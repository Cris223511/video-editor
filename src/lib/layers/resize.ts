// los ocho puntos de agarre de una caja seleccionada. la letra dice qué borde
// sigue al cursor; el contrario queda clavado en su sitio
export type Ancla = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

export const ANCLAS: Ancla[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']

// caja en coordenadas del lienzo, de 0 a 1. x e y son el centro, porque así es
// como las capas guardan su posición
export interface Caja {
  x: number
  y: number
  w: number
  h: number
}

// ángulo (grados, sentido horario desde el eje x con y hacia abajo) de la dirección
// en la que estira cada tirador desde el centro del elemento
const ANGULO_ANCLA: Record<Ancla, number> = {
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: 225,
  n: 270,
  ne: 315,
}

// cursor de un tirador teniendo en cuenta el giro y el volteo del elemento. sin esto,
// al girar algo las flechas diagonales quedan al revés de lo que se ve: la esquina de
// arriba a la izquierda mostraba la flecha de la de abajo a la derecha. el volteo
// (espejo) refleja el ángulo, y el giro lo suma, en el mismo orden que la css
export function cursorGirado(ancla: Ancla, rotacion = 0, espejoH = false, espejoV = false): string {
  let a = ANGULO_ANCLA[ancla]
  if (espejoH) a = 180 - a
  if (espejoV) a = -a
  a += rotacion
  a = ((a % 180) + 180) % 180
  if (a < 22.5 || a >= 157.5) return 'ew-resize'
  if (a < 67.5) return 'nwse-resize'
  if (a < 112.5) return 'ns-resize'
  return 'nesw-resize'
}

// cursor que corresponde a cada agarre, para que el puntero indique hacia dónde
// se va a estirar
export const CURSORES: Record<Ancla, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

// posición de cada agarre dentro de la caja, en porcentaje
export const POSICION: Record<Ancla, { left: string; top: string }> = {
  nw: { left: '0%', top: '0%' },
  n: { left: '50%', top: '0%' },
  ne: { left: '100%', top: '0%' },
  w: { left: '0%', top: '50%' },
  e: { left: '100%', top: '50%' },
  sw: { left: '0%', top: '100%' },
  s: { left: '50%', top: '100%' },
  se: { left: '100%', top: '100%' },
}

// lleva un punto del lienzo (en fracción 0..1) al marco local de un elemento girado
// o volteado: resta el centro, pasa a píxeles con el aspecto del área, des-rota y
// des-voltea (en el orden inverso a la css, que es girar y luego escalar), y vuelve a
// fracción. así `redimensionar` puede trabajar como si el elemento estuviera derecho,
// y estirar un lado significa de verdad ese lado y no otro
export function aMarcoLocal(
  p: { x: number; y: number },
  centro: { x: number; y: number },
  rect: { w: number; h: number },
  rotacion = 0,
  espejoH = false,
  espejoV = false,
): { x: number; y: number } {
  const dx = (p.x - centro.x) * rect.w
  const dy = (p.y - centro.y) * rect.h
  const rad = (-rotacion * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = dx * cos - dy * sin
  const ry = dx * sin + dy * cos
  return {
    x: centro.x + (espejoH ? -rx : rx) / rect.w,
    y: centro.y + (espejoV ? -ry : ry) / rect.h,
  }
}

// operación inversa: un desplazamiento medido en el marco local (fracción) se lleva al
// del lienzo, para recolocar el centro tras un estirado no simétrico de un elemento
// girado. se voltea y luego se gira, el mismo orden que aplica la css
export function aMarcoLienzo(
  off: { x: number; y: number },
  rect: { w: number; h: number },
  rotacion = 0,
  espejoH = false,
  espejoV = false,
): { x: number; y: number } {
  const dx = (espejoH ? -off.x : off.x) * rect.w
  const dy = (espejoV ? -off.y : off.y) * rect.h
  const rad = (rotacion * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: (dx * cos - dy * sin) / rect.w, y: (dx * sin + dy * cos) / rect.h }
}

// dimensiones (en fracción) de la caja envolvente recta de un rectángulo girado. la
// rotación es visual (en píxeles de pantalla), así que se mide con el aspecto del área
// y se vuelve a fracción. sirve para que las guías salten cuando el borde que se VE (el
// del rectángulo girado) toca el del lienzo, y no el borde sin girar, que cae en otro sitio
export function envolventeGirada(
  w: number,
  h: number,
  rect: { w: number; h: number },
  rotacion = 0,
): { w: number; h: number } {
  if (!rotacion) return { w, h }
  const rad = (rotacion * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  const wp = w * rect.w
  const hp = h * rect.h
  return { w: (wp * c + hp * s) / rect.w, h: (wp * s + hp * c) / rect.h }
}

// modificadores del redimensionado, iguales para cualquier elemento:
// - proporcional: conserva la relación ancho/alto (lo normal, y también con Ctrl).
//   se apaga con Shift, que deja estirar ancho y alto por separado.
// - simetrico: con Alt, el centro queda fijo y los dos bordes opuestos se mueven en
//   espejo, así el elemento crece por todos los lados a la vez
export interface OpcionesResize {
  proporcional: boolean
  simetrico: boolean
}

// calcula la caja resultante al arrastrar un agarre hasta el punto (px, py). sin
// Alt, el borde opuesto al que se agarra no se mueve y el elemento crece solo hacia
// el lado que se estira; con Alt, el que no se mueve es el centro. la proporción se
// conserva salvo que se pida lo contrario
export function redimensionar(
  caja: Caja,
  ancla: Ancla,
  px: number,
  py: number,
  opts: OpcionesResize,
  min = 0.03,
): Caja {
  const este = ancla.includes('e')
  const oeste = ancla.includes('w')
  const norte = ancla.startsWith('n')
  const sur = ancla.startsWith('s')
  const horizontal = este || oeste
  const vertical = norte || sur
  const relacion = caja.h > 0 ? caja.w / caja.h : 1

  let w = caja.w
  let h = caja.h
  // bordes anclados de partida, para recolocar el centro al final cuando no es
  // simétrico. el borde contrario al que se agarra es el que no se mueve
  const x0Fijo = caja.x - caja.w / 2
  const x1Fijo = caja.x + caja.w / 2
  const y0Fijo = caja.y - caja.h / 2
  const y1Fijo = caja.y + caja.h / 2

  if (opts.simetrico) {
    // el tamaño sale del doble de la distancia del cursor al centro en el eje que
    // se estira; el centro no se toca
    if (horizontal) w = Math.max(min, Math.abs(px - caja.x) * 2)
    if (vertical) h = Math.max(min, Math.abs(py - caja.y) * 2)
  } else {
    let x0 = x0Fijo
    let x1 = x1Fijo
    let y0 = y0Fijo
    let y1 = y1Fijo
    if (este) x1 = px
    if (oeste) x0 = px
    if (sur) y1 = py
    if (norte) y0 = py
    w = Math.max(min, x1 - x0)
    h = Math.max(min, y1 - y0)
  }

  if (opts.proporcional) {
    if (horizontal && vertical) {
      // en las esquinas manda el eje que más se movió, para que el elemento siga
      // al cursor sin dar tirones
      if (w / caja.w > h / caja.h) h = w / relacion
      else w = h * relacion
    } else if (horizontal) {
      h = w / relacion
    } else {
      w = h * relacion
    }
    w = Math.max(min, w)
    h = Math.max(min, h)
  }

  // el centro: si es simétrico se queda donde estaba; si no, se recoloca para que
  // el borde anclado (el contrario al agarre) siga en su sitio
  let x = caja.x
  let y = caja.y
  if (!opts.simetrico) {
    if (este) x = x0Fijo + w / 2
    else if (oeste) x = x1Fijo - w / 2
    if (sur) y = y0Fijo + h / 2
    else if (norte) y = y1Fijo - h / 2
  }

  return { x, y, w, h }
}
