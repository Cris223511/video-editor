import { ReactNode, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'

export interface Caracteristica {
  id: string
  icono: ReactNode
  titulo: string
  texto: string
}

// cada escena se dibuja con el mismo reloj, que da vueltas cada cuatro segundos.
// así ninguna escena necesita su propio requestAnimationFrame y todas quedan
// sincronizadas con el resto de la pieza
const CICLO = 4

// mientras nadie toque la lista, la selección va sola de una característica a la
// siguiente. al primer clic se detiene y manda la persona
const ROTACION = 5200

const AZUL = 'linear-gradient(120deg, rgb(var(--accent-boton)), rgb(var(--accent-soft)))'

// interpolación suave de ida y vuelta, la que usan varias escenas para moverse
// sin que se note el salto al cerrar el bucle
function vaiven(t: number, periodo = CICLO) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / periodo)
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-xl"
      style={{ background: 'rgb(var(--border) / 0.06)' }}
    >
      {children}
    </div>
  )
}

// tira de fotogramas que llevan dentro los clips, para que un rectángulo de
// color se lea como un trozo de video
function Fotogramas({ n = 6 }: { n?: number }) {
  return (
    <span className="absolute inset-0 flex">
      {Array.from({ length: n }, (_, k) => (
        <span
          key={k}
          className="h-full flex-1"
          style={{ background: k % 2 ? 'rgb(255 255 255 / 0.13)' : 'transparent' }}
        />
      ))}
    </span>
  )
}

// un clip se parte por donde pasa el cabezal, los dos trozos se separan y luego
// el hueco se cierra solo
function EscenaRecorte({ t }: { t: number }) {
  const corte = 48
  const cabezal = t < 1.4 ? 10 + (38 * t) / 1.4 : corte
  const dividido = t >= 1.4
  const hueco = t < 1.4 ? 0 : t < 2.4 ? ((t - 1.4) / 1) * 5 : t < 3.2 ? 5 * (1 - (t - 2.4) / 0.8) : 0

  return (
    <Marco>
      <div
        className="absolute inset-x-[6%] top-[26%] h-[16%] rounded-md"
        style={{ background: 'rgb(var(--border) / 0.1)' }}
      />
      <div className="absolute inset-x-[6%] top-[26%] h-[16%]">
        {dividido ? (
          <>
            <span
              className="absolute top-0 h-full overflow-hidden rounded-md"
              style={{ left: '2%', width: `${corte - 4}%`, background: AZUL }}
            >
              <Fotogramas n={4} />
            </span>
            <span
              className="absolute top-0 h-full overflow-hidden rounded-md"
              style={{ left: `${corte + hueco}%`, width: `${44 - hueco}%`, background: AZUL }}
            >
              <Fotogramas n={4} />
            </span>
          </>
        ) : (
          <span
            className="absolute left-[2%] top-0 h-full w-[86%] overflow-hidden rounded-md"
            style={{ background: AZUL }}
          >
            <Fotogramas n={8} />
          </span>
        )}
      </div>

      {/* segunda pista, quieta, para que se vea que el corte afecta solo a una */}
      <div
        className="absolute inset-x-[6%] top-[50%] h-[13%] rounded-md"
        style={{ background: 'rgb(var(--border) / 0.1)' }}
      />
      <div
        className="absolute top-[50%] h-[13%] rounded-md"
        style={{ left: '22%', width: '38%', background: 'rgb(var(--accent) / 0.35)' }}
      />

      <span
        className="absolute top-[20%] h-[50%] w-[2px] rounded-full bg-brand"
        style={{ left: `${6 + cabezal * 0.88}%` }}
      >
        <span className="absolute -left-[5px] -top-1 h-2.5 w-3 rounded-sm bg-brand" />
      </span>

      <p
        className="absolute inset-x-0 bottom-[10%] text-center text-[11px] font-medium"
        style={{ color: 'var(--muted)' }}
      >
        {dividido ? 'el hueco se cierra solo' : 'el cabezal marca el corte'}
      </p>
    </Marco>
  )
}

