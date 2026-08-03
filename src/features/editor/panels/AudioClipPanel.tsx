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

  // cada fundido llega hasta 10 s; si el clip dura menos, manda el clip; y no pasa de lo que deja
  // libre el otro lado, para que aparecer y desaparecer no se pisen
  const ent0 = audio.fundidoEntrada ?? 0
  const sal0 = audio.fundidoSalida ?? 0
  const topeEnt = Math.min(10, audio.duracion - sal0)
  const topeSal = Math.min(10, audio.duracion - ent0)
  const ent = Math.min(ent0, topeEnt)
  const sal = Math.min(sal0, topeSal)

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
            max={Math.max(0, Math.round(topeEnt * 10))}
            onChange={(v) => setFundidoAudio(audio.id, { fundidoEntrada: v / 10 })}
          />
        </Campo>
        <Campo etiqueta={`Desaparecer (${sal.toFixed(1)} s)`}>
          <Deslizador
            valor={Math.round(sal * 10)}
            min={0}
            max={Math.max(0, Math.round(topeSal * 10))}
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
