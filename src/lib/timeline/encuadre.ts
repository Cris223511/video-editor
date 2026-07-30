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

// rectángulo donde se dibuja el video dentro de un lienzo de ancho×alto, ya en
// píxeles del lienzo. parte del encaje "contener" (el video entra entero
// conservando su proporción) y le aplica la escala y el centro del encuadre.
// cuando el clip está girado un cuarto de vuelta, el encaje mide con el ancho y el
// alto intercambiados: así un vertical girado a horizontal llena el lienzo en vez de
// quedarse "echado" con bandas. es la misma cuenta que usan el visor y la
// exportación, así que lo que se ve al editar es lo que sale al exportar
export function rectClip(
  vw: number,
  vh: number,
  ancho: number,
  alto: number,
  e: Encuadre,
): { dx: number; dy: number; dw: number; dh: number } {
  // para el encaje, si va de lado se comparan las medidas cruzadas (el ancho del
  // video contra el alto del lienzo y viceversa), que es como quedará tras el giro
  const [fw, fh] = giradoUnCuarto(e.rotacion) ? [vh, vw] : [vw, vh]
  const base = Math.min(ancho / fw, alto / fh)
  const dw = vw * base * e.escala
  const dh = vh * base * e.escala
  const dx = e.x * ancho - dw / 2
  const dy = e.y * alto - dh / 2
  return { dx, dy, dw, dh }
}
