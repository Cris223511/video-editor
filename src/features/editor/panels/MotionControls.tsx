import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaBase } from '../../../types/layers'
import { posicionCapa } from '../../../lib/layers/motion'

// controles de movimiento compartidos por las capas que se pueden animar
// (texto, imagen, censura): grabar el recorrido con el cursor, añadir un punto
// en el cabezal o volver a dejar la capa fija
export default function MotionControls({ capa }: { capa: CapaBase }) {
  const playhead = useEditorStore((s) => s.playhead)
  const grabando = useEditorStore((s) => s.grabandoMovimiento)
  const setGrabando = useEditorStore((s) => s.setGrabandoMovimiento)
  const registrarPunto = useEditorStore((s) => s.registrarPunto)
  const quitarMovimiento = useEditorStore((s) => s.quitarMovimiento)

  const puntos = capa.keyframes.length

  return (
    <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Movimiento</span>
        <span className="text-xs text-[color:var(--muted)]">
          {puntos === 0 ? 'fija' : `${puntos} punto${puntos === 1 ? '' : 's'}`}
        </span>
      </div>

      <button
        onClick={() => setGrabando(!grabando)}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
          grabando
            ? 'bg-rose-500 text-white hover:bg-rose-600'
            : 'border border-black/10 hover:border-brand hover:text-brand dark:border-white/10',
        ].join(' ')}
      >
        <Icon name={grabando ? 'pausa' : 'play'} size={16} />
        {grabando ? 'Grabando: arrastra en el visor' : 'Grabar movimiento'}
      </button>

      {grabando && (
        <p className="text-xs leading-relaxed text-[color:var(--muted)]">
          Reproduce el video y arrastra el elemento en el visor siguiendo el recorrido. Cada instante
          se guarda como un punto.
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            const p = posicionCapa(capa, playhead)
            registrarPunto(capa.id, playhead, p.x, p.y)
          }}
          className="flex-1 rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
        >
          Añadir punto aquí
        </button>
        {puntos > 0 && (
          <button
            onClick={() => quitarMovimiento(capa.id)}
            className="flex-1 rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
          >
            Quitar movimiento
          </button>
        )}
      </div>
    </div>
  )
}
