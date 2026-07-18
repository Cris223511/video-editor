import { MouseEvent as ReactMouseEvent, useRef, useState } from 'react'
import {
  agregarPunto,
  evaluar,
  moverPunto,
  PuntoCurva,
  quitarPunto,
} from '../../lib/color/curvas'

const LADO = 168
const MUESTRAS = 48

// editor de curva de color. la diagonal es el punto de partida: cada punto que
// se añade dobla la respuesta de la imagen en ese nivel de luz. se arrastra para
// mover, se hace clic en el fondo para añadir y doble clic sobre un punto para
// quitarlo
export default function EditorCurva({
  puntos,
  color,
  onChange,
}: {
  puntos: PuntoCurva[]
  color: string
  onChange: (p: PuntoCurva[]) => void
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const vivos = useRef(puntos)
  vivos.current = puntos

  // pasa las coordenadas del ratón al espacio de la curva. el eje vertical se
  // invierte porque en pantalla crece hacia abajo y aquí el brillo crece hacia
  // arriba
  function aCurva(ev: { clientX: number; clientY: number }) {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return {
      x: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height)),
    }
  }

  function agarrar(e: ReactMouseEvent, indice: number) {
    e.stopPropagation()
    e.preventDefault()
    setArrastrando(indice)

    const mover = (ev: globalThis.MouseEvent) => {
      const p = aCurva(ev)
      onChange(moverPunto(vivos.current, indice, p.x, p.y))
    }
    const soltar = () => {
      setArrastrando(null)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // el trazo se dibuja muestreando la curva, no uniendo los puntos con rectas,
  // para que se vea la curvatura real que se está aplicando
  const trazo = Array.from({ length: MUESTRAS + 1 }, (_, i) => {
    const x = i / MUESTRAS
    return `${x * LADO},${(1 - evaluar(puntos, x)) * LADO}`
  }).join(' ')

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${LADO} ${LADO}`}
      className="w-full cursor-crosshair rounded-lg"
      style={{ background: 'rgb(var(--border) / 0.08)', aspectRatio: '1 / 1' }}
      onMouseDown={(e) => {
        const p = aCurva(e)
        onChange(agregarPunto(puntos, p.x, p.y))
      }}
    >
      {/* rejilla en tercios, la referencia habitual para leer una curva */}
      {[1, 2].map((i) => (
        <g key={i} stroke="rgb(var(--border) / 0.18)" strokeWidth={1}>
          <line x1={(LADO / 3) * i} y1={0} x2={(LADO / 3) * i} y2={LADO} />
          <line x1={0} y1={(LADO / 3) * i} x2={LADO} y2={(LADO / 3) * i} />
        </g>
      ))}
      <line x1={0} y1={LADO} x2={LADO} y2={0} stroke="rgb(var(--border) / 0.28)" strokeWidth={1} strokeDasharray="3 3" />

      <polyline points={trazo} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

      {puntos.map((p, i) => {
        const fijo = i === 0 || i === puntos.length - 1
        return (
          <circle
            key={i}
            cx={p.x * LADO}
            cy={(1 - p.y) * LADO}
            r={arrastrando === i ? 6 : 4.5}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
            className="cursor-grab"
            onMouseDown={(e) => agarrar(e, i)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (!fijo) onChange(quitarPunto(puntos, i))
            }}
          />
        )
      })}
    </svg>
  )
}
