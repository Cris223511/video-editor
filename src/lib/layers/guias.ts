// una guía dibujada sobre el lienzo mientras se arrastra. `eje` dice si es una
// línea vertical (compara posiciones horizontales) u horizontal, y `pos` es
// dónde cae, de 0 a 1
export interface Guia {
  eje: 'x' | 'y'
  pos: number
}

// distancia máxima, en unidades del lienzo, a la que un borde se pega a otro.
// equivale a unos ocho píxeles en un visor de tamaño corriente
export const IMAN = 0.008

// los tres puntos que interesan de una caja en cada eje: su centro y sus dos
// bordes. el centro va primero a propósito: cuando un elemento del tamaño del
// lienzo se centra, sus bordes tocan los del lienzo y su centro toca el centro a
// la vez, y en ese empate queremos que gane la guía del centro, no la del borde
function referencias(centro: number, medida: number) {
  return [centro, centro - medida / 2, centro + medida / 2]
}

export interface CajaGuia {
  x: number
  y: number
  w: number
  h: number
}

// busca a qué puntos conviene pegar la caja que se está moviendo. compara contra
// el centro y los bordes del lienzo y contra los de las demás capas visibles.
// devuelve la posición ya corregida y las guías que hay que pintar
export function imantar(
  caja: CajaGuia,
  otras: CajaGuia[],
  // el enganche puede ir por eje: como el lienzo casi nunca es cuadrado, una misma
  // distancia en fracción vale muchos más píxeles en el eje largo que en el corto, y
  // la guía del eje corto (normalmente arriba/abajo en un lienzo apaisado) se volvía
  // casi imposible de pegar. dándole a cada eje su propio umbral, ambas líneas se
  // enganchan con la misma facilidad en pantalla
  imanX = IMAN,
  imanY = imanX,
): { x: number; y: number; guias: Guia[] } {
  // el lienzo aporta sus bordes y su centro, que es la alineación más pedida
  const objetivosX = [0, 0.5, 1]
  const objetivosY = [0, 0.5, 1]
  for (const o of otras) {
    objetivosX.push(...referencias(o.x, o.w))
    objetivosY.push(...referencias(o.y, o.h))
  }

  const guias: Guia[] = []
  let x = caja.x
  let y = caja.y

  // de los tres puntos de la caja gana el que quede más cerca de un objetivo,
  // para que no compitan entre sí y el elemento no vibre al arrastrarlo
  let mejorX: { ajuste: number; pos: number; dist: number } | null = null
  for (const propio of referencias(caja.x, caja.w)) {
    for (const destino of objetivosX) {
      const dist = Math.abs(propio - destino)
      if (dist <= imanX && (!mejorX || dist < mejorX.dist))
        mejorX = { ajuste: destino - propio, pos: destino, dist }
    }
  }
  if (mejorX) {
    x = caja.x + mejorX.ajuste
    guias.push({ eje: 'x', pos: mejorX.pos })
  }

  let mejorY: { ajuste: number; pos: number; dist: number } | null = null
  for (const propio of referencias(caja.y, caja.h)) {
    for (const destino of objetivosY) {
      const dist = Math.abs(propio - destino)
      if (dist <= imanY && (!mejorY || dist < mejorY.dist))
        mejorY = { ajuste: destino - propio, pos: destino, dist }
    }
  }
  if (mejorY) {
    y = caja.y + mejorY.ajuste
    guias.push({ eje: 'y', pos: mejorY.pos })
  }

  return { x, y, guias }
}

// anclaje fijo de un redimensionado en cada eje, en coordenadas del lienzo. es el
// punto que no se mueve mientras se estira: el borde contrario al tirador, o el
// centro cuando se estira desde el medio o en simétrico (Alt). modelar el estirado
// como un escalado alrededor de este punto permite saber a dónde va a parar cada
// borde, no solo el que sigue al cursor
function anclajeEje(
  centro: number,
  medida: number,
  lado: 'min' | 'max' | 'centro',
): number {
  if (lado === 'min') return centro - medida / 2
  if (lado === 'max') return centro + medida / 2
  return centro
}

