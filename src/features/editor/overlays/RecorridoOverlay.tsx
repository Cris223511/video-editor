import { MouseEvent as ReactMouseEvent } from 'react'
import { Capa } from '../../../types/layers'
import { useEditorStore } from '../../../store/useEditorStore'

interface Rect {
  ox: number
  oy: number
  w: number
  h: number
}

// dibuja el recorrido grabado de una capa sobre el visor y deja retocarlo. la
// línea muestra por dónde pasa el elemento a lo largo del tiempo, y cada nodo se
// puede arrastrar para corregir el trazo o borrar con doble clic
export default function RecorridoOverlay({
  capa,
  rect,
  normalizar,
}: {
  capa: Capa
  rect: Rect
  normalizar: (ev: globalThis.MouseEvent) => { x: number; y: number }
}) {
  const moverKeyframe = useEditorStore((s) => s.moverKeyframe)
  const quitarKeyframe = useEditorStore((s) => s.quitarKeyframe)
  const playhead = useEditorStore((s) => s.playhead)

  const k = capa.keyframes
  if (k.length < 1) return null

  function agarrar(e: ReactMouseEvent, indice: number) {
    e.stopPropagation()
    e.preventDefault()
    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      moverKeyframe(capa.id, indice, p.x, p.y)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const aPantalla = (p: { x: number; y: number }) => ({
    cx: rect.ox + p.x * rect.w,
    cy: rect.oy + p.y * rect.h,
  })

  const trazo = k.map((p) => `${aPantalla(p).cx},${aPantalla(p).cy}`).join(' ')
  // instante del recorrido en el que está el cabezal, para saber qué tramo se
  // está viendo mientras se retoca
  const tRel = playhead - capa.inicio

  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
      {/* la línea va doble: una oscura debajo para que se vea sobre imágenes
          claras, y la de color encima */}
      <polyline points={trazo} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth={4} strokeLinejoin="round" />
      <polyline
        points={trazo}
        fill="none"
        stroke="#ff3ba7"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray="6 4"
      />

      {k.map((p, i) => {
        const { cx, cy } = aPantalla(p)
        // el nodo por el que pasa el cabezal se resalta
        const actual = i < k.length - 1 ? tRel >= p.t && tRel < k[i + 1].t : tRel >= p.t
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={actual ? 6 : 4}
            fill={actual ? '#ff3ba7' : '#fff'}
            stroke={actual ? '#fff' : '#ff3ba7'}
            strokeWidth={2}
            className="pointer-events-auto cursor-grab"
            onMouseDown={(e) => agarrar(e, i)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              quitarKeyframe(capa.id, i)
            }}
          >
            <title>{`Punto ${i + 1} · segundo ${p.t.toFixed(2)}`}</title>
          </circle>
        )
      })}
    </svg>
  )
}
