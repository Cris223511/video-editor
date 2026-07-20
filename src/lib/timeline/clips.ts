import { Clip } from '../../types/timeline'

// devuelve el clip visible en un instante dado, o null si cae en un hueco o más
// allá del final. cuando varios clips de distintos niveles coinciden en el mismo
// segundo gana el de la pista más alta, que es el criterio de cualquier editor:
// lo que está arriba tapa lo que está debajo. si se le pasan las pistas ocultas,
// esos niveles se saltan como si no estuvieran, de modo que al esconder el de
// arriba aflora el de debajo, o nada si no queda ninguno
export function clipEnTiempo(clips: Clip[], t: number, ocultas?: Set<number>): Clip | null {
  let visible: Clip | null = null
  for (const c of clips) {
    if (ocultas?.has(c.pista)) continue
    if (t < c.inicio || t >= c.inicio + c.duracion) continue
    if (!visible || c.pista > visible.pista) visible = c
  }
  return visible
}

// duración total del proyecto: el final del clip que termina más tarde, mirando
// todas las pistas a la vez
export function duracionTotal(clips: Clip[]): number {
  return clips.reduce((max, c) => Math.max(max, c.inicio + c.duracion), 0)
}
