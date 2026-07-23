import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { rectContenido } from '../../../lib/layers/rect'
import { rectClip, encuadreDe } from '../../../lib/timeline/encuadre'
import { clipEnTiempo } from '../../../lib/timeline/clips'
import { posicionCapa } from '../../../lib/layers/motion'
import { CapaImagen } from '../../../types/layers'

const CERO = { izq: 0, der: 0, arr: 0, aba: 0 }

// acota cada lado del recorte al rango válido, sin cruzar al de enfrente, para
// que quede al menos un mínimo de imagen a la vista. es el mismo criterio que
// aplica el store al recorte del video
function acotarRecorte(base: typeof CERO, cambios: Partial<typeof CERO>): typeof CERO {
  const n = { ...base, ...cambios }
  const MIN = 0.05
  n.izq = Math.max(0, Math.min(1 - MIN - n.der, n.izq))
  n.der = Math.max(0, Math.min(1 - MIN - n.izq, n.der))
  n.arr = Math.max(0, Math.min(1 - MIN - n.aba, n.arr))
  n.aba = Math.max(0, Math.min(1 - MIN - n.arr, n.aba))
  return n
}

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
  const capas = useEditorStore((s) => s.capas)
  const playhead = useEditorStore((s) => s.playhead)
  const resolucion = useEditorStore((s) => s.resolucion)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const recortarClipImagen = useEditorStore((s) => s.recortarClipImagen)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
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

  // la herramienta recorta o bien una imagen elegida, o bien el clip de video
  // bajo el cabezal. la imagen manda si está seleccionada, porque al elegirla se
  // suelta cualquier clip
  const capaImagen = capas.find(
    (c): c is CapaImagen =>
      c.id === capaSeleccionada &&
      c.tipo === 'imagen' &&
      playhead >= c.inicio &&
      playhead < c.inicio + c.duracion,
  )
  // solo se recorta el clip que está elegido y además bajo el cabezal, para que el
  // recuadro caiga sobre el video que de verdad se ve
  const objetivo = !capaImagen && activo && activo.id === clipSeleccionado ? activo : null
  const asset = objetivo ? medios.find((a) => a.id === objetivo.assetId) : null

  const activa = herramienta === 'recortar' && rect.w > 0 && (capaImagen || (objetivo && asset))
  if (!activa) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }

  // caja del objetivo en píxeles del visor, sobre la que se mide el recorte, y el
  // recorte vigente. el video sale de su encuadre; la imagen, de su posición y su
  // tamaño con la proporción natural completa
  let caja: { x: number; y: number; w: number; h: number }
  let rec: typeof CERO
  if (capaImagen) {
    const pos = posicionCapa(capaImagen, playhead)
    const w = capaImagen.anchoRel * rect.w
    // alto con la proporción natural entera, igual que lo pinta el visor
    const asp = capaImagen.anchoNatural > 0 ? capaImagen.anchoNatural / capaImagen.altoNatural : 1
    const h =
      capaImagen.altoRel !== undefined
        ? capaImagen.altoRel * rect.h
        : (capaImagen.anchoRel * aspecto) / (asp || 1) * rect.h
    caja = { x: rect.ox + pos.x * rect.w - w / 2, y: rect.oy + pos.y * rect.h - h / 2, w, h }
    rec = capaImagen.recorte ?? CERO
  } else {
    const enc = encuadreDe(objetivo!)
    const r = rectClip(asset!.ancho, asset!.alto, rect.w, rect.h, enc)
    caja = { x: rect.ox + r.dx, y: rect.oy + r.dy, w: r.dw, h: r.dh }
    rec = objetivo!.recorte ?? CERO
  }

  const crop = {
    x: caja.x + rec.izq * caja.w,
    y: caja.y + rec.arr * caja.h,
    w: caja.w * (1 - rec.izq - rec.der),
    h: caja.h * (1 - rec.arr - rec.aba),
  }

  // guarda el recorte en el objetivo que corresponda: la imagen lo lleva como un
  // campo de la capa (acotado aquí); el clip usa su acción del store, que ya acota
  function aplicarRecorte(cambios: Partial<typeof CERO>) {
    if (capaImagen) actualizarCapa(capaImagen.id, { recorte: acotarRecorte(rec, cambios) })
    else if (objetivo) recortarClipImagen(objetivo.id, cambios)
  }

  // arrastre de un agarre: la posición del cursor en fracción de la caja marca
  // dónde queda el lado que se mueve
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
      // con alt el recorte crece o encoge por los dos costados a la vez, midiendo
      // desde el centro. arrastrar un lado mueve también el de enfrente lo mismo,
      // así que el encuadre se cierra sin descentrarse y hay que apuntar a un solo
      // borde en lugar de ir corrigiendo los dos por turnos
      if (ev.altKey) {
        if (cambios.izq !== undefined) cambios.der = cambios.izq
        if (cambios.der !== undefined && cambios.izq === undefined) cambios.izq = cambios.der
        if (cambios.arr !== undefined) cambios.aba = cambios.arr
        if (cambios.aba !== undefined && cambios.arr === undefined) cambios.arr = cambios.aba
      }
      aplicarRecorte(cambios)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // arrastrar por dentro del recuadro lo desplaza entero sin cambiar su tamaño.
  // los cuatro lados se mueven a la vez el mismo tanto, y el recorrido se topa
  // para que el recorte no se salga de la imagen por ningún borde
  function iniciarMoverRecorte(e: ReactMouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const root = rootRef.current
    if (!root) return
    const inicioX = e.clientX
    const inicioY = e.clientY
    const base = { ...rec }
    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - inicioX) / caja.w
      const dy = (ev.clientY - inicioY) / caja.h
      // el desplazamiento se recorta al hueco que queda a cada lado, así el ancho
      // y el alto del recorte se mantienen exactos mientras se arrastra
      const mx = Math.max(-base.izq, Math.min(base.der, dx))
      const my = Math.max(-base.arr, Math.min(base.aba, dy))
      aplicarRecorte({
        izq: base.izq + mx,
        der: base.der - mx,
        arr: base.arr + my,
        aba: base.aba - my,
      })
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
      {/* zona de agarre del centro: pone la manito y mueve el recorte entero. va
          debajo de los agarres, así que tirar de un borde sigue redimensionando */}
      <div
        onMouseDown={iniciarMoverRecorte}
        title="Arrastra para mover el recorte"
        className="absolute cursor-move"
        style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
      />
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
