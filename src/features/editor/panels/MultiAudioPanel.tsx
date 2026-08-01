import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador } from '../../../components/ui/Controls'

// audio del clip de video, tanto de UNO suelto como de VARIOS marcados. con un solo clip se
// ajusta su volumen, sus fundidos de entrada y salida y su silencio; con varios, el volumen y el
// silencio caen sobre todo el conjunto a la vez (setVolumenClip y alternarSilencioClip ya reparten
// el cambio con clipsObjetivo). el clip que encabeza marca los valores que se ven
export default function MultiAudioPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const bloques = useEditorStore((s) => s.bloquesSeleccionados)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const setVolumenClip = useEditorStore((s) => s.setVolumenClip)
  const setFundido = useEditorStore((s) => s.setFundido)
  const alternarSilencioClip = useEditorStore((s) => s.alternarSilencioClip)

  const idsConjunto = bloques.filter((id) => clips.some((c) => c.id === id))
  const multi = idsConjunto.length > 1
  // el líder: con varios, el primero del conjunto; con uno, el clip suelto elegido
  const lider = clips.find((c) => c.id === (multi ? idsConjunto[0] : clipSeleccionado))
  if (!lider) return null

  const vol = Math.round((lider.volumen ?? 1) * 100)

  return (
    <div className="flex flex-col gap-4">
      {multi && (
        <div className="rounded-lg bg-brand/10 px-2.5 py-1.5 text-[11px] font-medium text-brand">
          Se aplica a los {idsConjunto.length} clips seleccionados.
        </div>
      )}

      {lider.mudo ? (
        <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
          El sonido de este video se separó a la pista de audio. Ajusta su volumen y sus fundidos en
          ese clip de sonido de abajo.
        </p>
      ) : (
        <>
          <Campo etiqueta={`Volumen (${vol}%)`}>
            <Deslizador valor={vol} min={0} max={200} onChange={(v) => setVolumenClip(lider.id, v / 100)} />
          </Campo>

          {/* los fundidos son de un clip concreto (no hay multi-aplicación), así que solo salen
              cuando hay uno solo elegido */}
          {!multi && (
            <>
              <Campo etiqueta={`Fundido de entrada (${(lider.fundidoEntrada ?? 0).toFixed(1)} s)`}>
                <Deslizador
                  valor={Math.round((lider.fundidoEntrada ?? 0) * 10)}
                  min={0}
                  max={Math.max(1, Math.round((lider.duracion / 2) * 10))}
                  onChange={(v) => setFundido(lider.id, 'entrada', v / 10)}
                />
              </Campo>
              <Campo etiqueta={`Fundido de salida (${(lider.fundidoSalida ?? 0).toFixed(1)} s)`}>
                <Deslizador
                  valor={Math.round((lider.fundidoSalida ?? 0) * 10)}
                  min={0}
                  max={Math.max(1, Math.round((lider.duracion / 2) * 10))}
                  onChange={(v) => setFundido(lider.id, 'salida', v / 10)}
                />
              </Campo>
            </>
          )}

          <button
            onClick={() => alternarSilencioClip(lider.id)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
          >
            <Icon name="audio" size={16} />{' '}
            {lider.silenciado
              ? multi
                ? 'Quitar el silencio'
                : 'Quitar el silencio'
              : multi
                ? 'Silenciar estos clips'
                : 'Silenciar este clip'}
          </button>
        </>
      )}
    </div>
  )
}
