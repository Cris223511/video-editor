import { TipoImpacto, DireccionImpacto } from '../../types/impacto'

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
  // no se muestra en la paleta, pero se conserva para que los proyectos guardados con ese
  // tipo sigan resolviendo su nombre y su animación. lo usan los flash viejos (a negro y a
  // blanco) que se unificaron en un solo "Flash" con color elegible
  oculto?: boolean
}

export const IMPACTOS: DefImpacto[] = [
  { tipo: 'rebote', nombre: 'Rebote', categoria: 'camara', descripcion: 'Golpe de zoom que rebota y se asienta.' },
  { tipo: 'zoom', nombre: 'Acercamiento', categoria: 'camara', descripcion: 'Se acerca y vuelve, suave.' },
  { tipo: 'sacudida', nombre: 'Sacudida', categoria: 'camara', descripcion: 'Tiembla un momento, como un golpe.' },
  { tipo: 'latido', nombre: 'Latido', categoria: 'camara', descripcion: 'Un par de pulsos rápidos.' },
  { tipo: 'movimiento', nombre: 'Movimiento', categoria: 'camara', descripcion: 'Barrido de cámara: la imagen se desenfoca con estelas en el sentido del movimiento, como cuando mueves la cámara rápido. La dirección se elige.' },
  { tipo: 'desenfoque', nombre: 'Fuera de foco', categoria: 'camara', descripcion: 'La cámara pierde el foco: la imagen se desenfoca de a poco hasta el medio y vuelve a nítida, como enfocar mal y corregir.' },
  { tipo: 'flashColor', nombre: 'Flash', categoria: 'camara', descripcion: 'Un destello del color que elijas. Por defecto, negro.' },
  { tipo: 'destello', nombre: 'Destello', categoria: 'camara', descripcion: 'Un fogonazo de luz seco.' },
  { tipo: 'parpadeo', nombre: 'Parpadeo', categoria: 'camara', descripcion: 'Parpadea a negro varias veces.' },
  { tipo: 'contorno', nombre: 'Contorno de neón', categoria: 'neon', descripcion: 'Enciende los bordes como líneas de neón.' },
  { tipo: 'lineas3d', nombre: 'Líneas 3D', categoria: 'neon', descripcion: 'Malla de curvas que envuelve la forma del objeto.' },
  { tipo: 'rayosObjeto', nombre: 'Rayos', categoria: 'neon', descripcion: 'Resplandor con destellos que emana del objeto.' },
  // el impacto "Manchas" se retiró del catálogo a pedido del dueño. el tipo y su dibujo siguen en
  // el código por si un proyecto viejo lo trae, pero ya no se puede añadir uno nuevo
  // se quedan solo para no romper proyectos viejos: ya no salen en la paleta, ahora todo es el
  // "Flash" de arriba con su color (negro para imitar el de a negro, blanco para el de a blanco)
  { tipo: 'flashNegro', nombre: 'Flash a negro', categoria: 'camara', descripcion: 'Se oscurece un instante y vuelve.', oculto: true },
  { tipo: 'flashBlanco', nombre: 'Flash a blanco', categoria: 'camara', descripcion: 'Se aclara un instante y vuelve.', oculto: true },
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

// color de partida según el tipo. el flash arranca en NEGRO (lo pidió así, es el uso más
// común: oscurecer un golpe), mientras que los de neón y demás siguen en el celeste de marca.
// en cualquier caso se puede cambiar luego con el selector de color del impacto
export function colorPorDefectoImpacto(tipo: TipoImpacto): string {
  if (tipo === 'flashColor') return '#000000'
  // las manchas arrancan en blanco: en modo diferencia el blanco es la inversión total (el
  // negativo puro), que es lo más parecido a "invierte el color" nada más ponerlo
  if (tipo === 'manchas') return '#ffffff'
  return COLOR_IMPACTO_DEF
}

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
  // desenfoque isotrópico en fracción del alto del cuadro (0 = nítido)
  desenfoque: number
  // desenfoque DIRECCIONAL: estela solo en un eje, para el barrido de una cámara que se mueve
  // rápido (no un blur redondo). en fracción del alto; x borra en horizontal, y en vertical
  desenfoqueX: number
  desenfoqueY: number
  // velo de color por encima de todo y su opacidad de 0 a 1
  veloColor: string
  veloOpacidad: number
}

