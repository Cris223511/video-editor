// un punto de control de la curva. x es el nivel de luz que entra e y en qué se
// convierte, ambos de 0 a 1
export interface PuntoCurva {
  x: number
  y: number
}

// las cuatro curvas de un corrector clásico: una maestra que actúa sobre el
// brillo general y una por canal para trabajar el color
export interface Curvas {
  maestra: PuntoCurva[]
  r: PuntoCurva[]
  g: PuntoCurva[]
  b: PuntoCurva[]
}

// la diagonal, que es la curva que no cambia nada
export const CURVA_RECTA: PuntoCurva[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]

export const CURVAS_NEUTRAS: Curvas = {
  maestra: [...CURVA_RECTA],
  r: [...CURVA_RECTA],
  g: [...CURVA_RECTA],
  b: [...CURVA_RECTA],
}

export function curvaEsRecta(p: PuntoCurva[]): boolean {
  return p.length === 2 && p.every((q) => Math.abs(q.x - q.y) < 0.001)
}

export function curvasNeutras(c: Curvas): boolean {
  return curvaEsRecta(c.maestra) && curvaEsRecta(c.r) && curvaEsRecta(c.g) && curvaEsRecta(c.b)
}

// interpolación cúbica monótona (Fritsch y Carlson). frente a una spline
// corriente tiene la ventaja de que la curva nunca se pasa de rosca entre dos
// puntos: si los puntos suben, el tramo sube, y no aparecen jorobas que
// arruinarían la imagen
export function evaluar(puntos: PuntoCurva[], x: number): number {
  const p = [...puntos].sort((a, b) => a.x - b.x)
  const n = p.length
  if (n === 0) return x
  if (n === 1) return p[0].y
  if (x <= p[0].x) return p[0].y
  if (x >= p[n - 1].x) return p[n - 1].y

  // pendiente de cada tramo
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = p[i + 1].x - p[i].x
    d.push(dx > 0 ? (p[i + 1].y - p[i].y) / dx : 0)
  }

  // tangente en cada punto, empezando por la media de sus dos tramos
  const m: number[] = new Array(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2

  // corrección que garantiza que no haya oscilaciones
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }

  let i = 0
  while (i < n - 2 && x > p[i + 1].x) i++
  const h = p[i + 1].x - p[i].x
  const t = (x - p[i].x) / h
  const t2 = t * t
  const t3 = t2 * t
  const y =
    (2 * t3 - 3 * t2 + 1) * p[i].y +
    (t3 - 2 * t2 + t) * h * m[i] +
    (-2 * t3 + 3 * t2) * p[i + 1].y +
    (t3 - t2) * h * m[i + 1]
  return Math.max(0, Math.min(1, y))
}

// coloca un punto en la curva respetando el orden y sin permitir dos puntos en
// la misma vertical, que dejaría la curva indefinida
export function moverPunto(puntos: PuntoCurva[], indice: number, x: number, y: number): PuntoCurva[] {
  const p = puntos.map((q) => ({ ...q }))
  const ultimo = p.length - 1
  const margen = 0.01
  // los extremos solo suben y bajan; su x está clavada en 0 y en 1
  if (indice === 0) p[0] = { x: 0, y: Math.max(0, Math.min(1, y)) }
  else if (indice === ultimo) p[ultimo] = { x: 1, y: Math.max(0, Math.min(1, y)) }
  else {
    const min = p[indice - 1].x + margen
    const max = p[indice + 1].x - margen
    p[indice] = {
      x: Math.max(min, Math.min(max, x)),
      y: Math.max(0, Math.min(1, y)),
    }
  }
  return p
}

export function agregarPunto(puntos: PuntoCurva[], x: number, y: number): PuntoCurva[] {
  if (x <= 0.01 || x >= 0.99) return puntos
  if (puntos.some((p) => Math.abs(p.x - x) < 0.02)) return puntos
  return [...puntos, { x, y }].sort((a, b) => a.x - b.x)
}

// los extremos no se pueden quitar: sin ellos la curva dejaría de cubrir todo el
// rango de luz
export function quitarPunto(puntos: PuntoCurva[], indice: number): PuntoCurva[] {
  if (indice <= 0 || indice >= puntos.length - 1) return puntos
  return puntos.filter((_, i) => i !== indice)
}
