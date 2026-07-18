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

// los tres puntos que interesan de una caja en cada eje: sus dos bordes y su
// centro. con eso se cubren las alineaciones que de verdad se usan
function referencias(centro: number, medida: number) {
  return [centro - medida / 2, centro, centro + medida / 2]
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
  iman = IMAN,
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
      if (dist <= iman && (!mejorX || dist < mejorX.dist))
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
      if (dist <= iman && (!mejorY || dist < mejorY.dist))
        mejorY = { ajuste: destino - propio, pos: destino, dist }
    }
  }
  if (mejorY) {
    y = caja.y + mejorY.ajuste
    guias.push({ eje: 'y', pos: mejorY.pos })
  }

  return { x, y, guias }
}
