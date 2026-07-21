// transformaciones generales que comparten capas y clips: rotación en grados y
// espejo por eje. viven aquí para que el visor y la exportación las apliquen
// exactamente igual, y lo que se ve al editar sea lo que sale en el archivo

export interface Transformable {
  rotacion?: number
  espejoH?: boolean
  espejoV?: boolean
}

// dice si no hay ninguna transformación puesta, para saltarse el trabajo
export function sinTransformar(t: Transformable): boolean {
  return !t.rotacion && !t.espejoH && !t.espejoV
}

// sufijo css para añadir a un transform ya existente. la rotación va primero y el
// volteo después, sobre el centro del elemento (el translate lo pone quien llama)
export function sufijoTransformCss(t: Transformable): string {
  const partes: string[] = []
  if (t.rotacion) partes.push(`rotate(${t.rotacion}deg)`)
  const fx = t.espejoH ? -1 : 1
  const fy = t.espejoV ? -1 : 1
  if (fx !== 1 || fy !== 1) partes.push(`scale(${fx}, ${fy})`)
  return partes.join(' ')
}

// aplica la misma transformación a un contexto de canvas, girando y volteando
// alrededor del centro (cx, cy) que se le indique. quien llama hace su save antes
// y su restore después
export function aplicarTransformCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: Transformable,
) {
  if (sinTransformar(t)) return
  ctx.translate(cx, cy)
  if (t.rotacion) ctx.rotate((t.rotacion * Math.PI) / 180)
  const fx = t.espejoH ? -1 : 1
  const fy = t.espejoV ? -1 : 1
  if (fx !== 1 || fy !== 1) ctx.scale(fx, fy)
  ctx.translate(-cx, -cy)
}
