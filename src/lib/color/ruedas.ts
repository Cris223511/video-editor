// posición del tirador dentro de una rueda de color. x e y van de -1 a 1 desde
// el centro; el ángulo elige el matiz y la distancia, cuánta corrección se
// aplica. el centro es no tocar nada
export interface PuntoRueda {
  x: number
  y: number
}

// las tres zonas tonales de un corrector de color clásico
export interface Ruedas {
  sombras: PuntoRueda
  medios: PuntoRueda
  altas: PuntoRueda
}

export const RUEDA_CENTRO: PuntoRueda = { x: 0, y: 0 }
export const RUEDAS_NEUTRAS: Ruedas = {
  sombras: { ...RUEDA_CENTRO },
  medios: { ...RUEDA_CENTRO },
  altas: { ...RUEDA_CENTRO },
}

export function ruedaNeutra(p: PuntoRueda): boolean {
  return Math.abs(p.x) < 0.001 && Math.abs(p.y) < 0.001
}

export function ruedasNeutras(r: Ruedas): boolean {
  return ruedaNeutra(r.sombras) && ruedaNeutra(r.medios) && ruedaNeutra(r.altas)
}

// fuerza máxima de cada rueda sobre el canal, con el tirador en el borde. es
// deliberadamente contenida: un corrector de color se usa para matizar, y pasado
// de ahí la imagen se rompe
const FUERZA = 0.22

// convierte la posición del tirador en cuánto hay que sumar a cada canal. el
// ángulo se lee como matiz sobre el círculo cromático rojo-verde-azul, y el
// resultado se centra restando la media para que mover la rueda tiña la imagen
// sin subirle ni bajarle el brillo general
export function desplazamientoRgb(p: PuntoRueda): [number, number, number] {
  const radio = Math.min(1, Math.hypot(p.x, p.y))
  if (radio < 0.001) return [0, 0, 0]

  const angulo = Math.atan2(p.y, p.x)
  // cada canal alcanza su máximo separado 120 grados del siguiente
  const canal = (desfase: number) => Math.cos(angulo - desfase)
  const crudo: [number, number, number] = [
    canal(0),
    canal((2 * Math.PI) / 3),
    canal((4 * Math.PI) / 3),
  ]
  const media = (crudo[0] + crudo[1] + crudo[2]) / 3
  const escala = radio * FUERZA
  return [
    (crudo[0] - media) * escala,
    (crudo[1] - media) * escala,
    (crudo[2] - media) * escala,
  ]
}

// cuánto pesa cada zona tonal sobre un valor de entrada. las sombras mandan
// cerca del negro, las altas cerca del blanco, y los medios cubren la campana
// del centro. las tres suman siempre uno, así que ninguna zona se pisa con otra
export function pesos(x: number): [number, number, number] {
  const sombras = (1 - x) * (1 - x)
  const altas = x * x
  const medios = Math.max(0, 1 - sombras - altas)
  return [sombras, medios, altas]
}

export const PASOS = 32

// en qué se convierte un nivel de luz de un canal tras aplicar las tres ruedas
export function valorCanal(r: Ruedas, indice: 0 | 1 | 2, x: number): number {
  const s = desplazamientoRgb(r.sombras)[indice]
  const m = desplazamientoRgb(r.medios)[indice]
  const a = desplazamientoRgb(r.altas)[indice]
  const [ps, pm, pa] = pesos(x)
  return Math.max(0, Math.min(1, x + s * ps + m * pm + a * pa))
}
