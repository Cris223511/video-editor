import { AjusteTono } from '../../types/timeline'
import { EfectoClip } from '../../types/timeline'
import { Ruedas } from './ruedas'
import { Curvas } from './curvas'

// mezcla una corrección de color hacia lo neutro según un factor de 0 a 1. con 0
// devuelve el tono sin ningún efecto (todo a su valor de reposo) y con 1 el tono
// tal cual. sirve para que el color de un clip aparezca de forma progresiva: se
// evalúa el factor en cada fotograma y se pasa por aquí antes de armar el filtro
export function mezclarTono(t: AjusteTono, mix: number): AjusteTono {
  if (mix >= 1) return t
  const m = Math.max(0, mix)
  const ruedas: Ruedas | undefined = t.ruedas && {
    sombras: { x: t.ruedas.sombras.x * m, y: t.ruedas.sombras.y * m },
    medios: { x: t.ruedas.medios.x * m, y: t.ruedas.medios.y * m },
    altas: { x: t.ruedas.altas.x * m, y: t.ruedas.altas.y * m },
  }
  // una curva se acerca a la diagonal (que no cambia nada) llevando cada punto a
  // su propio x según baje el factor; con m=0 queda recta y con m=1, intacta
  const curvarCanal = (p: { x: number; y: number }[]) =>
    p.map((q) => ({ x: q.x, y: q.y * m + q.x * (1 - m) }))
  const curvas: Curvas | undefined = t.curvas && {
    maestra: curvarCanal(t.curvas.maestra),
    r: curvarCanal(t.curvas.r),
    g: curvarCanal(t.curvas.g),
    b: curvarCanal(t.curvas.b),
  }
  return {
    exposicion: t.exposicion * m,
    contraste: t.contraste * m,
    saturacion: t.saturacion * m,
    temperatura: t.temperatura * m,
    tinte: t.tinte * m,
    ruedas,
    curvas,
  }
}

// escala la intensidad de cada efecto por el mismo factor, para que entren a la
// par que el color
export function mezclarEfectos(efectos: EfectoClip[], mix: number): EfectoClip[] {
  if (mix >= 1) return efectos
  const m = Math.max(0, mix)
  return efectos.map((e) => ({ ...e, intensidad: e.intensidad * m }))
}

// factor de aparición del color y los efectos de un clip en un instante dado. sin
// transición de efecto configurada devuelve 1 (a pleno desde el arranque)
export function mixEntradaEfecto(inicio: number, duracion: number | undefined, playhead: number): number {
  if (!duracion || duracion <= 0) return 1
  const dentro = playhead - inicio
  if (dentro <= 0) return 0
  if (dentro >= duracion) return 1
  return dentro / duracion
}
