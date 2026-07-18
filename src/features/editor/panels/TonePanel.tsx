import { useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { AjusteTono } from '../../../types/timeline'
import { Campo, Deslizador } from '../../../components/ui/Controls'
import RuedaColor from '../../../components/ui/RuedaColor'
import EditorCurva from '../../../components/ui/EditorCurva'
import { PuntoRueda, RUEDAS_NEUTRAS, Ruedas } from '../../../lib/color/ruedas'
import { Curvas, CURVAS_NEUTRAS, PuntoCurva } from '../../../lib/color/curvas'

const CANALES: { campo: keyof Curvas; etiqueta: string; color: string }[] = [
  { campo: 'maestra', etiqueta: 'Luz', color: '#8ea4c4' },
  { campo: 'r', etiqueta: 'Rojo', color: '#ff5a5a' },
  { campo: 'g', etiqueta: 'Verde', color: '#3ddc84' },
  { campo: 'b', etiqueta: 'Azul', color: '#4c8dff' },
]

const ZONAS: { campo: keyof Ruedas; etiqueta: string }[] = [
  { campo: 'sombras', etiqueta: 'Sombras' },
  { campo: 'medios', etiqueta: 'Medios' },
  { campo: 'altas', etiqueta: 'Luces' },
]

// solo los ajustes numéricos; ruedas y curvas tienen sus propios controles
type CampoNumerico = Exclude<keyof AjusteTono, 'ruedas' | 'curvas'>

const CONTROLES: { campo: CampoNumerico; etiqueta: string }[] = [
  { campo: 'exposicion', etiqueta: 'Exposición' },
  { campo: 'contraste', etiqueta: 'Contraste' },
  { campo: 'saturacion', etiqueta: 'Saturación' },
  { campo: 'temperatura', etiqueta: 'Temperatura' },
  { campo: 'tinte', etiqueta: 'Tinte' },
]

// panel de tono del clip seleccionado, al estilo Lumetri. los ajustes se ven en
// vivo en el visor sin perder fluidez
export default function TonePanel() {
  // canal de curva que se está editando; se conserva al cambiar de clip
  const [canal, setCanal] = useState<keyof Curvas>('maestra')
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

  const ruedas = clip.tono.ruedas ?? RUEDAS_NEUTRAS
  const curvas = clip.tono.curvas ?? CURVAS_NEUTRAS

  function cambiarRueda(zona: keyof Ruedas, p: PuntoRueda) {
    setTono(clip!.id, { ruedas: { ...ruedas, [zona]: p } })
  }

  function cambiarCurva(c: keyof Curvas, p: PuntoCurva[]) {
    setTono(clip!.id, { curvas: { ...curvas, [c]: p } })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Ruedas de color</span>
        </div>
        <div className="flex justify-between gap-2">
          {ZONAS.map((z) => (
            <RuedaColor
              key={z.campo}
              etiqueta={z.etiqueta}
              valor={ruedas[z.campo]}
              onChange={(p) => cambiarRueda(z.campo, p)}
              diametro={78}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] italic leading-relaxed text-[color:var(--muted)]">
          Arrastra hacia el color que quieras dar a cada zona. Con <b>Shift</b> el movimiento se
          afina, y con <b>doble clic</b> la rueda vuelve al centro.
        </p>
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Curvas</span>
          <div className="flex gap-1">
            {CANALES.map((c) => (
              <button
                key={c.campo}
                onClick={() => setCanal(c.campo)}
                className={[
                  'rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-200',
                  canal === c.campo ? 'text-white' : 'interactivo text-[color:var(--muted)]',
                ].join(' ')}
                style={canal === c.campo ? { background: c.color } : undefined}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <EditorCurva
          puntos={curvas[canal]}
          color={CANALES.find((c) => c.campo === canal)!.color}
          onChange={(p) => cambiarCurva(canal, p)}
        />
        <p className="mt-2 text-[11px] italic leading-relaxed text-[color:var(--muted)]">
          Haz clic para añadir un punto, arrástralo para doblar la curva y dale{' '}
          <b>doble clic</b> para quitarlo.
        </p>
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

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
