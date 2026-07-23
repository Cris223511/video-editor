import { EfectoClip, EfectoFiltro } from '../../types/timeline'

// un efecto del catálogo. css() devuelve las funciones de filtro que le
// corresponden a una intensidad dada, y esa misma cadena la usan el visor y la
// exportación, así que sumar efectos nuevos no obliga a tocar el render
export interface EfectoCatalogo {
  id: string
  nombre: string
  css: (i: number) => string
}

export interface CategoriaEfecto {
  id: string
  nombre: string
  efectos: EfectoCatalogo[]
}

// la intensidad llega de 0 a 100 y acá se traduce a la unidad de cada filtro
const p = (i: number) => Math.max(0, Math.min(1, i / 100))

export const CATEGORIAS_EFECTO: CategoriaEfecto[] = [
  {
    id: 'luz',
    nombre: 'Luz',
    efectos: [
      { id: 'brillo', nombre: 'Más luz', css: (i) => `brightness(${1 + p(i) * 0.6})` },
      { id: 'sombra', nombre: 'Menos luz', css: (i) => `brightness(${1 - p(i) * 0.55})` },
      { id: 'contraste', nombre: 'Contraste', css: (i) => `contrast(${1 + p(i) * 0.9})` },
      { id: 'plano', nombre: 'Aplanado', css: (i) => `contrast(${1 - p(i) * 0.5})` },
      { id: 'quemado', nombre: 'Quemado', css: (i) => `brightness(${1 + p(i) * 0.4}) contrast(${1 + p(i) * 0.5})` },
    ],
  },
  {
    id: 'color',
    nombre: 'Color',
    efectos: [
      { id: 'vivo', nombre: 'Vivo', css: (i) => `saturate(${1 + p(i) * 1.4})` },
      { id: 'apagado', nombre: 'Apagado', css: (i) => `saturate(${1 - p(i) * 0.9})` },
      { id: 'byn', nombre: 'Blanco y negro', css: (i) => `grayscale(${p(i)})` },
      { id: 'sepia', nombre: 'Sepia', css: (i) => `sepia(${p(i)})` },
      { id: 'negativo', nombre: 'Negativo', css: (i) => `invert(${p(i)})` },
      { id: 'giro', nombre: 'Giro de tono', css: (i) => `hue-rotate(${Math.round(p(i) * 180)}deg)` },
    ],
  },
  {
    id: 'epoca',
    nombre: 'Época',
    efectos: [
      { id: 'antiguo', nombre: 'Antiguo', css: (i) => `sepia(${p(i) * 0.8}) contrast(${1 + p(i) * 0.2}) saturate(${1 - p(i) * 0.3})` },
      { id: 'super8', nombre: 'Súper 8', css: (i) => `sepia(${p(i) * 0.5}) contrast(${1 + p(i) * 0.35}) brightness(${1 + p(i) * 0.12})` },
      { id: 'polaroid', nombre: 'Polaroid', css: (i) => `sepia(${p(i) * 0.32}) saturate(${1 - p(i) * 0.22}) brightness(${1 + p(i) * 0.14}) contrast(${1 - p(i) * 0.12})` },
      { id: 'periodico', nombre: 'Periódico', css: (i) => `grayscale(${p(i)}) contrast(${1 + p(i) * 0.7})` },
    ],
  },
  {
    id: 'ambiente',
    nombre: 'Ambiente',
    efectos: [
      { id: 'frio', nombre: 'Frío', css: (i) => `hue-rotate(${Math.round(-p(i) * 22)}deg) saturate(${1 + p(i) * 0.2})` },
      { id: 'calido', nombre: 'Cálido', css: (i) => `sepia(${p(i) * 0.45}) saturate(${1 + p(i) * 0.3})` },
      { id: 'noche', nombre: 'Noche', css: (i) => `brightness(${1 - p(i) * 0.45}) hue-rotate(${Math.round(-p(i) * 18)}deg) contrast(${1 + p(i) * 0.25})` },
      { id: 'nebuloso', nombre: 'Nebuloso', css: (i) => `contrast(${1 - p(i) * 0.35}) brightness(${1 + p(i) * 0.2}) saturate(${1 - p(i) * 0.35})` },
      { id: 'toxico', nombre: 'Tóxico', css: (i) => `hue-rotate(${Math.round(p(i) * 80)}deg) saturate(${1 + p(i) * 0.9})` },
    ],
  },
]

export function buscarEfecto(id: string): EfectoCatalogo | undefined {
  for (const c of CATEGORIAS_EFECTO) {
    const e = c.efectos.find((x) => x.id === id)
    if (e) return e
  }
  return undefined
}

export function esFiltro(e: EfectoClip): e is { id: string } & EfectoFiltro {
  return e.tipo === 'filtro'
}

// cadena css de todos los efectos de filtro de un clip, en el orden en que se
// aplicaron. el desenfoque de movimiento no entra acá: ese va por su propio
// filtro svg, porque encadenarlo con estos deja el fotograma en negro
export function cssEfectos(efectos: EfectoClip[] = []): string {
  return efectos
    .filter(esFiltro)
    .filter((e) => e.intensidad > 0)
    .map((e) => buscarEfecto(e.filtro)?.css(e.intensidad) ?? '')
    .filter(Boolean)
    .join(' ')
}
