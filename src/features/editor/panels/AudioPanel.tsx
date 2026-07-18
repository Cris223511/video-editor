import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador } from '../../../components/ui/controls'

// panel de audio: volumen general del proyecto y ajustes por franja. cada franja
// se coloca y recorta en la línea de tiempo, y aquí se define su ganancia
export default function AudioPanel() {
  const volumenGlobal = useEditorStore((s) => s.volumenGlobal)
  const setVolumenGlobal = useEditorStore((s) => s.setVolumenGlobal)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const agregarRegionAudio = useEditorStore((s) => s.agregarRegionAudio)
  const actualizarRegionAudio = useEditorStore((s) => s.actualizarRegionAudio)
  const quitarRegionAudio = useEditorStore((s) => s.quitarRegionAudio)

  const region = audioRegiones.find((r) => r.id === regionSeleccionada)

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta={`Volumen general (${Math.round(volumenGlobal * 100)}%)`}>
        <Deslizador
          valor={Math.round(volumenGlobal * 100)}
          min={0}
          max={200}
          onChange={(v) => setVolumenGlobal(v / 100)}
        />
      </Campo>
      <button
        onClick={() => setVolumenGlobal(volumenGlobal === 0 ? 1 : 0)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="audio" size={16} /> {volumenGlobal === 0 ? 'Quitar silencio' : 'Silenciar todo'}
      </button>

      <div className="border-t border-black/10 pt-3 dark:border-white/10">
        <button
          onClick={agregarRegionAudio}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          <Icon name="mas" size={16} /> Añadir franja de volumen
        </button>

        {!region ? (
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
            Añade una franja y colócala en la línea de tiempo para subir o silenciar el volumen solo
            en ese tramo del video.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <Campo etiqueta={`Volumen de la franja (${Math.round(region.ganancia * 100)}%)`}>
              <Deslizador
                valor={Math.round(region.ganancia * 100)}
                min={0}
                max={200}
                onChange={(v) => actualizarRegionAudio(region.id, { ganancia: v / 100 })}
              />
            </Campo>
            <button
              onClick={() => actualizarRegionAudio(region.id, { ganancia: 0 })}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
            >
              <Icon name="audio" size={16} /> Silenciar esta franja
            </button>
            <button
              onClick={() => quitarRegionAudio(region.id)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
            >
              <Icon name="papelera" size={16} /> Eliminar franja
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
