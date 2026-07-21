import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { AjusteTono } from '../../../types/timeline'
import { Campo, Deslizador } from '../../../components/ui/Controls'
import RuedaColor from '../../../components/ui/RuedaColor'
import EditorCurva from '../../../components/ui/EditorCurva'
import { PuntoRueda, RUEDAS_NEUTRAS, Ruedas } from '../../../lib/color/ruedas'
import { Curvas, CURVAS_NEUTRAS, PuntoCurva } from '../../../lib/color/curvas'

const CANALES: { campo: keyof Curvas; etiqueta: string; color: string }[] = [
  { campo: 'maestra', etiqueta: 'Curva de luz', color: '#8ea4c4' },
  { campo: 'r', etiqueta: 'Curva de rojo', color: '#ff5a5a' },
  { campo: 'g', etiqueta: 'Curva de verde', color: '#3ddc84' },
  { campo: 'b', etiqueta: 'Curva de azul', color: '#4c8dff' },
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
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const setTono = useEditorStore((s) => s.setTono)
  const resetTono = useEditorStore((s) => s.resetTono)

  const clip = clips.find((c) => c.id === clipSeleccionado)

  if (!clip) {
    return (
      <SinSeleccion icono="tono" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para corregir su color con las ruedas y las curvas.
      </SinSeleccion>
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

  // devuelve solo las cuatro curvas a la diagonal, con copias frescas de cada
  // punto para no compartir referencia con la constante neutra. el resto de la
  // corrección de color (exposición, contraste, ruedas...) queda intacto
  function restablecerCurvas() {
    setTono(clip!.id, {
      curvas: {
        maestra: CURVAS_NEUTRAS.maestra.map((p) => ({ ...p })),
        r: CURVAS_NEUTRAS.r.map((p) => ({ ...p })),
        g: CURVAS_NEUTRAS.g.map((p) => ({ ...p })),
        b: CURVAS_NEUTRAS.b.map((p) => ({ ...p })),
      },
    })
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
        <p className="mt-2 text-[13px] italic leading-relaxed text-[color:var(--muted)]">
          Arrastra hacia el color que quieras dar a cada zona. Con <b>Shift</b> el movimiento se
          afina, y con <b>doble clic</b> la rueda vuelve al centro.
        </p>
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Curvas</span>
          <button
            onClick={restablecerCurvas}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
          >
            <Icon name="restablecer" size={14} /> Restablecer curvas
          </button>
        </div>
        {/* las cuatro curvas se muestran a la vez, cada una con su editor. en un
            panel estrecho se apilan y cuando hay ancho de sobra pasan a dos
            columnas gracias al auto-fit de la rejilla */}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          {CANALES.map((c) => (
            <div key={c.campo} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--muted)]">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {c.etiqueta}
              </span>
              <EditorCurva
                puntos={curvas[c.campo]}
                color={c.color}
                onChange={(p) => cambiarCurva(c.campo, p)}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[13px] italic leading-relaxed text-[color:var(--muted)]">
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
