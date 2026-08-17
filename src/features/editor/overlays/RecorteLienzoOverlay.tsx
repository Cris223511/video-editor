import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'

// proporciones a las que se imanta el recuadro, con su etiqueta para la guía. son las mismas del
// panel, más sus recíprocas, para que tanto apaisado como vertical encuentren su forma redonda
const PROPORCIONES: { r: number; etq: string }[] = [
  { r: 16 / 9, etq: '16:9' },
  { r: 9 / 16, etq: '9:16' },
  { r: 1, etq: '1:1' },
  { r: 4 / 5, etq: '4:5' },
  { r: 5 / 4, etq: '5:4' },
  { r: 4 / 3, etq: '4:3' },
  { r: 3 / 4, etq: '3:4' },
]

// tamaño mínimo del recuadro en fracción del lienzo, para que no se pueda achicar hasta cero
const MIN_FRAC = 0.08

// los ocho tiradores: las cuatro esquinas y los cuatro lados. cada uno mueve los bordes que le tocan
type Tirador = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
const TIRADORES: { id: Tirador; cx: number; cy: number; cursor: string }[] = [
  { id: 'nw', cx: 0, cy: 0, cursor: 'nwse-resize' },
  { id: 'ne', cx: 1, cy: 0, cursor: 'nesw-resize' },
  { id: 'sw', cx: 0, cy: 1, cursor: 'nesw-resize' },
  { id: 'se', cx: 1, cy: 1, cursor: 'nwse-resize' },
  { id: 'n', cx: 0.5, cy: 0, cursor: 'ns-resize' },
  { id: 's', cx: 0.5, cy: 1, cursor: 'ns-resize' },
  { id: 'e', cx: 1, cy: 0.5, cursor: 'ew-resize' },
  { id: 'w', cx: 0, cy: 0.5, cursor: 'ew-resize' },
]

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

