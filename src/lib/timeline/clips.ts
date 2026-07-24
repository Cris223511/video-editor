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

// duración del proyecto entero, contando además de los clips de video las capas
// (texto, figura, imagen, dibujo, censura) y los audios y franjas. así un montaje
// hecho solo con elementos de la app, sin ningún video subido, tiene duración: la
// línea de tiempo se extiende, se reproduce y se exporta hasta donde llega el
// último elemento
export function duracionProyecto(
  clips: Clip[],
  capas: { inicio: number; duracion: number }[] = [],
  audios: { inicio: number; duracion: number }[] = [],
  regiones: { inicio: number; duracion: number }[] = [],
): number {
  let max = duracionTotal(clips)
  for (const c of capas) max = Math.max(max, c.inicio + c.duracion)
  for (const a of audios) max = Math.max(max, a.inicio + a.duracion)
  for (const r of regiones) max = Math.max(max, r.inicio + r.duracion)
  return max
}
