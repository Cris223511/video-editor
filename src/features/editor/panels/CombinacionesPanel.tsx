import { useRef, useState } from 'react'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import MuestraVideo from '../../../components/ui/MuestraVideo'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { useFrameEnTiempo } from '../../../lib/media/useFrameEnTiempo'
import { useToast } from '../../../components/ui/ToastProvider'
import { LOOKS, Look } from '../../../lib/efectos/looks'

// aproxima el aspecto de una combinación con un filtro css sencillo, solo para la
// muestra de la tarjeta. no es el resultado real (el brillo, los bordes cromáticos y el
// grano no se imitan con un filtro suelto), pero deja intuir el color y el contraste; el
// tinte de verdad lo pinta un degradado por encima
function cssMuestraLook(look: Look): string {
  const brillo = (1 + look.tono.exposicion / 200).toFixed(3)
  const contraste = (1 + look.tono.contraste / 160).toFixed(3)
  const satur = (1 + look.tono.saturacion / 120).toFixed(3)
  return `brightness(${brillo}) contrast(${contraste}) saturate(${satur})`
}

// panel de combinaciones: recetas de aspecto de un clic que cambian color, tono, ruedas
// y efectos a la vez. solo puede haber una puesta; elegir otra reemplaza la anterior, y
// cada parte se sigue afinando después en Ajustar colores y en Efectos
export default function CombinacionesPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const bloquesSeleccionados = useEditorStore((s) => s.bloquesSeleccionados)
  const playhead = useEditorStore((s) => s.playhead)
  const aplicarCombinacion = useEditorStore((s) => s.aplicarCombinacion)
  const medios = useProjectStore((s) => s.medios)
  const { mostrar } = useToast()

  // clip "líder" que muestra el panel: el seleccionado, o el primero de un recuadro de varios.
  // lo que se elija aquí lo aplica el store a todo el conjunto marcado
  const clipsConjunto = bloquesSeleccionados.filter((id) => clips.some((c) => c.id === id))
  const liderId =
    clipSeleccionado && clips.some((c) => c.id === clipSeleccionado) ? clipSeleccionado : clipsConjunto[0]
  const clip = clips.find((c) => c.id === liderId)
  const aplicaAVarios = clipsConjunto.length > 1 && !!liderId && clipsConjunto.includes(liderId)
  const medioClip = clip ? medios.find((m) => m.id === clip.assetId) : undefined
  const videoUrl = medioClip?.clase === 'video' ? medioClip.url : undefined

  // el fotograma que se ve en el visor es el fondo de las muestras, para que el hover
  // continúe desde ese mismo frame. no se recaptura mientras se reproduce (parecería
  // animarse solo): se congela en marcha y se pone al día en pausa o al arrastrar el cabezal
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const tiempoVivo = clip ? Math.max(0, clip.recorteInicio + (playhead - clip.inicio) * clip.velocidad) : 0
  const tiempoRef = useRef(tiempoVivo)
  if (!reproduciendo) tiempoRef.current = tiempoVivo
  const tiempoFrame = tiempoRef.current
  const frameActual = useFrameEnTiempo(videoUrl, tiempoFrame)
  const miniatura = videoUrl ? frameActual : medioClip?.miniatura
  const cargandoFrame = !!videoUrl && !frameActual

  if (!clip) {
    return (
      <SinSeleccion icono="pelicula" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para darle una combinación: color, tono y efectos de un
        solo clic.
      </SinSeleccion>
    )
  }

  const activa = clip.combinacion

  function aplicar(look: Look) {
    if (!clip) return
    // volver a pulsar la que ya está puesta la quita; si no, se pone (reemplazando a la anterior)
    if (activa === look.id) {
      aplicarCombinacion(clip.id, null)
      mostrar('info', 'Combinación quitada.')
      return
    }
    aplicarCombinacion(clip.id, look)
    mostrar('success', aplicaAVarios ? `Combinación "${look.nombre}" en los clips.` : `Combinación "${look.nombre}" aplicada.`)
  }

  function quitar() {
    if (!clip) return
    aplicarCombinacion(clip.id, null)
    mostrar('info', 'Combinación quitada.')
  }

  return (
    <div className="flex flex-col gap-4">
      {aplicaAVarios && (
        <div className="rounded-lg bg-brand/10 px-2.5 py-1.5 text-[11px] font-medium text-brand">
          Se aplica a los {clipsConjunto.length} clips seleccionados.
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Combinaciones</span>
          {activa && (
            <button
              onClick={quitar}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
            >
              <Icon name="restablecer" size={14} /> Quitar
            </button>
          )}
        </div>
        <p className="text-[12px] leading-relaxed text-[color:var(--muted)]">
          Un clic deja un estilo completo (color, tono y efectos). Solo una a la vez: elegir otra
          reemplaza la anterior. Después afinas cada parte en Ajustar colores y en Efectos.
        </p>
      </div>

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
        {LOOKS.map((look) => (
          <LookCard
            key={look.id}
            look={look}
            activo={activa === look.id}
            miniatura={miniatura}
            videoUrl={videoUrl}
            tiempo={tiempoFrame}
            cargando={cargandoFrame}
            onAplicar={() => aplicar(look)}
          />
        ))}
      </div>
    </div>
  )
}

// tarjeta de una combinación: una muestra que insinúa la estética (el frame con el filtro
// aproximado y un baño de color encima) y, al pasar el cursor, reproduce el propio video.
// un clic la aplica; la que está puesta se marca con el borde y un visto
function LookCard({
  look,
  activo,
  miniatura,
  videoUrl,
  tiempo,
  cargando,
  onAplicar,
}: {
  look: Look
  activo: boolean
  miniatura?: string
  videoUrl?: string
  tiempo: number
  cargando: boolean
  onAplicar: () => void
}) {
  const [encima, setEncima] = useState(false)
  const fondo = miniatura
    ? { backgroundImage: `url(${miniatura})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : cargando
      ? { backgroundColor: 'rgb(var(--border) / 0.18)' }
      : { backgroundImage: `linear-gradient(135deg, ${look.colorA} 0%, ${look.colorB} 100%)` }

  return (
    <button
      onClick={onAplicar}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      className="group flex flex-col gap-1 text-left"
      aria-pressed={activo}
    >
      <span
        className={[
          'relative block h-[112px] w-full overflow-hidden rounded-lg border transition-all duration-200',
          activo ? 'border-brand ring-2 ring-brand' : 'border-black/10 group-hover:border-brand dark:border-white/10',
        ].join(' ')}
      >
        {/* el frame con el filtro aproximado; al hacer hover, el video en marcha */}
        <span className="absolute inset-0" style={{ ...fondo, filter: cssMuestraLook(look) }}>
          {encima && videoUrl && (
            <MuestraVideo src={videoUrl} tiempo={tiempo} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </span>
        {/* el baño de color: un degradado de la combinación por encima, en modo mezcla para
            que tiña sin tapar del todo, más un realce en las luces que imita el brillo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${look.colorA} 0%, ${look.colorB} 100%)`,
            mixBlendMode: 'overlay',
            opacity: 0.6,
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(120% 80% at 50% 18%, rgba(255,255,255,0.32), rgba(255,255,255,0) 60%)`,
            mixBlendMode: 'screen',
          }}
        />
        {/* el visto de la que está puesta, o la etiqueta que insinúa que es una receta */}
        {activo ? (
          <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white shadow">
            <Icon name="check" size={12} />
          </span>
        ) : (
          <span className="absolute bottom-1 left-1 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            Combinación
          </span>
        )}
      </span>
      <span
        className={[
          'truncate text-[12px] font-medium transition-colors',
          activo ? 'text-brand' : 'text-[color:var(--text)] group-hover:text-brand',
        ].join(' ')}
      >
        {look.nombre}
      </span>
      <span className="text-[10px] leading-tight text-[color:var(--muted)] line-clamp-2">{look.descripcion}</span>
    </button>
  )
}
