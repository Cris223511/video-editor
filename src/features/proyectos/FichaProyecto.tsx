import { useEffect, useState } from 'react'
import { CalendarPlus, PencilLine, Play } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Loader from '../../components/ui/Loader'
import FichaMedio from '../editor/FichaMedio'
import { MediaAsset } from '../../types/media'
import { leerProyecto } from '../../lib/proyecto/almacen'
import { ProyectoGuardado, MedioGuardado } from '../../lib/proyecto/formato'
import { frameDeVideo } from '../../lib/media/probeVideo'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'

// el máximo común divisor deja la proporción en su forma corta, que es como se
// reconoce de un vistazo. 1920 por 1080 se lee mal, 16:9 se lee solo
function mcd(a: number, b: number): number {
  return b === 0 ? a : mcd(b, a % b)
}

function proporcion(ancho: number, alto: number): string {
  if (!ancho || !alto) return 'No disponible'
  const d = mcd(ancho, alto)
  const w = ancho / d
  const h = alto / d
  // cuando la división no cae en números manejables se recurre al decimal, que
  // es preferible a soltar una proporción como 683:384
  if (w > 30 || h > 30) return `${(ancho / alto).toFixed(2)}:1`
  return `${w}:${h}`
}

// la resolución en la forma reconocible (720p, 1080p), nombrada por el lado menor: así un video
// vertical de 720 por 1280 es 720p, igual que su equivalente horizontal
function resolucion(ancho: number, alto: number): string {
  if (!ancho || !alto) return 'No disponible'
  return `${Math.min(ancho, alto)}p`
}

// fecha escrita en largo, con el mes en palabra y la hora en formato de doce
// horas. queda más natural de leer que una cadena de números, y el mes con su
// inicial en mayúscula sigue la forma que pidió el dueño del proyecto
function fecha(ms: number): string {
  const d = new Date(ms)
  const mes = d.toLocaleDateString('es', { month: 'long' })
  const conMayuscula = mes.charAt(0).toUpperCase() + mes.slice(1)
  const hora = d
    .toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(/\s?([ap])\.?\s?m\.?/i, (_, l) => ` ${l.toLowerCase()}.m.`)
  return `${d.getDate()} de ${conMayuscula} del ${d.getFullYear()}, a las ${hora}`
}

// una fila de la ficha. el nombre a la izquierda en gris y el valor a la derecha
// con el color del texto, para que la columna de valores se lea de corrido
function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 py-1.5"
      style={{ borderBottom: '1px solid rgb(var(--border) / 0.08)' }}
    >
      <dt className="shrink-0 text-[13px] text-[color:var(--muted)]">{nombre}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium">{valor}</dd>
    </div>
  )
}

