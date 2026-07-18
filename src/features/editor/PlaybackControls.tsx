import Icon from '../../components/ui/Icon'
import { useEditorStore } from '../../store/useEditorStore'
import { duracionTotal } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'

// controles de reproducción bajo el visor: volver al inicio, reproducir o
// pausar, y el tiempo actual frente al total
export default function PlaybackControls() {
  const clips = useEditorStore((s) => s.pista.clips)
  const playhead = useEditorStore((s) => s.playhead)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const alternar = useEditorStore((s) => s.alternarReproduccion)
  const irA = useEditorStore((s) => s.irA)
  const total = duracionTotal(clips)
  const vacio = total === 0

  return (
    <div className="flex items-center justify-center gap-4 border-t border-black/10 px-4 py-2.5 dark:border-white/10">
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
        className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-40"
      >
        <Icon name={reproduciendo ? 'pausa' : 'play'} size={20} />
      </button>
      <div className="min-w-[104px] text-center font-mono text-sm tabular-nums text-[color:var(--muted)]">
        {formatearDuracion(playhead)} / {formatearDuracion(total)}
      </div>
    </div>
  )
}
