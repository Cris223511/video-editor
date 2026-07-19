import { useEditorStore } from '../../../store/useEditorStore'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import { Campo, Deslizador } from '../../../components/ui/Controls'
import { formatearDuracion } from '../../../lib/format/duracion'

const PRESETS = [0.25, 0.5, 1, 1.5, 2, 4]

// panel de velocidad del clip seleccionado. al cambiarla se conserva el mismo
// trozo de video y se recalcula cuánto ocupa en la pista
export default function SpeedPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const setVelocidadClip = useEditorStore((s) => s.setVelocidadClip)

  const clip = clips.find((c) => c.id === clipSeleccionado)

  if (!clip) {
    return (
      <SinSeleccion icono="velocidad" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para cambiar a qué velocidad se reproduce.
      </SinSeleccion>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta={`Velocidad (${clip.velocidad.toFixed(2)}x)`}>
        <Deslizador
          valor={Math.round(clip.velocidad * 100)}
          min={25}
          max={400}
          onChange={(v) => setVelocidadClip(clip.id, v / 100)}
        />
      </Campo>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setVelocidadClip(clip.id, p)}
            className={[
              'rounded-lg border py-2 text-sm font-medium transition-colors',
              Math.abs(clip.velocidad - p) < 0.001
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
            ].join(' ')}
          >
            {p}x
          </button>
        ))}
      </div>

      <div className="flex justify-between border-t border-black/10 pt-3 text-sm dark:border-white/10">
        <span className="text-[color:var(--muted)]">Duración resultante</span>
        <span>{formatearDuracion(clip.duracion)}</span>
      </div>
    </div>
  )
}
