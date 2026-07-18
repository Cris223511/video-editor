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

// calcula la caja resultante al arrastrar un agarre hasta el punto (px, py).
// el borde opuesto al que se agarra no se mueve, así que el elemento crece solo
// hacia el lado que se estira. con `proporcional` activo (tecla Shift) se
// conserva la relación entre ancho y alto, igual que en cualquier editor
export function redimensionar(
  caja: Caja,
  ancla: Ancla,
  px: number,
  py: number,
  proporcional: boolean,
  min = 0.03,
): Caja {
  let x0 = caja.x - caja.w / 2
  let x1 = caja.x + caja.w / 2
  let y0 = caja.y - caja.h / 2
  let y1 = caja.y + caja.h / 2
  const relacion = caja.h > 0 ? caja.w / caja.h : 1

  const este = ancla.includes('e')
  const oeste = ancla.includes('w')
  const norte = ancla.startsWith('n')
  const sur = ancla.startsWith('s')

  if (este) x1 = px
  if (oeste) x0 = px
  if (sur) y1 = py
  if (norte) y0 = py

  let w = Math.max(min, x1 - x0)
  let h = Math.max(min, y1 - y0)

  if (proporcional) {
    const horizontal = este || oeste
    const vertical = norte || sur
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

  // el centro se recoloca para que el borde anclado siga donde estaba. cuando el
  // agarre es de un lado, el otro eje se queda como está
  let x = caja.x
  let y = caja.y
  if (este) x = x0 + w / 2
  else if (oeste) x = x1 - w / 2
  if (sur) y = y0 + h / 2
  else if (norte) y = y1 - h / 2

  return { x, y, w, h }
}