// overlay del recorte del lienzo: se pinta sobre el visor mientras el modo está activo. deja
// arrastrar un recuadro (y sus tiradores) sobre la vista previa; al aceptar, esa región pasa a ser
// el nuevo lienzo y el contenido se reproyecta para conservar lo que se veía dentro. clic afuera o
// el botón del visto lo aceptan; Esc o la cruz lo cancelan
export default function RecorteLienzoOverlay() {
  const rect = useEditorStore((s) => s.recorteLienzo)
  const setRect = useEditorStore((s) => s.setRecorteLienzo)
  const resolucion = useEditorStore((s) => s.resolucion)
  const setLienzo = useEditorStore((s) => s.setLienzo)
  const actualizarEncuadre = useEditorStore((s) => s.actualizarEncuadre)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const medios = useProjectStore((s) => s.medios)

  const ref = useRef<HTMLDivElement>(null)
  // proporción a la que se acaba de imantar el recuadro, para enseñar su etiqueta un momento
  const [guia, setGuia] = useState<string | null>(null)
  const arrastre = useRef<{ modo: 'mover' | Tirador; x0: number; y0: number; rect: { x: number; y: number; w: number; h: number } } | null>(null)

  // Esc cancela el recorte estando activo
  useEffect(() => {
    if (!rect) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRect(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rect, setRect])

  if (!rect) return null

  const W = resolucion.ancho
  const H = resolucion.alto

  // imanta la proporción del recuadro (en píxeles reales del lienzo) a la común más cercana. si
  // ninguna queda a tiro devuelve el alto tal cual y no muestra guía. mueve el ALTO para clavar la
  // forma, tomando el ancho como fijo
  function imantar(w: number, h: number): { h: number; etq: string | null } {
    const prPx = (w * W) / (h * H)
    let mejor: { r: number; etq: string } | null = null
    let dif = 0.05 // tolerancia relativa
    for (const p of PROPORCIONES) {
      const d = Math.abs(prPx - p.r) / p.r
      if (d < dif) { dif = d; mejor = p }
    }
    if (!mejor) return { h, etq: null }
    // h tal que (w*W)/(h*H) = r  ->  h = (w*W)/(r*H)
    return { h: (w * W) / (mejor.r * H), etq: mejor.etq }
  }

  function alSoltar() {
    arrastre.current = null
    setGuia(null)
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('pointerup', alSoltar)
  }

  function alMover(ev: PointerEvent) {
    const st = arrastre.current
    const caja = ref.current
    if (!st || !caja) return
    const r = caja.getBoundingClientRect()
    const dx = (ev.clientX - st.x0) / r.width
    const dy = (ev.clientY - st.y0) / r.height
    const b = st.rect
    let nx = b.x, ny = b.y, nw = b.w, nh = b.h
    let etq: string | null = null

    if (st.modo === 'mover') {
      nx = clamp01(b.x + dx > 1 - b.w ? 1 - b.w : Math.max(0, b.x + dx))
      ny = clamp01(b.y + dy > 1 - b.h ? 1 - b.h : Math.max(0, b.y + dy))
    } else {
      const m = st.modo
      // cada tirador mueve el borde que le toca, sin dejar que crucen el mínimo
      if (m.includes('w')) { const x1 = b.x + b.w; nx = Math.min(x1 - MIN_FRAC, Math.max(0, b.x + dx)); nw = x1 - nx }
      if (m.includes('e')) { nw = Math.min(1 - b.x, Math.max(MIN_FRAC, b.w + dx)) }
      if (m.includes('n')) { const y1 = b.y + b.h; ny = Math.min(y1 - MIN_FRAC, Math.max(0, b.y + dy)); nh = y1 - ny }
      if (m.includes('s')) { nh = Math.min(1 - b.y, Math.max(MIN_FRAC, b.h + dy)) }
      // al mover una esquina o los lados verticales, se intenta clavar una proporción conocida
      const im = imantar(nw, nh)
      if (im.etq && im.h >= MIN_FRAC && ny + im.h <= 1.0001) {
        // si se está arrastrando desde arriba, el alto crece hacia arriba; si no, hacia abajo
        if (m.includes('n')) ny = (b.y + b.h) - im.h
        nh = im.h
        etq = im.etq
      }
    }
    setRect({ x: clamp01(nx), y: clamp01(ny), w: nw, h: nh })
    setGuia(etq)
  }

  function iniciar(modo: 'mover' | Tirador, ev: React.PointerEvent) {
    ev.preventDefault()
    ev.stopPropagation()
    arrastre.current = { modo, x0: ev.clientX, y0: ev.clientY, rect: { ...rect! } }
    window.addEventListener('pointermove', alMover)
    window.addEventListener('pointerup', alSoltar)
  }

  // aplica el recorte: la región elegida pasa a ser el lienzo y todo lo de dentro se reproyecta
  // para que se vea igual. el video mantiene su tamaño en píxeles y su posición relativa; las capas
  // conservan sus píxeles (lo hace setLienzo) y se reubican al nuevo marco
  function aplicar() {
    const r = rect!
    const nW = Math.max(240, Math.min(3840, Math.round(r.w * W)))
    const nH = Math.max(240, Math.min(3840, Math.round(r.h * H)))
    // se calculan los encuadres nuevos ANTES de tocar el lienzo, desde los valores actuales
    const nuevos = clips
      .map((c) => {
        const med = medios.find((m) => m.id === c.assetId)
        if (!med) return null
        const e = c.encuadre ?? { x: 0.5, y: 0.5, escala: 1 }
        const baseV = Math.min(W / med.ancho, H / med.alto)
        const baseN = Math.min(nW / med.ancho, nH / med.alto)
        return {
          id: c.id,
          enc: {
            x: (e.x - r.x) / r.w,
            y: (e.y - r.y) / r.h,
            escala: e.escala * (baseV / baseN),
            rotacion: e.rotacion,
            espejoH: e.espejoH,
            espejoV: e.espejoV,
          },
        }
      })
      .filter((v): v is { id: string; enc: NonNullable<typeof v>['enc'] } => v !== null)
    const capasReub = capas.map((c) => ({ id: c.id, x: (c.x - r.x) / r.w, y: (c.y - r.y) / r.h }))

    setLienzo(nW, nH)
    nuevos.forEach((n) => actualizarEncuadre(n.id, n.enc))
    capasReub.forEach((c) => actualizarCapa(c.id, { x: c.x, y: c.y }))
    setRect(null)
  }

  const pct = (v: number) => `${v * 100}%`

  return (
    // capa a pantalla completa del visor. el fondo oscuro fuera del recuadro se hace con un borde
    // enorme y semitransparente en el propio recuadro (box-shadow), así se ve qué zona se conserva.
    // un clic en esta capa (fuera del recuadro) acepta el recorte, como se pidió
    <div ref={ref} className="absolute inset-0 z-40" onPointerDown={() => aplicar()}>
      <div
        className="absolute cursor-move"
        style={{
          left: pct(rect.x),
          top: pct(rect.y),
          width: pct(rect.w),
          height: pct(rect.h),
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          outline: '2px solid rgb(24 97 255)',
        }}
        onPointerDown={(e) => iniciar('mover', e)}
      >
        {/* rejilla de tercios, la referencia clásica para encuadrar */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
        </div>

        {/* la etiqueta de la proporción a la que se acaba de imantar */}
        {guia && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-brand px-2 py-0.5 text-[11px] font-semibold text-white shadow">
            {guia}
          </div>
        )}

        {/* los ocho tiradores */}
        {TIRADORES.map((t) => (
          <span
            key={t.id}
            onPointerDown={(e) => iniciar(t.id, e)}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-white shadow"
            style={{ left: pct(t.cx), top: pct(t.cy), cursor: t.cursor }}
          />
        ))}
      </div>

      {/* controles: aceptar o cancelar, flotando abajo. no dejan pasar el clic al fondo */}
      <div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setRect(null)}
          className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/75"
        >
          <X size={15} /> Cancelar
        </button>
        <button
          onClick={aplicar}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white shadow transition-colors hover:brightness-110"
        >
          <Check size={15} /> Aplicar recorte
        </button>
      </div>
    </div>
  )
}
