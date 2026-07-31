// impacto de "manchas": unos blobs suaves que vagan al azar por el cuadro y, con el modo de
// fusión DIFERENCIA, invierten el color de lo que tienen debajo (el aire líquido/negativo de la
// referencia). aquí solo se pintan los blobs del color elegido con su alfa; la inversión la pone
// el modo de fusión, que decide el llamante: en el visor el lienzo va con mix-blend-mode:difference
// y en la exportación se dibuja con globalCompositeOperation='difference'. así el mismo dibujo
// sirve para los dos. todo se deriva del tiempo (nada de Math.random), para que el archivo repita
// exactamente lo que se vio en el visor

// pseudoaleatorio con semilla (mulberry32): mismo número para la misma semilla, para que cada
// mancha tenga sus parámetros fijos y el conjunto no "hierva" distinto entre visor y exportación
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

// cuántas manchas hay a la vez. suficientes para que se lea como algo vivo, sin llenar el cuadro
const CUANTAS = 7

// dibuja las manchas dentro del rectángulo (x, y, w, h). color es el elegido por el usuario,
// intensidad de 0 a 100 (la transparencia/fuerza general), suavidad de 0 a 1 (qué tan suave entra
// y sale, para poder estirar el impacto entre dos clips sin cortes secos), p el avance del impacto
// (0 al empezar, 1 al terminar) y t el tiempo del cabezal (mueve las manchas)
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
  // envolvente trapezoidal: sube en el primer tramo, se mantiene y baja al final. el ancho de la
  // subida/bajada crece con la suavidad. así el impacto aparece y desaparece sin golpe seco
  const borde = 0.04 + suavidad * 0.36
  const env = Math.max(0, Math.min(1, Math.min(p / borde, (1 - p) / borde)))
  const alfaBase = amp * env
  if (alfaBase <= 0.001) return

  const lado = Math.min(w, h)
  ctx.save()
  for (let i = 0; i < CUANTAS; i++) {
    const r = prng(i * 2654435761 + 17)
    // parámetros fijos de la mancha: su velocidad y fase de deambular, su tamaño base y su ritmo
    const velX = 0.12 + r() * 0.5
    const velY = 0.12 + r() * 0.5
    const faseX = r() * 6.2832
    const faseY = r() * 6.2832
    const tamBase = 0.12 + r() * 0.24
    const ritmo = 0.5 + r()
    const faseR = r() * 6.2832
    // se pasea con dos senos desfasados (movimiento suave y sin repetición evidente) y late un
    // poco de tamaño; el alfa de cada mancha también respira, para que no queden todas iguales
    const cx = x + (0.5 + 0.45 * Math.sin(t * velX + faseX)) * w
    const cy = y + (0.5 + 0.45 * Math.sin(t * velY + faseY)) * h
    const tam = tamBase * lado * (0.85 + 0.3 * Math.sin(t * ritmo + faseR))
    const a = alfaBase * (0.55 + 0.45 * Math.sin(t * (0.4 + r()) + r() * 6.2832))
    if (a <= 0.001 || tam <= 0.5) continue
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, tam)
    g.addColorStop(0, conAlfa(color, a))
    g.addColorStop(0.55, conAlfa(color, a * 0.6))
    g.addColorStop(1, conAlfa(color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, tam, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
