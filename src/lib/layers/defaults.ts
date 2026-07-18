import { CapaCensura, CapaFigura, CapaImagen, CapaTexto } from '../../types/layers'

// crea una capa de texto con valores de partida sensatos. el tamaño se calcula
// a partir de la altura del proyecto para que se vea proporcionado en cualquier
// resolución, y la capa nace centrada y a partir del cabezal
export function crearCapaTexto(inicio: number, alturaProyecto: number): CapaTexto {
  return {
    id: crypto.randomUUID(),
    tipo: 'texto',
    inicio,
    duracion: 3,
    x: 0.5,
    y: 0.5,
    opacidad: 100,
    keyframes: [],
    texto: 'Tu texto',
    fuente: 'Inter',
    tamano: Math.max(24, Math.round(alturaProyecto * 0.06)),
    color: '#ffffff',
    negrita: true,
    cursiva: false,
    subrayado: false,
    alineacion: 'center',
    fondo: false,
    colorFondo: '#000000',
    opacidadFondo: 60,
    contorno: false,
    grosorContorno: 2,
    colorContorno: '#000000',
    sombra: true,
  }
}

// crea una capa de imagen a partir de un archivo ya leído, centrada y con un
// ancho de partida cómodo; el alto se deduce de la proporción original
export function crearCapaImagen(
  inicio: number,
  src: string,
  anchoNatural: number,
  altoNatural: number,
): CapaImagen {
  return {
    id: crypto.randomUUID(),
    tipo: 'imagen',
    inicio,
    duracion: 3,
    x: 0.5,
    y: 0.5,
    opacidad: 100,
    keyframes: [],
    src,
    anchoNatural,
    altoNatural,
    anchoRel: 0.4,
    recorte: { izq: 0, der: 0, arr: 0, aba: 0 },
  }
}

// crea una capa de censura centrada, circular y pixelada por defecto, sin
// movimiento (fija). el usuario luego elige forma, efecto, tamaño y recorrido
export function crearCapaCensura(inicio: number): CapaCensura {
  return {
    id: crypto.randomUUID(),
    tipo: 'censura',
    inicio,
    duracion: 3,
    x: 0.5,
    y: 0.5,
    opacidad: 100,
    keyframes: [],
    forma: 'circulo',
    efecto: 'pixelar',
    intensidad: 20,
    anchoRel: 0.25,
    altoRel: 0.25,
    trazos: [],
    grosorPincel: 0.06,
  }
}

// crea una figura por defecto: un rectángulo azul relleno, centrado
export function crearCapaFigura(inicio: number): CapaFigura {
  return {
    id: crypto.randomUUID(),
    tipo: 'figura',
    inicio,
    duracion: 3,
    x: 0.5,
    y: 0.5,
    opacidad: 100,
    keyframes: [],
    forma: 'rectangulo',
    anchoRel: 0.3,
    altoRel: 0.2,
    relleno: true,
    colorRelleno: '#1861ff',
    borde: false,
    colorBorde: '#000000',
    grosorBorde: 6,
  }
}

// convierte un color hex y una opacidad de 0 a 100 en una cadena rgba
export function hexAOpacidad(hex: string, opacidad: number): string {
  const limpio = hex.replace('#', '')
  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)
  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${opacidad / 100})`
}
