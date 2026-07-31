import { EfectoClip, EfectoFiltro } from '../../types/timeline'
import { TipoAnimado, TIPOS_ANIMADOS, efectoAnimado, cssBaseAnimado } from './animados'

// un efecto del catálogo. css() devuelve las funciones de filtro que le
// corresponden a una intensidad dada, y esa misma cadena la usan el visor y la
// exportación, así que sumar efectos nuevos no obliga a tocar el render
export interface EfectoCatalogo {
  id: string
  nombre: string
  css: (i: number) => string
}

// dos familias de arriba del todo: los EFECTOS mueven o texturizan el cuadro
// (desenfoques, nitidez, resplandor, cámara de acción) y los FILTROS solo cambian la
// tonalidad y el color (luz, virados, épocas, cine). se separan para que cada cosa
// esté donde se la busca, pero por debajo comparten el mismo mecanismo de efecto, así
// que un proyecto guardado con cualquiera de ellos se sigue abriendo igual
export type GrupoEfecto = 'efecto' | 'filtro'

export const NOMBRES_GRUPO_EFECTO: Record<GrupoEfecto, string> = {
  efecto: 'Efectos',
  filtro: 'Filtros',
}

export interface CategoriaEfecto {
  id: string
  nombre: string
  grupo: GrupoEfecto
  efectos: EfectoCatalogo[]
}

// la intensidad llega de 0 a 100 y acá se traduce a la unidad de cada filtro
const p = (i: number) => Math.max(0, Math.min(1, i / 100))

