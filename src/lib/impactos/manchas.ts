// impacto de "manchas": un revoltijo ALEATORIO de formas (manchas de tinta, círculos, triángulos,
// trazos rectos tipo brochazo, punteados) que aparecen por un momento sobre el cuadro y, con el
// modo de fusión DIFERENCIA, invierten el color de lo que tienen debajo. es el aire de collage en
// negativo de la referencia: cosas geométricas y orgánicas mezcladas, no una sola forma repetida.
// aquí solo se pintan las formas del color elegido con su alfa; la inversión la pone el modo de
// fusión que decide el llamante: en el visor el lienzo va con mix-blend-mode:difference y en la
// exportación con globalCompositeOperation='difference'. así el mismo dibujo sirve para los dos.
// todo se deriva del tiempo y de semillas fijas (nada de Math.random), para que el archivo repita
// exactamente lo que se vio en el visor. el color elige la TONALIDAD de la inversión (blanco =
// negativo puro; un color tiñe el negativo hacia él) y la fuerza decide cuánto y cuán marcado sale.

// pseudoaleatorio con semilla (mulberry32): mismo número para la misma semilla, para que cada forma
// tenga sus parámetros fijos y el conjunto no "hierva" distinto entre visor y exportación
function prng(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// pasa un color hex (#rgb o #rrggbb) a rgba con el alfa dado. si viene raro cae a blanco, que en
// modo diferencia es la inversión total (el negativo puro)
function conAlfa(hex: string, alfa: number): string {
  let h = (hex || '').replace('#', '').trim()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  const ok = h.length === 6 && !Number.isNaN(n)
  const r = ok ? (n >> 16) & 255 : 255
  const g = ok ? (n >> 8) & 255 : 255
  const b = ok ? n & 255 : 255
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alfa)).toFixed(3)})`
}

// disco de bordes desvanecidos (tinta suave). varios solapados hacen una mancha irregular
function grumo(ctx: CanvasRenderingContext2D, cx: number, cy: number, radio: number, color: string, alfa: number) {
  if (radio <= 0.5 || alfa <= 0.001) return
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio)
  g.addColorStop(0, conAlfa(color, alfa))
  g.addColorStop(0.55, conAlfa(color, alfa * 0.7))
  g.addColorStop(1, conAlfa(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, radio, 0, Math.PI * 2)
  ctx.fill()
}

// mancha orgánica: un grumo central con satélites, silueta con bultos, nada de círculo perfecto
function manchaTinta(ctx: CanvasRenderingContext2D, cx: number, cy: number, radio: number, color: string, alfa: number, semilla: number, t: number) {
  const r = prng(semilla)
  grumo(ctx, cx, cy, radio, color, alfa)
  const n = 4 + Math.floor(r() * 4)
  for (let k = 0; k < n; k++) {
    const ang = r() * 6.2832
    const dist = radio * (0.35 + r() * 0.6)
    const vaiven = 0.12 * radio * Math.sin(t * (0.6 + r()) + r() * 6.2832)
    grumo(ctx, cx + Math.cos(ang) * dist + vaiven, cy + Math.sin(ang) * dist, radio * (0.3 + r() * 0.45), color, alfa * (0.55 + 0.4 * r()))
  }
}

// polígono regular crisp (triángulo, cuadrado…), girado. da el corte geométrico en negativo
function poligono(ctx: CanvasRenderingContext2D, cx: number, cy: number, radio: number, lados: number, rot: number, color: string, alfa: number) {
  ctx.fillStyle = conAlfa(color, alfa)
  ctx.beginPath()
  for (let k = 0; k < lados; k++) {
    const a = rot + (k / lados) * 6.2832
    const x = cx + Math.cos(a) * radio
    const y = cy + Math.sin(a) * radio
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

// aro (círculo solo de contorno): otra figura geométrica que invierte una banda fina
function aro(ctx: CanvasRenderingContext2D, cx: number, cy: number, radio: number, grosor: number, color: string, alfa: number) {
  ctx.strokeStyle = conAlfa(color, alfa)
  ctx.lineWidth = Math.max(1, grosor)
  ctx.beginPath()
  ctx.arc(cx, cy, radio, 0, Math.PI * 2)
  ctx.stroke()
}

// brochazo: un trazo recto largo y fino, girado, con las puntas desvanecidas, tipo pintura
function brochazo(ctx: CanvasRenderingContext2D, cx: number, cy: number, largo: number, ancho: number, rot: number, color: string, alfa: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  const g = ctx.createLinearGradient(-largo / 2, 0, largo / 2, 0)
  g.addColorStop(0, conAlfa(color, 0))
  g.addColorStop(0.5, conAlfa(color, alfa))
  g.addColorStop(1, conAlfa(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-largo / 2, -ancho / 2, largo, ancho)
  ctx.restore()
}

// puñado de puntos sueltos alrededor de un centro, como una salpicadura
function salpicadura(ctx: CanvasRenderingContext2D, cx: number, cy: number, radio: number, color: string, alfa: number, semilla: number) {
  const r = prng(semilla)
  const n = 5 + Math.floor(r() * 6)
  for (let k = 0; k < n; k++) {
    const ang = r() * 6.2832
    const dist = radio * (0.2 + r() * 1.1)
    grumo(ctx, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, radio * (0.08 + r() * 0.16), color, alfa * (0.5 + 0.5 * r()))
  }
}

// cuántas formas salen a la vez; suficientes para el revoltijo sin empastar el cuadro
const CUANTAS = 13

// dibuja el revoltijo dentro del rectángulo (x, y, w, h). color = tonalidad de la inversión,
// intensidad de 0 a 100 (fuerza/opacidad general), suavidad de 0 a 1 (entrada/salida suave para
// estirar el impacto sin cortes secos), p el avance del impacto (0 a 1) y t el tiempo del cabezal
export function dibujarManchas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  intensidad: number,
  suavidad: number,
  p: number,
  t: number,
) {
  const amp = Math.max(0, Math.min(1, intensidad / 100))
  // envolvente trapezoidal: aparece, se mantiene y se va, con el ancho de subida/bajada según la
  // suavidad, para que el impacto no dé un golpe seco al empezar ni al terminar
  const borde = 0.04 + suavidad * 0.36
  const env = Math.max(0, Math.min(1, Math.min(p / borde, (1 - p) / borde)))
  const fuerza = amp * env
  if (fuerza <= 0.001) return

  const lado = Math.max(w, h)
  ctx.save()
  for (let i = 0; i < CUANTAS; i++) {
    // dos semillas: una fija por forma (su tipo, sitio y tamaño) y el tiempo, que la hace latir un
    // poco y aparecer escalonada, para que no salgan ni se vayan todas a la vez
    const r = prng(i * 2654435761 + 17)
    const tipo = Math.floor(r() * 6)
    // sitio repartido por todo el cuadro, con algo de desorden; unas cerca del borde, otras al medio
    const cx = x + (0.08 + r() * 0.84) * w + 0.05 * w * Math.sin(t * (0.4 + r() * 0.5) + r() * 6.2832)
    const cy = y + (0.08 + r() * 0.84) * h + 0.05 * h * Math.cos(t * (0.4 + r() * 0.5) + r() * 6.2832)
    // cada forma entra y sale en su propia ventanita dentro del impacto, no todas juntas: así el
    // conjunto parpadea y se renueva como un collage vivo
    const fase = r()
    const propio = Math.max(0, Math.min(1, 1 - Math.abs(((p + fase) % 1) - 0.5) * 3.4))
    const a = fuerza * propio * (0.5 + 0.5 * r())
    if (a <= 0.004) continue
    const tam = (0.1 + r() * 0.26) * lado * (0.6 + 0.6 * fuerza)
    const rot = r() * 6.2832 + t * (r() - 0.5) * 0.6

    if (tipo === 0) manchaTinta(ctx, cx, cy, tam, color, a, i * 7 + 3, t)
    else if (tipo === 1) poligono(ctx, cx, cy, tam * 0.9, 3, rot, color, a) // triángulo
    else if (tipo === 2) brochazo(ctx, cx, cy, tam * 3.2, tam * (0.16 + r() * 0.18), rot, color, a)
    else if (tipo === 3) aro(ctx, cx, cy, tam, tam * (0.06 + r() * 0.1), color, a)
    else if (tipo === 4) salpicadura(ctx, cx, cy, tam, color, a, i * 13 + 5)
    else poligono(ctx, cx, cy, tam * 0.8, 4, rot, color, a) // rombo/cuadrado girado
  }
  ctx.restore()
}
