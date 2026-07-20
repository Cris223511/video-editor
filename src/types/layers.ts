// un punto del recorrido de una capa en movimiento. t es el segundo relativo al
// inicio de la capa; x e y, el centro en ese instante
export interface KeyframePos {
  t: number
  x: number
  y: number
  // tiradores de curvatura opcionales: desvían la tangente de la curva a su paso
  // por este nodo. sin definir, la curva calcula la tangente sola a partir de los
  // nodos vecinos, que da el trazo redondeado por defecto
  hx?: number
  hy?: number
}

// capas que se dibujan encima del video. todas comparten una franja de tiempo
// (desde qué segundo y cuánto duran), una posición sobre el lienzo, opacidad y
// un recorrido opcional (keyframes) para moverse
export interface CapaBase {
  id: string
  inicio: number // segundo del proyecto en el que aparece
  duracion: number // cuánto permanece en pantalla
  x: number // centro horizontal sobre el lienzo, de 0 a 1
  y: number // centro vertical sobre el lienzo, de 0 a 1
  opacidad: number // 0 a 100
  keyframes: KeyframePos[] // vacío = fija en x,y; con puntos = en movimiento
}

export interface CapaTexto extends CapaBase {
  tipo: 'texto'
  texto: string
  fuente: string
  tamano: number // en píxeles a la resolución del proyecto
  color: string
  negrita: boolean
  cursiva: boolean
  subrayado: boolean
  alineacion: 'left' | 'center' | 'right'
  fondo: boolean
  colorFondo: string
  opacidadFondo: number
  radioFondo: number // radio de las esquinas del fondo, en píxeles del proyecto
  contorno: boolean
  grosorContorno: number
  colorContorno: string
  sombra: boolean
  // resplandor alrededor del texto (efecto de brillo o neón)
  brillo: boolean
  colorBrillo: string
  intensidadBrillo: number // 0 a 100, controla cuánto se difumina el halo
}

export interface CapaImagen extends CapaBase {
  tipo: 'imagen'
  src: string // data url de la imagen
  anchoNatural: number
  altoNatural: number
  anchoRel: number // ancho sobre el lienzo, de 0 a 1
  // alto sobre el lienzo. mientras no se toque queda sin definir y la imagen
  // conserva su proporción natural; al deformarla a mano se fija aquí
  altoRel?: number
  // recorte en fracciones desde cada borde de la imagen original
  recorte: { izq: number; der: number; arr: number; aba: number }
}

export interface CapaCensura extends CapaBase {
  tipo: 'censura'
  forma: 'circulo' | 'rectangulo' | 'pincel'
  efecto: 'pixelar' | 'difuminar' | 'transparente'
  intensidad: number // 1 a 100: tamaño de bloque o radio de desenfoque
  anchoRel: number // ancho de la máscara sobre el lienzo, de 0 a 1 (círculo/rectángulo)
  altoRel: number // alto de la máscara sobre el lienzo, de 0 a 1 (círculo/rectángulo)
  // trazos del pincel: cada uno es una lista de puntos relativos al centro de la
  // capa, en unidades del lienzo, para que el dibujo se mueva con ella
  trazos: { x: number; y: number }[][]
  grosorPincel: number // radio del pincel como fracción de la altura del lienzo
}

export interface CapaFigura extends CapaBase {
  tipo: 'figura'
  forma: 'rectangulo' | 'redondeado' | 'elipse' | 'triangulo' | 'estrella' | 'linea' | 'flecha'
  anchoRel: number
  altoRel: number
  relleno: boolean
  colorRelleno: string
  borde: boolean
  colorBorde: string
  grosorBorde: number // px a una altura de lienzo de 1080; se escala al mostrar
}

export type Capa = CapaTexto | CapaImagen | CapaCensura | CapaFigura
