import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador } from '../../../components/ui/Controls'

// panel del clip de audio elegido: su volumen y el fundido de su sonido. el audio
// no lleva transición como el resto de elementos; lo suyo es que el sonido entre y
// salga poco a poco, que es justo lo que gobiernan estos dos deslizadores
export default function AudioClipPanel() {
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const audios = useEditorStore((s) => s.audios)
  const setVolumenAudio = useEditorStore((s) => s.setVolumenAudio)
  const setFundidoAudio = useEditorStore((s) => s.setFundidoAudio)
  const quitarAudio = useEditorStore((s) => s.quitarAudio)

  const audio = audios.find((a) => a.id === regionSeleccionada)
  if (!audio) return null

  // el fundido no puede pasar de la mitad del clip, para que entrada y salida no se
  // pisen; se acota al mostrar y al guardar
  const tope = audio.duracion / 2
  const ent = Math.min(audio.fundidoEntrada ?? 0, tope)
  const sal = Math.min(audio.fundidoSalida ?? 0, tope)

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta={`Volumen (${Math.round((audio.volumen ?? 1) * 100)}%)`}>
        <Deslizador
          valor={Math.round((audio.volumen ?? 1) * 100)}
          min={0}
          max={200}
          onChange={(v) => setVolumenAudio(audio.id, v / 100)}
        />
      </Campo>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="text-sm font-medium">Fundido del sonido</span>
        <Campo etiqueta={`Aparecer (${ent.toFixed(1)} s)`}>
          <Deslizador
            valor={Math.round(ent * 10)}
            min={0}
            max={Math.max(0, Math.round(tope * 10))}
            onChange={(v) => setFundidoAudio(audio.id, { fundidoEntrada: v / 10 })}
          />
        </Campo>
        <Campo etiqueta={`Desaparecer (${sal.toFixed(1)} s)`}>
          <Deslizador
            valor={Math.round(sal * 10)}
            min={0}
            max={Math.max(0, Math.round(tope * 10))}
            onChange={(v) => setFundidoAudio(audio.id, { fundidoSalida: v / 10 })}
          />
        </Campo>
      </div>

      <button
        onClick={() => quitarAudio(audio.id)}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
      >
        <Icon name="papelera" size={16} /> Quitar audio
      </button>
    </div>
  )
}
