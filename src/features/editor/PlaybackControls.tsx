import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, RotateCcw, RotateCw, Volume2, Volume1, VolumeX } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore } from '../../store/useEditorStore'
import { duracionProyecto } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'

// mando de volumen del visor. es solo de escucha: sube o baja lo que suena en la
// vista previa sin tocar el proyecto ni la exportación. al pasar el cursor por encima
// asoma un panel con el mismo deslizador y el mismo estilo que el volumen general del
// panel de audio
function ControlVolumen({ oscuro = false }: { oscuro?: boolean }) {
  const volumen = useEditorStore((s) => s.volumenPreview)
  const setVolumen = useEditorStore((s) => s.setVolumenPreview)
  const [abierto, setAbierto] = useState(false)
  const cajaRef = useRef<HTMLDivElement | null>(null)
  // temporizador de cierre: al salir el cursor no se cierra en el acto, se espera un
  // instante. así hay tiempo de cruzar el hueco entre la bocina y el deslizador sin
  // que el panel desaparezca a mitad de camino
  const cierre = useRef<number>()
  const pct = Math.round(volumen * 100)

  const abrir = () => {
    window.clearTimeout(cierre.current)
    setAbierto(true)
  }
  const cerrarConRetraso = () => {
    window.clearTimeout(cierre.current)
    cierre.current = window.setTimeout(() => setAbierto(false), 160)
  }

  // el popover también se cierra al pulsar fuera de él o de su botón, por si el mando
  // se abrió con un toque en pantalla táctil, donde no hay cursor que se aleje
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false)
    }
    window.addEventListener('pointerdown', fuera)
    return () => window.removeEventListener('pointerdown', fuera)
  }, [abierto])

  // al desmontar no debe quedar un cierre pendiente tocando un estado que ya no existe
  useEffect(() => () => window.clearTimeout(cierre.current), [])

  const Bocina = volumen === 0 ? VolumeX : volumen < 0.5 ? Volume1 : Volume2
  const colorBoton = oscuro
    ? 'text-white/80 hover:text-white'
    : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'

  return (
    <div ref={cajaRef} className="relative" onMouseEnter={abrir} onMouseLeave={cerrarConRetraso}>
      {/* sin tooltip: al pasar el cursor ya se abre el deslizador de volumen, así que
          el globo de ayuda solo estorbaba tapando el control */}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Volumen de la vista previa"
        className={['grid h-9 w-9 place-items-center rounded-lg transition-colors', colorBoton].join(' ')}
      >
        <Bocina size={18} />
      </button>
      {abierto && (
        <div
          className="absolute bottom-full left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 rounded-xl px-3 pb-3 pt-3 shadow-xl before:absolute before:left-0 before:top-full before:h-2 before:w-full before:content-['']"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.16)',
            boxShadow: '0 10px 28px rgb(6 12 24 / 0.24)',
            marginBottom: 8,
          }}
        >
          <span className="text-[11px] font-semibold tabular-nums text-[color:var(--text)]">{pct}</span>
          {/* deslizador de pie (girado un cuarto de vuelta) con el mismo estilo que el
              Deslizador de la app: track redondeado con relleno de color de acento hasta
              el valor y el pulgar en color de marca, en vez del control nativo del navegador */}
          <div className="relative h-28 w-6">
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setVolumen(Number(e.target.value) / 100)}
              aria-label="Volumen de la vista previa"
              className="absolute left-1/2 top-1/2 h-1.5 cursor-pointer appearance-none rounded-full accent-brand"
              style={{
                width: 112,
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                background: `linear-gradient(to right, rgb(var(--accent)) ${pct}%, rgb(var(--border) / 0.18) ${pct}%)`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// controles de reproducción bajo el visor: volver al inicio, reproducir o
// pausar, el tiempo actual frente al total, y el paso a pantalla completa
export default function PlaybackControls({
  visorCompleto = false,
  onAlternarCompleto,
}: {
  visorCompleto?: boolean
  onAlternarCompleto?: () => void
}) {
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const audios = useEditorStore((s) => s.audios)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const playhead = useEditorStore((s) => s.playhead)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const alternar = useEditorStore((s) => s.alternarReproduccion)
  const irA = useEditorStore((s) => s.irA)
  const total = duracionProyecto(clips, capas, audios, audioRegiones)
  const vacio = total === 0

  // saltos de cinco segundos, recortados a los extremos del montaje. el de
  // retroceder solo se apaga si el cabezal ya está en el arranque; desde el
  // segundo dos sí retrocede y aterriza en el cero, no se bloquea por no llegar a
  // cinco. igual el de avanzar respecto al final
  const SALTO = 5
  const puedeAtras = !vacio && playhead > 0.001
  const puedeAdelante = !vacio && playhead < total - 0.001

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center gap-4 px-4 py-1.5',
        // a pantalla completa la barra flota sobre el fondo oscuro, así que ni el
        // borde superior ni el color del tema pintan nada ahí
        visorCompleto ? 'mt-3' : 'border-t border-black/10 dark:border-white/10',
      ].join(' ')}
    >
      <Tooltip texto="Ir al inicio" lado="arriba">
        <button
          onClick={() => irA(0)}
          aria-label="Ir al inicio"
          disabled={vacio}
          className="grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)] disabled:opacity-40"
        >
          <Icon name="inicio" size={18} />
        </button>
      </Tooltip>
      <Tooltip texto="Retroceder 5 segundos" lado="arriba">
        <button
          onClick={() => irA(Math.max(0, playhead - SALTO))}
          aria-label="Retroceder 5 segundos"
          disabled={!puedeAtras}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw size={19} />
          <span className="absolute text-[8px] font-bold leading-none">5</span>
        </button>
      </Tooltip>
      <Tooltip texto={reproduciendo ? 'Pausar' : 'Reproducir'} atajo="Espacio" lado="arriba">
        <button
          onClick={alternar}
          aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
          disabled={vacio}
          className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95 disabled:opacity-40"
        >
          <Icon name={reproduciendo ? 'pausa' : 'play'} size={20} />
        </button>
      </Tooltip>
      <Tooltip texto="Avanzar 5 segundos" lado="arriba">
        <button
          onClick={() => irA(Math.min(total, playhead + SALTO))}
          aria-label="Avanzar 5 segundos"
          disabled={!puedeAdelante}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)] disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCw size={19} />
          <span className="absolute text-[8px] font-bold leading-none">5</span>
        </button>
      </Tooltip>
      <div className="min-w-[104px] text-center font-mono text-sm tabular-nums text-[color:var(--muted)]">
        {formatearDuracion(playhead)} / {formatearDuracion(total)}
      </div>
      <ControlVolumen oscuro={visorCompleto} />
      {/* pantalla completa, junto al mando de reproducir. el visor se agranda hasta
          ocupar toda la ventana sin dejar de ser el mismo, así que lo que se ve
          sigue siendo el montaje con sus capas, no un video suelto */}
      {onAlternarCompleto && (
        <Tooltip texto={visorCompleto ? 'Salir de pantalla completa' : 'Ver a pantalla completa'} lado="arriba">
          <button
            onClick={onAlternarCompleto}
            aria-label={visorCompleto ? 'Salir de pantalla completa' : 'Ver a pantalla completa'}
            className={[
              'grid h-9 w-9 place-items-center rounded-lg transition-colors',
              visorCompleto
                ? 'text-white/80 hover:text-white'
                : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
            ].join(' ')}
          >
            {visorCompleto ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </Tooltip>
      )}
    </div>
  )
}
