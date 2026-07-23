import { AjusteTono } from '../../types/timeline'
import { tonoNeutro } from './tono'

// un preset de color no es más que una combinación de los ajustes que ya existen.
// gracias a eso no hace falta ningún motor aparte: aplicar uno es rellenar el tono
// del clip, y tanto el visor como la exportación lo pintan por el camino de
// siempre. así se pueden sumar todos los que se quieran sin tocar el render
export interface PresetColor {
  id: string
  nombre: string
  tono: AjusteTono
}

export interface CategoriaPreset {
  id: string
  nombre: string
  presets: PresetColor[]
}

// atajo para escribir los presets sin repetir los cinco campos cada vez
const t = (v: Partial<AjusteTono>): AjusteTono => ({ ...tonoNeutro, ...v })

export const CATEGORIAS_PRESET: CategoriaPreset[] = [
  {
    id: 'basicos',
    nombre: 'Básicos',
    presets: [
      { id: 'original', nombre: 'Original', tono: t({}) },
      { id: 'nitido', nombre: 'Nítido', tono: t({ contraste: 18, saturacion: 10 }) },
      { id: 'suave', nombre: 'Suave', tono: t({ contraste: -14, exposicion: 6, saturacion: -8 }) },
      { id: 'claro', nombre: 'Claro', tono: t({ exposicion: 20, contraste: -6 }) },
      { id: 'oscuro', nombre: 'Oscuro', tono: t({ exposicion: -20, contraste: 12 }) },
      { id: 'punch', nombre: 'Con fuerza', tono: t({ contraste: 30, saturacion: 24 }) },
    ],
  },
  {
    id: 'calidos',
    nombre: 'Cálidos',
    presets: [
      { id: 'dorado', nombre: 'Dorado', tono: t({ temperatura: 34, saturacion: 14, exposicion: 6 }) },
      { id: 'atardecer', nombre: 'Atardecer', tono: t({ temperatura: 46, tinte: 12, contraste: 10 }) },
      { id: 'arena', nombre: 'Arena', tono: t({ temperatura: 26, saturacion: -12, exposicion: 10 }) },
      { id: 'cobre', nombre: 'Cobre', tono: t({ temperatura: 40, saturacion: 20, contraste: 16 }) },
      { id: 'verano', nombre: 'Verano', tono: t({ temperatura: 20, saturacion: 26, exposicion: 8 }) },
    ],
  },
  {
    id: 'frios',
    nombre: 'Fríos',
    presets: [
      { id: 'luzfria', nombre: 'Luz fría', tono: t({ temperatura: -32, saturacion: 6 }) },
      { id: 'acero', nombre: 'Acero', tono: t({ temperatura: -26, saturacion: -18, contraste: 14 }) },
      { id: 'nocturno', nombre: 'Nocturno', tono: t({ temperatura: -38, exposicion: -16, contraste: 18 }) },
      { id: 'menta', nombre: 'Menta', tono: t({ temperatura: -18, tinte: -22, saturacion: 12 }) },
      { id: 'niebla', nombre: 'Niebla', tono: t({ temperatura: -12, contraste: -22, exposicion: 12, saturacion: -20 }) },
    ],
  },
  {
    id: 'cine',
    nombre: 'Cine',
    presets: [
      { id: 'tealorange', nombre: 'Naranja y azul', tono: t({ temperatura: 18, tinte: -14, contraste: 22, saturacion: 12 }) },
      { id: 'pelicula', nombre: 'Película', tono: t({ contraste: -10, saturacion: -14, exposicion: 6, temperatura: 8 }) },
      { id: 'drama', nombre: 'Dramático', tono: t({ contraste: 34, saturacion: -10, exposicion: -8 }) },
      { id: 'vintage', nombre: 'Antiguo', tono: t({ temperatura: 24, saturacion: -26, contraste: -12, exposicion: 8 }) },
      { id: 'noir', nombre: 'Negro clásico', tono: t({ saturacion: -100, contraste: 26 }) },
    ],
  },
  {
    id: 'byn',
    nombre: 'Blanco y negro',
    presets: [
      { id: 'byn', nombre: 'Blanco y negro', tono: t({ saturacion: -100 }) },
      { id: 'byn-suave', nombre: 'Suave', tono: t({ saturacion: -100, contraste: -16, exposicion: 8 }) },
      { id: 'byn-duro', nombre: 'Contrastado', tono: t({ saturacion: -100, contraste: 42 }) },
      { id: 'byn-calido', nombre: 'Cálido', tono: t({ saturacion: -86, temperatura: 30 }) },
      { id: 'byn-frio', nombre: 'Frío', tono: t({ saturacion: -86, temperatura: -30 }) },
    ],
  },
]

// compara el tono de un clip con el de un preset para marcar cuál está puesto.
// solo se miran los cinco ajustes básicos: si además se tocaron las ruedas o las
// curvas a mano, deja de considerarse que el preset sigue tal cual
export function presetAplicado(actual: AjusteTono | undefined, preset: PresetColor): boolean {
  if (!actual) return false
  return (
    actual.exposicion === preset.tono.exposicion &&
    actual.contraste === preset.tono.contraste &&
    actual.saturacion === preset.tono.saturacion &&
    actual.temperatura === preset.tono.temperatura &&
    actual.tinte === preset.tono.tinte
  )
}
