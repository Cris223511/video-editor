import { MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { PuntoRueda } from '../../lib/color/ruedas'

// cuánto avanza el tirador respecto a lo que se mueve el ratón. por debajo de 1
// el control se vuelve más lento que el cursor, que es justo lo que hace falta
// para afinar un color sin pasarse
const SENSIBILIDAD = 0.55
const SENSIBILIDAD_FINA = 0.14

// rueda de corrección de color de una zona tonal. al presionar se captura el
// puntero: el cursor desaparece y deja de chocar contra los bordes de la
// pantalla, así que se puede seguir afinando todo lo que haga falta. con Shift
// el movimiento se vuelve mucho más lento, y con doble clic la rueda vuelve al
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
  const [capturado, setCapturado] = useState(false)
  // el valor vive en una referencia durante el arrastre porque los eventos de
  // movimiento llegan más rápido de lo que react vuelve a pintar
  const actual = useRef(valor)
  actual.current = valor

  useEffect(() => {
    if (!capturado) return
    const radio = diametro / 2

    const mover = (ev: globalThis.MouseEvent) => {
      const paso = ev.shiftKey ? SENSIBILIDAD_FINA : SENSIBILIDAD
      let x = actual.current.x + (ev.movementX / radio) * paso
      let y = actual.current.y + (ev.movementY / radio) * paso
      // el tirador no sale del círculo: pasado el borde se queda en él
      const dist = Math.hypot(x, y)
      if (dist > 1) {
        x /= dist
        y /= dist
      }
      const nuevo = { x, y }
      actual.current = nuevo
      onChange(nuevo)
    }

    const soltar = () => {
      setCapturado(false)
      if (document.pointerLockElement) document.exitPointerLock()
    }
    // si el navegador suelta la captura por su cuenta (Esc, cambio de pestaña)
    // hay que enterarse para no quedarse arrastrando a ciegas
    const alCambiarCaptura = () => {
      if (!document.pointerLockElement) setCapturado(false)
    }

    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
    document.addEventListener('pointerlockchange', alCambiarCaptura)
    return () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      document.removeEventListener('pointerlockchange', alCambiarCaptura)
    }
  }, [capturado, diametro, onChange])

  function agarrar(e: ReactMouseEvent) {
    e.preventDefault()
    setCapturado(true)
    // en algunos navegadores devuelve una promesa que se rechaza si el gesto no
    // se considera válido; en ese caso el arrastre sigue funcionando igual, solo
    // que con el cursor a la vista
    const p = ref.current?.requestPointerLock() as unknown as Promise<void> | undefined
    if (p && typeof p.catch === 'function') p.catch(() => {})
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
          capturado ? 'cursor-none shadow-[0_0_0_2px_rgb(var(--brand))]' : 'cursor-grab',
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
