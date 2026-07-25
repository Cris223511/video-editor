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
