import { TipoImpacto } from '../../types/impacto'

// tipo de arrastre nativo con el que una bolita viaja desde la paleta del panel
// hasta un clip. lleva dentro el tipo de efecto elegido
export const TIPO_IMPACTO = 'application/x-ve-impacto'

// categorías de impactos, para los tabs del panel
export type CategoriaImpacto = 'camara' | 'neon'

export const NOMBRES_CATEGORIA_IMPACTO: Record<CategoriaImpacto, string> = {
  camara: 'Cámara',
  neon: 'Neón 3D',
}

// el catálogo de impactos: cada tipo con su nombre, su categoría y una breve
// descripción. el orden es el que se ve en la paleta de bolitas del panel
export interface DefImpacto {
  tipo: TipoImpacto
  nombre: string
  categoria: CategoriaImpacto
  descripcion: string
}

export const IMPACTOS: DefImpacto[] = [
  { tipo: 'rebote', nombre: 'Rebote', categoria: 'camara', descripcion: 'Golpe de zoom que rebota y se asienta.' },
  { tipo: 'zoom', nombre: 'Acercamiento', categoria: 'camara', descripcion: 'Se acerca y vuelve, suave.' },
  { tipo: 'sacudida', nombre: 'Sacudida', categoria: 'camara', descripcion: 'Tiembla un momento, como un golpe.' },
  { tipo: 'latido', nombre: 'Latido', categoria: 'camara', descripcion: 'Un par de pulsos rápidos.' },
  { tipo: 'flashNegro', nombre: 'Flash a negro', categoria: 'camara', descripcion: 'Se oscurece un instante y vuelve.' },
  { tipo: 'flashBlanco', nombre: 'Flash a blanco', categoria: 'camara', descripcion: 'Se aclara un instante y vuelve.' },
  { tipo: 'destello', nombre: 'Destello', categoria: 'camara', descripcion: 'Un fogonazo de luz seco.' },
  { tipo: 'parpadeo', nombre: 'Parpadeo', categoria: 'camara', descripcion: 'Parpadea a negro varias veces.' },
  { tipo: 'flashColor', nombre: 'Flash de color', categoria: 'camara', descripcion: 'Un destello del color elegido.' },
  { tipo: 'contorno', nombre: 'Contorno de neón', categoria: 'neon', descripcion: 'Enciende los bordes como líneas de neón.' },
  { tipo: 'lineas3d', nombre: 'Líneas 3D', categoria: 'neon', descripcion: 'Malla de curvas que envuelve la forma del objeto.' },
  { tipo: 'rayosObjeto', nombre: 'Rayos', categoria: 'neon', descripcion: 'Resplandor con destellos que emana del objeto.' },
]

// categoría a la que pertenece un tipo de impacto, para abrir su tab al seleccionarlo
export function categoriaImpacto(tipo: TipoImpacto): CategoriaImpacto {
  return IMPACTOS.find((i) => i.tipo === tipo)?.categoria ?? 'camara'
}

// nombre legible de un impacto por su tipo, para la interfaz
export function nombreImpacto(tipo: TipoImpacto): string {
  return IMPACTOS.find((i) => i.tipo === tipo)?.nombre ?? tipo
}

// el color por defecto de una bolita recién puesta: un celeste, como pidió el
// usuario. desde ahí se puede cambiar
export const COLOR_IMPACTO_DEF = '#38bdf8'

// valores de partida de un impacto, compartidos entre el store al crearlo y el
// editor al restablecer con doble clic
export const DUR_IMPACTO_DEF = 0.5
export const FUERZA_IMPACTO_DEF = 60

// estado geométrico y de velo que deja un impacto en un instante dado. lo usan
// por igual el visor y la exportación para que el efecto se vea idéntico
export interface EstadoImpacto {
  // factor de escala del cuadro entero (1 = sin cambio)
  escala: number
  // desplazamiento en fracción del alto del cuadro, para las sacudidas
  x: number
  y: number
  // desenfoque en fracción del alto del cuadro (0 = nítido)
  desenfoque: number
  // velo de color por encima de todo y su opacidad de 0 a 1
  veloColor: string
  veloOpacidad: number
}