export const CATEGORIAS_EFECTO: CategoriaEfecto[] = [
  {
    // desenfoques: los borrosos, que texturizan el cuadro sin tocar la tonalidad
    id: 'desenfoque',
    nombre: 'Desenfoque',
    grupo: 'efecto',
    efectos: [
      // desenfoque de foco: el cuadro entero se pone borroso como una foto fuera de
      // foco, sin dirección. es un blur css a secas, así que va por la cadena de filtros
      // normal y la intensidad manda cuánto se difumina, desde nada hasta bastante
      { id: 'desenfoque-foco', nombre: 'Desenfoque', css: (i) => `blur(${(p(i) * 16).toFixed(2)}px)` },
      // desenfoque de movimiento: el borroso direccional, tipo barrido de cámara. es
      // otro efecto, con su propio ángulo, y por eso lo pinta un filtro svg aparte
      { id: 'desenfoque-movimiento', nombre: 'Desenfoque de movimiento', css: (i) => `blur(${(p(i) * 3).toFixed(2)}px)` },
    ],
  },
  {
    // realce: los que afilan, hacen resplandecer o curvan el cuadro. no salen de un
    // filtro css suelto; la muestra es solo una aproximación para elegir a ojo, y el
    // efecto de verdad lo arma el panel con sus propios mandos al aplicarlo
    id: 'realce',
    nombre: 'Realce',
    grupo: 'efecto',
    efectos: [
      {
        id: 'nitidez-brillo',
        nombre: 'Nítido y brilloso',
        css: (i) => `contrast(${1 + p(i) * 0.35}) brightness(${1 + p(i) * 0.16}) saturate(${1 + p(i) * 0.22})`,
      },
      // resplandor (bloom): aísla las luces, las difumina y las suma en modo pantalla,
      // el destello que envuelve lo brillante del plano. la muestra solo lo insinúa con
      // brillo y contraste; el glow real lo arma el filtro svg al aplicarlo
      { id: 'resplandor', nombre: 'Resplandor', css: (i) => `brightness(${1 + p(i) * 0.4}) contrast(${1 - p(i) * 0.06}) saturate(${1 + p(i) * 0.15})` },
      // la curvatura de lente no se puede imitar con un filtro css, así que la muestra
      // solo insinúa el aire de cámara de acción con un poco de contraste y color; la
      // curva de verdad la aplica el visor al elegirlo
      { id: 'gopro', nombre: 'Cámara de acción', css: (i) => `contrast(${1 + p(i) * 0.25}) saturate(${1 + p(i) * 0.3})` },
      // aberración cromática: el look 3D de canales corridos. no se puede imitar con un filtro
      // css, así que la muestra solo lo insinúa con saturación y un pelín de contraste; la
      // separación real de los canales la aplica el filtro svg al elegirlo
      { id: 'cromatico', nombre: 'Cromático', css: (i) => `saturate(${1 + p(i) * 0.35}) contrast(${1 + p(i) * 0.08})` },
    ],
  },
  {
    // texturas que se mueven con el tiempo: grano, rayas de cine, líneas de vhs y
    // destellos. no son filtros de color, se pintan por cuadro encima del video, así
    // que la muestra de aquí es solo una aproximación para reconocerlas de un vistazo
    id: 'animados',
    nombre: 'Animados',
    grupo: 'efecto',
    efectos: [
      { id: 'grano', nombre: 'Grano de película', css: (i) => `contrast(${1 + p(i) * 0.14}) brightness(${1 - p(i) * 0.04})` },
      { id: 'cineviejo', nombre: 'Cine viejo', css: (i) => `sepia(${p(i) * 0.5}) contrast(${1 + p(i) * 0.22}) brightness(${1 - p(i) * 0.06})` },
      { id: 'cinemudo', nombre: 'Cine mudo (1920)', css: (i) => `grayscale(1) contrast(${1 + p(i) * 0.3}) sepia(${p(i) * 0.15})` },
      { id: 'proyector', nombre: 'Proyector viejo', css: (i) => `sepia(${p(i) * 0.35}) brightness(${1 - p(i) * 0.05}) contrast(${1 + p(i) * 0.15})` },
      { id: 'polvo', nombre: 'Polvo y arañazos', css: (i) => `contrast(${1 + p(i) * 0.08}) brightness(${1 + p(i) * 0.03})` },
      { id: 'vhs', nombre: 'VHS', css: (i) => `saturate(${1 + p(i) * 0.4}) contrast(${1 + p(i) * 0.1}) hue-rotate(${Math.round(p(i) * 6)}deg)` },
      { id: 'crt', nombre: 'Monitor CRT', css: (i) => `saturate(${1 + p(i) * 0.15}) contrast(${1 + p(i) * 0.12}) hue-rotate(${Math.round(-p(i) * 8)}deg)` },
      { id: 'cam2000', nombre: 'Cámara 2000', css: (i) => `blur(${(p(i) * 0.6).toFixed(2)}px) contrast(${1 - p(i) * 0.09}) brightness(${1 + p(i) * 0.05}) saturate(${1 + p(i) * 0.06})` },
      { id: 'estatica', nombre: 'Estática de TV', css: (i) => `grayscale(${p(i) * 0.7}) contrast(${1 + p(i) * 0.2})` },
      { id: 'glitch', nombre: 'Glitch digital', css: (i) => `saturate(${1 + p(i) * 0.5}) hue-rotate(${Math.round(p(i) * 10)}deg) contrast(${1 + p(i) * 0.1})` },
      { id: 'interferencia', nombre: 'Interferencia', css: (i) => `contrast(${1 + p(i) * 0.2}) brightness(${1 + p(i) * 0.05})` },
      { id: 'retro', nombre: 'Neón 80', css: (i) => `saturate(${1 + p(i) * 0.6}) contrast(${1 + p(i) * 0.15}) hue-rotate(${Math.round(-p(i) * 10)}deg)` },
      { id: 'destellos', nombre: 'Destellos de luz', css: (i) => `brightness(${1 + p(i) * 0.16}) sepia(${p(i) * 0.2}) saturate(${1 + p(i) * 0.2})` },
      { id: 'fugascolor', nombre: 'Fugas de color', css: (i) => `saturate(${1 + p(i) * 0.4}) brightness(${1 + p(i) * 0.12}) hue-rotate(${Math.round(p(i) * 20)}deg)` },
      { id: 'bokeh', nombre: 'Luces bokeh', css: (i) => `brightness(${1 + p(i) * 0.14}) contrast(${1 - p(i) * 0.05})` },
      { id: 'nieve', nombre: 'Nieve', css: (i) => `brightness(${1 + p(i) * 0.1}) contrast(${1 + p(i) * 0.05})` },
      { id: 'lluvia', nombre: 'Lluvia', css: (i) => `brightness(${1 - p(i) * 0.05}) contrast(${1 + p(i) * 0.08})` },
    ],
  },
  {
    id: 'luz',
    nombre: 'Luz',
    grupo: 'filtro',
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
    grupo: 'filtro',
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
    grupo: 'filtro',
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
    grupo: 'filtro',
    efectos: [
      { id: 'frio', nombre: 'Frío', css: (i) => `hue-rotate(${Math.round(-p(i) * 22)}deg) saturate(${1 + p(i) * 0.2})` },
      { id: 'calido', nombre: 'Cálido', css: (i) => `sepia(${p(i) * 0.45}) saturate(${1 + p(i) * 0.3})` },
      { id: 'noche', nombre: 'Noche', css: (i) => `brightness(${1 - p(i) * 0.45}) hue-rotate(${Math.round(-p(i) * 18)}deg) contrast(${1 + p(i) * 0.25})` },
      { id: 'nebuloso', nombre: 'Nebuloso', css: (i) => `contrast(${1 - p(i) * 0.35}) brightness(${1 + p(i) * 0.2}) saturate(${1 - p(i) * 0.35})` },
      { id: 'toxico', nombre: 'Tóxico', css: (i) => `hue-rotate(${Math.round(p(i) * 80)}deg) saturate(${1 + p(i) * 0.9})` },
    ],
  },
  {
    // looks dramáticos, sobre todo en blanco y negro de mucho contraste, con las
    // luces reventadas y las sombras cerradas, el aire de vídeo nocturno de coches
    id: 'cine',
    nombre: 'Cine',
    grupo: 'filtro',
    efectos: [
      { id: 'noir', nombre: 'Noir', css: (i) => `grayscale(1) contrast(${1 + p(i) * 0.8}) brightness(${1 - p(i) * 0.08})` },
      { id: 'infrarrojo', nombre: 'Infrarrojo', css: (i) => `grayscale(1) contrast(${1 + p(i) * 1.1}) brightness(${1 + p(i) * 0.28})` },
      { id: 'ceniza', nombre: 'Ceniza', css: (i) => `grayscale(1) contrast(${1 + p(i) * 0.6}) brightness(${1 - p(i) * 0.2})` },
      { id: 'contraste-duro', nombre: 'Alto contraste', css: (i) => `contrast(${1 + p(i) * 1.2}) saturate(${1 + p(i) * 0.25})` },
      { id: 'plata', nombre: 'Plata fría', css: (i) => `grayscale(${1 - p(i) * 0.15}) contrast(${1 + p(i) * 0.5}) hue-rotate(${Math.round(-p(i) * 12)}deg) brightness(${1 + p(i) * 0.06})` },
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

// dato que viaja al arrastrar una muestra de efecto: hacia una fila para reemplazar
// ese efecto, o hacia el clip en la línea de tiempo para dejarlo encima de todos
export const TIPO_EFECTO = 'application/x-ve-efecto'

// identidad de un efecto ya puesto, para no repetirlo. el desenfoque y la nitidez
// son únicos; los filtros se distinguen por cuál es
export function claveEfecto(e: EfectoClip): string {
  if (e.tipo === 'filtro') return `filtro:${e.filtro}`
  if (e.tipo === 'desenfoque-movimiento') return 'desenfoque'
  if (e.tipo === 'gopro') return 'gopro'
  if (e.tipo === 'cromatico') return 'cromatico'
  if (e.tipo === 'animado') return `animado:${e.animado}`
  // el resplandor y el nítido y brilloso comparten motor pero son muestras distintas:
  // la variante los separa para que en el catálogo solo se marque el que se aplicó
  return e.tipo === 'nitidez-brillo' && e.variante === 'resplandor' ? 'resplandor' : 'nitidez-brillo'
}

// ids de las texturas animadas, para reconocerlas al crear o clasificar
const IDS_ANIMADOS = new Set<string>(TIPOS_ANIMADOS.map((a) => a.id))

// la misma identidad, pero calculada desde el id de una muestra del catálogo. el
// resplandor comparte el motor de nitidez-brillo (aislar luces, difuminar y sumar),
// pero es una muestra propia, con su clave, para que marcar una no encienda la otra
export function claveCatalogo(id: string): string {
  if (id === 'resplandor') return 'resplandor'
  if (id === 'nitidez-brillo') return 'nitidez-brillo'
  if (id === 'desenfoque-movimiento') return 'desenfoque'
  if (id === 'gopro') return 'gopro'
  if (id === 'cromatico') return 'cromatico'
  if (IDS_ANIMADOS.has(id)) return `animado:${id}`
  return `filtro:${id}`
}

// arma el efecto que corresponde a una muestra del catálogo, con sus valores de
// arranque. el desenfoque parte con intensidad media y barrido horizontal, que es
// la dirección más habitual en un travelling
export function crearEfecto(id: string): EfectoClip {
  if (id === 'nitidez-brillo') return { id: crypto.randomUUID(), tipo: 'nitidez-brillo', nitidez: 55, brillo: 35 }
  // el resplandor nace con la nitidez apagada y el brillo alto: solo glow, ya marcado,
  // y desde ahí el panel lo sube o lo baja con el mismo mando de brillo. la variante lo
  // distingue del nítido y brilloso en el catálogo aunque compartan motor
  if (id === 'resplandor') return { id: crypto.randomUUID(), tipo: 'nitidez-brillo', nitidez: 0, brillo: 80, variante: 'resplandor' }
  if (id === 'desenfoque-movimiento')
    return { id: crypto.randomUUID(), tipo: 'desenfoque-movimiento', intensidad: 40, angulo: 0 }
  if (id === 'gopro') return { id: crypto.randomUUID(), tipo: 'gopro', curvatura: 45 }
  if (id === 'cromatico') return { id: crypto.randomUUID(), tipo: 'cromatico', intensidad: 50 }
  if (IDS_ANIMADOS.has(id))
    return { id: crypto.randomUUID(), tipo: 'animado', animado: id as TipoAnimado, intensidad: 55 }
  return { id: crypto.randomUUID(), tipo: 'filtro', filtro: id, intensidad: 50 }
}

export function esFiltro(e: EfectoClip): e is { id: string } & EfectoFiltro {
  return e.tipo === 'filtro'
}

// cadena css de todos los efectos de filtro de un clip, en el orden en que se
// aplicaron. el desenfoque de movimiento no entra acá: ese va por su propio
// filtro svg, porque encadenarlo con estos deja el fotograma en negro. algunos
// efectos animados (cine mudo, estática) además cambian el color del video, y ese
// filtro base se suma aquí para que salga igual en el visor y en la exportación
export function cssEfectos(efectos: EfectoClip[] = []): string {
  const filtros = efectos
    .filter(esFiltro)
    .filter((e) => e.intensidad > 0)
    .map((e) => buscarEfecto(e.filtro)?.css(e.intensidad) ?? '')
    .filter(Boolean)
  const anim = efectoAnimado(efectos)
  if (anim) {
    const base = cssBaseAnimado(anim)
    if (base) filtros.push(base)
  }
  return filtros.join(' ')
}
