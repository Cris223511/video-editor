import { CapaCensura, CapaFigura, CapaImagen, CapaTexto } from '../../types/layers'

// crea una capa de texto con valores de partida sensatos. el tamaño se calcula
// a partir de la altura del proyecto para que se vea proporcionado en cualquier
// resolución, y la capa nace centrada y a partir del cabezal
export function crearCapaTexto(inicio: number, alturaProyecto: number): CapaTexto {
  return {
    id: crypto.randomUUID(),
    tipo: 'texto',
    inicio,
    duracion: 4,
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
    interlineado: 1.2,
    tracking: 0,
    fondo: false,
    colorFondo: '#000000',
    opacidadFondo: 60,
    radioFondo: 6,
    contorno: false,
    grosorContorno: 2,
    colorContorno: '#000000',
    sombra: true,
    brillo: false,
    colorBrillo: '#4da6ff',
    intensidadBrillo: 60,
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
    duracion: 4,
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
    duracion: 4,
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

// crea una figura relleno azul, centrada por defecto. admite una forma concreta
// (si no llega, nace como rectángulo) y una posición en fracción del lienzo, para
// que al soltarla en el visor caiga justo donde apuntó el cursor
export function crearCapaFigura(
  inicio: number,
  forma: CapaFigura['forma'] = 'rectangulo',
  x = 0.5,
  y = 0.5,
): CapaFigura {
  return {
    id: crypto.randomUUID(),
    tipo: 'figura',
    inicio,
    duracion: 4,
    x,
    y,
    opacidad: 100,
    keyframes: [],
    forma,
    anchoRel: 0.3,
    altoRel: 0.2,
    relleno: true,
    colorRelleno: '#1861ff',
    borde: false,
    colorBorde: '#000000',
    grosorBorde: 6,
  }
}

// cuántas veces se repite el halo del resplandor. al pintar varias sombras
// iguales una sobre otra el brillo se intensifica y deja de verse lavado
export const REPETICIONES_BRILLO = 3

// desenfoque del resplandor en función del tamaño del texto y la intensidad
// elegida (0 a 100). el visor y el exportador llaman a esta misma función para
// que el halo salga idéntico al editar y al exportar; el visor luego multiplica
// el resultado por la escala del lienzo en pantalla
export function desenfoqueBrillo(tamano: number, intensidad: number): number {
  return tamano * 0.5 * (intensidad / 100)
}

// convierte un color hex y una opacidad de 0 a 100 en una cadena rgba
export function hexAOpacidad(hex: string, opacidad: number): string {
  const limpio = hex.replace('#', '')
  const r = parseInt(limpio.slice(0, 2), 16)
  const g = parseInt(limpio.slice(2, 4), 16)
  const b = parseInt(limpio.slice(4, 6), 16)
  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${opacidad / 100})`
}
