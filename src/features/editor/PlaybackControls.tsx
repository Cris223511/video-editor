import { Maximize2, Minimize2 } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore } from '../../store/useEditorStore'
import { duracionTotal } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'

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
  const playhead = useEditorStore((s) => s.playhead)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const alternar = useEditorStore((s) => s.alternarReproduccion)
  const irA = useEditorStore((s) => s.irA)
  const total = duracionTotal(clips)
  const vacio = total === 0

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center gap-4 px-4 py-1.5',
        // a pantalla completa la barra flota sobre el fondo oscuro, así que ni el
        // borde superior ni el color del tema pintan nada ahí
        visorCompleto ? 'mt-3' : 'border-t border-black/10 dark:border-white/10',
      ].join(' ')}
    >
      <button
        onClick={() => irA(0)}
        title="Ir al inicio"
        disabled={vacio}
        className="grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)] disabled:opacity-40"
      >
        <Icon name="inicio" size={18} />
      </button>
      <button
        onClick={alternar}
        title={reproduciendo ? 'Pausar' : 'Reproducir'}
        disabled={vacio}
        className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95 disabled:opacity-40"
      >
        <Icon name={reproduciendo ? 'pausa' : 'play'} size={20} />
      </button>
      <div className="min-w-[104px] text-center font-mono text-sm tabular-nums text-[color:var(--muted)]">
        {formatearDuracion(playhead)} / {formatearDuracion(total)}
      </div>
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
