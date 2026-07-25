import { useEditorStore } from '../../../store/useEditorStore'
import { IMPACTOS, DUR_IMPACTO_DEF, FUERZA_IMPACTO_DEF } from '../../../lib/impactos/catalogo'
import { Campo, Deslizador, ColorCampo } from '../../../components/ui/Controls'
import Icon from '../../../components/ui/Icon'

const DUR_DEF = DUR_IMPACTO_DEF
const FUERZA_DEF = FUERZA_IMPACTO_DEF

// editor de la bolita elegida: se cambia el efecto, su color, cuánto dura y qué
// tan brusco es. se abre solo al hacer clic en un impacto de la línea de tiempo
export default function ImpactoEditorPanel() {
  const impactoSeleccionado = useEditorStore((s) => s.impactoSeleccionado)
  const impactos = useEditorStore((s) => s.impactos)
  const actualizarImpacto = useEditorStore((s) => s.actualizarImpacto)
  const quitarImpacto = useEditorStore((s) => s.quitarImpacto)

  const im = impactos.find((x) => x.id === impactoSeleccionado)
  if (!im) return null

  return (
    <div className="flex flex-col gap-4">
      {/* qué efecto hace la bolita: la rejilla de tipos, con el activo resaltado */}
      <div>
        <span className="mb-2 block text-xs font-medium text-[color:var(--muted)]">Efecto:</span>
        <div className="grid grid-cols-2 gap-1.5">
          {IMPACTOS.map((def) => {
            const activo = def.tipo === im.tipo
            return (
              <button
                key={def.tipo}
                onClick={() => actualizarImpacto(im.id, { tipo: def.tipo })}
                title={def.descripcion}
                className={[
                  'rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-all duration-150',
                  activo
                    ? 'bg-brand/10 text-brand ring-2 ring-brand'
                    : 'text-[color:var(--muted)] ring-1 ring-black/10 hover:text-brand hover:ring-brand/50 dark:ring-white/10',
                ].join(' ')}
                style={{ background: activo ? undefined : 'rgb(var(--border) / 0.05)' }}
              >
                {def.nombre}
              </button>
            )
          })}
        </div>
      </div>

      <Campo etiqueta="Color del impacto">
        <ColorCampo valor={im.color} onChange={(v) => actualizarImpacto(im.id, { color: v })} />
      </Campo>

      {/* duración libre, sin imanes que la hagan saltar. doble clic la devuelve al
          valor por defecto (medio segundo) */}
      <Campo etiqueta="Duración" valor={`${im.duracion.toFixed(2).replace('.', ',')} s`}>
        <div onDoubleClick={() => actualizarImpacto(im.id, { duracion: DUR_DEF })} title="Doble clic para restablecer">
          <Deslizador
            valor={im.duracion}
            min={0.1}
            max={5}
            paso={0.01}
            onChange={(v) => actualizarImpacto(im.id, { duracion: v })}
          />
        </div>
      </Campo>

      <Campo etiqueta="Fuerza" valor={`${Math.round(im.intensidad)}%`}>
        <div onDoubleClick={() => actualizarImpacto(im.id, { intensidad: FUERZA_DEF })} title="Doble clic para restablecer">
          <Deslizador
            valor={im.intensidad}
            min={0}
            max={100}
            paso={1}
            onChange={(v) => actualizarImpacto(im.id, { intensidad: v })}
          />
        </div>
      </Campo>

      <button
        onClick={() => quitarImpacto(im.id)}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-red-500 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/10"
      >
        <Icon name="papelera" size={14} /> Quitar este impacto
      </button>
    </div>
  )
}
