import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import { EfectoClip } from '../../../types/timeline'

// valores de partida al añadir el desenfoque: intensidad media y barrido
// horizontal, que es la dirección más habitual en un travelling
const DESENFOQUE_INICIAL: Omit<EfectoClip, 'id'> = {
  tipo: 'desenfoque-movimiento',
  intensidad: 40,
  angulo: 0,
}

// panel de efectos del clip seleccionado. de momento solo el desenfoque de
// movimiento, pero la lista está pensada para encadenar varios efectos: cada uno
// se añade, se regula en vivo y se quita por separado
export default function EffectsPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const agregarEfecto = useEditorStore((s) => s.agregarEfecto)
  const actualizarEfecto = useEditorStore((s) => s.actualizarEfecto)
  const quitarEfecto = useEditorStore((s) => s.quitarEfecto)

  const clip = clips.find((c) => c.id === clipSeleccionado)

  if (!clip) {
    return (
      <SinSeleccion icono="efectos" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para aplicarle efectos como el desenfoque de movimiento.
      </SinSeleccion>
    )
  }

  const efectos = clip.efectos ?? []

  return (
    <div className="flex flex-col gap-4">
      {efectos.length === 0 && (
        <p className="text-[13px] italic leading-relaxed text-[color:var(--muted)]">
          Todavía no hay ningún efecto en este clip. Añade un desenfoque de movimiento para dar
          sensación de velocidad; se combina sin problema con la cámara lenta.
        </p>
      )}

      {efectos.map((e) => {
        if (e.tipo !== 'desenfoque-movimiento') return null
        return (
          <div
            key={e.id}
            className="flex flex-col gap-3 rounded-xl border p-3"
            style={{ borderColor: 'rgb(var(--border) / 0.14)' }}
          >
            <div className="flex items-center gap-2">
              <Icon name="efectos" size={15} className="text-brand" />
              <span className="text-sm font-medium">Desenfoque de movimiento</span>
              <button
                onClick={() => quitarEfecto(clip.id, e.id)}
                aria-label="Quitar efecto"
                className="interactivo -mr-1 ml-auto grid h-7 w-7 place-items-center rounded-lg text-[color:var(--muted)] hover:text-rose-500"
              >
                <Icon name="papelera" size={15} />
              </button>
            </div>

            <Campo etiqueta="Nivel" valor={e.intensidad}>
              <Deslizador
                valor={e.intensidad}
                min={0}
                max={100}
                onChange={(v) => actualizarEfecto(clip.id, e.id, { intensidad: v })}
              />
            </Campo>

            {/* la dirección no va dentro de un Campo porque este usa un label y
                envolver botones en un label reactiva el primero al pulsar los
                demás. un bloque simple con su rótulo evita ese enredo */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[color:var(--muted)]">Dirección</span>
              <Segmentado
                valor={e.angulo >= 45 && e.angulo <= 135 ? 'vertical' : 'horizontal'}
                opciones={[
                  { valor: 'horizontal', etiqueta: 'Horizontal' },
                  { valor: 'vertical', etiqueta: 'Vertical' },
                ]}
                onChange={(v) =>
                  actualizarEfecto(clip.id, e.id, { angulo: v === 'vertical' ? 90 : 0 })
                }
              />
            </div>

            <Campo etiqueta={`Ángulo (${Math.round(e.angulo)}°)`}>
              <Deslizador
                valor={Math.round(e.angulo)}
                min={0}
                max={180}
                onChange={(v) => actualizarEfecto(clip.id, e.id, { angulo: v })}
              />
            </Campo>
          </div>
        )
      })}

      <button
        onClick={() => agregarEfecto(clip.id, { id: crypto.randomUUID(), ...DESENFOQUE_INICIAL })}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="mas" size={16} /> Añadir desenfoque de movimiento
      </button>
    </div>
  )
}
