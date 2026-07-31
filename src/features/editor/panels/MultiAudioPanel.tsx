import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador } from '../../../components/ui/Controls'

// audio para la selección múltiple: sube o baja el volumen de todos los clips marcados a
// la vez y los silencia o les devuelve el sonido en bloque. el clip que encabeza el conjunto
// marca el valor que se ve; las acciones caen sobre todo el grupo (setVolumenClip y
// alternarSilencioClip ya reparten el cambio con clipsObjetivo cuando hay varios marcados)
export default function MultiAudioPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const bloques = useEditorStore((s) => s.bloquesSeleccionados)
  const setVolumenClip = useEditorStore((s) => s.setVolumenClip)
  const alternarSilencioClip = useEditorStore((s) => s.alternarSilencioClip)

  const idsClips = bloques.filter((id) => clips.some((c) => c.id === id))
  const lider = clips.find((c) => c.id === idsClips[0])
  if (!lider) return null

  const volLider = Math.round((lider.volumen ?? 1) * 100)

  return (
    <div className="flex flex-col gap-4">
      {/* mismo aviso, mismo estilo que en Efectos y Ajustar colores, para que el panel de conjunto
          se lea igual en todas sus pestañas */}
      <div className="rounded-lg bg-brand/10 px-2.5 py-1.5 text-[11px] font-medium text-brand">
        Se aplica a los {idsClips.length} clips seleccionados.
      </div>
      <Campo etiqueta={`Volumen (${volLider}%)`}>
        <Deslizador
          valor={volLider}
          min={0}
          max={200}
          onChange={(v) => setVolumenClip(lider.id, v / 100)}
        />
      </Campo>
      <button
        onClick={() => alternarSilencioClip(lider.id)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="audio" size={16} />{' '}
        {lider.silenciado ? 'Quitar el silencio' : 'Silenciar estos clips'}
      </button>
    </div>
  )
}
