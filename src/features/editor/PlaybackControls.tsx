import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, RotateCcw, RotateCw, Volume2, Volume1, VolumeX } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore } from '../../store/useEditorStore'
import { duracionProyecto } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'

// mando de volumen del visor. es solo de escucha: sube o baja lo que suena en la
// vista previa sin tocar el proyecto ni la exportación. al pulsarlo asoma un
// deslizador vertical (de pie, no tumbado) que va de 0 a 100 %
function ControlVolumen({ oscuro = false }: { oscuro?: boolean }) {
  const volumen = useEditorStore((s) => s.volumenPreview)
  const setVolumen = useEditorStore((s) => s.setVolumenPreview)
  const [abierto, setAbierto] = useState(false)
  const cajaRef = useRef<HTMLDivElement | null>(null)
  const pct = Math.round(volumen * 100)

  // el popover se cierra al pulsar fuera de él o de su botón, como cualquier menú
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false)
    }
    window.addEventListener('pointerdown', fuera)
    return () => window.removeEventListener('pointerdown', fuera)
  }, [abierto])

  const Bocina = volumen === 0 ? VolumeX : volumen < 0.5 ? Volume1 : Volume2
  const colorBoton = oscuro
    ? 'text-white/80 hover:text-white'
    : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'

  return (
    <div ref={cajaRef} className="relative">
      <Tooltip texto="Volumen de la vista previa" lado="arriba">
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-label="Volumen de la vista previa"
          className={['grid h-9 w-9 place-items-center rounded-lg transition-colors', colorBoton].join(' ')}
        >
          <Bocina size={18} />
        </button>
      </Tooltip>
      {abierto && (
        <div
          className="absolute bottom-full left-1/2 z-[70] mb-2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-xl px-3 py-3 shadow-xl"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.16)',
            boxShadow: '0 10px 28px rgb(6 12 24 / 0.24)',
          }}
        >
          <span className="text-[11px] font-semibold tabular-nums text-[color:var(--text)]">{pct}</span>
          {/* deslizador de pie: un range horizontal girado un cuarto de vuelta. el
              cero queda abajo y el máximo arriba, como se espera de un control de
              volumen vertical. va en posición absoluta y centrado para que su caja
              horizontal de origen no desborde el popover al girarlo */}
          <div className="relative h-28 w-6">
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setVolumen(Number(e.target.value) / 100)}
              aria-label="Volumen de la vista previa"
              className="absolute left-1/2 top-1/2 cursor-pointer"
              style={{ width: 112, transform: 'translate(-50%, -50%) rotate(-90deg)', accentColor: 'rgb(var(--brand))' }}
            />
          </div>
          <button
            onClick={() => setVolumen(volumen === 0 ? 1 : 0)}
            aria-label={volumen === 0 ? 'Quitar silencio' : 'Silenciar'}
            className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
          >
            <Bocina size={15} />
          </button>
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
