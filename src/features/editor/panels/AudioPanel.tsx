import { AudioLines, Copy, Trash2, Volume2, VolumeX } from 'lucide-react'
import { ReactNode } from 'react'
import Tooltip from '../../../components/ui/Tooltip'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador } from '../../../components/ui/Controls'

// dato que viaja al arrastrar una franja de volumen desde el panel hasta el carril de audio de la
// línea de tiempo. al soltarla, la franja nace justo donde cayó el cursor
export const TIPO_FRANJA = 'application/x-ve-franja'

// botón cuadrado con solo un icono y su nombre en el tooltip, para no llenar el panel de botones
// largos con texto
function BotonIcono({
  etiqueta,
  onClick,
  activo = false,
  peligro = false,
  children,
}: {
  etiqueta: string
  onClick: () => void
  activo?: boolean
  peligro?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip texto={etiqueta} lado="abajo">
      <button
        type="button"
        onClick={onClick}
        aria-label={etiqueta}
        aria-pressed={activo}
        className={[
          'grid h-9 w-9 place-items-center rounded-lg border transition-colors',
          activo
            ? 'border-brand bg-brand/10 text-brand'
            : peligro
              ? 'border-black/10 text-[color:var(--muted)] hover:border-rose-500 hover:text-rose-500 dark:border-white/10'
              : 'border-black/10 text-[color:var(--muted)] hover:border-brand hover:text-brand dark:border-white/10',
        ].join(' ')}
      >
        {children}
      </button>
    </Tooltip>
  )
}

// niveles de volumen de un solo toque para una franja
const ATAJOS_VOLUMEN = [0, 50, 100, 150]

// panel de audio. arriba va el audio del clip de video elegido, luego el volumen general del
// proyecto, y al final las franjas de volumen. una franja no se crea con un botón sino arrastrando
// su icono hasta el carril de audio, y al elegir una se editan solo sus valores
export default function AudioPanel() {
  const volumenGlobal = useEditorStore((s) => s.volumenGlobal)
  const setVolumenGlobal = useEditorStore((s) => s.setVolumenGlobal)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const actualizarRegionAudio = useEditorStore((s) => s.actualizarRegionAudio)
  const quitarRegionAudio = useEditorStore((s) => s.quitarRegionAudio)
  const duplicarRegionAudio = useEditorStore((s) => s.duplicarRegionAudio)
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[color:var(--text)]">Audio de este clip</span>
            {!clip.mudo && (
              <BotonIcono
                etiqueta={clip.silenciado ? 'Quitar el silencio' : 'Silenciar este clip'}
                activo={!!clip.silenciado}
                onClick={() => alternarSilencioClip(clip.id)}
              >
                {clip.silenciado ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </BotonIcono>
            )}
          </div>
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
                  max={Math.max(1, Math.round(Math.min(10, clip.duracion - (clip.fundidoSalida ?? 0)) * 10))}
                  onChange={(v) => setFundido(clip.id, 'entrada', v / 10)}
                />
              </Campo>
              <Campo etiqueta={`Fundido de salida (${(clip.fundidoSalida ?? 0).toFixed(1)} s)`}>
                <Deslizador
                  valor={Math.round((clip.fundidoSalida ?? 0) * 10)}
                  min={0}
                  max={Math.max(1, Math.round(Math.min(10, clip.duracion - (clip.fundidoEntrada ?? 0)) * 10))}
                  onChange={(v) => setFundido(clip.id, 'salida', v / 10)}
                />
              </Campo>
            </>
          )}
        </div>
      )}

      <Campo etiqueta={`Volumen general (${Math.round(volumenGlobal * 100)}%)`}>
        <Deslizador
          valor={Math.round(volumenGlobal * 100)}
          min={0}
          max={200}
          onChange={(v) => setVolumenGlobal(v / 100)}
        />
      </Campo>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
        {/* la franja se arrastra desde aquí hasta el carril de audio. el recuadro es pequeño a
            propósito, un icono con una palabra, sin botones largos */}
        <div className="flex items-center gap-3">
          <Tooltip texto="Arrástrala al carril de audio de la línea de tiempo para marcar un tramo con su propio volumen" lado="abajo">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TIPO_FRANJA, '1')
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className="flex cursor-grab items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:border-brand hover:text-brand active:cursor-grabbing dark:border-white/10"
            >
              <AudioLines size={16} /> Franja
            </div>
          </Tooltip>
          <span className="text-[12px] leading-snug text-[color:var(--muted)]">
            Arrástrala al carril de audio.
          </span>
        </div>

        {region && (
          <div className="flex flex-col gap-4 rounded-xl p-3" style={{ background: 'rgb(var(--border) / 0.06)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[color:var(--text)]">Franja elegida</span>
              <div className="flex gap-1.5">
                <BotonIcono
                  etiqueta={region.ganancia === 0 ? 'Quitar el silencio' : 'Silenciar la franja'}
                  activo={region.ganancia === 0}
                  onClick={() => actualizarRegionAudio(region.id, { ganancia: region.ganancia === 0 ? 1 : 0 })}
                >
                  {region.ganancia === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </BotonIcono>
                <BotonIcono etiqueta="Duplicar la franja" onClick={() => duplicarRegionAudio(region.id)}>
                  <Copy size={15} />
                </BotonIcono>
                <BotonIcono etiqueta="Eliminar la franja" peligro onClick={() => quitarRegionAudio(region.id)}>
                  <Trash2 size={15} />
                </BotonIcono>
              </div>
            </div>
            <Campo etiqueta={`Volumen (${Math.round(region.ganancia * 100)}%)`}>
              <Deslizador
                valor={Math.round(region.ganancia * 100)}
                min={0}
                max={200}
                onChange={(v) => actualizarRegionAudio(region.id, { ganancia: v / 100 })}
              />
            </Campo>
            <div className="flex gap-1.5">
              {ATAJOS_VOLUMEN.map((v) => {
                const activa = Math.round(region.ganancia * 100) === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => actualizarRegionAudio(region.id, { ganancia: v / 100 })}
                    className={[
                      'flex-1 rounded-md border py-1 text-[12px] font-medium tabular-nums transition-colors',
                      activa
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-black/10 text-[color:var(--muted)] hover:border-brand hover:text-brand dark:border-white/10',
                    ].join(' ')}
                  >
                    {v}%
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
