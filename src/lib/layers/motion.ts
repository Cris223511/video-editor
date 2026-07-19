import { CapaBase, KeyframePos } from '../../types/layers'

// interpolación suave entre los puntos de un recorrido, con la variante monótona
// de Catmull-Rom (Fritsch-Carlson). la curva pasa por todos los nodos y no se
// pasa de rosca entre ellos, así que un recorrido no se sale por fuera de los
// puntos que lo definen aunque estén muy juntos o muy separados.
//
// cada punto puede llevar además sus propios tiradores de curvatura, hx y hy,
// que desvían la tangente en ese nodo. si no los lleva, la tangente se calcula
// sola a partir de los vecinos, que es lo que da el trazo redondeado por defecto.

// tangente automática en un nodo, promediando la pendiente de los dos tramos que
// lo tocan. en los extremos se usa solo el tramo que hay
function tangente(k: KeyframePos[], i: number, eje: 'x' | 'y') {
  const ant = k[i - 1]
  const act = k[i]
  const sig = k[i + 1]
  if (!ant) return ((sig[eje] - act[eje]) / Math.max(1e-4, sig.t - act.t)) || 0
  if (!sig) return ((act[eje] - ant[eje]) / Math.max(1e-4, act.t - ant.t)) || 0
  return ((sig[eje] - ant[eje]) / Math.max(1e-4, sig.t - ant.t)) || 0
}

// evalúa la curva de Hermite en un eje entre dos nodos, con sus tangentes
function hermite(p0: number, p1: number, m0: number, m1: number, dt: number, f: number) {
  const f2 = f * f
  const f3 = f2 * f
  const h00 = 2 * f3 - 3 * f2 + 1
  const h10 = f3 - 2 * f2 + f
  const h01 = -2 * f3 + 3 * f2
  const h11 = f3 - f2
  return h00 * p0 + h10 * dt * m0 + h01 * p1 + h11 * dt * m1
}

// tangente efectiva de un nodo: si lleva tirador propio se usa, si no se calcula
function tangenteNodo(k: KeyframePos[], i: number, eje: 'x' | 'y') {
  const n = k[i]
  const propio = eje === 'x' ? n.hx : n.hy
  return propio === undefined ? tangente(k, i, eje) : propio
}

// posición del centro de una capa en un instante del proyecto. sin keyframes es
// fija; con dos o más se interpola con la curva suave; con uno solo, ese punto.
// fuera del rango se mantiene el primero o el último
export function posicionCapa(capa: CapaBase, playhead: number): { x: number; y: number } {
  const k = capa.keyframes
  if (k.length === 0) return { x: capa.x, y: capa.y }
  if (k.length === 1) return { x: k[0].x, y: k[0].y }

  const tRel = playhead - capa.inicio
  if (tRel <= k[0].t) return { x: k[0].x, y: k[0].y }

  const ultimo = k[k.length - 1]
  if (tRel >= ultimo.t) return { x: ultimo.x, y: ultimo.y }

  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]
    const b = k[i + 1]
    if (tRel >= a.t && tRel <= b.t) {
      const dt = b.t - a.t
      if (dt <= 0) return { x: b.x, y: b.y }
      const f = (tRel - a.t) / dt
      return {
        x: hermite(a.x, b.x, tangenteNodo(k, i, 'x'), tangenteNodo(k, i + 1, 'x'), dt, f),
        y: hermite(a.y, b.y, tangenteNodo(k, i, 'y'), tangenteNodo(k, i + 1, 'y'), dt, f),
      }
    }
  }
  return { x: ultimo.x, y: ultimo.y }
}

// muestrea la curva en muchos puntos, para dibujar el trazo sobre el visor como
// una línea continua en lugar de segmentos rectos entre nodos
export function trazarRecorrido(capa: CapaBase, muestras = 12): { x: number; y: number }[] {
  const k = capa.keyframes
  if (k.length < 2) return k.map((p) => ({ x: p.x, y: p.y }))

  const salida: { x: number; y: number }[] = []
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]
    const b = k[i + 1]
    const dt = b.t - a.t
    const pasos = i === k.length - 2 ? muestras : muestras - 1
    for (let s = 0; s <= pasos; s++) {
      const f = s / muestras
      if (dt <= 0) {
        salida.push({ x: b.x, y: b.y })
        continue
      }
      salida.push({
        x: hermite(a.x, b.x, tangenteNodo(k, i, 'x'), tangenteNodo(k, i + 1, 'x'), dt, f),
        y: hermite(a.y, b.y, tangenteNodo(k, i, 'y'), tangenteNodo(k, i + 1, 'y'), dt, f),
      })
    }
  }
  return salida
}

// simplifica un recorrido grabado a pulso. mover el ratón deja cientos de puntos
// casi iguales, imposibles de editar de uno en uno y absurdos de guardar. el
// algoritmo de Ramer-Douglas-Peucker se queda solo con los que definen la forma:
// conserva los dos extremos y, entre ellos, el punto que más se aleja de la recta
// que los une; si esa distancia supera la tolerancia, ese punto se guarda y el
// tramo se parte en dos, que se simplifican igual. si no, todo el tramo se
// reduce a la recta.
//
// la distancia se mide en el plano x,y normalizado, no en el tiempo: lo que
// importa es por dónde pasa el elemento, y el instante de cada nodo conservado se
// mantiene tal cual para no descuadrar el recorrido con el video.
function distanciaARecta(p: KeyframePos, a: KeyframePos, b: KeyframePos): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const largo2 = dx * dx + dy * dy
  if (largo2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  // proyección del punto sobre el segmento, acotada a sus extremos
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function simplificarRecorrido(k: KeyframePos[], tolerancia = 0.012): KeyframePos[] {
  if (k.length <= 2) return k

  let maxDist = 0
  let indice = 0
  for (let i = 1; i < k.length - 1; i++) {
    const d = distanciaARecta(k[i], k[0], k[k.length - 1])
    if (d > maxDist) {
      maxDist = d
      indice = i
    }
  }

  if (maxDist > tolerancia) {
    const izq = simplificarRecorrido(k.slice(0, indice + 1), tolerancia)
    const der = simplificarRecorrido(k.slice(indice), tolerancia)
    // el punto de corte queda repetido entre las dos mitades, se quita uno
    return [...izq.slice(0, -1), ...der]
  }
  return [k[0], k[k.length - 1]]
}
