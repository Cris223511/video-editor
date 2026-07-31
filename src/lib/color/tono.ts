import { AjusteTono, EfectoClip } from '../../types/timeline'
import { PASOS, ruedasNeutras, valorCanal } from './ruedas'
import { curvasNeutras, evaluar, PuntoCurva } from './curvas'
import { NodoFiltro } from '../efectos/nitidezBrillo'

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
    (t.nitidez ?? 0) === 0 &&
    !usaTinte(t) &&
    !usaRuedas(t) &&
    !usaCurvas(t)
  )
}

// hay nitidez que aplicar (afilar o ablandar). va en el filtro svg del tono
export function usaNitidez(t: AjusteTono): boolean {
  return (t.nitidez ?? 0) !== 0
}

// nodos del filtro svg para la nitidez del tono, encadenados sobre lo que traiga la corrección
// de color anterior. al afilar se usa una máscara de desenfoque (unsharp mask): se difumina un
// poco y se resta esa versión suave de la original amplificada, que marca los bordes sin los
// artefactos que deja feConvolveMatrix. al ablandar (nitidez negativa) se aplica un desenfoque
// leve. el feOffset inicial (identidad) nombra el resultado anterior para poder referenciarlo
export function nodosNitidez(t: AjusteTono): NodoFiltro[] {
  const n = t.nitidez ?? 0
  if (n === 0) return []
  if (n > 0) {
    const a = (n / 100) * 1.3 // cuánto se realza el borde
    return [
      { tag: 'feOffset', attrs: { dx: '0', dy: '0', result: 'nitBase' } },
      { tag: 'feGaussianBlur', attrs: { in: 'nitBase', stdDeviation: '1.1', edgeMode: 'duplicate', result: 'nitSuave' } },
      {
        tag: 'feComposite',
        attrs: { in: 'nitBase', in2: 'nitSuave', operator: 'arithmetic', k1: '0', k2: (1 + a).toFixed(3), k3: (-a).toFixed(3), k4: '0' },
      },
    ]
  }
  // ablandar: un desenfoque gaussiano suave, tanto más cuanto más negativa la nitidez
  const sd = (-n / 100) * 2.4
  return [{ tag: 'feGaussianBlur', attrs: { stdDeviation: sd.toFixed(2), edgeMode: 'duplicate' } }]
}

// hay un tinte rápido activo (un color elegido con algo de fuerza)
export function usaTinte(t: AjusteTono): boolean {
  return !!t.tinteColor && (t.tinteFuerza ?? 0) > 0
}

// la temperatura, el tinte, el tinte rápido y las ruedas se resuelven con el filtro
// svg; el resto sale de las funciones nativas de filtro
export function usaMatriz(t: AjusteTono): boolean {
  return t.temperatura !== 0 || t.tinte !== 0 || usaTinte(t) || usaRuedas(t) || usaCurvas(t)
}

// cuánto stdDeviation en píxeles corresponde a la intensidad máxima. un valor
// alto se nota mucho sin llegar a borrar la imagen del todo
const DESENFOQUE_MAX_PX = 20

// componentes x/y del stdDeviation de cada desenfoque de movimiento del clip. el
// desenfoque de feGaussianBlur es direccional cuando se le dan dos valores: la
// intensidad se reparte entre los ejes según el ángulo (0 grados barre en
// horizontal, 90 en vertical) usando el coseno y el seno. se descartan los
// efectos sin intensidad, que no aportarían nada
export function stdDeviationsDesenfoque(efectos: EfectoClip[]): string[] {
  return efectos
    .filter(
      (e): e is EfectoClip & { tipo: 'desenfoque-movimiento'; angulo: number } =>
        e.tipo === 'desenfoque-movimiento' && e.intensidad > 0,
    )
    .map((e) => {
      const mag = (e.intensidad / 100) * DESENFOQUE_MAX_PX
      const rad = (e.angulo * Math.PI) / 180
      const x = Math.abs(Math.cos(rad)) * mag
      const y = Math.abs(Math.sin(rad)) * mag
      return `${x.toFixed(2)} ${y.toFixed(2)}`
    })
}

// hay algún efecto que obligue a montar el filtro svg del clip
export function hayEfectoFiltro(efectos: EfectoClip[]): boolean {
  return stdDeviationsDesenfoque(efectos).length > 0
}

// cadena de filtro css para el video. brillo, contraste y saturación son
// nativos; la temperatura, el tinte y el desenfoque de movimiento se resuelven
// con el filtro svg referenciado, que se enlaza si hay color que corregir o
// algún efecto activo
export function filtroCss(t: AjusteTono, idFiltro: string, efectos: EfectoClip[] = []): string {
  const partes = [
    `brightness(${1 + t.exposicion / 100})`,
    `contrast(${1 + t.contraste / 100})`,
    `saturate(${1 + t.saturacion / 100})`,
  ]
  if (usaMatriz(t) || usaNitidez(t) || hayEfectoFiltro(efectos)) partes.push(`url(#${idFiltro})`)
  return partes.join(' ')
}

// lee un color hex (#rgb o #rrggbb) a sus tres canales en 0..1. si viene raro
// devuelve blanco, que como gel no altera nada
function hexA01(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (h.length !== 6) return [1, 1, 1]
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return [1, 1, 1]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// pesos de luminancia (rec. 709): cuánto aporta cada canal al brillo percibido. se
// usan para teñir sin oscurecer, mapeando el gris de cada píxel al color elegido
const LUMA: [number, number, number] = [0.2126, 0.7152, 0.0722]

// matriz 3x3 del tinte rápido. la idea es un virado hacia el color, como un duotono:
// se toma la luminancia del píxel y se pinta con el color elegido (normalizado para que
// su propio brillo sea 1 y no apague la imagen), y la fuerza mezcla entre no tocar nada
// y el virado a pleno. al ser una transformación lineal cabe entera en la feColorMatrix,
// así se ve igual en el visor, la exportación y la portada
function matrizTinte(t: AjusteTono): number[][] {
  const I = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  if (!usaTinte(t)) return I
  const f = Math.max(0, Math.min(1, (t.tinteFuerza ?? 0) / 100))
  const rgb = hexA01(t.tinteColor as string)
  const brillo = Math.max(rgb[0] * LUMA[0] + rgb[1] * LUMA[1] + rgb[2] * LUMA[2], 0.001)
  const col = rgb.map((c) => c / brillo) // color con luminancia 1
  const m: number[][] = []
  for (let i = 0; i < 3; i++) {
    m[i] = []
    for (let j = 0; j < 3; j++) {
      const identidad = i === j ? 1 : 0
      m[i][j] = (1 - f) * identidad + f * col[i] * LUMA[j]
    }
  }
  return m
}

// valores de la matriz: la temperatura sube el rojo y baja el azul (o al revés para
// enfriar), y el tinte ajusta el verde hacia magenta o verde. eso es una diagonal, y
// encima se compone el virado del tinte rápido. como la diagonal actúa primero, la
// matriz final es el tinte por la diagonal, canal a canal
export function matrizTono(t: AjusteTono): string {
  const temp = t.temperatura / 100
  const tin = t.tinte / 100
  const d = [1 + temp * 0.35, 1 + tin * 0.35, 1 - temp * 0.35] // diagonal temp/tinte
  const m = matrizTinte(t)
  const fila = (i: number) =>
    `${m[i][0] * d[0]} ${m[i][1] * d[1]} ${m[i][2] * d[2]} 0 0`
  return `${fila(0)} ${fila(1)} ${fila(2)} 0 0 0 1 0`
}
