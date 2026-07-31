import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador } from '../../../components/ui/Controls'

// panel de audio: volumen general del proyecto, el audio del clip de video elegido (volumen,
// fundidos y silencio) y ajustes por franja. cada franja se coloca y recorta en la línea de
// tiempo, y aquí se define su ganancia
export default function AudioPanel() {
  const volumenGlobal = useEditorStore((s) => s.volumenGlobal)
  const setVolumenGlobal = useEditorStore((s) => s.setVolumenGlobal)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const agregarRegionAudio = useEditorStore((s) => s.agregarRegionAudio)
  const actualizarRegionAudio = useEditorStore((s) => s.actualizarRegionAudio)
  const quitarRegionAudio = useEditorStore((s) => s.quitarRegionAudio)
  // el clip de video elegido, para poder tocar SU audio (volumen, fundidos, silencio) desde aquí,
  // igual que se hace con un audio suelto. un video también tiene sonido, así que también se ajusta
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const setVolumenClip = useEditorStore((s) => s.setVolumenClip)
  const setFundido = useEditorStore((s) => s.setFundido)
  const alternarSilencioClip = useEditorStore((s) => s.alternarSilencioClip)
  const clip = clips.find((c) => c.id === clipSeleccionado)

  const region = audioRegiones.find((r) => r.id === regionSeleccionada)

  return (
    <div className="flex flex-col gap-4">
      {/* audio del clip de video elegido: su propio volumen, sus fundidos de entrada y salida y el
          silencio. va arriba del todo porque es lo que el usuario suele venir a tocar al elegir un
          clip. si su audio ya se separó a la pista de sonido, el video queda mudo y se avisa */}
      {clip && (
        <div className="flex flex-col gap-4 rounded-xl p-3" style={{ background: 'rgb(var(--border) / 0.06)' }}>
          <span className="text-xs font-semibold text-[color:var(--text)]">Audio de este clip</span>
          {clip.mudo ? (
            <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
              El sonido de este video se separó a la pista de audio. Ajusta su volumen y sus fundidos
              en ese clip de sonido de abajo.
            </p>
          ) : (
            <>
              <Campo etiqueta={`Volumen (${Math.round((clip.volumen ?? 1) * 100)}%)`}>
                <Deslizador
                  valor={Math.round((clip.volumen ?? 1) * 100)}
                  min={0}
                  max={200}
                  onChange={(v) => setVolumenClip(clip.id, v / 100)}
                />
              </Campo>
              <Campo etiqueta={`Fundido de entrada (${(clip.fundidoEntrada ?? 0).toFixed(1)} s)`}>
                <Deslizador
                  valor={Math.round((clip.fundidoEntrada ?? 0) * 10)}
                  min={0}
                  max={Math.max(1, Math.round((clip.duracion / 2) * 10))}
                  onChange={(v) => setFundido(clip.id, 'entrada', v / 10)}
                />
              </Campo>
              <Campo etiqueta={`Fundido de salida (${(clip.fundidoSalida ?? 0).toFixed(1)} s)`}>
                <Deslizador
                  valor={Math.round((clip.fundidoSalida ?? 0) * 10)}
                  min={0}
                  max={Math.max(1, Math.round((clip.duracion / 2) * 10))}
                  onChange={(v) => setFundido(clip.id, 'salida', v / 10)}
                />
              </Campo>
              <button
                onClick={() => alternarSilencioClip(clip.id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
              >
                <Icon name="audio" size={16} /> {clip.silenciado ? 'Quitar el silencio' : 'Silenciar este clip'}
              </button>
            </>
          )}
        </div>
      )}

      {/* este bloque guarda lo que vale para todo el proyecto. */}
      <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
        Acá manda el sonido de todo el proyecto. También puedes tocar el audio del clip elegido
        arriba, o el de un audio suelto con la barra que aparece sobre la línea de tiempo.
      </p>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
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