const NEUTRO: EstadoImpacto = { escala: 1, x: 0, y: 0, desenfoque: 0, desenfoqueX: 0, desenfoqueY: 0, veloColor: '#000000', veloOpacidad: 0 }

// pseudoaleatorio estable a partir de un número: la misma p siempre da el mismo
// temblor, así el efecto no baila distinto entre el visor y la exportación
function ruido(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

// dado el tipo, el avance p (0 al empezar, 1 al terminar) y la intensidad de 0 a
// 100, devuelve cuánto deforma el cuadro. el golpe es más fuerte al principio y
// se va soltando, que es como se siente un impacto de verdad
export function estadoImpacto(
  tipo: TipoImpacto,
  p: number,
  intensidad: number,
  color: string,
  direccion?: DireccionImpacto,
): EstadoImpacto {
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
    case 'movimiento': {
      // desenfoque de MOVIMIENTO (paneo de cámara): la imagen se estira en estelas a lo largo del
      // eje elegido, como cuando mueves la cámara rápido siguiendo algo. NO es un blur redondo: es
      // un desenfoque SOLO en una dirección. la estela está presente durante todo el impacto, con
      // una envolvente suave (sube, se mantiene fuerte, baja), no un flash al inicio, para que se
      // lea como un barrido sostenido y no como un parpadeo
      const dir = direccion ?? 'der'
      const ux = dir === 'der' ? 1 : dir === 'izq' ? -1 : 0
      const uy = dir === 'aba' ? 1 : dir === 'arr' ? -1 : 0
      // meseta suave: casi plena en el medio y con bordes redondeados; ^0.5 la ensancha para que
      // el desenfoque dure casi todo el tramo en vez de un pico fino
      const env = Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, p))), 0.5)
      const resorte = Math.exp(-4.5 * p) * Math.cos(7 * p)
      return {
        ...NEUTRO,
        // un empujón leve en la dirección, para reforzar la sensación de que la cámara se mueve
        x: 0.09 * amp * resorte * ux,
        y: 0.09 * amp * resorte * uy,
        // la estela: bastante marcada (hasta ~0.22 del alto en un eje) y sostenida por la meseta
        desenfoqueX: Math.abs(ux) * 0.22 * amp * env,
        desenfoqueY: Math.abs(uy) * 0.22 * amp * env,
      }
    }
    case 'desenfoque': {
      // fuera de foco: un desenfoque redondo (isótropo) que crece hasta el medio del impacto y
      // regresa a nítido, como una cámara que pierde el foco un instante y lo recupera. la
      // envolvente ^0.6 ensancha la meseta para que la imagen quede borrosa buena parte del
      // tramo en vez de un pico fino, y el pico llega alto (~0.13 del alto a fuerza plena) para
      // que se sienta bien fuera de foco, no un velo tímido
      const env = Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, p))), 0.6)
      return { ...NEUTRO, desenfoque: 0.13 * amp * env }
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
  impactos: { t: number; duracion: number; tipo: TipoImpacto; intensidad: number; color: string; direccion?: DireccionImpacto }[],
  t: number,
): EstadoImpacto {
  let escala = 1
  let x = 0
  let y = 0
  let desenfoque = 0
  let desenfoqueX = 0
  let desenfoqueY = 0
  let veloColor = '#000000'
  let veloOpacidad = 0
  for (const im of impactos) {
    if (im.duracion <= 0) continue
    const p = (t - im.t) / im.duracion
    if (p < 0 || p > 1) continue
    const e = estadoImpacto(im.tipo, p, im.intensidad, im.color, im.direccion)
    escala *= e.escala
    x += e.x
    y += e.y
    desenfoque += e.desenfoque
    desenfoqueX += e.desenfoqueX
    desenfoqueY += e.desenfoqueY
    if (e.veloOpacidad > veloOpacidad) {
      veloOpacidad = e.veloOpacidad
      veloColor = e.veloColor
    }
  }
  return { escala, x, y, desenfoque, desenfoqueX, desenfoqueY, veloColor, veloOpacidad }
}