// una cara recorre el plano y el recuadro pixelado la sigue por el trazo grabado
function EscenaCensura({ t }: { t: number }) {
  const avance = vaiven(t)
  const x = 18 + 56 * avance
  const y = 34 + 14 * Math.sin((2 * Math.PI * t) / CICLO)

  return (
    <Marco>
      <span
        className="absolute inset-[6%] rounded-lg"
        style={{ background: 'linear-gradient(165deg, #1d3557, #2f6bd6)' }}
      />
      {/* puntos del recorrido que quedó grabado */}
      {Array.from({ length: 9 }, (_, k) => {
        const f = k / 8
        return (
          <span
            key={k}
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: `${18 + 56 * f + 6}%`,
              top: `${34 + 14 * Math.sin(2 * Math.PI * (f / 2)) + 8}%`,
              background: 'rgb(255 255 255 / 0.45)',
            }}
          />
        )
      })}

      <span
        className="absolute grid h-[22%] w-[15%] grid-cols-3 grid-rows-3 overflow-hidden rounded"
        style={{ left: `${x}%`, top: `${y}%`, outline: '2px solid rgb(var(--accent))' }}
      >
        {Array.from({ length: 9 }, (_, k) => (
          <span
            key={k}
            style={{
              background: `rgb(${180 + ((k * 37) % 60)} ${140 + ((k * 53) % 70)} ${120 + ((k * 71) % 80)})`,
            }}
          />
        ))}
      </span>

      <span
        className="absolute rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
        style={{ left: `${x}%`, top: `${y - 11}%`, background: 'rgb(var(--accent-boton))' }}
      >
        Pixelar
      </span>

      <p className="absolute inset-x-0 bottom-[8%] text-center text-[11px] font-medium text-white/70">
        el recuadro sigue el trazo grabado
      </p>
    </Marco>
  )
}

// rótulo y figura que se colocan sobre el lienzo con las guías que los alinean
function EscenaTexto({ t }: { t: number }) {
  const figura = t > 0.6
  const rotulo = t > 1.5
  const guias = t > 1.2 && t < 2.6

  return (
    <Marco>
      <span
        className="absolute inset-[6%] rounded-lg"
        style={{ background: 'linear-gradient(165deg, #123, #24506e)' }}
      />

      {guias && (
        <>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-y-[6%] left-1/2 w-px"
            style={{ background: 'rgb(var(--accent) / 0.85)' }}
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-x-[6%] top-[62%] h-px"
            style={{ background: 'rgb(var(--accent) / 0.85)' }}
          />
        </>
      )}

      {figura && (
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-[14%] top-[18%] h-[20%] w-[16%] rounded-full"
          style={{ border: '2px solid rgb(255 255 255 / 0.8)' }}
        />
      )}

      {rotulo && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 top-[54%] -translate-x-1/2 rounded px-3 py-1.5 font-display text-sm font-extrabold text-white"
          style={{ background: 'rgb(6 12 24 / 0.55)', textShadow: '0 2px 6px rgb(0 0 0 / 0.6)' }}
        >
          Amanecer en la sierra
        </motion.span>
      )}

      <p className="absolute inset-x-0 bottom-[8%] text-center text-[11px] font-medium text-white/70">
        las guías alinean solas lo que colocas
      </p>
    </Marco>
  )
}

