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

// igual que fundidoEn pero con curva de IGUAL POTENCIA (equal-power) para el AUDIO. una rampa
// lineal de amplitud (la que usa fundidoEn, buena para la opacidad visual) suena "callada al
// principio y de golpe al final", porque el oído percibe el volumen en escala logarítmica: la
// mitad de amplitud ya son −6 dB, casi todo el recorrido audible queda amontonado al final. con
// sin(x·π/2) el sonido aparece de forma pareja, de menos a más, y se asienta suave al llegar a
// pleno. cuanto más largo el fundido, más lento el recorrido, igual que antes
export function fundidoAudioEn(
  t: number,
  inicio: number,
  duracion: number,
  entrada = 0,
  salida = 0,
): number {
  if (entrada <= 0 && salida <= 0) return 1
  const curva = (x: number) => Math.sin(Math.max(0, Math.min(1, x)) * (Math.PI / 2))
  const desde = t - inicio
  const hasta = inicio + duracion - t
  let f = 1
  if (entrada > 0 && desde < entrada) f = Math.min(f, curva(desde / entrada))
  if (salida > 0 && hasta < salida) f = Math.min(f, curva(hasta / salida))
  return f
}
