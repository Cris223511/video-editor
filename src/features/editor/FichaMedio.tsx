import { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Clock,
  Compass,
  Download,
  FileCode2,
  FileVideo,
  Grid2x2,
  HardDrive,
  Hash,
  Play,
  RectangleHorizontal,
  Ruler,
  X,
} from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { MediaAsset } from '../../types/media'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'

// proporción en su forma corta, la misma idea que la ficha de proyecto: 16:9 se
// reconoce de un vistazo, 1920 por 1080 no
function mcd(a: number, b: number): number {
  return b === 0 ? a : mcd(b, a % b)
}
function proporcion(ancho: number, alto: number): string {
  if (!ancho || !alto) return 'No disponible'
  const d = mcd(ancho, alto)
  const w = ancho / d
  const h = alto / d
  if (w > 30 || h > 30) return `${(ancho / alto).toFixed(2)}:1`
  return `${w}:${h}`
}
function orientacion(ancho: number, alto: number): string {
  if (ancho === alto) return 'Cuadrado'
  return ancho > alto ? 'Horizontal' : 'Vertical'
}

function Dato({
  icono,
  nombre,
  valor,
  ultima,
}: {
  icono?: ReactNode
  nombre: string
  valor: string
  // la última fila no lleva línea abajo, que si no la lista parece cortada
  ultima?: boolean
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 py-2"
      style={ultima ? undefined : { borderBottom: '1px solid rgb(var(--border) / 0.1)' }}
    >
      <dt className="flex shrink-0 items-center gap-2 text-[13px] text-[color:var(--muted)]">
        {icono && <span className="text-brand">{icono}</span>}
        {nombre}
      </dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium">{valor}</dd>
    </div>
  )
}

// descarga el video con su nombre original. como la url es un object url local,
// basta un enlace temporal al que se le da clic desde el código
function descargar(medio: MediaAsset) {
  const a = document.createElement('a')
  a.href = medio.url
  a.download = medio.nombre
  a.click()
}

