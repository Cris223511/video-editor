import { nodosFiltroNB, NodoFiltro } from '../efectos/nitidezBrillo'

// mejoras que se aplican al CUADRO YA COMPUESTO, justo antes de codificar, sobre toda la imagen (no
// por clip). van dentro de "ajustes avanzados" del export y son opcionales: en 0 (o apagadas) no se
// monta ni se aplica nada, así que quien no las toque exporta exactamente igual que siempre. los
// valores numéricos van de 0 a 100
export interface FiltrosExport {
  // realce de bordes por máscara de desenfoque, el mismo algoritmo que ya usan los efectos del clip
  nitidez: number
  // suaviza el granulado de las grabaciones con poca luz o de celular
  ruido: number
  // grano fino tipo película de cine, a propósito, para un aire menos digital
  grano: number
  // une las mitades del material entrelazado (VHS, cámaras viejas) que muestra líneas tipo peine
  desentrelazar: boolean
  // arreglo todo en uno para grabaciones de cámara web: quita algo de ruido, afila y aviva el color
  webcam: boolean
  // reduce el ruido de fondo del SONIDO (no de la imagen) con RNNoise. va por la ruta del audio, aparte
  // de los filtros svg de imagen, por eso no cuenta en hayFiltrosExport
  audioRuido: boolean
  // suaviza el movimiento mezclando cada cuadro con el anterior (mezcla temporal, no IA). va en el bucle
  // de cuadros, aparte de los filtros svg, por eso tampoco cuenta en hayFiltrosExport
  suavizar: number
  // si se define, las mejoras DE IMAGEN solo se aplican dentro de este tramo (en segundos); fuera de él
  // el cuadro sale sin tocar. el ruido de audio no usa el tramo, va sobre toda la mezcla
  tramo?: { inicio: number; fin: number }
}

// ¿el instante está dentro del tramo elegido? sin tramo, siempre sí (las mejoras van a todo el video)
export function dentroDelTramo(tramo: { inicio: number; fin: number } | undefined, t: number): boolean {
  return !tramo || (t >= tramo.inicio && t <= tramo.fin)
}

// filtros por defecto: nada activo
export const FILTROS_VACIOS: FiltrosExport = {
  nitidez: 0,
  ruido: 0,
  grano: 0,
  desentrelazar: false,
  webcam: false,
  audioRuido: false,
  suavizar: 0,
}

// helper de la mezcla temporal: dibuja una fracción del cuadro anterior sobre el actual, lo que crea una
// estela que suaviza el movimiento. la fracción sube con el nivel, con tope prudente para no emborronar
export function fuerzaSuavizado(suavizar: number): number {
  return (Math.max(0, Math.min(100, suavizar)) / 100) * 0.6
}

// ¿hay al menos un filtro DE IMAGEN activo? si no, ni se monta el svg ni se toca el cuadro. el ruido de
// audio no cuenta aquí: va por su propio camino sobre la mezcla de sonido
export function hayFiltrosExport(f?: FiltrosExport): boolean {
  if (!f) return false
  return f.nitidez > 0 || f.ruido > 0 || f.grano > 0 || f.desentrelazar || f.webcam
}

const NS = 'http://www.w3.org/2000/svg'

// pinta un nodo del grafo (con sus hijos) como elemento del dom, a partir de la receta en datos
function crearNodo(n: NodoFiltro): Element {
  const el = document.createElementNS(NS, n.tag)
  for (const [k, v] of Object.entries(n.attrs)) el.setAttribute(k, v)
  n.children?.forEach((h) => el.appendChild(crearNodo(h)))
  return el
}

// las tres funciones de canal (r, g, b) con los mismos parámetros
function canales(attrs: Record<string, string>): NodoFiltro[] {
  return ['feFuncR', 'feFuncG', 'feFuncB'].map((tag) => ({ tag, attrs }))
}

// grafo del arreglo de cámara web: una limpieza suave, un realce por máscara de desenfoque sobre lo ya
// limpio, y un empujón de saturación y luz. junta en una sola pasada lo que se suele tocar a mano
function nodosWebcam(): NodoFiltro[] {
  return [
    { tag: 'feGaussianBlur', attrs: { in: 'SourceGraphic', stdDeviation: '0.7', edgeMode: 'duplicate', result: 'wcLimpio' } },
    { tag: 'feGaussianBlur', attrs: { in: 'wcLimpio', stdDeviation: '1.1', edgeMode: 'duplicate', result: 'wcSuave' } },
    {
      tag: 'feComposite',
      attrs: { in: 'wcLimpio', in2: 'wcSuave', operator: 'arithmetic', k1: '0', k2: '1.5', k3: '-0.5', k4: '0', result: 'wcNitido' },
    },
    { tag: 'feColorMatrix', attrs: { in: 'wcNitido', type: 'saturate', values: '1.18', result: 'wcColor' } },
    {
      tag: 'feComponentTransfer',
      attrs: { in: 'wcColor' },
      children: canales({ type: 'linear', slope: '1.06', intercept: '0.012' }),
    },
  ]
}