// una fila de archivo dentro de la ficha del proyecto. al pulsarla se abre la ficha completa del medio
// (la misma que usa la biblioteca del editor) por encima de este modal, con su vista previa y todos sus
// datos. antes desplegaba los datos en línea; ahora reutiliza esa ficha para tener todo con el mismo
// diseño. la miniatura se rehace desde la mitad del propio archivo, para que no dependa de una guardada
// que saliera negra
function FilaArchivo({ m }: { m: MedioGuardado }) {
  const [verDetalle, setVerDetalle] = useState(false)
  const [portada, setPortada] = useState(m.miniatura)

  // el archivo real y su url viva, para previsualizar y para sacarle un fotograma. se crea y se
  // revoca dentro del MISMO efecto a propósito: si se creara en un useMemo y se revocara en un efecto
  // aparte, el doble montaje de StrictMode (en desarrollo) la revocaba sin volver a crearla, y el
  // <video> se quedaba con una url muerta (ERR_FILE_NOT_FOUND). el blob se envuelve en un File con su
  // tipo por si vuelve de IndexedDB sin el tipo MIME, que también dejaría al <video> sin decodificar
  const [url, setUrl] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  useEffect(() => {
    const f =
      m.archivo instanceof File
        ? m.archivo
        : new File([m.archivo], m.nombre, { type: m.tipo || m.archivo.type })
    setArchivo(f)
    const u = URL.createObjectURL(f)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [m.archivo, m.nombre, m.tipo])

  // se rehace la portada tomando el fotograma de la mitad; si sale algo, sustituye
  // a la guardada, que en proyectos viejos podía ser el primer frame en negro
  useEffect(() => {
    if (!url) return
    let vivo = true
    frameDeVideo(url, (m.duracion || 0) / 2).then((f) => {
      if (vivo && f) setPortada(f)
    })
    return () => {
      vivo = false
    }
  }, [url, m.duracion])

  // el medio guardado se adapta a un MediaAsset para poder pasárselo tal cual a la ficha del editor
  const asset: MediaAsset | null =
    url && archivo
      ? {
          id: m.id,
          clase: 'video',
          file: archivo,
          nombre: m.nombre,
          tamano: m.tamano,
          tipo: m.tipo,
          duracion: m.duracion,
          ancho: m.ancho,
          alto: m.alto,
          url,
          miniatura: portada,
        }
      : null

  return (
    <>
      <button
        onClick={() => setVerDetalle(true)}
        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[rgb(var(--border)/0.06)]"
        style={{ border: '1px dashed rgb(var(--border) / 0.35)' }}
      >
        {/* la portada, con el botón de reproducir sobrepuesto como pista de que el archivo se puede ver */}
        <span className="group relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black/40">
          <img src={portada} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors duration-200 group-hover:bg-black/45">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#13233d] shadow transition-transform duration-200 group-hover:scale-110">
              <Play size={15} className="ml-0.5" fill="currentColor" />
            </span>
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold" title={m.nombre}>
            {m.nombre}
          </span>
          <span className="mt-0.5 block text-[12px] text-[color:var(--muted)]">
            {formatearDuracion(m.duracion)} · {formatearBytes(m.tamano)}
          </span>
        </span>
      </button>

      {/* la ficha del medio se monta por encima de este modal; al cerrarla se vuelve al del proyecto */}
      <FichaMedio medio={verDetalle ? asset : null} onCerrar={() => setVerDetalle(false)} />
    </>
  )
}

// ficha con todo lo que se sabe de un proyecto y de cada uno de sus medios. se
// apoya en el Modal de siempre, así que hereda su desenfoque de fondo y sus
// animaciones de apertura y cierre sin escribir ninguna propia
export default function FichaProyecto({
  id,
  onCerrar,
}: {
  id: string | null
  onCerrar: () => void
}) {
  const [proyecto, setProyecto] = useState<ProyectoGuardado | null>(null)

  // la lista de proyectos solo guarda un resumen, así que los datos de cada
  // medio hay que traerlos del almacén al abrir la ficha. se limpia al cerrar
  // para que la siguiente no muestre un instante los datos de la anterior
  useEffect(() => {
    if (!id) {
      setProyecto(null)
      return
    }
    let vigente = true
    leerProyecto(id).then((p) => {
      if (vigente) setProyecto(p ?? null)
    })
    return () => {
      vigente = false
    }
  }, [id])

  const pesoTotal = proyecto?.medios.reduce((t, m) => t + m.tamano, 0) ?? 0

  return (
    <Modal
      titulo={proyecto?.titulo ?? 'Detalles del proyecto'}
      abierto={id !== null}
      onCerrar={onCerrar}
      ancho="max-w-xl"
    >
      {!proyecto ? (
        <div className="py-10">
          <Loader texto="Leyendo el proyecto..." />
        </div>
      ) : (
        <div className="flex max-h-[65vh] flex-col gap-8 overflow-y-auto pr-1">
          <section>
            <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Proyecto
            </h3>
            {/* las dos fechas van juntas y con su icono, separadas del resto de
                datos: son lo primero que se busca al abrir la ficha */}
            <div className="mb-5 flex flex-col gap-2">
              <p className="flex items-center gap-2 text-[13px]">
                <CalendarPlus size={15} className="shrink-0 text-brand" />
                <span className="text-[color:var(--muted)]">Creado el</span>
                <span className="font-medium">{fecha(proyecto.creado)}</span>
              </p>
              <p className="flex items-center gap-2 text-[13px]">
                <PencilLine size={15} className="shrink-0 text-brand" />
                <span className="text-[color:var(--muted)]">Última vez editado el</span>
                <span className="font-medium">{fecha(proyecto.modificado)}</span>
              </p>
            </div>
            <dl>
              <Dato nombre="Título" valor={proyecto.titulo} />
              <Dato nombre="Archivos" valor={String(proyecto.medios.length)} />
              <Dato nombre="Clips en la línea de tiempo" valor={String(proyecto.edicion.clips.length)} />
              <Dato nombre="Niveles de video" valor={String(proyecto.edicion.numPistas)} />
              <Dato nombre="Capas" valor={String(proyecto.edicion.capas.length)} />
              <Dato
                nombre="Resolución de salida"
                valor={`${resolucion(proyecto.edicion.resolucion.ancho, proyecto.edicion.resolucion.alto)} · ${proyecto.edicion.resolucion.ancho} × ${proyecto.edicion.resolucion.alto} px`}
              />
              <Dato
                nombre="Proporción de salida"
                valor={proporcion(proyecto.edicion.resolucion.ancho, proyecto.edicion.resolucion.alto)}
              />
              <Dato nombre="Tamaño total" valor={formatearBytes(pesoTotal)} />
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Archivos ({proyecto.medios.length})
            </h3>
            {/* cada archivo abre su ficha completa al pulsarlo, por encima de este modal */}
            <div className="flex flex-col gap-2">
              {proyecto.medios.map((m) => (
                <FilaArchivo key={m.id} m={m} />
              ))}
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}
