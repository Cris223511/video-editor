// geometría compartida de las figuras, para que el visor y la exportación tracen
// exactamente la misma forma. hoy vive aquí la estrella, que es la que necesitaba
// un cálculo aparte

// vértices de una estrella de cinco puntas que llenan por completo su caja. antes
// se dibujaba con un radio de min(ancho, alto), así que en una caja más ancha
// quedaba cuadrada y centrada, con aire a los lados y un recuadro de selección
// que no se ceñía a la forma. ahora los diez vértices se generan en un círculo
// unitario, se mide su recuadro real y se reescala para que sus extremos toquen
// los cuatro bordes: la estrella ocupa toda su caja y la selección se le pega.
// el margen deja sitio al grosor del borde para que no se salga por los lados
export function puntosEstrella(w: number, h: number, margen = 0): [number, number][] {
  const crudos: [number, number][] = []
  for (let k = 0; k < 10; k++) {
    const ang = ((k * 36 - 90) * Math.PI) / 180
    const rr = k % 2 === 0 ? 1 : 0.42
    crudos.push([Math.cos(ang) * rr, Math.sin(ang) * rr])
  }
  const xs = crudos.map((p) => p[0])
  const ys = crudos.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const anchoUtil = Math.max(0, w - 2 * margen)
  const altoUtil = Math.max(0, h - 2 * margen)
  return crudos.map(([x, y]) => [
    margen + ((x - minX) / (maxX - minX || 1)) * anchoUtil,
    margen + ((y - minY) / (maxY - minY || 1)) * altoUtil,
  ])
}
