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
// imanta una coordenada suelta (0..1) a los objetivos cercanos. se usa al
// redimensionar: el borde que se arrastra se pega al centro y los bordes del lienzo
// (o de las capas vecinas) y ahí sale la línea guía, igual que al mover. devuelve la
// coordenada ya corregida y, si se pegó a algo, la línea donde cayó
export function imantarValor(
  v: number,
  objetivos: number[],
  iman = IMAN,
): { v: number; pos: number | null } {
  let mejor: number | null = null
  let dist = Infinity
  for (const o of objetivos) {
    const d = Math.abs(v - o)
    if (d <= iman && d < dist) {
      dist = d
      mejor = o
    }
  }
  return mejor === null ? { v, pos: null } : { v: mejor, pos: mejor }
}

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
