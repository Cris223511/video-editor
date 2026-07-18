// rectángulo real donde se ve el video dentro de un área. como el visor usa
// object-contain, sobran bandas a los lados o arriba y abajo; las capas y la
// censura se colocan respecto a este rectángulo para cuadrar con la imagen
export function rectContenido(w: number, h: number, aspecto: number) {
  const aspectoArea = w / h
  let cw: number
  let ch: number
  if (aspectoArea > aspecto) {
    ch = h
    cw = h * aspecto
  } else {
    cw = w
    ch = w / aspecto
  }
  return { w: cw, h: ch, ox: (w - cw) / 2, oy: (h - ch) / 2 }
}
