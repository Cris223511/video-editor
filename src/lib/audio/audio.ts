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
