import { Clip } from '../../types/timeline'

// devuelve el clip que ocupa un instante dado de la pista, o null si cae en un
// hueco o más allá del final
export function clipEnTiempo(clips: Clip[], t: number): Clip | null {
  for (const c of clips) {
    if (t >= c.inicio && t < c.inicio + c.duracion) return c
  }
  return null
}

// duración total de la pista: el final del clip que termina más tarde
export function duracionTotal(clips: Clip[]): number {
  return clips.reduce((max, c) => Math.max(max, c.inicio + c.duracion), 0)
}
