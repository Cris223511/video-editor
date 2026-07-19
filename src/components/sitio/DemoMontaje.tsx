import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { MousePointer2 } from 'lucide-react'

// pasos de la representación. cada uno dura lo que dice y el siguiente arranca
// donde acaba el anterior, así que cambiar una duración no descuadra el resto
const GUION = [
  { hasta: 1.6, texto: 'Traes un archivo desde tu carpeta' },
  { hasta: 3.2, texto: 'Lo sueltas en la línea de tiempo' },
  { hasta: 4.6, texto: 'Colocas el siguiente al lado' },
  { hasta: 6.2, texto: 'Ajustas el color y las transiciones' },
  { hasta: 8.4, texto: 'Reproduces el montaje terminado' },
]
const TOTAL = 8.4

const CLIPS = [
  { izq: 4, ancho: 26, tono: 'linear-gradient(120deg,#2f6bd6,#5aa9ff)', entra: 1.6 },
  { izq: 32, ancho: 22, tono: 'linear-gradient(120deg,#8a5ad6,#c07af0)', entra: 3.2 },
  { izq: 56, ancho: 28, tono: 'linear-gradient(120deg,#1f8a7a,#4fd0b5)', entra: 4.4 },
]

// recorrido del cursor: de la carpeta a la pista, y luego hacia los controles
// el recorrido pasa por encima de cada caja de la carpeta antes de llevársela.
// las tres están en la esquina superior izquierda, así que el cursor las visita
// una a una en lugar de salir del centro con el clip ya cogido
const RUTA = [
  { t: 0, x: 50, y: 50 },
  { t: 0.5, x: 8, y: 16 },
  { t: 1.6, x: 16, y: 70 },
  { t: 2.1, x: 14, y: 16 },
  { t: 3.2, x: 40, y: 70 },
  { t: 3.7, x: 20, y: 16 },
  { t: 4.6, x: 66, y: 70 },
  { t: 5.6, x: 84, y: 32 },
  { t: 6.4, x: 88, y: 40 },
  { t: 8.4, x: 50, y: 86 },
]

function posicion(t: number) {
  for (let i = 0; i < RUTA.length - 1; i++) {
    const a = RUTA[i]
    const b = RUTA[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1)
      // suavizado en los extremos, para que el cursor no arranque ni frene de golpe
      const s = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2
      return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s }
    }
  }
  return RUTA[RUTA.length - 1]
}

// representación de un montaje completo, del archivo suelto al video terminado.
// se reproduce sola en bucle cuando la sección aparece, y se detiene al salir de
// pantalla para no gastar trabajo en algo que nadie está viendo
export default function DemoMontaje() {
  const caja = useRef<HTMLDivElement>(null)
  const visible = useInView(caja, { amount: 0.35 })
  const [t, setT] = useState(0)

  useEffect(() => {
    if (!visible) return
    let raf = 0
    const inicio = performance.now()
    const paso = () => {
      setT(((performance.now() - inicio) / 1000) % TOTAL)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [visible])

  const cursor = posicion(t)
  const pasoActual = GUION.find((g) => t < g.hasta) ?? GUION[GUION.length - 1]
  // se arrastra en los tres tramos que van de la carpeta a la pista, no en los
  // de vuelta a por el siguiente
  const arrastrando =
    (t > 0.5 && t < 1.6) || (t > 2.1 && t < 3.2) || (t > 3.7 && t < 4.6)

  return (
    <div
      ref={caja}
      className="relative overflow-hidden rounded-3xl p-4 shadow-lg sm:p-6"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl sm:aspect-[16/7]"
        style={{ background: 'rgb(var(--border) / 0.05)' }}
      >
        {/* carpeta de origen, arriba a la izquierda */}
        <div className="absolute left-[4%] top-[10%] flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-8 w-12 rounded-md sm:h-10 sm:w-16"
              style={{
                background: CLIPS[i]?.tono,
                opacity: t > CLIPS[i].entra ? 0.25 : 1,
                transition: 'opacity 400ms ease-out',
              }}
            />
          ))}
        </div>

        {/* visor */}
        <div
          className="absolute right-[4%] top-[8%] h-[38%] w-[34%] overflow-hidden rounded-lg"
          style={{ background: '#0b1424' }}
        >
          <div
            className="h-full w-full transition-all duration-700"
            style={{
              background: t > 6.2 ? CLIPS[2].tono : t > 4.4 ? CLIPS[1].tono : CLIPS[0].tono,
              filter: t > 5.4 && t < 6.4 ? 'saturate(1.6) contrast(1.15)' : 'none',
            }}
          />
        </div>

        {/* dos pistas con los clips entrando */}
        <div className="absolute inset-x-[4%] bottom-[14%] flex flex-col gap-1.5">
          {[0, 1].map((pista) => (
            <div
              key={pista}
              className="relative h-7 rounded-md sm:h-9"
              style={{ background: 'rgb(var(--border) / 0.08)' }}
            >
              {CLIPS.filter((_, i) => (pista === 0 ? i !== 1 : i === 1)).map((c, i) => (
                <motion.span
                  key={i}
                  className="absolute top-0 h-full rounded-md"
                  style={{ left: `${c.izq}%`, width: `${c.ancho}%`, background: c.tono }}
                  animate={{
                    opacity: t > c.entra ? 1 : 0,
                    scaleX: t > c.entra ? 1 : 0.4,
                  }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>
          ))}

          {/* cabezal, que recorre la pista en el último tramo */}
          <span
            className="pointer-events-none absolute -top-1 bottom-0 w-px bg-brand"
            style={{
              left: `${t > 6.2 ? ((t - 6.2) / (TOTAL - 6.2)) * 88 + 4 : 4}%`,
              opacity: t > 6.2 ? 1 : 0.25,
            }}
          />
        </div>

        {/* el cursor, con su indicación de arrastre */}
        <span
          className="pointer-events-none absolute z-10 transition-transform"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: `translate(-4px, -2px) scale(${arrastrando ? 0.92 : 1})`,
          }}
        >
          <MousePointer2
            size={20}
            className="text-brand drop-shadow"
            fill="currentColor"
            strokeWidth={1}
          />
          {arrastrando && (
            <span
              className="absolute left-4 top-3 h-5 w-8 rounded"
              style={{ background: CLIPS[t < 1.6 ? 0 : t < 3.2 ? 1 : 2].tono, opacity: 0.75 }}
            />
          )}
        </span>
      </div>

      {/* el pie va cambiando con lo que ocurre arriba */}
      <div className="mt-4 flex items-center gap-3">
        <span className="flex gap-1">
          {GUION.map((g) => (
            <span
              key={g.texto}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: g === pasoActual ? 22 : 7,
                background:
                  g === pasoActual ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.22)',
              }}
            />
          ))}
        </span>
        <p className="text-sm font-medium text-[color:var(--muted)]">{pasoActual.texto}</p>
      </div>
    </div>
  )
}