// las líneas inteligentes durante un redimensionado. en vez de mirar solo el borde
// que arrastra el cursor, revisa a dónde caen los cuatro bordes y el centro de la
// caja ya estirada: si cualquiera queda cerca de un borde o del centro del lienzo se
// pega ahí y sale su guía. así la línea aparece igual cuando el contorno toca el
// límite por arriba o por abajo aunque el cursor esté estirando por un lado.
// `n` es la caja tentativa que devuelve `redimensionar` con la posición cruda del
// cursor; se recalcula el factor de escala para clavar el borde más cercano
export function imantarRedimension(
  caja: CajaGuia,
  proporcional: boolean,
  // punto fijo del estirado en cada eje: 'min' deja quieto el borde izquierdo/superior,
  // 'max' el derecho/inferior, 'centro' cuando crece desde el medio (tiradores del
  // medio en su eje perpendicular, o cualquier tirador con Alt)
  anclaX: 'min' | 'max' | 'centro',
  anclaY: 'min' | 'max' | 'centro',
  n: CajaGuia,
  imanX = IMAN,
  imanY = IMAN,
  // objetivos a los que se pega cada eje: por defecto el centro y los bordes del
  // lienzo, pero se les pueden sumar los bordes de las capas vecinas
  objX: number[] = [0, 0.5, 1],
  objY: number[] = objX,
): { caja: CajaGuia; guias: Guia[] } {
  const ax = anclajeEje(caja.x, caja.w, anclaX)
  const ay = anclajeEje(caja.y, caja.h, anclaY)
  // posiciones de las tres referencias (centro y bordes) con la caja sin estirar
  const xr = { centro: caja.x, min: caja.x - caja.w / 2, max: caja.x + caja.w / 2 }
  const yr = { centro: caja.y, min: caja.y - caja.h / 2, max: caja.y + caja.h / 2 }

  // busca el factor de escala que clava alguna referencia móvil de un eje en uno de
  // sus objetivos, quedándose con la más cercana. la referencia que coincide con el
  // anclaje no cuenta: está fija y no se puede mover escalando
  const candidatos = (f0: number, anc: number, refs: number[], objs: number[], iman: number) => {
    const out: { f: number; dist: number }[] = []
    for (const r of refs) {
      const denom = r - anc
      if (Math.abs(denom) < 1e-6) continue
      const actual = anc + f0 * denom
      for (const t of objs) {
        const dist = Math.abs(actual - t)
        if (dist <= iman) {
          const f = (t - anc) / denom
          if (f > 0.001) out.push({ f, dist })
        }
      }
    }
    return out
  }
  const mejor = (arr: { f: number; dist: number }[]) =>
    arr.reduce<{ f: number; dist: number } | null>((m, c) => (!m || c.dist < m.dist ? c : m), null)

  const f0x = caja.w > 0 ? n.w / caja.w : 1
  const f0y = caja.h > 0 ? n.h / caja.h : 1
  let fx: number
  let fy: number
  if (proporcional) {
    // un solo factor para los dos ejes: gana el borde que quede más cerca de un
    // objetivo, venga del eje que venga
    const b = mejor([
      ...candidatos(f0x, ax, [xr.centro, xr.min, xr.max], objX, imanX),
      ...candidatos(f0y, ay, [yr.centro, yr.min, yr.max], objY, imanY),
    ])
    fx = b ? b.f : f0x
    fy = fx
  } else {
    const bx = mejor(candidatos(f0x, ax, [xr.centro, xr.min, xr.max], objX, imanX))
    const by = mejor(candidatos(f0y, ay, [yr.centro, yr.min, yr.max], objY, imanY))
    fx = bx ? bx.f : f0x
    fy = by ? by.f : f0y
  }

  const xmin = ax + fx * (xr.min - ax)
  const xmax = ax + fx * (xr.max - ax)
  const ymin = ay + fy * (yr.min - ay)
  const ymax = ay + fy * (yr.max - ay)
  const fin: CajaGuia = { x: (xmin + xmax) / 2, y: (ymin + ymax) / 2, w: xmax - xmin, h: ymax - ymin }

  // las guías salen de los bordes que de verdad se mueven (el borde anclado queda
  // fijo y pintarlo dejaría una línea encendida todo el rato). se pinta donde una
  // referencia móvil coincide con uno de sus objetivos
  const guias: Guia[] = []
  const eps = 0.0015
  const agregar = (eje: 'x' | 'y', v: number, ancla: number, objs: number[]) => {
    if (Math.abs(v - ancla) < 1e-6) return
    const t = objs.find((o) => Math.abs(v - o) < eps)
    if (t !== undefined && !guias.some((g) => g.eje === eje && g.pos === t)) guias.push({ eje, pos: t })
  }
  agregar('x', fin.x, ax, objX)
  agregar('x', xmin, ax, objX)
  agregar('x', xmax, ax, objX)
  agregar('y', fin.y, ay, objY)
  agregar('y', ymin, ay, objY)
  agregar('y', ymax, ay, objY)

  return { caja: fin, guias }
}

// umbral de enganche por eje que da la misma holgura en píxeles de pantalla a lo alto
// y a lo ancho. `rc` es el área de contenido en píxeles (del propio visor), y `px` los
// píxeles de holgura deseados. así la guía se pega igual de fácil en un lienzo apaisado
// que en uno vertical, y a cualquier zoom del navegador
export function imanesPorEje(rc: { w: number; h: number }, px = 9): { x: number; y: number } {
  return {
    x: rc.w > 0 ? px / rc.w : IMAN,
    y: rc.h > 0 ? px / rc.h : IMAN,
  }
}
