import { AjusteTono } from '../../types/timeline'

export const tonoNeutro: AjusteTono = {
  exposicion: 0,
  contraste: 0,
  saturacion: 0,
  temperatura: 0,
  tinte: 0,
}

export function esTonoNeutro(t: AjusteTono): boolean {
  return (
    t.exposicion === 0 &&
    t.contraste === 0 &&
    t.saturacion === 0 &&
    t.temperatura === 0 &&
    t.tinte === 0
  )
}

// la temperatura y el tinte necesitan una matriz de color (feColorMatrix); el
// resto se resuelve con funciones nativas de filtro
export function usaMatriz(t: AjusteTono): boolean {
  return t.temperatura !== 0 || t.tinte !== 0
}

// cadena de filtro css para el video. brillo, contraste y saturación son
// nativos; la temperatura y el tinte se aplican con la matriz svg referenciada
export function filtroCss(t: AjusteTono, idFiltro: string): string {
  const partes = [
    `brightness(${1 + t.exposicion / 100})`,
    `contrast(${1 + t.contraste / 100})`,
    `saturate(${1 + t.saturacion / 100})`,
  ]
  if (usaMatriz(t)) partes.push(`url(#${idFiltro})`)
  return partes.join(' ')
}

// valores de la matriz: la temperatura sube el rojo y baja el azul (o al revés
// para enfriar), y el tinte ajusta el verde hacia magenta o verde
export function matrizTono(t: AjusteTono): string {
  const temp = t.temperatura / 100
  const tin = t.tinte / 100
  const rr = 1 + temp * 0.35
  const gg = 1 + tin * 0.35
  const bb = 1 - temp * 0.35
  return `${rr} 0 0 0 0 0 ${gg} 0 0 0 0 0 ${bb} 0 0 0 0 0 1 0`
}