// grafo del grano: ruido fractal desaturado que se SUMA centrado sobre la imagen (source + amt*(ruido -
// 0,5)). la semilla fija deja un grano estable, sin parpadeo, que es lo que se busca en el aire de cine
function nodosGrano(grano: number): NodoFiltro[] {
  const amt = (grano / 100) * 0.5
  return [
    {
      tag: 'feTurbulence',
      attrs: { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: '2', seed: '7', stitchTiles: 'stitch', result: 'gNoise' },
    },
    {
      // desatura el ruido a gris y le fija el alfa en 1, para que la suma no vuelva la imagen translúcida
      tag: 'feColorMatrix',
      attrs: {
        in: 'gNoise',
        type: 'matrix',
        values: '0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1',
        result: 'gGris',
      },
    },
    {
      tag: 'feComposite',
      attrs: {
        in: 'SourceGraphic',
        in2: 'gGris',
        operator: 'arithmetic',
        k1: '0',
        k2: '1',
        k3: amt.toFixed(3),
        k4: (-amt / 2).toFixed(3),
      },
    },
  ]
}

// monta en el dom los filtros svg de las mejoras activas y devuelve una función para aplicarlos en
// secuencia sobre un lienzo, más otra para desmontarlos al terminar. cada mejora es un filtro propio
// que se aplica como una pasada aparte, así se encadenan sin enhebrar resultados dentro de un mismo
// filtro. el orden es limpiar primero (ruido, desentrelazado, webcam), luego afilar y por último el
// grano, para que el granulado no se difumine. el navegador acelera estos filtros
export function montarFiltrosExport(f: FiltrosExport) {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('style', 'position:absolute;width:0;height:0')
  const defs = document.createElementNS(NS, 'defs')
  const ids: string[] = []

  const agregar = (id: string, nodos: NodoFiltro[], primitiveUnits?: string) => {
    const filtro = document.createElementNS(NS, 'filter')
    filtro.setAttribute('id', id)
    filtro.setAttribute('color-interpolation-filters', 'sRGB')
    if (primitiveUnits) filtro.setAttribute('primitiveUnits', primitiveUnits)
    nodos.forEach((n) => filtro.appendChild(crearNodo(n)))
    defs.appendChild(filtro)
    ids.push(id)
  }

  if (f.ruido > 0) {
    // desenfoque leve que promedia el granulado; a más nivel, más suavizado
    const sd = ((f.ruido / 100) * 1.3).toFixed(2)
    agregar('ve-fx-ruido', [
      { tag: 'feGaussianBlur', attrs: { in: 'SourceGraphic', stdDeviation: sd, edgeMode: 'duplicate' } },
    ])
  }
  if (f.desentrelazar) {
    // desenfoque SOLO en vertical, que funde las mitades entrelazadas y borra el peine del movimiento
    agregar('ve-fx-desentrelazar', [
      { tag: 'feGaussianBlur', attrs: { in: 'SourceGraphic', stdDeviation: '0 0.8', edgeMode: 'duplicate' } },
    ])
  }
  if (f.webcam) agregar('ve-fx-webcam', nodosWebcam())
  if (f.nitidez > 0) agregar('ve-fx-nitidez', nodosFiltroNB({ nitidez: f.nitidez, brillo: 0 }))
  if (f.grano > 0) agregar('ve-fx-grano', nodosGrano(f.grano))

  svg.appendChild(defs)
  document.body.appendChild(svg)

  // aplica cada filtro como una pasada: copia el cuadro a un lienzo auxiliar y lo vuelve a dibujar sobre
  // el original a través del filtro. así el resultado de una pasada entra en la siguiente sin mezclarse
  const aplicar = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    off: HTMLCanvasElement,
  ) => {
    if (!ids.length) return
    const octx = off.getContext('2d')
    if (!octx) return
    for (const id of ids) {
      if (off.width !== canvas.width) off.width = canvas.width
      if (off.height !== canvas.height) off.height = canvas.height
      octx.clearRect(0, 0, off.width, off.height)
      octx.drawImage(canvas, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = `url(#${id})`
      ctx.drawImage(off, 0, 0)
      ctx.filter = 'none'
    }
  }

  const quitar = () => svg.remove()
  return { aplicar, quitar }
}
