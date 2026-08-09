import { Clip, Encuadre } from '../../types/timeline'

// encuadre por defecto: el video centrado y con el tamaño de siempre. cuando un
// clip no guarda encuadre propio se comporta como este, de modo que nada cambia
// hasta que se toca a mano
export const ENCUADRE_NEUTRO: Encuadre = { x: 0.5, y: 0.5, escala: 1 }

// el encuadre efectivo de un clip, cayendo al neutro si aún no tiene uno
export function encuadreDe(clip: Clip): Encuadre {
  return clip.encuadre ?? ENCUADRE_NEUTRO
}

// dice si un encuadre deja el video tal cual, sin mover ni escalar. sirve para
// saltarse cálculos cuando no hace falta
export function encuadreNeutro(e: Encuadre): boolean {
  return e.x === 0.5 && e.y === 0.5 && e.escala === 1
}

// dice si una rotación deja el video "de lado" (un cuarto de vuelta), donde el ancho
// y el alto se intercambian de cara al encaje. se toma un margen amplio alrededor de
// 90 y 270 para que también valga con giros libres cercanos a esos cuartos
export function giradoUnCuarto(rotacion?: number): boolean {
  if (!rotacion) return false
  const r = ((rotacion % 360) + 360) % 360
  return (r > 45 && r < 135) || (r > 225 && r < 315)
}

// cuánto hay que agrandar el video para que, ya girado, cubra el lienzo entero sin
// dejar a la vista los triángulos de fondo que asoman al girar un rectángulo dentro
// de otro. sin giro vale 1: el video queda como siempre, contenido y con sus bandas
// si su proporción no coincide, sin recortarse. según se gira, crece lo justo para
// tapar esas esquinas, así que "llena" recortando un poco el borde en vez de "contener".
// la cuenta pide que las cuatro esquinas del lienzo caigan dentro del rectángulo del
// video llevado a su propio marco (girado el ángulo contrario): de ahí los términos
// con seno y coseno. el visor y el compositor lo aplican igual para que editar y
// exportar muestren lo mismo. a un cuarto de vuelta da el mismo relleno que antes lograba
// el intercambio de medidas, así que el botón de girar 90° no cambia
export function factorLlenado(
  vw: number,
  vh: number,
  ancho: number,
  alto: number,
  rotacion?: number,
): number {
  if (!rotacion) return 1
  const rad = (rotacion * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  // rectángulo base: el video contenido en el lienzo conservando su proporción
  const base = Math.min(ancho / vw, alto / vh)
  const dw = vw * base
  const dh = vh * base
  if (dw <= 0 || dh <= 0) return 1
  // el rectángulo, girado, debe abarcar el lienzo por sus dos ejes locales
  const cover = Math.max((ancho * c + alto * s) / dw, (ancho * s + alto * c) / dh)
  // nunca se encoge por debajo del "contener": como mucho agranda para llenar
  return Math.max(1, cover)
}

// rectángulo donde se dibuja el video dentro de un lienzo de ancho×alto, ya en
// píxeles del lienzo. parte del encaje "contener" (el video entra entero
// conservando su proporción) y le aplica la escala y el centro del encuadre. cuando
// el clip está girado, se suma el factor de llenado para que, una vez girado en el
// lienzo, cubra todo sin esquinas vacías. es la misma cuenta que usan el visor y la
// exportación, así que lo que se ve al editar es lo que sale al exportar
export function rectClip(
  vw: number,
  vh: number,
  ancho: number,
  alto: number,
  e: Encuadre,
): { dx: number; dy: number; dw: number; dh: number } {
  const base = Math.min(ancho / vw, alto / vh)
  const factor = factorLlenado(vw, vh, ancho, alto, e.rotacion)
  const dw = vw * base * e.escala * factor
  const dh = vh * base * e.escala * factor
  const dx = e.x * ancho - dw / 2
  const dy = e.y * alto - dh / 2
  return { dx, dy, dw, dh }
}
