import { AjusteTono } from '../../types/timeline'
import { PASOS, ruedasNeutras, valorCanal } from './ruedas'
import { curvasNeutras, evaluar, PuntoCurva } from './curvas'

// hay corrección por zonas tonales que aplicar
export function usaRuedas(t: AjusteTono): boolean {
  return t.ruedas !== undefined && !ruedasNeutras(t.ruedas)
}

export function usaCurvas(t: AjusteTono): boolean {
  return t.curvas !== undefined && !curvasNeutras(t.curvas)
}

// tablas de transferencia por canal para feComponentTransfer, o null si no hay
// nada que corregir. ruedas y curvas se resuelven en una sola tabla: primero
// actúan las ruedas sobre cada canal, luego la curva de ese canal y por último
// la maestra, que es el orden habitual en un corrector de color
export function tablasColor(t: AjusteTono): [string, string, string] | null {
  const hayRuedas = usaRuedas(t)
  const hayCurvas = usaCurvas(t)
  if (!hayRuedas && !hayCurvas) return null

  const porCanal: PuntoCurva[][] = t.curvas
    ? [t.curvas.r, t.curvas.g, t.curvas.b]
    : [[], [], []]

  const construir = (indice: 0 | 1 | 2) => {
    const valores: number[] = []
    for (let i = 0; i < PASOS; i++) {
      const x = i / (PASOS - 1)
      let y = hayRuedas && t.ruedas ? valorCanal(t.ruedas, indice, x) : x
      if (hayCurvas && t.curvas) {
        y = evaluar(porCanal[indice], y)
        y = evaluar(t.curvas.maestra, y)
      }
      valores.push(Number(Math.max(0, Math.min(1, y)).toFixed(4)))
    }
    return valores.join(' ')
  }

  return [construir(0), construir(1), construir(2)]
}

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
    t.tinte === 0 &&
    !usaRuedas(t) &&
    !usaCurvas(t)
  )
}

// la temperatura, el tinte y las ruedas se resuelven con el filtro svg; el resto
// sale de las funciones nativas de filtro
export function usaMatriz(t: AjusteTono): boolean {
  return t.temperatura !== 0 || t.tinte !== 0 || usaRuedas(t) || usaCurvas(t)
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
