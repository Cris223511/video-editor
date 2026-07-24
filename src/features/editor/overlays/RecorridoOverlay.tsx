import { MouseEvent as ReactMouseEvent } from 'react'
import { Capa, KeyframePos } from '../../../types/layers'
import { useEditorStore } from '../../../store/useEditorStore'
import { trazarRecorrido } from '../../../lib/layers/motion'

interface Rect {
  ox: number
  oy: number
  w: number
  h: number
}

// segundos que representa el largo del tirador en pantalla. hx/hy son pendientes
// (unidades normalizadas por segundo), así que para dibujarlas como un vector
// corto que sale del nodo hay que multiplicarlas por un tiempo. con tau fijo el
// tirador queda a una distancia predecible del nodo y el mapeo inverso (deducir
// la pendiente a partir de dónde se soltó el tirador) es directo: pendiente =
// desplazamiento_normalizado / tau. 0.3 s da un brazo cómodo sin invadir la escena
const TAU = 0.3

// mismo cálculo de tangente automática que usa la interpolación cuando un nodo no
// trae tirador propio: se promedia la pendiente de los dos tramos que lo tocan, y
// en los extremos se usa solo el tramo disponible. sirve para dibujar el tirador
// donde ya apunta la curva, de modo que agarrarlo no da un salto
function tangenteAuto(k: KeyframePos[], i: number, eje: 'x' | 'y') {
  const ant = k[i - 1]
  const act = k[i]
  const sig = k[i + 1]
  if (!ant) return (sig[eje] - act[eje]) / Math.max(1e-4, sig.t - act.t) || 0
  if (!sig) return (act[eje] - ant[eje]) / Math.max(1e-4, act.t - ant.t) || 0
  return (sig[eje] - ant[eje]) / Math.max(1e-4, sig.t - ant.t) || 0
}

