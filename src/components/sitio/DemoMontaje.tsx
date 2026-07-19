import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Crop,
  MousePointer2,
  Palette,
  Scissors,
  Sparkles,
  Type,
  Volume2,
  Wand2,
} from 'lucide-react'

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

// los clips ocupan la línea de tiempo casi entera: si se quedaban cortos, la
// mitad derecha de la pista se veía como un hueco muerto
const CLIPS = [
  { izq: 1, ancho: 34, pista: 0, entra: 1.6, de: '#2f6bd6', a: '#5aa9ff', nombre: 'sierra_01' },
  { izq: 44, ancho: 40, pista: 0, entra: 3.2, de: '#8a5ad6', a: '#c07af0', nombre: 'sierra_02' },
  { izq: 24, ancho: 38, pista: 1, entra: 4.6, de: '#1f8a7a', a: '#4fd0b5', nombre: 'detalle_01' },
]

// las herramientas de la columna izquierda, las mismas que tiene el editor de
// verdad. la que está encendida cambia según lo que se esté haciendo
const HERRAMIENTAS = [MousePointer2, Scissors, Type, Sparkles, Wand2, Palette, Volume2, Crop]

// el cursor recorre el panel de medios, suelta cada archivo en su pista, tira
// del borde de un clip y termina colocando el rótulo sobre el visor
const RUTA = [
  { t: 0, x: 50, y: 40 },
  { t: 0.5, x: 17, y: 18 },
  { t: 1.6, x: 6, y: 74 },
  { t: 2.1, x: 17, y: 33 },
  { t: 3.2, x: 47, y: 74 },
  { t: 3.7, x: 17, y: 48 },
  { t: 4.6, x: 28, y: 84 },
  { t: 5.0, x: 35, y: 74 },
  { t: 5.8, x: 43, y: 74 },
  { t: 6.4, x: 58, y: 40 },
  { t: 7.2, x: 63, y: 48 },
  { t: 10, x: 55, y: 55 },
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

// montaje completo reproducido con la misma disposición que tiene la aplicación:
// herramientas en columna, panel de medios al lado, visor grande arriba y la
// línea de tiempo cruzando abajo. antes las piezas flotaban sueltas y sobraba
// espacio por el centro
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

  // la herramienta encendida acompaña al paso: puntero al mover, tirador al
  // estirar y texto al rotular
  const herramientaActiva = estirando ? 1 : t > 6.4 && t < 7.6 ? 2 : 0

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
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl sm:aspect-[16/9]"
        style={{ background: 'rgb(var(--border) / 0.05)' }}
      >
        {/* columna de herramientas, pegada al borde como en la aplicación */}
        <div
          className="absolute bottom-[35%] left-[1.5%] top-[2%] flex w-[5%] flex-col items-center justify-start gap-[3%] rounded-lg py-[3%]"
          style={{ background: 'rgb(var(--border) / 0.09)' }}
        >
          {HERRAMIENTAS.map((Icono, i) => (
            <span
              key={i}
              className="grid aspect-square w-[62%] place-items-center rounded-md transition-colors duration-300"
              style={{
                background: i === herramientaActiva ? 'rgb(var(--accent-boton))' : 'transparent',
                color: i === herramientaActiva ? '#fff' : 'rgb(var(--border) / 0.55)',
              }}
            >
              <Icono size={11} />
            </span>
          ))}
        </div>

        {/* panel de medios: los archivos de origen se apagan al usarse */}
        <div
          className="absolute bottom-[35%] left-[8%] top-[2%] w-[19%] overflow-hidden rounded-lg p-[4%]"
          style={{ background: 'rgb(var(--border) / 0.09)' }}
        >
          <p
            className="mb-[6%] text-[8px] font-bold uppercase tracking-wider sm:text-[9px]"
            style={{ color: 'var(--muted)' }}
          >
            Medios
          </p>
          <div className="flex flex-col gap-[7%]">
            {CLIPS.map((c, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded transition-opacity duration-500"
                style={{ opacity: t > c.entra ? 0.25 : 1 }}
              >
                <span
                  className="h-5 w-8 shrink-0 rounded sm:h-6 sm:w-10"
                  style={{ background: `linear-gradient(120deg, ${c.de}, ${c.a})` }}
                />
                <span
                  className="truncate text-[7px] sm:text-[8px]"
                  style={{ color: 'var(--muted)' }}
                >
                  {c.nombre}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* visor: ocupa todo el resto de la franja superior, que es lo que la
            pieza quiere enseñar */}
        <div
          className="absolute bottom-[35%] left-[29%] right-[1.5%] top-[2%] overflow-hidden rounded-lg shadow-lg"
          style={{ background: '#0b1424' }}
        >
          {/* el fotograma va centrado en 16/9, con el negro alrededor igual que
              en un visor real */}
          <div className="absolute inset-x-0 top-0 grid h-[86%] place-items-center">
            <div className="relative h-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
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
                  borderLeft: '26px solid transparent',
                  borderRight: '26px solid transparent',
                  borderBottom: '34px solid rgb(6 12 24 / 0.45)',
                }}
              />
              <span
                className="absolute bottom-[32%] left-[38%] h-0 w-0"
                style={{
                  borderLeft: '38px solid transparent',
                  borderRight: '38px solid transparent',
                  borderBottom: '50px solid rgb(6 12 24 / 0.6)',
                }}
              />
              <span
                className="absolute right-[18%] top-[14%] h-5 w-5 rounded-full"
                style={{ background: 'rgb(255 255 255 / 0.75)' }}
              />

              {conRotulo && (
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-4 bottom-3 rounded px-2 py-1 text-center text-[11px] font-bold text-white sm:text-sm"
                  style={{ background: 'rgb(6 12 24 / 0.6)' }}
                >
                  Amanecer en la sierra
                </motion.span>
              )}

              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-white/90">
                00:0{Math.floor(avance * 9)}:{String(Math.floor(avance * 240) % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* barra de reproducción del visor, que avanza con el cabezal */}
          <div className="absolute inset-x-[4%] bottom-[4%] flex items-center gap-2">
            <span
              className="h-0 w-0 shrink-0"
              style={{
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: `6px solid ${reproduciendo ? 'rgb(255 255 255 / 0.85)' : 'rgb(255 255 255 / 0.35)'}`,
              }}
            />
            <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                style={{ width: `${avance * 100}%` }}
              />
            </span>
          </div>
        </div>

        {/* línea de tiempo, cruzando de lado a lado por debajo de todo */}
        <div
          className="absolute inset-x-[1.5%] bottom-[2%] top-[67%] rounded-lg p-[1.2%]"
          style={{ background: 'rgb(var(--border) / 0.09)' }}
        >
          <div className="relative flex h-full flex-col justify-center gap-[3%]">
            {[0, 1].map((pista) => (
              <div
                key={pista}
                className="relative h-[30%] rounded-md"
                style={{ background: 'rgb(var(--border) / 0.1)' }}
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
                      {Array.from({ length: 10 }, (_, k) => (
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
              className="relative h-[22%] rounded-md transition-opacity duration-500"
              style={{
                background: 'rgb(var(--border) / 0.1)',
                opacity: conRotulo ? 1 : 0.35,
              }}
            >
              {conRotulo && (
                <motion.span
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  className="absolute top-0 flex h-full items-center gap-1 rounded-md px-1.5"
                  style={{ left: '30%', width: '34%', background: 'rgb(var(--accent) / 0.85)' }}
                >
                  <Type size={9} className="shrink-0 text-white" />
                  <span className="truncate text-[8px] font-medium text-white">Rótulo</span>
                </motion.span>
              )}
            </div>

            <span
              className="pointer-events-none absolute inset-y-0 w-px bg-brand"
              style={{ left: `${avance * 92 + 2}%`, opacity: reproduciendo ? 1 : 0.25 }}
            >
              <span className="absolute -left-[5px] -top-[2px] h-2 w-3 rounded-sm bg-brand" />
            </span>
          </div>
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