const NEUTRO: EstadoImpacto = { escala: 1, x: 0, y: 0, desenfoque: 0, veloColor: '#000000', veloOpacidad: 0 }

// pseudoaleatorio estable a partir de un número: la misma p siempre da el mismo
// temblor, así el efecto no baila distinto entre el visor y la exportación
function ruido(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

// dado el tipo, el avance p (0 al empezar, 1 al terminar) y la intensidad de 0 a
// 100, devuelve cuánto deforma el cuadro. el golpe es más fuerte al principio y
// se va soltando, que es como se siente un impacto de verdad
export function estadoImpacto(tipo: TipoImpacto, p: number, intensidad: number, color: string): EstadoImpacto {
  if (p < 0 || p > 1) return NEUTRO
  const amp = Math.max(0, Math.min(100, intensidad)) / 100
  switch (tipo) {
    case 'rebote': {
      // un resorte amortiguado: salta al máximo y oscila de vuelta a 1
      const resorte = Math.exp(-4.5 * p) * Math.cos(7 * p)
      return { ...NEUTRO, escala: 1 + 0.3 * amp * resorte, desenfoque: 0.03 * amp * Math.exp(-7 * p) }
    }
    case 'zoom': {
      const f = Math.sin(Math.PI * p)
      return { ...NEUTRO, escala: 1 + 0.28 * amp * f, desenfoque: 0.012 * amp * f }
    }
    case 'sacudida': {
      const caida = Math.exp(-3 * p)
      return {
        ...NEUTRO,
        x: 0.05 * amp * caida * ruido(p * 37 + 1),
        y: 0.05 * amp * caida * ruido(p * 41 + 9),
        escala: 1 + 0.04 * amp * caida,
        desenfoque: 0.016 * amp * caida,
      }
    }
    case 'latido': {
      const f = Math.exp(-4.5 * p) * Math.abs(Math.sin(6 * p))
      return { ...NEUTRO, escala: 1 + 0.22 * amp * f, desenfoque: 0.01 * amp * f }
    }
    case 'flashNegro':
      return { ...NEUTRO, veloColor: '#000000', veloOpacidad: amp * Math.sin(Math.PI * p) }
    case 'flashBlanco':
      return { ...NEUTRO, veloColor: '#ffffff', veloOpacidad: amp * Math.sin(Math.PI * p) }
    case 'destello':
      // seco: aparece de golpe y se apaga
      return { ...NEUTRO, veloColor: '#ffffff', veloOpacidad: amp * Math.exp(-6 * p) }
    case 'parpadeo': {
      // estroboscopio a negro que se va calmando hacia el final
      const encendido = Math.sin(28 * p) > 0 ? 1 : 0
      return { ...NEUTRO, veloColor: '#000000', veloOpacidad: amp * encendido * (1 - p) }
    }
    case 'flashColor':
      return { ...NEUTRO, veloColor: color, veloOpacidad: amp * Math.sin(Math.PI * p) }
    default:
      return NEUTRO
  }
}

// el estado combinado de todos los impactos activos en un instante t. las escalas
// se multiplican, los desplazamientos y desenfoques se suman, y los velos se
// apilan quedándose con el más opaco por si dos se pisan
export function estadoImpactosEn(
  impactos: { t: number; duracion: number; tipo: TipoImpacto; intensidad: number; color: string }[],
  t: number,
): EstadoImpacto {
  let escala = 1
  let x = 0
  let y = 0
  let desenfoque = 0
  let veloColor = '#000000'
  let veloOpacidad = 0
  for (const im of impactos) {
    if (im.duracion <= 0) continue
    const p = (t - im.t) / im.duracion
    if (p < 0 || p > 1) continue
    const e = estadoImpacto(im.tipo, p, im.intensidad, im.color)
    escala *= e.escala
    x += e.x
    y += e.y
    desenfoque += e.desenfoque
    if (e.veloOpacidad > veloOpacidad) {
      veloOpacidad = e.veloOpacidad
      veloColor = e.veloColor
    }
  }
  return { escala, x, y, desenfoque, veloColor, veloOpacidad }
}
