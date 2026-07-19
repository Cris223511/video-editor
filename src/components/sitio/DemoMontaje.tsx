import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { MousePointer2, Type } from 'lucide-react'

// el guion completo, con lo que ocurre en cada tramo. cada paso arranca donde
// acaba el anterior, así que cambiar una duración no descuadra el resto
const GUION = [
  { hasta: 1.6, texto: 'Traes un archivo desde tu carpeta' },
  { hasta: 3.2, texto: 'Colocas el siguiente al lado' },
  { hasta: 4.6, texto: 'Y el tercero en otro nivel' },
  { hasta: 5.8, texto: 'Estiras un clip para ajustar su duración' },
  { hasta: 7.2, texto: 'Añades un rótulo sobre la imagen' },
  { hasta: 10, texto: 'Reproduces el montaje terminado' },
]
const TOTAL = 10

const CLIPS = [
  { izq: 2, ancho: 24, pista: 0, entra: 1.6, de: '#2f6bd6', a: '#5aa9ff' },
  { izq: 34, ancho: 20, pista: 0, entra: 3.2, de: '#8a5ad6', a: '#c07af0' },
  { izq: 18, ancho: 22, pista: 1, entra: 4.6, de: '#1f8a7a', a: '#4fd0b5' },
]

// el cursor visita cada caja antes de llevársela, luego tira del borde de un
// clip y por último coloca el rótulo
const RUTA = [
  { t: 0, x: 50, y: 50 },
  { t: 0.5, x: 8, y: 14 },
  { t: 1.6, x: 14, y: 74 },
  { t: 2.1, x: 15, y: 14 },
  { t: 3.2, x: 42, y: 74 },
  { t: 3.7, x: 22, y: 14 },
  { t: 4.6, x: 30, y: 86 },
  { t: 5.0, x: 27, y: 74 },
  { t: 5.8, x: 34, y: 74 },
  { t: 6.4, x: 70, y: 40 },
  { t: 7.2, x: 76, y: 30 },
  { t: 10, x: 50, y: 60 },
]

function posicion(t: number) {
  for (let i = 0; i < RUTA.length - 1; i++) {
    const a = RUTA[i]
    const b = RUTA[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1)
      const s = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2
      return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s }
    }
  }
  return RUTA[RUTA.length - 1]
}