// dibuja el recorrido grabado de una capa sobre el visor y deja retocarlo. la
// línea muestra por dónde pasa el elemento a lo largo del tiempo; cada nodo se
// arrastra para corregir el trazo, se borra con doble clic y lleva un par de
// tiradores para ajustar cuánto se curva la trayectoria a su paso
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
  const insertarKeyframe = useEditorStore((s) => s.insertarKeyframe)
  const setTiradorNodo = useEditorStore((s) => s.setTiradorNodo)
  const playhead = useEditorStore((s) => s.playhead)
  const grabando = useEditorStore((s) => s.grabandoMovimiento)
  const editandoNodos = useEditorStore((s) => s.editandoNodos)

  // color con el que se pinta el recorrido; el usuario lo puede cambiar para que
  // resalte sobre el fondo. sin elegir, el rojo de siempre
  const color = capa.colorRuta ?? '#ff2d2d'

  const k = capa.keyframes
  if (k.length < 1) return null

  // con el pincel activo, pulsar sobre la línea mete un nodo nuevo por donde se
  // pulsa. el instante se saca proyectando el clic sobre el tramo más cercano entre
  // dos nodos, así el punto se cuela en el sitio del recorrido que le toca
  function insertarEnClic(e: ReactMouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const p = normalizar(e.nativeEvent)
    if (k.length < 2) {
      insertarKeyframe(capa.id, k.length ? k[0].t + 0.3 : 0, p.x, p.y)
      return
    }
    let mejor = { d: Infinity, i: 0, f: 0 }
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i]
      const b = k[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const largo2 = dx * dx + dy * dy
      let f = largo2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2 : 0
      f = Math.max(0, Math.min(1, f))
      const d = Math.hypot(p.x - (a.x + f * dx), p.y - (a.y + f * dy))
      if (d < mejor.d) mejor = { d, i, f }
    }
    const a = k[mejor.i]
    const b = k[mejor.i + 1]
    insertarKeyframe(capa.id, a.t + (b.t - a.t) * mejor.f, p.x, p.y)
  }

  function agarrar(e: ReactMouseEvent, indice: number) {
    e.stopPropagation()
    e.preventDefault()
    // con el pincel, pulsar un nodo lo borra en vez de arrastrarlo
    if (editandoNodos) {
      quitarKeyframe(capa.id, indice)
      return
    }
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

  // arrastre de un tirador: la punta suelta define un desplazamiento respecto al
  // nodo, y ese desplazamiento (ya en unidades normalizadas 0..1) dividido por tau
  // es la pendiente. lado indica si es el tirador de entrada o el de salida; el de
  // entrada apunta al revés, por eso se invierte el signo antes de guardar
  function agarrarTirador(e: ReactMouseEvent, indice: number, lado: 1 | -1) {
    e.stopPropagation()
    e.preventDefault()
    const nodo = k[indice]
    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const hx = (lado * (p.x - nodo.x)) / TAU
      const hy = (lado * (p.y - nodo.y)) / TAU
      setTiradorNodo(capa.id, indice, hx, hy)
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

  // el trazo sigue la curva suave, no las rectas entre nodos, así que lo que se
  // ve dibujado coincide con el recorrido real del elemento
  const trazo = trazarRecorrido(capa)
    .map((p) => `${aPantalla(p).cx},${aPantalla(p).cy}`)
    .join(' ')
  // instante del recorrido en el que está el cabezal, para saber qué tramo se
  // está viendo mientras se retoca
  const tRel = playhead - capa.inicio

  // los tiradores solo tienen sentido cuando se edita un recorrido ya hecho, con
  // al menos dos nodos que definan una curva. mientras se graba estorban y no se
  // muestran
  const mostrarTiradores = !grabando && k.length >= 2

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      style={{ cursor: editandoNodos ? 'crosshair' : undefined }}
    >
      {/* la línea va doble: una oscura debajo para que se vea sobre imágenes
          claras, y la de color encima, a juego con los nodos */}
      <polyline points={trazo} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth={4} strokeLinejoin="round" />
      <polyline
        points={trazo}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray="6 4"
      />

      {/* franja ancha e invisible sobre la línea que, con el pincel activo, recoge
          el clic para insertar un nodo donde se pulse. va por debajo de los nodos,
          así pulsar justo encima de uno lo borra en vez de crear otro */}
      {editandoNodos && (
        <polyline
          points={trazo}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.01}
          strokeWidth={18}
          className="pointer-events-auto cursor-crosshair"
          style={{ pointerEvents: 'stroke' }}
          onMouseDown={insertarEnClic}
        />
      )}

      {/* tiradores primero, para que queden por debajo de los nodos y no tapen el
          punto que se arrastra */}
      {mostrarTiradores &&
        k.map((p, i) => {
          const { cx, cy } = aPantalla(p)
          // se dibuja el tirador donde ya apunta la curva: si el nodo trae pendiente
          // propia se usa, y si no la automática, así agarrarlo no provoca un salto
          const mx = p.hx ?? tangenteAuto(k, i, 'x')
          const my = p.hy ?? tangenteAuto(k, i, 'y')
          // la pendiente (por segundo) se lleva a un desplazamiento en pantalla
          // multiplicando por tau y por el tamaño del visor en cada eje
          const dx = mx * TAU * rect.w
          const dy = my * TAU * rect.h
          return (
            <g key={`t-${i}`}>
              <line x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} stroke="rgba(0,0,0,.4)" strokeWidth={2} />
              <line x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} stroke="#ffb4b4" strokeWidth={1} />
              {/* tirador de salida */}
              <circle
                cx={cx + dx}
                cy={cy + dy}
                r={4}
                fill="#fff"
                stroke={color}
                strokeWidth={1.5}
                className="pointer-events-auto cursor-move"
                onMouseDown={(e) => agarrarTirador(e, i, 1)}
              >
                <title>{`Curvatura del punto ${i + 1}`}</title>
              </circle>
              {/* tirador de entrada, simétrico */}
              <circle
                cx={cx - dx}
                cy={cy - dy}
                r={4}
                fill="#fff"
                stroke={color}
                strokeWidth={1.5}
                className="pointer-events-auto cursor-move"
                onMouseDown={(e) => agarrarTirador(e, i, -1)}
              >
                <title>{`Curvatura del punto ${i + 1}`}</title>
              </circle>
            </g>
          )
        })}

      {k.map((p, i) => {
        const { cx, cy } = aPantalla(p)
        // el nodo por el que pasa el cabezal se resalta un poco más
        const actual = i < k.length - 1 ? tRel >= p.t && tRel < k[i + 1].t : tRel >= p.t
        const r = actual ? 8 : 6
        return (
          <g key={i}>
            {/* aro rojo con relleno claro: el nodo destaca sobre el video */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={actual ? '#ffe3e3' : '#fff'}
              stroke={color}
              strokeWidth={actual ? 3 : 2}
              className="pointer-events-auto cursor-grab"
              onMouseDown={(e) => agarrar(e, i)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                quitarKeyframe(capa.id, i)
              }}
            >
              <title>{`Punto ${i + 1} · segundo ${p.t.toFixed(2)}`}</title>
            </circle>
            {/* punto central macizo, el corazón del nodo */}
            <circle cx={cx} cy={cy} r={actual ? 3 : 2} fill={color} className="pointer-events-none" />
          </g>
        )
      })}
    </svg>
  )
}
