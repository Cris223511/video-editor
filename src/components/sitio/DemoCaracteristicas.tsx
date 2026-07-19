import { ReactNode, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Circle, Image as IconoImagen, MousePointer2, Pause, Play, Square, Type } from 'lucide-react'

export interface Caracteristica {
  id: string
  icono: ReactNode
  titulo: string
  texto: string
}

// cada escena se dibuja con el mismo reloj, que da vueltas cada siete segundos.
// así ninguna escena necesita su propio requestAnimationFrame y todas quedan
// sincronizadas con el resto de la pieza.
//
// el ritmo es pausado a propósito. con vueltas cortas los gestos del cursor se
// atropellaban y no daba tiempo a leer lo que hacía en cada escena
const CICLO = 7

// el bucle no salta: los últimos instantes de una vuelta se funden con los
// primeros de la siguiente. para que el enlace no pierda tiempo, la vuelta
// vuelve a empezar antes de que la anterior termine, y ese solape es el fundido
const FUNDIDO = 0.5
const PERIODO = CICLO - FUNDIDO

const AZUL = 'linear-gradient(120deg, rgb(var(--accent-boton)), rgb(var(--accent-soft)))'
const PANEL = 'rgb(var(--border) / 0.09)'
const PISTA = 'rgb(var(--border) / 0.12)'

// interpolación suave de ida y vuelta, la que usan varias escenas para moverse
// sin que se note el salto al cerrar el bucle
function vaiven(t: number, periodo = CICLO) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / periodo)
}

