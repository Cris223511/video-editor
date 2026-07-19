import { useEffect, useState } from 'react'
import { CalendarPlus, PencilLine } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Loader from '../../components/ui/Loader'
import { leerProyecto } from '../../lib/proyecto/almacen'
import { ProyectoGuardado, MedioGuardado } from '../../lib/proyecto/formato'
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

function orientacion(ancho: number, alto: number): string {
  if (ancho === alto) return 'Cuadrado'
  return ancho > alto ? 'Horizontal' : 'Vertical'
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

function FichaMedio({ m }: { m: MedioGuardado }) {
  // los megapíxeles se sacan del total de píxeles y sirven para hacerse una idea
  // del peso real de la imagen, más que el ancho y el alto por separado
  const pixeles = m.ancho * m.alto
  const formato = m.nombre.includes('.')
    ? m.nombre.split('.').pop()!.toUpperCase()
    : 'Desconocido'

  return (
    <div
      className="flex gap-3 rounded-xl p-3"
      style={{ background: 'rgb(var(--border) / 0.05)' }}
    >
      <img
        src={m.miniatura}
        alt=""
        className="h-16 w-24 shrink-0 rounded-lg bg-black/40 object-cover"
      />
      <dl className="min-w-0 flex-1">
        <p className="mb-1 truncate text-xs font-semibold" title={m.nombre}>
          {m.nombre}
        </p>
        <Dato nombre="Dimensiones" valor={`${m.ancho} × ${m.alto} px`} />
        <Dato nombre="Proporción" valor={proporcion(m.ancho, m.alto)} />
        <Dato nombre="Orientación" valor={orientacion(m.ancho, m.alto)} />
        <Dato nombre="Duración" valor={formatearDuracion(m.duracion)} />
        <Dato nombre="Tamaño" valor={formatearBytes(m.tamano)} />
        <Dato nombre="Formato" valor={formato} />
        <Dato nombre="Tipo MIME" valor={m.tipo || 'Desconocido'} />
        <Dato nombre="Megapíxeles" valor={`${(pixeles / 1_000_000).toFixed(2)} MP`} />
        <Dato nombre="Píxeles totales" valor={pixeles.toLocaleString('es')} />
      </dl>
    </div>
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
      descripcion="Todo lo que se sabe de este proyecto y de sus archivos."
      abierto={id !== null}
      onCerrar={onCerrar}
      ancho="max-w-xl"
    >
      {!proyecto ? (
        <div className="py-10">
          <Loader texto="Leyendo el proyecto..." />
        </div>
      ) : (
        <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
          <section>
            <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Proyecto
            </h3>
            {/* las dos fechas van juntas y con su icono, separadas del resto de
                datos: son lo primero que se busca al abrir la ficha */}
            <div className="mb-3 flex flex-col gap-2">
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
                valor={`${proyecto.edicion.resolucion.ancho} × ${proyecto.edicion.resolucion.alto} px`}
              />
              <Dato
                nombre="Proporción de salida"
                valor={proporcion(proyecto.edicion.resolucion.ancho, proyecto.edicion.resolucion.alto)}
              />
              <Dato nombre="Espacio ocupado" valor={formatearBytes(pesoTotal)} />
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--muted)]">
              Los archivos viven dentro del navegador de este equipo, no en una carpeta que puedas
              abrir. Por eso no hay una ruta que mostrar: descarga el proyecto si quieres una copia
              en disco.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Archivos ({proyecto.medios.length})
            </h3>
            <div className="flex flex-col gap-2">
              {proyecto.medios.map((m) => (
                <FichaMedio key={m.id} m={m} />
              ))}
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}
