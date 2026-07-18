import { CapaBase } from '../../types/layers'

// posición del centro de una capa en un instante del proyecto. sin keyframes es
// fija; con keyframes se interpola linealmente entre los puntos, y fuera del
// rango se mantiene el primero o el último
export function posicionCapa(capa: CapaBase, playhead: number): { x: number; y: number } {
  const k = capa.keyframes
  if (k.length === 0) return { x: capa.x, y: capa.y }

  const tRel = playhead - capa.inicio
  if (tRel <= k[0].t) return { x: k[0].x, y: k[0].y }

  const ultimo = k[k.length - 1]
  if (tRel >= ultimo.t) return { x: ultimo.x, y: ultimo.y }

  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i]
    const b = k[i + 1]
    if (tRel >= a.t && tRel <= b.t) {
      const f = b.t === a.t ? 0 : (tRel - a.t) / (b.t - a.t)
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
    }
  }
  return { x: ultimo.x, y: ultimo.y }
}
