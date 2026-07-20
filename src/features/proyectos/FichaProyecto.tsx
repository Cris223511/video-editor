import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarPlus, ChevronDown, Download, PencilLine, Play, X } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Loader from '../../components/ui/Loader'
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

// vista previa a pantalla de un archivo del proyecto. detrás va el mismo video
// muy ampliado y borroso, para que el fondo acompañe a lo que se reproduce en
// lugar de un negro plano. la apertura y el cierre los anima Framer Motion
function Reproductor({
  url,
  nombre,
  ancho,
  alto,
  onCerrar,
}: {
  url: string
  nombre: string
  ancho: number
  alto: number
  onCerrar: () => void
}) {
  // esc cierra sin tener que apuntar a la equis, como en cualquier visor
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      style={{ pointerEvents: 'auto' }}
      onClick={onCerrar}
    >
      {/* el mismo material de fondo, agrandado y difuminado, oscurecido para que
          el video de delante y los controles resalten */}
      <video
        src={url}
        muted
        autoPlay
        loop
        playsInline
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ filter: 'blur(42px) brightness(0.5)' }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-end gap-2">
          <a
            href={url}
            download={nombre}
            aria-label="Descargar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <Download size={18} />
          </a>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25"
          >
            <X size={18} />
          </button>
        </div>
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className="max-h-[78vh] w-full rounded-2xl bg-black shadow-2xl"
          style={{ aspectRatio: `${ancho} / ${alto}` }}
        />
        <p className="mt-3 truncate text-center text-[13px] text-white/80">{nombre}</p>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

// una fila de archivo dentro de la ficha del proyecto. va plegada de entrada,
// con su borde punteado; al pulsar el bloque se despliegan los datos técnicos, y
// la portada abre la vista previa a pantalla. la miniatura se rehace desde la
// mitad del propio archivo, para que no dependa de una guardada que saliera negra
function FilaArchivo({ m }: { m: MedioGuardado }) {
  const [abierto, setAbierto] = useState(false)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [portada, setPortada] = useState(m.miniatura)

  // url viva del archivo, para previsualizarlo y para sacarle un fotograma
  const url = useMemo(() => URL.createObjectURL(m.archivo), [m.archivo])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  // se rehace la portada tomando el fotograma de la mitad; si sale algo, sustituye
  // a la guardada, que en proyectos viejos podía ser el primer frame en negro
  useEffect(() => {
    let vivo = true
    frameDeVideo(url, (m.duracion || 0) / 2).then((f) => {
      if (vivo && f) setPortada(f)
    })
    return () => {
      vivo = false
    }
  }, [url, m.duracion])

  const pixeles = m.ancho * m.alto
  const formato = m.nombre.includes('.') ? m.nombre.split('.').pop()!.toUpperCase() : 'Desconocido'

  return (
    <div className="rounded-xl" style={{ border: '1px dashed rgb(var(--border) / 0.35)' }}>
      <div className="flex items-center gap-3 p-2.5">
        {/* la portada hace de disparador de la vista previa: al pasar el cursor se
            oscurece y aparece el botón de reproducir en el centro */}
        <button
          onClick={() => setReproduciendo(true)}
          className="group relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black/40"
          aria-label="Ver vista previa"
        >
          <img src={portada} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors duration-200 group-hover:bg-black/45">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#13233d] shadow transition-transform duration-200 group-hover:scale-110">
              <Play size={15} className="ml-0.5" fill="currentColor" />
            </span>
          </span>
        </button>

        {/* el resto de la fila pliega y despliega los datos del archivo */}
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold" title={m.nombre}>
              {m.nombre}
            </p>
            <p className="mt-0.5 text-[12px] text-[color:var(--muted)]">
              {formatearDuracion(m.duracion)} · {formatearBytes(m.tamano)}
            </p>
          </div>
          <ChevronDown
            size={16}
            className="shrink-0 text-[color:var(--muted)] transition-transform duration-300"
            style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <dl className="px-3 pb-3">
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reproduciendo && (
          <Reproductor
            url={url}
            nombre={m.nombre}
            ancho={m.ancho}
            alto={m.alto}
            onCerrar={() => setReproduciendo(false)}
          />
        )}
      </AnimatePresence>
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
            <h3 className="mb-1 text-[14px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
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
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--muted)]">
              Los archivos viven dentro del navegador de este equipo, no en una carpeta que puedas
              abrir. Por eso no hay una ruta que mostrar: descarga el proyecto si quieres una copia
              en disco.
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-[14px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Archivos ({proyecto.medios.length})
            </h3>
            {/* cada archivo va plegado, con su borde punteado; se despliega al
                pulsarlo y su portada abre la vista previa */}
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