// representación de un montaje completo. el visor muestra un fotograma
// reconocible, con horizonte, sujeto, código de tiempo y el rótulo cuando se
// añade, en lugar de un rectángulo de color que no se entendía
export default function DemoMontaje() {
  const caja = useRef<HTMLDivElement>(null)
  const visible = useInView(caja, { amount: 0.3 })
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
  const arrastrando = (t > 0.5 && t < 1.6) || (t > 2.1 && t < 3.2) || (t > 3.7 && t < 4.6)
  const estirando = t > 5.0 && t < 5.8
  const conRotulo = t > 7.2
  const reproduciendo = t > 7.2

  // el primer clip se alarga mientras el cursor tira de su borde derecho
  const estirado = t < 5.0 ? 0 : t > 5.8 ? 1 : (t - 5.0) / 0.8
  const anchoPrimero = CLIPS[0].ancho + estirado * 8

  const avance = reproduciendo ? (t - 7.2) / (TOTAL - 7.2) : 0
  // qué clip se ve según dónde esté el cabezal
  const enPantalla = avance < 0.45 ? 0 : avance < 0.75 ? 1 : 2
  const clip = CLIPS[enPantalla]
  const cogido = CLIPS[t < 1.6 ? 0 : t < 3.2 ? 1 : 2]

  return (
    <div
      ref={caja}
      className="relative overflow-hidden rounded-3xl p-4 shadow-lg sm:p-6"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl sm:aspect-[16/8]"
        style={{ background: 'rgb(var(--border) / 0.05)' }}
      >
        {/* carpeta de origen: las cajas se apagan conforme se usan */}
        <div className="absolute left-[3%] top-[7%] flex gap-2">
          {CLIPS.map((c, i) => (
            <span
              key={i}
              className="h-8 w-12 rounded-md transition-opacity duration-500 sm:h-9 sm:w-16"
              style={{
                background: `linear-gradient(120deg, ${c.de}, ${c.a})`,
                opacity: t > c.entra ? 0.2 : 1,
              }}
            />
          ))}
        </div>

        {/* visor con un encuadre legible */}
        <div
          className="absolute right-[3%] top-[6%] w-[36%] overflow-hidden rounded-lg shadow-lg"
          style={{ aspectRatio: '16 / 9', background: '#0b1424' }}
        >
          <div
            className="absolute inset-0 transition-all duration-700"
            style={{ background: `linear-gradient(160deg, ${clip.de}, ${clip.a})` }}
          />
          <span
            className="absolute inset-x-0 bottom-0 h-[38%]"
            style={{ background: 'rgb(6 12 24 / 0.55)' }}
          />
          {/* dos montañas y un sol, que dan escala y hacen legible el encuadre */}
          <span
            className="absolute bottom-[32%] left-[12%] h-0 w-0"
            style={{
              borderLeft: '18px solid transparent',
              borderRight: '18px solid transparent',
              borderBottom: '22px solid rgb(6 12 24 / 0.45)',
            }}
          />
          <span
            className="absolute bottom-[32%] left-[40%] h-0 w-0"
            style={{
              borderLeft: '26px solid transparent',
              borderRight: '26px solid transparent',
              borderBottom: '32px solid rgb(6 12 24 / 0.6)',
            }}
          />
          <span
            className="absolute right-[18%] top-[16%] h-3 w-3 rounded-full"
            style={{ background: 'rgb(255 255 255 / 0.75)' }}
          />

          {conRotulo && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-x-2 bottom-2 rounded px-1.5 py-1 text-center text-[9px] font-bold text-white"
              style={{ background: 'rgb(6 12 24 / 0.6)' }}
            >
              Amanecer en la sierra
            </motion.span>
          )}

          <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 font-mono text-[8px] text-white/90">
            00:0{Math.floor(avance * 9)}:{String(Math.floor(avance * 240) % 60).padStart(2, '0')}
          </span>
        </div>

        {/* pistas de video y de rótulos */}
        <div className="absolute inset-x-[3%] bottom-[10%] flex flex-col gap-1.5">
          {[0, 1].map((pista) => (
            <div
              key={pista}
              className="relative h-7 rounded-md sm:h-8"
              style={{ background: 'rgb(var(--border) / 0.08)' }}
            >
              {CLIPS.filter((c) => c.pista === pista).map((c, i) => (
                <motion.span
                  key={i}
                  className="absolute top-0 h-full overflow-hidden rounded-md"
                  style={{
                    left: `${c.izq}%`,
                    width: `${c === CLIPS[0] ? anchoPrimero : c.ancho}%`,
                    background: `linear-gradient(120deg, ${c.de}, ${c.a})`,
                    // el clip que suena se resalta mientras el cabezal lo cruza
                    outline:
                      reproduciendo && c === CLIPS[enPantalla]
                        ? '2px solid rgb(var(--accent))'
                        : 'none',
                  }}
                  animate={{ opacity: t > c.entra ? 1 : 0, scaleX: t > c.entra ? 1 : 0.4 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="flex h-full">
                    {Array.from({ length: 6 }, (_, k) => (
                      <span
                        key={k}
                        className="h-full flex-1"
                        style={{ background: k % 2 ? 'rgb(255 255 255 / 0.1)' : 'transparent' }}
                      />
                    ))}
                  </span>
                </motion.span>
              ))}
            </div>
          ))}

          {/* pista de rótulos, que se enciende al añadir el texto */}
          <div
            className="relative h-5 rounded-md transition-opacity duration-500"
            style={{
              background: 'rgb(var(--border) / 0.08)',
              opacity: conRotulo ? 1 : 0.35,
            }}
          >
            {conRotulo && (
              <motion.span
                initial={{ opacity: 0, scaleX: 0.4 }}
                animate={{ opacity: 1, scaleX: 1 }}
                className="absolute top-0 flex h-full items-center gap-1 rounded-md px-1.5"
                style={{ left: '8%', width: '30%', background: 'rgb(var(--accent) / 0.85)' }}
              >
                <Type size={9} className="shrink-0 text-white" />
                <span className="truncate text-[8px] font-medium text-white">Rótulo</span>
              </motion.span>
            )}
          </div>

          <span
            className="pointer-events-none absolute -top-1 bottom-0 w-px bg-brand"
            style={{ left: `${avance * 88 + 3}%`, opacity: reproduciendo ? 1 : 0.25 }}
          />
        </div>

        {/* cursor, con lo que lleva en la mano según el momento */}
        <span
          className="pointer-events-none absolute z-10"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: `translate(-4px, -2px) scale(${arrastrando || estirando ? 0.92 : 1})`,
          }}
        >
          <MousePointer2
            size={19}
            className="text-brand drop-shadow"
            fill="currentColor"
            strokeWidth={1}
          />
          {arrastrando && (
            <span
              className="absolute left-4 top-3 h-4 w-7 rounded"
              style={{
                background: `linear-gradient(120deg, ${cogido.de}, ${cogido.a})`,
                opacity: 0.8,
              }}
            />
          )}
          {estirando && (
            <span className="absolute -left-1 top-4 text-[10px] font-bold text-brand">↔</span>
          )}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex gap-1">
          {GUION.map((g) => (
            <span
              key={g.texto}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: g === pasoActual ? 22 : 7,
                background: g === pasoActual ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.22)',
              }}
            />
          ))}
        </span>
        <p className="text-sm font-medium text-[color:var(--muted)]">{pasoActual.texto}</p>
      </div>
    </div>
  )
}