// vista grande del video ocupando la pantalla. detrás va el mismo video, muy
// ampliado y difuminado, para que el fondo respire con lo que se reproduce en
// lugar de un negro plano. la apertura y el cierre los anima Framer Motion
function ReproductorMedio({ medio, onCerrar }: { medio: MediaAsset; onCerrar: () => void }) {
  const principal = useRef<HTMLVideoElement>(null)
  const fondo = useRef<HTMLVideoElement>(null)
  // solo cierra un clic que nace y termina en el fondo. si el clic empezó dentro
  // (arrastrar y soltar fuera), no se cierra
  const abajoEnFondo = useRef(false)

  // esc cierra sin tener que apuntar a la equis, como en cualquier visor
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  // el video del fondo sigue al de delante: comparte su instante y su estado de
  // reproducción para que la mancha borrosa cambie a la vez que la imagen nítida
  const sincronizar = () => {
    const p = principal.current
    const f = fondo.current
    if (!p || !f) return
    if (Math.abs(f.currentTime - p.currentTime) > 0.25) f.currentTime = p.currentTime
    if (p.paused) f.pause()
    else f.play().catch(() => {})
  }

  return createPortal(
      <motion.div
        key="reproductor"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-6"
        // la ficha se abre sobre un diálogo de Radix, que apaga los eventos de
        // puntero fuera de su contenido. el visor vive en el body, así que hay
        // que devolverle los clics a mano o no respondería ni la equis
        style={{ pointerEvents: 'auto' }}
        onMouseDown={() => {
          abajoEnFondo.current = true
        }}
        onClick={() => {
          if (abajoEnFondo.current) onCerrar()
        }}
      >
        {/* el mismo video de fondo, agrandado y difuminado. va oscurecido para
            que los controles y el video de delante resalten por encima */}
        <video
          ref={fondo}
          src={medio.url}
          muted
          autoPlay
          loop
          playsInline
          className="absolute inset-0 h-full w-full scale-110 object-cover"
          style={{ filter: 'blur(42px) brightness(0.5)' }}
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* la capa nítida, centrada y con esquinas redondeadas. el clic dentro no
            debe cerrar, por eso corta la propagación hacia el fondo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-4xl"
          onMouseDown={(e) => {
            // un clic que empieza dentro no debe contar como clic en el fondo
            abajoEnFondo.current = false
            e.stopPropagation()
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-end gap-2">
            <button
              onClick={() => descargar(medio)}
              aria-label="Descargar"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onCerrar}
              aria-label="Cerrar"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <X size={18} />
            </button>
          </div>
          <video
            ref={principal}
            src={medio.url}
            controls
            autoPlay
            playsInline
            onPlay={sincronizar}
            onPause={sincronizar}
            onSeeked={sincronizar}
            onTimeUpdate={sincronizar}
            className="max-h-[78vh] w-full rounded-2xl bg-black shadow-2xl"
            style={{ aspectRatio: `${medio.ancho} / ${medio.alto}` }}
          />
          <p className="mt-3 truncate text-center text-[13px] text-white/80">{medio.nombre}</p>
        </motion.div>
      </motion.div>,
    document.body,
  )
}

// ficha de un medio importado. muestra la portada con un botón de reproducción,
// y los datos técnicos plegados en un bloque de borde punteado que se abre a
// voluntad. el visor a pantalla se monta aparte, por encima de todo
export default function FichaMedio({
  medio,
  onCerrar,
}: {
  medio: MediaAsset | null
  onCerrar: () => void
}) {
  // el visor arranca cerrado hasta que se pulse play
  const [reproduciendo, setReproduciendo] = useState(false)

  // al abrir otra ficha se vuelve al estado de reposo, para no heredar el visor
  // del medio anterior
  useEffect(() => {
    setReproduciendo(false)
  }, [medio])

  if (!medio) return <Modal titulo="" abierto={false} onCerrar={onCerrar}>{null}</Modal>

  const pixeles = medio.ancho * medio.alto
  const formato = medio.nombre.includes('.')
    ? medio.nombre.split('.').pop()!.toUpperCase()
    : 'Desconocido'

  return (
    <>
      <Modal
        titulo={medio.nombre}
        descripcion="Datos del archivo importado."
        abierto={medio !== null}
        onCerrar={onCerrar}
        ancho="max-w-3xl"
      >
        {/* dos columnas: el video a la izquierda y sus datos a la derecha. antes
            los datos vivían plegados dentro de un desplegable, así que había que
            abrirlos para ver algo tan básico como las dimensiones */}
        <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
          {/* la portada hace de disparador del visor: al pasar el cursor se
              oscurece y aparece el botón de reproducir en el centro */}
          <button
            onClick={() => setReproduciendo(true)}
            className="group relative block w-full self-start overflow-hidden rounded-xl bg-black/40"
            style={{ aspectRatio: `${medio.ancho} / ${medio.alto}` }}
            aria-label="Reproducir video"
          >
            <img
              src={medio.miniatura}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors duration-200 group-hover:bg-black/40">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-[#13233d] shadow-lg transition-transform duration-200 group-hover:scale-110">
                <Play size={22} className="ml-0.5" fill="currentColor" />
              </span>
            </span>
          </button>

          {/* los datos, siempre a la vista y repartidos en filas separadas por una
              línea, que es como se lee una ficha de un vistazo */}
          <dl className="flex flex-col self-start">
            <Dato icono={<Ruler size={14} />} nombre="Dimensiones" valor={`${medio.ancho} × ${medio.alto} px`} />
            <Dato icono={<RectangleHorizontal size={14} />} nombre="Proporción" valor={proporcion(medio.ancho, medio.alto)} />
            <Dato icono={<Compass size={14} />} nombre="Orientación" valor={orientacion(medio.ancho, medio.alto)} />
            <Dato icono={<Clock size={14} />} nombre="Duración" valor={formatearDuracion(medio.duracion)} />
            <Dato icono={<HardDrive size={14} />} nombre="Tamaño" valor={formatearBytes(medio.tamano)} />
            <Dato icono={<FileVideo size={14} />} nombre="Formato" valor={formato} />
            <Dato icono={<FileCode2 size={14} />} nombre="Tipo MIME" valor={medio.tipo || 'Desconocido'} />
            <Dato icono={<Grid2x2 size={14} />} nombre="Megapíxeles" valor={`${(pixeles / 1_000_000).toFixed(2)} MP`} />
            <Dato icono={<Hash size={14} />} nombre="Píxeles totales" valor={pixeles.toLocaleString('es')} ultima />
          </dl>
        </div>
      </Modal>

      {/* la presencia envuelve al visor para que el cierre también se anime: sin
          esto, al bajar el estado el componente se desmontaría de golpe */}
      <AnimatePresence>
        {reproduciendo && (
          <ReproductorMedio medio={medio} onCerrar={() => setReproduciendo(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
