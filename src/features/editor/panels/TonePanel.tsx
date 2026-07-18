import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { AjusteTono } from '../../../types/timeline'
import { Campo, Deslizador } from '../../../components/ui/controls'

const CONTROLES: { campo: keyof AjusteTono; etiqueta: string }[] = [
  { campo: 'exposicion', etiqueta: 'Exposición' },
  { campo: 'contraste', etiqueta: 'Contraste' },
  { campo: 'saturacion', etiqueta: 'Saturación' },
  { campo: 'temperatura', etiqueta: 'Temperatura' },
  { campo: 'tinte', etiqueta: 'Tinte' },
]

// panel de tono del clip seleccionado, al estilo Lumetri. los ajustes se ven en
// vivo en el visor sin perder fluidez
export default function TonePanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const setTono = useEditorStore((s) => s.setTono)
  const resetTono = useEditorStore((s) => s.resetTono)

  const clip = clips.find((c) => c.id === clipSeleccionado)

  if (!clip) {
    return (
      <p className="text-sm leading-relaxed text-[color:var(--muted)]">
        Selecciona un clip en la línea de tiempo para ajustar su tono.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {CONTROLES.map((c) => (
        <Campo key={c.campo} etiqueta={`${c.etiqueta} (${clip.tono[c.campo]})`}>
          <Deslizador
            valor={clip.tono[c.campo]}
            min={-100}
            max={100}
            onChange={(v) => setTono(clip.id, { [c.campo]: v } as Partial<AjusteTono>)}
          />
        </Campo>
      ))}

      <button
        onClick={() => resetTono(clip.id)}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="ajustes" size={16} /> Restablecer tono
      </button>
    </div>
  )
}
