import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { rectContenido } from '../../../lib/layers/rect'
import { rectClip, encuadreDe } from '../../../lib/timeline/encuadre'
import { clipEnTiempo } from '../../../lib/timeline/clips'

const CERO = { izq: 0, der: 0, arr: 0, aba: 0 }

// los ocho agarres del recuadro de recorte y qué lados mueve cada uno. las
// esquinas tocan dos lados a la vez; los del medio, solo el suyo
type Lado = 'izq' | 'der' | 'arr' | 'aba'
const AGARRES: { id: string; lados: Lado[]; x: number; y: number; cursor: string }[] = [
  { id: 'nw', lados: ['arr', 'izq'], x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', lados: ['arr'], x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', lados: ['arr', 'der'], x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', lados: ['der'], x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', lados: ['aba', 'der'], x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', lados: ['aba'], x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', lados: ['aba', 'izq'], x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', lados: ['izq'], x: 0, y: 0.5, cursor: 'ew-resize' },
]

// capa de recorte que sale sobre el visor cuando la herramienta de recortar está
// activa y hay un video seleccionado bajo el cabezal. muestra el recuadro que se
// conserva con líneas blancas finas, oscurece lo que queda fuera, y por sus
// agarres se ajusta cada lado. lo que se recorta se ve igual en el archivo
export default function RecorteOverlay() {
  const herramienta = useEditorStore((s) => s.herramienta)
  const clips = useEditorStore((s) => s.pista.clips)
  const playhead = useEditorStore((s) => s.playhead)
  const resolucion = useEditorStore((s) => s.resolucion)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const recortarClipImagen = useEditorStore((s) => s.recortarClipImagen)
  const medios = useProjectStore((s) => s.medios)

  const rootRef = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observar = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }))
    observar.observe(el)
    setTam({ w: el.clientWidth, h: el.clientHeight })
    return () => observar.disconnect()
  }, [])

  const aspecto = resolucion.ancho / resolucion.alto
  const rect = rectContenido(tam.w, tam.h, aspecto)

  const ocultas = useMemo(() => {
    const set = new Set<number>()
    pistasMeta.forEach((m, i) => {
      if (m.oculta) set.add(i)
    })
    return set
  }, [pistasMeta])
  const ordenados = useMemo(() => [...clips].sort((a, b) => a.inicio - b.inicio), [clips])
  const activo = clipEnTiempo(ordenados, playhead, ocultas)

  // solo se recorta el clip que está elegido y además bajo el cabezal, para que el
  // recuadro caiga sobre el video que de verdad se ve
  const objetivo = activo && activo.id === clipSeleccionado ? activo : null
  const asset = objetivo ? medios.find((a) => a.id === objetivo.assetId) : null

  if (herramienta !== 'recortar' || !objetivo || !asset || rect.w === 0) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }

  const enc = encuadreDe(objetivo)
  const r = rectClip(asset.ancho, asset.alto, rect.w, rect.h, enc)
  // caja del video en píxeles del visor, sobre la que se mide el recorte
  const caja = { x: rect.ox + r.dx, y: rect.oy + r.dy, w: r.dw, h: r.dh }
  const rec = objetivo.recorte ?? CERO

  const crop = {
    x: caja.x + rec.izq * caja.w,
    y: caja.y + rec.arr * caja.h,
    w: caja.w * (1 - rec.izq - rec.der),
    h: caja.h * (1 - rec.arr - rec.aba),
  }

  // arrastre de un agarre: la posición del cursor en fracción de la caja marca
  // dónde queda el lado que se mueve. el store se encarga de acotar cada valor
  function iniciar(e: ReactMouseEvent, lados: Lado[]) {
    e.stopPropagation()
    e.preventDefault()
    const root = rootRef.current
    if (!root) return
    const rr = root.getBoundingClientRect()
    const mover = (ev: globalThis.MouseEvent) => {
      const fx = (ev.clientX - rr.left - caja.x) / caja.w
      const fy = (ev.clientY - rr.top - caja.y) / caja.h
      const cambios: Partial<typeof CERO> = {}
      for (const lado of lados) {
        if (lado === 'izq') cambios.izq = fx
        if (lado === 'der') cambios.der = 1 - fx
        if (lado === 'arr') cambios.arr = fy
        if (lado === 'aba') cambios.aba = 1 - fy
      }
      recortarClipImagen(objetivo!.id, cambios)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div ref={rootRef} className="absolute inset-0 z-40">
      {/* el recuadro que se conserva, con su borde blanco fino. el oscurecido de
          alrededor lo pinta una sombra enorme proyectada hacia afuera, un truco
          clásico para tapar todo menos el hueco del recorte */}
      <div
        className="pointer-events-none absolute border border-white/90"
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.w,
          height: crop.h,
          boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* guías de tercios, finísimas, para encuadrar como en una cámara */}
        <div className="absolute inset-0">
          <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
        </div>
      </div>

      {/* agarres blancos por lados y esquinas */}
      {AGARRES.map((a) => (
        <div
          key={a.id}
          onMouseDown={(e) => iniciar(e, a.lados)}
          className="absolute h-3 w-3 rounded-[2px] border border-black/30 bg-white shadow-sm"
          style={{
            left: crop.x + a.x * crop.w,
            top: crop.y + a.y * crop.h,
            transform: 'translate(-50%, -50%)',
            cursor: a.cursor,
          }}
        />
      ))}
    </div>
  )
}