// el clip se encoge y se estira según el ritmo, y la línea de tiempo lo recalcula
function EscenaVelocidad({ t }: { t: number }) {
  const f = vaiven(t)
  const ritmo = 0.5 + 1.5 * f
  const ancho = 76 / ritmo

  return (
    <Marco>
      <div
        className="absolute inset-x-[6%] top-[30%] h-[18%] rounded-md"
        style={{ background: 'rgb(var(--border) / 0.1)' }}
      />
      <span
        className="absolute top-[30%] h-[18%] overflow-hidden rounded-md"
        style={{ left: '8%', width: `${ancho}%`, background: AZUL }}
      >
        <Fotogramas n={Math.max(3, Math.round(ancho / 9))} />
      </span>

      {/* aguja simple que acompaña al número, para que el cambio se vea y no
          solo se lea */}
      <div
        className="absolute left-1/2 top-[58%] h-1.5 w-[52%] -translate-x-1/2 overflow-hidden rounded-full"
        style={{ background: 'rgb(var(--border) / 0.14)' }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-brand"
          style={{ width: `${((ritmo - 0.5) / 1.5) * 100}%` }}
        />
      </div>

      <p className="absolute inset-x-0 top-[66%] text-center font-display text-lg font-extrabold text-brand">
        {ritmo.toFixed(2).replace(/0$/, '')}x
      </p>
      <p
        className="absolute inset-x-0 bottom-[8%] text-center text-[11px] font-medium"
        style={{ color: 'var(--muted)' }}
      >
        la duración se recalcula al vuelo
      </p>
    </Marco>
  )
}

// la proporción del proyecto cambia y las bandas se rellenan con el propio video
function EscenaLienzo({ t }: { t: number }) {
  const FORMAS = [
    { w: 74, h: 42, nombre: '16:9' },
    { w: 48, h: 48, nombre: '1:1' },
    { w: 30, h: 54, nombre: '9:16' },
  ]
  const forma = FORMAS[Math.floor((t / CICLO) * 3) % 3]

  return (
    <Marco>
      <motion.span
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg"
        animate={{ width: `${forma.w}%`, height: `${forma.h}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: 'linear-gradient(165deg, #1d3557, #4a8fd6)' }}
      >
        {/* bandas: el mismo plano ampliado y desenfocado detrás del encuadre */}
        <span
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(165deg, #4a8fd6, #1d3557)',
            filter: 'blur(9px)',
            transform: 'scale(1.6)',
          }}
        />
        <span
          className="absolute inset-x-0 top-1/2 h-[56%] -translate-y-1/2"
          style={{ background: 'linear-gradient(165deg, #123, #2f6bd6)' }}
        />
      </motion.span>

      <span
        className="absolute left-1/2 top-[78%] -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold text-white"
        style={{ background: 'rgb(var(--accent-boton))' }}
      >
        {forma.nombre}
      </span>
    </Marco>
  )
}

// onda de sonido con su curva de volumen y el cabezal cruzándola
function EscenaAudio({ t }: { t: number }) {
  const avance = t / CICLO
  const BARRAS = 34

  return (
    <Marco>
      <div className="absolute inset-x-[6%] top-[24%] flex h-[40%] items-center gap-[2px]">
        {Array.from({ length: BARRAS }, (_, k) => {
          const f = k / (BARRAS - 1)
          const alto =
            18 +
            Math.abs(Math.sin(k * 0.7)) * 42 +
            Math.abs(Math.sin(k * 0.23 + t * 2)) * 34
          // el volumen baja al final, que es la curva que se dibuja encima
          const ganancia = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.45
          const pasado = f <= avance
          return (
            <span
              key={k}
              className="flex-1 rounded-sm"
              style={{
                height: `${alto * ganancia}%`,
                background: pasado ? 'rgb(var(--accent-boton))' : 'rgb(var(--border) / 0.28)',
              }}
            />
          )
        })}
      </div>

      <span
        className="absolute top-[20%] h-[48%] w-[2px] rounded-full bg-brand"
        style={{ left: `${6 + avance * 88}%` }}
      />

      <div className="absolute inset-x-[6%] top-[70%] flex items-center gap-2">
        <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
          Volumen
        </span>
        <span
          className="relative h-1.5 flex-1 overflow-hidden rounded-full"
          style={{ background: 'rgb(var(--border) / 0.14)' }}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-brand"
            style={{ width: `${52 + 34 * vaiven(t)}%` }}
          />
        </span>
      </div>
    </Marco>
  )
}

// las teclas se encienden una tras otra con la acción que disparan
function EscenaAtajos({ t }: { t: number }) {
  const ATAJOS = [
    { tecla: 'S', accion: 'Dividir por el cabezal' },
    { tecla: 'Espacio', accion: 'Reproducir o pausar' },
    { tecla: '← →', accion: 'Mover el cabezal' },
    { tecla: 'Ctrl S', accion: 'Guardar el proyecto' },
    { tecla: 'Ctrl E', accion: 'Exportar el video' },
  ]
  const i = Math.floor((t / CICLO) * ATAJOS.length) % ATAJOS.length

  return (
    <Marco>
      <div className="absolute inset-x-[8%] top-[22%] flex flex-wrap justify-center gap-2">
        {ATAJOS.map((a, k) => {
          const activa = k === i
          return (
            <span
              key={a.tecla}
              className="rounded-lg px-3 py-2 font-mono text-[11px] font-bold transition-all duration-200"
              style={{
                background: activa ? 'rgb(var(--accent-boton))' : 'rgb(var(--surface))',
                color: activa ? '#fff' : 'var(--muted)',
                border: '1px solid rgb(var(--border) / 0.14)',
                boxShadow: activa
                  ? '0 6px 16px rgb(21 52 102 / 0.22)'
                  : '0 2px 0 rgb(var(--border) / 0.16)',
                transform: activa ? 'translateY(1px)' : 'none',
              }}
            >
              {a.tecla}
            </span>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={ATAJOS[i].accion}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-x-0 top-[62%] text-center font-display text-sm font-bold"
          style={{ color: 'var(--text)' }}
        >
          {ATAJOS[i].accion}
        </motion.p>
      </AnimatePresence>
    </Marco>
  )
}

function Escena({ id, t }: { id: string; t: number }) {
  if (id === 'censura') return <EscenaCensura t={t} />
  if (id === 'texto') return <EscenaTexto t={t} />
  if (id === 'velocidad') return <EscenaVelocidad t={t} />
  if (id === 'lienzo') return <EscenaLienzo t={t} />
  if (id === 'audio') return <EscenaAudio t={t} />
  if (id === 'atajos') return <EscenaAtajos t={t} />
  return <EscenaRecorte t={t} />
}

// lista de características a la izquierda y, a la derecha, una demostración
// animada de la que esté elegida. antes era una rejilla de tarjetas con una foto
// fija al lado, que no contaba nada de lo que hace el editor
export default function DemoCaracteristicas({ items }: { items: Caracteristica[] }) {
  const caja = useRef<HTMLDivElement>(null)
  const visible = useInView(caja, { amount: 0.25 })
  const [activo, setActivo] = useState(items[0].id)
  const [manual, setManual] = useState(false)
  const [t, setT] = useState(0)

  // el reloj de las escenas solo corre con la pieza a la vista, y vuelve a cero
  // cada vez que se cambia de característica para que la demostración se vea
  // desde el principio
  useEffect(() => {
    if (!visible) return
    let raf = 0
    const inicio = performance.now()
    const paso = () => {
      setT(((performance.now() - inicio) / 1000) % CICLO)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [visible, activo])

  useEffect(() => {
    if (!visible || manual) return
    const id = setInterval(() => {
      setActivo((a) => {
        const i = items.findIndex((x) => x.id === a)
        return items[(i + 1) % items.length].id
      })
    }, ROTACION)
    return () => clearInterval(id)
  }, [visible, manual, items])

  const actual = items.find((x) => x.id === activo) ?? items[0]

  const elegir = (id: string) => {
    setManual(true)
    setActivo(id)
  }

  return (
    <div ref={caja} className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
      {/* la lista se desplaza en horizontal en móvil y se apila en pantalla
          grande, donde hay sitio para el texto de la elegida */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((it) => {
          const es = it.id === activo
          return (
            <button
              key={it.id}
              onClick={() => elegir(it.id)}
              aria-pressed={es}
              className="relative shrink-0 rounded-2xl px-4 py-3 text-left transition-colors duration-200 lg:w-full lg:shrink"
              style={{
                background: es ? 'rgb(var(--surface))' : 'transparent',
                border: `1px solid rgb(var(--border) / ${es ? '0.14' : '0'})`,
                boxShadow: es ? '0 8px 24px rgb(21 52 102 / 0.1)' : 'none',
              }}
            >
              {/* la marca azul del borde es un solo elemento que se desliza de
                  una fila a otra, no una por fila encendiéndose */}
              {es && (
                <motion.span
                  layoutId="caracteristica-activa"
                  className="absolute left-0 top-3 bottom-3 hidden w-[3px] rounded-full lg:block"
                  style={{ background: 'rgb(var(--accent))' }}
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                />
              )}
              <span className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                  style={{
                    background: es ? AZUL : 'rgb(var(--border) / 0.22)',
                  }}
                >
                  {it.icono}
                </span>
                <span
                  className="whitespace-nowrap text-sm font-semibold lg:whitespace-normal"
                  style={{ color: es ? 'var(--text)' : 'var(--muted)' }}
                >
                  {it.titulo}
                </span>
              </span>

              {/* el texto solo se despliega en la elegida: siete párrafos a la
                  vez era justo lo que hacía sosa la sección */}
              <AnimatePresence initial={false}>
                {es && (
                  <motion.span
                    key="texto"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="hidden overflow-hidden lg:block"
                  >
                    <span className="mt-2 block pl-12 text-sm leading-relaxed text-[color:var(--muted)]">
                      {it.texto}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </div>

      <div>
        <div
          className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl p-3 shadow-lg sm:aspect-[16/9] sm:p-4"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.1)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={actual.id}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-3 sm:inset-4"
            >
              <Escena id={actual.id} t={t} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* en móvil el texto no cabe en la lista, así que se lee bajo la escena */}
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)] lg:hidden">
          {actual.texto}
        </p>
      </div>
    </div>
  )
}
