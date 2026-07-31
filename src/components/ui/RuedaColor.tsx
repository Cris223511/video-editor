import { MouseEvent as ReactMouseEvent, useRef, useState } from 'react'
import { PuntoRueda } from '../../lib/color/ruedas'

// en el modo fino (con Shift) el tirador avanza mucho menos de lo que se mueve el
// cursor, para clavar un color sin pasarse
const SENSIBILIDAD_FINA = 0.14

// rueda de corrección de color de una zona tonal. el tirador va justo bajo el
// cursor, medido desde el centro de la rueda: así arranca donde se hace clic (en
// el centro, si se pulsa el centro) y lo sigue sin pegar saltos. con Shift el
// movimiento se afina desde donde se pulsa, y con doble clic la rueda vuelve al
// centro
export default function RuedaColor({
  etiqueta,
  valor,
  onChange,
  diametro = 92,
}: {
  etiqueta: string
  valor: PuntoRueda
  onChange: (p: PuntoRueda) => void
  diametro?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  // el valor vive en una referencia durante el arrastre porque los eventos de
  // movimiento llegan más rápido de lo que react vuelve a pintar
  const actual = useRef(valor)
  actual.current = valor

  function agarrar(e: ReactMouseEvent) {
    e.preventDefault()
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const radio = rect.width / 2
    const cx = rect.left + radio
    const cy = rect.top + radio
    setArrastrando(true)

    // referencia del modo fino: se guarda dónde estaba el cursor y el valor al
    // pulsar Shift, para afinar desde ahí sin saltos al entrar o salir del modo
    let fino: { x: number; y: number; base: PuntoRueda } | null = null

    const aplicar = (px: number, py: number) => {
      let x = px
      let y = py
      // el tirador no sale del círculo: pasado el borde se queda pegado a él
      const dist = Math.hypot(x, y)
      if (dist > 1) {
        x /= dist
        y /= dist
      }
      const nuevo = { x, y }
      actual.current = nuevo
      onChange(nuevo)
    }

    const mover = (ev: globalThis.MouseEvent) => {
      if (ev.shiftKey) {
        if (!fino) fino = { x: ev.clientX, y: ev.clientY, base: actual.current }
        aplicar(
          fino.base.x + ((ev.clientX - fino.x) / radio) * SENSIBILIDAD_FINA,
          fino.base.y + ((ev.clientY - fino.y) / radio) * SENSIBILIDAD_FINA,
        )
        return
      }
      fino = null
      // posición del cursor respecto al centro de la rueda, normalizada al radio
      aplicar((ev.clientX - cx) / radio, (ev.clientY - cy) / radio)
    }

    const soltar = () => {
      setArrastrando(false)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const centrada = Math.abs(valor.x) < 0.001 && Math.abs(valor.y) < 0.001

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        onMouseDown={agarrar}
        onDoubleClick={() => onChange({ x: 0, y: 0 })}
        title="Arrastra para corregir. Shift afina el movimiento y el doble clic la devuelve al centro"
        className={[
          'relative rounded-full transition-shadow duration-200',
          arrastrando ? 'cursor-grabbing shadow-[0_0_0_2px_rgb(24_97_255)]' : 'cursor-grab',
        ].join(' ')}
        style={{
          width: diametro,
          height: diametro,
          background: `
            radial-gradient(circle at center, rgb(255 255 255 / 0.92) 0%, rgb(255 255 255 / 0) 62%),
            conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)
          `,
        }}
      >
        {/* cruz central para saber dónde está el punto sin corrección */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-black/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-2 -translate-x-1/2 -translate-y-1/2 bg-black/25" />

        <div
          className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,.5)]"
          style={{
            left: `${50 + valor.x * 50}%`,
            top: `${50 + valor.y * 50}%`,
            transform: 'translate(-50%, -50%)',
            background: centrada ? 'transparent' : 'rgb(0 0 0 / 0.25)',
          }}
        />
      </div>
      <span className="text-[13px] font-medium text-[color:var(--muted)]">{etiqueta}</span>
    </div>
  )
}
