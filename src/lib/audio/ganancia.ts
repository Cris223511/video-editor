import { RegionAudio } from '../../types/audio'

// ganancia efectiva en un instante: si alguna franja lo cubre, prevalece la
// última definida; si no, se aplica el volumen general del proyecto
export function gananciaEn(regiones: RegionAudio[], volumenGeneral: number, t: number): number {
  for (let i = regiones.length - 1; i >= 0; i--) {
    const r = regiones[i]
    if (t >= r.inicio && t < r.inicio + r.duracion) return r.ganancia
  }
  return volumenGeneral
}

// cuánto deja pasar el fundido en un instante, de 0 a 1. la entrada abre el
// sonido desde el silencio durante sus primeros segundos y la salida lo cierra
// en los últimos. si los dos tramos se solapan en un bloque corto, manda el más
// cerrado de los dos, de modo que nunca suena más fuerte de lo que toca.
// devuelve 1 cuando no hay fundido, así que lo de siempre no cambia
export function fundidoEn(
  t: number,
  inicio: number,
  duracion: number,
  entrada = 0,
  salida = 0,
): number {
  if (entrada <= 0 && salida <= 0) return 1
  const desde = t - inicio
  const hasta = inicio + duracion - t
  let f = 1
  if (entrada > 0 && desde < entrada) f = Math.min(f, Math.max(0, desde / entrada))
  if (salida > 0 && hasta < salida) f = Math.min(f, Math.max(0, hasta / salida))
  return f
}