// aceleración y frenada, el perfil con el que se mueve todo lo que arrastra el
// cursor. sin esto los desplazamientos salen mecánicos
function suave(f: number) {
  const x = Math.min(1, Math.max(0, f))
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

type Punto = { t: number; x: number; y: number }

// dado el instante, dice en qué parte de su recorrido va el cursor. las rutas
// empiezan y acaban en el mismo sitio, condición para que la vuelta enlace
function enRuta(t: number, ruta: Punto[]) {
  for (let i = 0; i < ruta.length - 1; i++) {
    const a = ruta[i]
    const b = ruta[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = suave((t - a.t) / (b.t - a.t || 1))
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
    }
  }
  const fin = ruta[ruta.length - 1]
  return { x: fin.x, y: fin.y }
}

function Marco({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 overflow-hidden rounded-xl">{children}</div>
}

// el puntero que hace el trabajo en todas las escenas. al pulsar se encoge y
// suelta un halo, que es lo que se lee como clic
function Cursor({
  x,
  y,
  pulsando = false,
  etiqueta,
}: {
  x: number
  y: number
  pulsando?: boolean
  etiqueta?: string
}) {
  return (
    <span
      className="pointer-events-none absolute z-30"
      style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${pulsando ? 0.86 : 1})` }}
    >
      {pulsando && (
        <span
          className="absolute -left-2 -top-2 h-7 w-7 rounded-full"
          style={{ background: 'rgb(var(--accent) / 0.22)' }}
        />
      )}
      <MousePointer2
        size={17}
        className="relative drop-shadow"
        style={{ color: 'rgb(var(--accent))' }}
        fill="currentColor"
        strokeWidth={1}
      />
      {etiqueta && (
        <span
          className="absolute left-3 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
          style={{ background: 'rgb(var(--accent-boton))' }}
        >
          {etiqueta}
        </span>
      )}
    </span>
  )
}

// los ocho tiradores de una selección, repartidos por las esquinas y los lados
function Nodos() {
  const P = [
    [0, 0],
    [50, 0],
    [100, 0],
    [0, 50],
    [100, 50],
    [0, 100],
    [50, 100],
    [100, 100],
  ]
  return (
    <span
      className="absolute -inset-[6px]"
      style={{ outline: '1px solid rgb(var(--accent))', outlineOffset: '-1px' }}
    >
      {P.map(([px, py]) => (
        <span
          key={`${px}-${py}`}
          className="absolute h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-white"
          style={{
            left: `${px}%`,
            top: `${py}%`,
            border: '1px solid rgb(var(--accent))',
          }}
        />
      ))}
    </span>
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

// barra de acciones con la que se encabezan casi todas las escenas: da contexto
// y de paso llena la franja de arriba, que antes quedaba vacía
function Barra({ titulo, acciones, activa }: { titulo: string; acciones: string[]; activa?: number }) {
  return (
    <div
      className="absolute inset-x-[3%] top-[3%] flex h-[12%] items-center gap-[1.5%] rounded-lg px-[2%]"
      style={{ background: PANEL }}
    >
      <span
        className="mr-auto truncate text-[10px] font-bold uppercase tracking-wider"
        style={{ color: 'var(--muted)' }}
      >
        {titulo}
      </span>
      {acciones.map((a, k) => (
        <span
          key={a}
          className="shrink-0 rounded px-2 py-1 text-[9px] font-semibold transition-colors duration-200"
          style={{
            background: k === activa ? 'rgb(var(--accent-boton))' : 'rgb(var(--surface))',
            color: k === activa ? '#fff' : 'var(--muted)',
            border: '1px solid rgb(var(--border) / 0.14)',
          }}
        >
          {a}
        </span>
      ))}
    </div>
  )
}

function Pie({ children, claro = false }: { children: ReactNode; claro?: boolean }) {
  return (
    <p
      className="absolute inset-x-0 bottom-[3%] text-center text-[11px] font-medium"
      style={{ color: claro ? 'rgb(255 255 255 / 0.72)' : 'var(--muted)' }}
    >
      {children}
    </p>
  )
}

// el cursor lleva el cabezal hasta el punto de corte, divide el clip, aparta el
// trozo de la derecha y lo devuelve a su sitio. el último fotograma reconstruye
// el primero, así que la vuelta cierra sin ayuda
function EscenaRecorte({ t }: { t: number }) {
  const CORTE = 52
  const ORIGEN = 16
  const yendo = t < 0.9
  const volviendo = t > 3.5

  const cabezal = yendo
    ? ORIGEN + (CORTE - ORIGEN) * suave(t / 0.9)
    : volviendo
      ? CORTE + (ORIGEN - CORTE) * suave((t - 3.5) / (CICLO - 3.5))
      : CORTE

  const dividido = t >= 1.5 && t <= 3.4
  const hueco = !dividido
    ? 0
    : t < 2.4
      ? 9 * suave((t - 1.5) / 0.9)
      : 9 * (1 - suave((t - 2.4) / 0.9))

  const cursor = enRuta(t, [
    { t: 0, x: ORIGEN, y: 30 },
    { t: 0.9, x: CORTE, y: 30 },
    { t: 1.4, x: CORTE, y: 44 },
    { t: 2.4, x: CORTE + 12, y: 44 },
    { t: 3.4, x: CORTE, y: 44 },
    { t: 3.5, x: CORTE, y: 30 },
    { t: CICLO, x: ORIGEN, y: 30 },
  ])
  const pulsando = t < 0.9 || (t > 1.35 && t < 3.4) || t > 3.5
  const etiqueta = t > 1.35 && t < 1.75 ? 'Dividir' : undefined

  return (
    <Marco>
      <Barra
        titulo="Línea de tiempo"
        acciones={['Dividir', 'Recortar', 'Cerrar hueco']}
        activa={t > 1.4 && t < 1.9 ? 0 : t > 2.5 && t < 3.4 ? 2 : undefined}
      />

      {/* regla con las marcas de segundo, que da escala a las pistas */}
      <div className="absolute inset-x-[3%] top-[20%] flex h-[5%] items-end gap-[1%]">
        {Array.from({ length: 24 }, (_, k) => (
          <span
            key={k}
            className="flex-1 rounded-t-sm"
            style={{
              height: k % 4 === 0 ? '100%' : '45%',
              background: 'rgb(var(--border) / 0.2)',
            }}
          />
        ))}
      </div>

      {[
        { top: 29, alto: 15 },
        { top: 48, alto: 13 },
        { top: 65, alto: 11 },
      ].map((p) => (
        <div
          key={p.top}
          className="absolute inset-x-[3%] rounded-md"
          style={{ top: `${p.top}%`, height: `${p.alto}%`, background: PISTA }}
        />
      ))}

      {/* pista de video: el clip que se parte y se vuelve a juntar */}
      {dividido ? (
        <>
          <span
            className="absolute overflow-hidden rounded-md"
            style={{ left: '6%', width: `${CORTE - 6}%`, top: '29%', height: '15%', background: AZUL }}
          >
            <Fotogramas n={5} />
          </span>
          <span
            className="absolute overflow-hidden rounded-md"
            style={{
              left: `${CORTE + hueco}%`,
              width: `${88 - CORTE - hueco}%`,
              top: '29%',
              height: '15%',
              background: AZUL,
              outline: hueco > 1 ? '2px solid rgb(var(--accent))' : 'none',
            }}
          >
            <Fotogramas n={4} />
          </span>
        </>
      ) : (
        <span
          className="absolute overflow-hidden rounded-md"
          style={{ left: '6%', width: '82%', top: '29%', height: '15%', background: AZUL }}
        >
          <Fotogramas n={9} />
        </span>
      )}

      {/* pista de rótulos y pista de audio, quietas: el corte solo afecta a una */}
      <span
        className="absolute rounded-md"
        style={{ left: '20%', width: '34%', top: '48%', height: '13%', background: 'rgb(var(--accent) / 0.38)' }}
      />
      <span
        className="absolute flex items-end gap-[2px] overflow-hidden rounded-md px-1"
        style={{ left: '10%', width: '62%', top: '65%', height: '11%', background: 'rgb(var(--accent) / 0.2)' }}
      >
        {Array.from({ length: 30 }, (_, k) => (
          <span
            key={k}
            className="flex-1 rounded-sm"
            style={{
              height: `${25 + Math.abs(Math.sin(k * 0.9)) * 60}%`,
              background: 'rgb(var(--accent) / 0.55)',
            }}
          />
        ))}
      </span>

      <span
        className="absolute top-[24%] h-[56%] w-[2px] rounded-full bg-brand"
        style={{ left: `${cabezal}%` }}
      >
        <span className="absolute -left-[5px] -top-1 h-2.5 w-3 rounded-sm bg-brand" />
      </span>

      <Cursor {...cursor} pulsando={pulsando} etiqueta={etiqueta} />
      <Pie>{dividido ? 'apartas el trozo y el hueco se cierra solo' : 'llevas el cabezal al punto de corte'}</Pie>
    </Marco>
  )
}

// el cursor arrastra el recuadro pixelado sobre la cara y el recorrido queda
// grabado como puntos. todo el movimiento es de ida y vuelta, con lo que el
// final del ciclo es exactamente el principio
function EscenaCensura({ t }: { t: number }) {
  const avance = vaiven(t)
  const x = 20 + 48 * avance
  const y = 24 + 14 * Math.sin((2 * Math.PI * t) / CICLO)
  const grabados = Math.round(avance * 8)

  return (
    <Marco>
      <Barra titulo="Censura en movimiento" acciones={['Pixelar', 'Difuminar', 'Tapar']} activa={0} />

      <span
        className="absolute inset-x-[3%] top-[20%] h-[58%] overflow-hidden rounded-lg"
        style={{ background: 'linear-gradient(165deg, #1d3557, #2f6bd6)' }}
      >
        {/* dos siluetas de fondo para que el plano no sea un color plano */}
        <span
          className="absolute bottom-0 left-[10%] h-[45%] w-[30%] rounded-t-full"
          style={{ background: 'rgb(6 12 24 / 0.3)' }}
        />
        <span
          className="absolute bottom-0 right-[8%] h-[60%] w-[38%] rounded-t-full"
          style={{ background: 'rgb(6 12 24 / 0.22)' }}
        />
      </span>

      {/* puntos del recorrido que ya quedó grabado */}
      {Array.from({ length: 9 }, (_, k) => {
        const f = k / 8
        return (
          <span
            key={k}
            className="absolute h-1.5 w-1.5 rounded-full transition-opacity duration-300"
            style={{
              left: `${20 + 48 * f + 5}%`,
              top: `${24 + 14 * Math.sin(Math.PI * f) + 9}%`,
              background: 'rgb(255 255 255 / 0.5)',
              opacity: k <= grabados ? 1 : 0.18,
            }}
          />
        )
      })}

      <span
        className="absolute grid h-[22%] w-[13%] grid-cols-3 grid-rows-3 overflow-hidden rounded"
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

      {/* pista de puntos clave: se van encendiendo al ritmo del arrastre */}
      <div
        className="absolute inset-x-[3%] top-[81%] flex h-[9%] items-center gap-[1.5%] rounded-md px-[2%]"
        style={{ background: PISTA }}
      >
        <span className="mr-1 shrink-0 text-[9px] font-semibold" style={{ color: 'var(--muted)' }}>
          Trazo
        </span>
        {Array.from({ length: 9 }, (_, k) => (
          <span
            key={k}
            className="h-2 w-2 rotate-45 rounded-[1px] transition-colors duration-200"
            style={{
              background: k <= grabados ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.28)',
            }}
          />
        ))}
      </div>

      <Cursor x={x + 5} y={y + 9} pulsando etiqueta="Grabando" />
      <Pie>el recuadro va donde lo llevas y el trazo se guarda</Pie>
    </Marco>
  )
}

// el cursor coge cada herramienta del panel, coloca el elemento sobre el lienzo
// y lo deja seleccionado con sus tiradores. al final todo se desvanece y el
// lienzo queda como estaba, que es lo que cierra el bucle sin corte
function EscenaTexto({ t }: { t: number }) {
  const HERRAMIENTAS = [Type, Square, Circle, IconoImagen]

  const cursor = enRuta(t, [
    { t: 0, x: 30, y: 76 },
    { t: 0.5, x: 8, y: 26 },
    { t: 1.35, x: 44, y: 52 },
    { t: 1.9, x: 8, y: 38 },
    { t: 2.3, x: 62, y: 26 },
    { t: 2.85, x: 84, y: 44 },
    { t: 3.25, x: 8, y: 62 },
    { t: 3.6, x: 20, y: 30 },
    { t: CICLO, x: 30, y: 76 },
  ])

  // qué botón del panel está encendido en cada tramo
  const herramienta = t < 1.9 ? 0 : t < 3.25 ? 1 : 3
  const pulsando =
    (t > 0.45 && t < 1.4) || (t > 1.85 && t < 2.9) || (t > 3.2 && t < 3.65)

  const rotulo = t > 1.35
  const figura = t > 2.3
  const marca = t > 3.6
  const dibujando = t > 2.3 && t < 2.85
  const guias = t > 0.9 && t < 1.6

  // el rectángulo crece mientras el cursor tira de su esquina
  const anchoFigura = dibujando ? Math.max(2, cursor.x - 62) : 22
  const altoFigura = dibujando ? Math.max(2, cursor.y - 26) : 18

  // desvanecido de cierre: en el último medio segundo el lienzo se vacía
  const salida = t > CICLO - 0.55 ? 1 - suave((t - (CICLO - 0.55)) / 0.55) : 1

  return (
    <Marco>
      <Barra titulo="Texto, figuras y marcas" acciones={['Contorno', 'Sombra', 'Alinear']} activa={1} />

      <span
        className="absolute inset-x-[3%] top-[20%] h-[64%] overflow-hidden rounded-lg"
        style={{ background: 'linear-gradient(165deg, #10243c, #24506e)' }}
      >
        <span
          className="absolute bottom-0 left-[18%] h-0 w-0"
          style={{
            borderLeft: '42px solid transparent',
            borderRight: '42px solid transparent',
            borderBottom: '52px solid rgb(6 12 24 / 0.4)',
          }}
        />
        <span
          className="absolute right-[16%] top-[16%] h-6 w-6 rounded-full"
          style={{ background: 'rgb(255 255 255 / 0.6)' }}
        />
      </span>

      {/* panel de herramientas pegado al borde izquierdo del lienzo */}
      <div
        className="absolute left-[5%] top-[24%] flex w-[6%] flex-col items-center gap-[8px] rounded-lg py-2"
        style={{ background: 'rgb(6 12 24 / 0.55)' }}
      >
        {HERRAMIENTAS.map((Icono, k) => (
          <span
            key={k}
            className="grid aspect-square w-[70%] place-items-center rounded-md transition-colors duration-200"
            style={{
              background: k === herramienta ? 'rgb(var(--accent-boton))' : 'transparent',
              color: k === herramienta ? '#fff' : 'rgb(255 255 255 / 0.55)',
            }}
          >
            <Icono size={11} />
          </span>
        ))}
      </div>

      {guias && (
        <>
          <span
            className="absolute inset-y-[20%] left-1/2 w-px"
            style={{ background: 'rgb(var(--accent) / 0.8)', opacity: salida }}
          />
          <span
            className="absolute inset-x-[3%] top-[56%] h-px"
            style={{ background: 'rgb(var(--accent) / 0.8)', opacity: salida }}
          />
        </>
      )}

      {figura && (
        <span
          className="absolute rounded-md"
          style={{
            left: '62%',
            top: '26%',
            width: `${anchoFigura}%`,
            height: `${altoFigura}%`,
            border: '2px solid rgb(255 255 255 / 0.85)',
            background: 'rgb(255 255 255 / 0.08)',
            opacity: salida,
          }}
        >
          {dibujando && <Nodos />}
        </span>
      )}

      {rotulo && (
        <span
          className="absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 rounded px-3 py-1.5 font-display text-sm font-extrabold text-white"
          style={{
            background: 'rgb(6 12 24 / 0.55)',
            textShadow: '0 2px 6px rgb(0 0 0 / 0.6)',
            opacity: salida,
          }}
        >
          Amanecer en la sierra
          {t < 1.9 && <Nodos />}
        </span>
      )}

      {marca && (
        <span
          className="absolute left-[20%] top-[30%] grid h-[13%] w-[9%] place-items-center rounded-md"
          style={{
            background: 'linear-gradient(140deg, #2f6bd6, #38bdf8)',
            opacity: salida,
          }}
        >
          <IconoImagen size={12} className="text-white" />
          <Nodos />
        </span>
      )}

      <Cursor {...cursor} pulsando={pulsando} etiqueta={dibujando ? 'Figura' : undefined} />
      <Pie>colocas el elemento y lo ajustas por sus nodos</Pie>
    </Marco>
  )
}

// el cursor tira del mando de velocidad y el clip se encoge o se estira con él.
// el recorrido es de ida y vuelta, así que acaba en el mismo 0,5x del principio
function EscenaVelocidad({ t }: { t: number }) {
  const f = vaiven(t)
  const ritmo = 0.5 + 1.5 * f
  const ancho = 42 / ritmo
  const mando = 12 + 76 * f
  const segundos = 12 / ritmo

  return (
    <Marco>
      <Barra titulo="Velocidad del clip" acciones={['0,5x', '1x', '2x']} activa={ritmo < 0.9 ? 0 : ritmo < 1.6 ? 1 : 2} />

      <div className="absolute inset-x-[3%] top-[21%] h-[16%] rounded-md" style={{ background: PISTA }} />
      <span
        className="absolute overflow-hidden rounded-md"
        style={{ left: '4%', width: `${ancho}%`, top: '21%', height: '16%', background: AZUL }}
      >
        <Fotogramas n={Math.max(3, Math.round(ancho / 8))} />
      </span>

      {/* la duración resultante, que es lo que de verdad cambia al mover el mando */}
      <div className="absolute inset-x-[3%] top-[41%] flex h-[22%] items-center justify-between rounded-lg px-[4%]" style={{ background: PANEL }}>
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Duración
          </span>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--text)' }}>
            00:{String(Math.floor(segundos)).padStart(2, '0')}:
            {String(Math.floor((segundos % 1) * 100)).padStart(2, '0')}
          </span>
        </span>
        <span className="font-display text-2xl font-extrabold text-brand">
          {ritmo.toFixed(2).replace(/0$/, '')}x
        </span>
      </div>

      {/* el mando: el cursor lo lleva de un extremo a otro */}
      <div className="absolute inset-x-[12%] top-[70%] h-1.5 overflow-hidden rounded-full" style={{ background: 'rgb(var(--border) / 0.16)' }}>
        <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${f * 100}%` }} />
      </div>
      <span
        className="absolute top-[70%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-[25%] rounded-full border-2 border-white bg-brand shadow"
        style={{ left: `${mando}%` }}
      />
      <div className="absolute inset-x-[12%] top-[76%] flex justify-between text-[9px] font-medium" style={{ color: 'var(--muted)' }}>
        {['0,5x', '1x', '1,5x', '2x'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      <Cursor x={mando} y={71} pulsando etiqueta={`${ritmo.toFixed(1).replace('.', ',')}x`} />
      <Pie>la duración se recalcula mientras arrastras</Pie>
    </Marco>
  )
}

// el cursor pulsa cada proporción y el lienzo se reajusta. la última que pulsa
// es la misma con la que empezó, así que el ciclo vuelve a su primer fotograma
function EscenaLienzo({ t }: { t: number }) {
  const FORMAS = [
    { w: 62, h: 40, nombre: '16:9', x: 30 },
    { w: 38, h: 46, nombre: '1:1', x: 50 },
    { w: 26, h: 50, nombre: '9:16', x: 70 },
  ]
  // paradas del guion: cada una dice a qué proporción se salta y cuándo
  const PARADAS = [
    { t: 0, i: 0 },
    { t: 0.9, i: 1 },
    { t: 1.9, i: 2 },
    { t: 2.9, i: 0 },
  ]

  let k = 0
  for (let i = 0; i < PARADAS.length; i++) if (t >= PARADAS[i].t) k = i
  const destino = FORMAS[PARADAS[k].i]
  const origen = FORMAS[PARADAS[Math.max(0, k - 1)].i]
  const p = suave((t - PARADAS[k].t) / 0.5)
  const w = origen.w + (destino.w - origen.w) * p
  const h = origen.h + (destino.h - origen.h) * p

  const cursor = enRuta(t, [
    { t: 0, x: FORMAS[0].x, y: 82 },
    { t: 0.85, x: FORMAS[1].x, y: 82 },
    { t: 1.85, x: FORMAS[2].x, y: 82 },
    { t: 2.85, x: FORMAS[0].x, y: 82 },
    { t: CICLO, x: FORMAS[0].x, y: 82 },
  ])
  const pulsando = PARADAS.some((q) => t > q.t - 0.05 && t < q.t + 0.25)

  return (
    <Marco>
      <Barra titulo="Proporción del proyecto" acciones={['Rellenar', 'Ajustar']} activa={0} />

      {/* el visor ocupa toda la franja central; el encuadre vive dentro */}
      <div className="absolute inset-x-[3%] top-[20%] h-[50%] overflow-hidden rounded-lg" style={{ background: '#0b1424' }}>
        <div className="grid h-full place-items-center">
          <span
            className="relative overflow-hidden rounded-md"
            style={{ width: `${w}%`, height: `${h * 1.7}%`, background: 'linear-gradient(165deg, #1d3557, #4a8fd6)' }}
          >
            {/* bandas: el mismo plano ampliado y desenfocado detrás del encuadre */}
            <span
              className="absolute inset-0"
              style={{ background: 'linear-gradient(165deg, #4a8fd6, #1d3557)', filter: 'blur(9px)', transform: 'scale(1.6)' }}
            />
            <span
              className="absolute inset-x-0 top-1/2 h-[56%] -translate-y-1/2"
              style={{ background: 'linear-gradient(165deg, #123, #2f6bd6)' }}
            />
          </span>
        </div>
      </div>

      {/* los tres botones que el cursor va pulsando */}
      {FORMAS.map((forma, i) => {
        const activa = PARADAS[k].i === i
        return (
          <span
            key={forma.nombre}
            className="absolute top-[74%] -translate-x-1/2 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors duration-200"
            style={{
              left: `${forma.x}%`,
              background: activa ? 'rgb(var(--accent-boton))' : 'rgb(var(--surface))',
              color: activa ? '#fff' : 'var(--muted)',
              border: '1px solid rgb(var(--border) / 0.14)',
            }}
          >
            {forma.nombre}
          </span>
        )
      })}

      <Cursor {...cursor} pulsando={pulsando} />
      <Pie>cambias la proporción y las bandas se rellenan solas</Pie>
    </Marco>
  )
}

// el cursor baja y sube el volumen mientras el cabezal recorre la onda. el mando
// va de ida y vuelta, y el barrido del cabezal lo tapa el fundido de cierre
function EscenaAudio({ t }: { t: number }) {
  const avance = t / CICLO
  const BARRAS = 40
  const volumen = 0.5 + 0.36 * vaiven(t)
  const mando = 16 + 74 * volumen

  return (
    <Marco>
      <Barra titulo="Audio de la pista 1" acciones={['Normalizar', 'Silenciar']} />

      <div className="absolute inset-x-[3%] top-[21%] flex h-[36%] items-center gap-[2px] rounded-lg px-[2%]" style={{ background: PISTA }}>
        {Array.from({ length: BARRAS }, (_, k) => {
          const f = k / (BARRAS - 1)
          const alto =
            18 +
            Math.abs(Math.sin(k * 0.7)) * 40 +
            Math.abs(Math.sin(k * 0.23 + (2 * Math.PI * t) / CICLO)) * 30
          // la curva de ganancia baja al final del clip, y el mando la escala entera
          const ganancia = (f < 0.7 ? 1 : 1 - (f - 0.7) / 0.45) * volumen
          return (
            <span
              key={k}
              className="flex-1 rounded-sm"
              style={{
                height: `${alto * ganancia}%`,
                background: f <= avance ? 'rgb(var(--accent-boton))' : 'rgb(var(--border) / 0.3)',
              }}
            />
          )
        })}
      </div>

      <span
        className="absolute top-[19%] h-[40%] w-[2px] rounded-full bg-brand"
        style={{ left: `${3 + avance * 94}%` }}
      >
        <span className="absolute -left-[5px] -top-1 h-2.5 w-3 rounded-sm bg-brand" />
      </span>

      {/* mando de volumen, que es lo que el cursor está moviendo */}
      <div className="absolute inset-x-[3%] top-[62%] flex h-[14%] items-center gap-3 rounded-lg px-[4%]" style={{ background: PANEL }}>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Volumen
        </span>
        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgb(var(--border) / 0.16)' }}>
          <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${volumen * 100}%` }} />
        </span>
        <span className="w-9 shrink-0 text-right font-mono text-[11px] font-bold" style={{ color: 'var(--text)' }}>
          {Math.round(volumen * 100)}%
        </span>
      </div>
      <span
        className="absolute top-[68%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
        style={{ left: `${mando}%` }}
      />

      {/* franjas con ganancia propia, la otra forma de tocar el sonido */}
      <div className="absolute inset-x-[3%] top-[79%] flex h-[10%] gap-[2%]">
        {[0.55, 0.9, 0.4].map((g, i) => (
          <span key={i} className="relative flex-1 overflow-hidden rounded-md" style={{ background: PISTA }}>
            <span className="absolute inset-x-0 bottom-0 bg-brand" style={{ height: `${g * volumen * 130}%`, opacity: 0.6 }} />
          </span>
        ))}
      </div>

      <Cursor x={mando} y={69} pulsando />
      <Pie>subes el volumen general o el de una franja suelta</Pie>
    </Marco>
  )
}

// el cursor va pulsando teclas y la acción se enciende en la lista. la sexta
// pulsación repite la primera, con lo que el ciclo termina donde empezó
function EscenaAtajos({ t }: { t: number }) {
  const ATAJOS = [
    { tecla: 'S', accion: 'Dividir por el cabezal', x: 16, y: 30 },
    { tecla: 'Espacio', accion: 'Reproducir o pausar', x: 38, y: 30 },
    { tecla: '← →', accion: 'Mover el cabezal', x: 16, y: 52 },
    { tecla: 'Ctrl S', accion: 'Guardar el proyecto', x: 38, y: 52 },
    { tecla: 'Ctrl E', accion: 'Exportar el video', x: 27, y: 74 },
  ]
  const ORDEN = [0, 1, 2, 3, 4, 0]
  const paso = CICLO / ORDEN.length
  const slot = Math.min(ORDEN.length - 1, Math.floor(t / paso))
  const local = t - slot * paso
  const i = ORDEN[slot]
  const pulsando = local > paso * 0.42 && local < paso * 0.72

  const ruta: Punto[] = [
    { t: 0, x: ATAJOS[ORDEN[0]].x + 4, y: ATAJOS[ORDEN[0]].y + 5 },
    ...ORDEN.map((idx, k) => ({
      t: k * paso + paso * 0.42,
      x: ATAJOS[idx].x + 4,
      y: ATAJOS[idx].y + 5,
    })),
    { t: CICLO, x: ATAJOS[0].x + 4, y: ATAJOS[0].y + 5 },
  ]
  const cursor = enRuta(t, ruta)

  return (
    <Marco>
      <Barra titulo="Atajos de teclado" acciones={['Editar']} />

      {/* teclado a la izquierda, lista de acciones a la derecha: entre las dos
          mitades no queda hueco muerto */}
      <div className="absolute bottom-[12%] left-[3%] top-[20%] w-[48%] rounded-lg" style={{ background: PANEL }} />
      {ATAJOS.map((a, k) => {
        const activa = k === i
        return (
          <span
            key={a.tecla}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-3 py-2 font-mono text-[11px] font-bold transition-all duration-150"
            style={{
              left: `${a.x}%`,
              top: `${a.y}%`,
              background: activa ? 'rgb(var(--accent-boton))' : 'rgb(var(--surface))',
              color: activa ? '#fff' : 'var(--muted)',
              border: '1px solid rgb(var(--border) / 0.14)',
              boxShadow: activa && pulsando ? 'none' : '0 2px 0 rgb(var(--border) / 0.18)',
              transform: `translate(-50%, -50%) translateY(${activa && pulsando ? 2 : 0}px)`,
            }}
          >
            {a.tecla}
          </span>
        )
      })}

      <div className="absolute bottom-[12%] right-[3%] top-[20%] flex w-[42%] flex-col justify-center gap-[3%] rounded-lg p-[4%]" style={{ background: PANEL }}>
        {ATAJOS.map((a, k) => {
          const activa = k === i
          return (
            <span
              key={a.accion}
              className="rounded-md px-2 py-1.5 text-[10px] font-semibold transition-colors duration-200"
              style={{
                background: activa ? 'rgb(var(--accent) / 0.16)' : 'transparent',
                color: activa ? 'var(--text)' : 'var(--muted)',
              }}
            >
              {a.accion}
            </span>
          )
        })}
      </div>

      <Cursor {...cursor} pulsando={pulsando} />
      <Pie>cada tecla dispara la acción que tiene al lado</Pie>
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
  const [auto, setAuto] = useState(true)
  const [t, setT] = useState(0)
  const reloj = useRef(0)

  // al cambiar de característica la demostración se ve desde el principio
  useEffect(() => {
    reloj.current = 0
    setT(0)
  }, [activo])

  // el estado del pase se lee desde una referencia porque el bucle de dibujo lo
  // consulta en cada fotograma. teniéndolo como dependencia habría que rehacer el
  // bucle entero cada vez que se pausa, y el reloj daría un tirón
  const pasando = useRef(auto)
  useEffect(() => {
    pasando.current = auto
  }, [auto])

  // el reloj solo corre con la pieza a la vista. antes había dos tiempos por su
  // cuenta, el de la animación y un temporizador aparte que cambiaba de pestaña,
  // así que el salto caía en cualquier punto de la escena, casi nunca al final.
  // ahora manda uno solo: cuando la vuelta se completa, o se pasa a la siguiente
  // característica o se repite esta misma si el pase está detenido
  useEffect(() => {
    if (!visible) return
    let raf = 0
    let anterior = performance.now()
    const paso = (ahora: number) => {
      const avance = reloj.current + (ahora - anterior) / 1000
      anterior = ahora

      if (avance >= PERIODO) {
        // el reloj se pone a cero aquí mismo y no se espera al efecto del cambio
        // de característica: si no, los fotogramas de en medio volverían a ver la
        // vuelta cumplida y adelantarían varias pestañas de golpe
        reloj.current = 0
        setT(0)
        if (pasando.current) {
          setActivo((a) => {
            const i = items.findIndex((x) => x.id === a)
            return items[(i + 1) % items.length].id
          })
        }
      } else {
        reloj.current = avance
        setT(avance)
      }
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [visible, items])

  const actual = items.find((x) => x.id === activo) ?? items[0]

  const elegir = (id: string) => {
    setAuto(false)
    setActivo(id)
  }

  // mientras dura el solape conviven la cola de la vuelta anterior y la cabeza
  // de la nueva, una desvaneciéndose sobre la otra
  const solape = t < FUNDIDO
  const mezcla = solape ? t / FUNDIDO : 1

  return (
    <div ref={caja}>
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* la lista se desplaza en horizontal en móvil y se apila en pantalla
            grande, donde hay sitio para el texto de la elegida */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:h-full lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
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

        {/* la escena estira hasta el fondo de la fila, que es lo que deja las dos
            columnas terminando a la misma altura */}
        <div className="flex flex-col lg:h-full">
          <div
            className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl p-3 shadow-lg sm:aspect-[16/9] sm:p-4 lg:aspect-auto lg:min-h-[22rem] lg:flex-1"
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
                className="absolute inset-3 overflow-hidden rounded-xl sm:inset-4"
                style={{ background: 'rgb(var(--border) / 0.06)' }}
              >
                {solape && (
                  <div className="absolute inset-0" style={{ opacity: 1 - mezcla }}>
                    <Escena id={actual.id} t={t + PERIODO} />
                  </div>
                )}
                <div className="absolute inset-0" style={{ opacity: mezcla }}>
                  <Escena id={actual.id} t={t} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* en móvil el texto no cabe en la lista, así que se lee bajo la escena */}
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)] lg:hidden">
            {actual.texto}
          </p>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setAuto((a) => !a)}
              className="interactivo flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: 'rgb(var(--surface))',
                border: '1px solid rgb(var(--border) / 0.14)',
                color: 'var(--muted)',
              }}
            >
              {auto ? <Pause size={13} /> : <Play size={13} />}
              {auto ? 'Pausar el pase automático' : 'Reanudar el pase automático'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
