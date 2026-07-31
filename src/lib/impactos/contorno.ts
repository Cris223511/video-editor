import { aplicarTransformCanvas } from '../layers/transform'
import { DireccionImpacto } from '../../types/impacto'

// motor de los impactos de neón. componen sobre el objeto que se ve en el plano líneas
// y resplandores del color elegido. lo usan por igual el visor y la exportación, así que
// lo que se ve al montar es lo que sale en el archivo.
//
// el objeto se aísla por brillo: en estos planos nocturnos lo iluminado (el coche) es
// lo claro y el fondo es oscuro, así que quedándose solo con los píxeles por encima de
// un umbral de luz el efecto cae sobre el objeto y no sobre todo el cuadro.

const ANCHO_TRABAJO = 480
// umbral de luz para considerar que un píxel es del objeto (0..255)
const UMBRAL_OBJETO = 42

export interface LienzosContorno {
  reduce: HTMLCanvasElement | OffscreenCanvas
  linea: HTMLCanvasElement | OffscreenCanvas
}

export function crearLienzosContorno(): LienzosContorno {
  return { reduce: document.createElement('canvas'), linea: document.createElement('canvas') }
}

function aRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [56, 189, 248]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function ruido(n: number): number {
  const s = Math.sin(n * 91.37) * 47453.13
  return s - Math.floor(s)
}

// envolvente del impacto: entra y sale con suavidad. `suavidad` (0..1) controla cuánto
// tarda en aparecer y retirarse, sin tocar la duración total: 0 = entra y sale seco y
// rápido; 1 = despacio. siempre suave, solo cambia el ritmo
function envolvente(p: number, suavidad: number): number {
  if (p <= 0 || p >= 1) return 0
  const rampa = 0.04 + Math.max(0, Math.min(1, suavidad)) * 0.42
  const sube = Math.min(1, p / rampa)
  const baja = Math.min(1, (1 - p) / rampa)
  // suavizado tipo smoothstep en los extremos, para que no entre lineal
  const s = Math.min(sube, baja)
  return s * s * (3 - 2 * s)
}

type Trans = { rotacion?: number; espejoH?: boolean; espejoV?: boolean }

// reduce el video a tamaño de trabajo y devuelve su luminancia por píxel, o null si el
// fotograma aún no se puede leer
function luminancia(
  video: CanvasImageSource,
  vw: number,
  vh: number,
  lz: LienzosContorno,
): { w: number; h: number; lum: Float32Array; rctx: CanvasRenderingContext2D } | null {
  const w = ANCHO_TRABAJO
  const h = Math.max(1, Math.round((w * vh) / vw))
  lz.reduce.width = w
  lz.reduce.height = h
  const rctx = lz.reduce.getContext('2d') as CanvasRenderingContext2D | null
  if (!rctx) return null
  rctx.drawImage(video, 0, 0, w, h)
  let datos: ImageData
  try {
    datos = rctx.getImageData(0, 0, w, h)
  } catch {
    return null
  }
  const src = datos.data
  const lum = new Float32Array(w * h)
  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    lum[j] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]
  }
  return { w, h, lum, rctx }
}

// vuelca el lienzo de líneas sobre el destino con halo y trazo nítido, en modo additivo
function volcarNeon(
  ctx: CanvasRenderingContext2D,
  linea: CanvasImageSource,
  rect: { dx: number; dy: number; dw: number; dh: number },
  w: number,
  amp: number,
  alfa: number,
) {
  const radioGlow = (2 + amp * 5) * (rect.dw / w)
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alfa * 0.85
  ctx.filter = `blur(${Math.max(1, radioGlow).toFixed(1)}px)`
  ctx.drawImage(linea, rect.dx, rect.dy, rect.dw, rect.dh)
  ctx.filter = 'none'
  ctx.globalAlpha = Math.min(1, alfa)
  ctx.drawImage(linea, rect.dx, rect.dy, rect.dw, rect.dh)
}

// interpolación suave (smoothstep) entre a y b: 0 por debajo de a, 1 por encima de b y
// una transición sin aristas en medio. sirve para los bordes blandos de los barridos
function suave(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// máscara de revelado direccional aplicada al lienzo de líneas. las líneas entran
// barriendo el plano en la dirección elegida durante la primera parte, y salen barriendo
// en esa MISMA dirección durante la última: si aparecieron de izquierda a derecha, se
// borran también empezando por la izquierda, como una cortina que abre y luego cierra por
// el mismo lado. un frente de entrada y otro de salida, ambos avanzando por el mismo eje
function revelar(
  lctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  direccion: DireccionImpacto,
  p: number,
) {
  const banda = 0.16
  // el frente de entrada recorre 0→1 en la primera parte; el de salida arranca más tarde
  // y recorre 0→1 hasta el final. una línea está encendida si el frente de entrada ya la
  // pasó y el de salida todavía no
  const entra = Math.min(1 + banda, p * 2.6)
  const sale = Math.max(0, (p - 0.6) * 2.6)
  const alfa = (v: number) => {
    const encendida = 1 - suave(entra - banda, entra, v) // 1 antes del frente de entrada
    const sinBorrar = suave(sale, sale + banda, v) // 0 detrás del frente de salida
    return Math.max(0, Math.min(1, encendida * sinBorrar))
  }
  const horizontal = direccion === 'izq' || direccion === 'der'
  const invertido = direccion === 'izq' || direccion === 'arr'
  // el eje del gradiente va en el sentido del barrido; si la dirección es invertida se
  // crea al revés, así v=0 cae en el lado por el que debe empezar
  const [x0, y0, x1, y1] = horizontal
    ? invertido
      ? [w, 0, 0, 0]
      : [0, 0, w, 0]
    : invertido
      ? [0, h, 0, 0]
      : [0, 0, 0, h]
  const g = lctx.createLinearGradient(x0, y0, x1, y1)
  // se muestrea la visibilidad en varios puntos del eje para que las bandas blandas de los
  // dos frentes salgan bien, no solo cuatro paradas fijas
  for (let i = 0; i <= 10; i++) {
    const v = i / 10
    g.addColorStop(v, `rgba(255,255,255,${alfa(v).toFixed(3)})`)
  }
  lctx.globalCompositeOperation = 'destination-in'
  lctx.fillStyle = g
  lctx.fillRect(0, 0, w, h)
  lctx.globalCompositeOperation = 'source-over'
}

// impacto "contorno de neón": todos los bordes del plano encendidos, con parpadeo. es
// el que abarca el cuadro entero (los otros dos se ciñen al objeto)
export function dibujarContorno(
  ctx: CanvasRenderingContext2D,
  video: CanvasImageSource,
  vw: number,
  vh: number,
  rect: { dx: number; dy: number; dw: number; dh: number },
  color: string,
  intensidad: number,
  suavidad: number,
  p: number,
  tiempo: number,
  lz: LienzosContorno,
  trans: Trans = {},
) {
  if (vw <= 0 || vh <= 0) return
  const env = envolvente(p, suavidad)
  if (env <= 0) return
  const info = luminancia(video, vw, vh, lz)
  if (!info) return
  const { w, h, lum, rctx } = info
  const [cr, cg, cb] = aRgb(color)
  const amp = Math.max(0, Math.min(100, intensidad)) / 100
  const umbral = 42 - amp * 22
  const ganancia = 0.9 + amp * 1.6
  const salida = rctx.createImageData(w, h)
  const out = salida.data
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const o = y * w + x
      const gx =
        -lum[o - w - 1] - 2 * lum[o - 1] - lum[o + w - 1] +
        lum[o - w + 1] + 2 * lum[o + 1] + lum[o + w + 1]
      const gy =
        -lum[o - w - 1] - 2 * lum[o - w] - lum[o - w + 1] +
        lum[o + w - 1] + 2 * lum[o + w] + lum[o + w + 1]
      const mag = Math.sqrt(gx * gx + gy * gy)
      let a = (mag - umbral) * ganancia
      if (a <= 0) continue
      if (a > 255) a = 255
      const k = o * 4
      out[k] = cr
      out[k + 1] = cg
      out[k + 2] = cb
      out[k + 3] = a
    }
  }
  ;(lz.linea as HTMLCanvasElement).width = w
  ;(lz.linea as HTMLCanvasElement).height = h
  const lctx = lz.linea.getContext('2d') as CanvasRenderingContext2D
  lctx.putImageData(salida, 0, 0)
  const flick = 0.72 + 0.28 * ruido(Math.floor(tiempo * 24))
  ctx.save()
  aplicarTransformCanvas(ctx, rect.dx + rect.dw / 2, rect.dy + rect.dh / 2, trans)
  volcarNeon(ctx, lz.linea, rect, w, amp, env * flick)
  ctx.restore()
}

// impacto "líneas 3D": curvas de nivel de brillo (topográficas) que envuelven la forma
// del OBJETO, como una malla que sigue su volumen. se cuantiza la luz en bandas y se
// marca dónde cambia de banda; solo sobre el objeto (píxeles claros). `densidad` sube
// cuántas curvas salen; se revelan en la dirección elegida
export function dibujarLineas3d(
  ctx: CanvasRenderingContext2D,
  video: CanvasImageSource,
  vw: number,
  vh: number,
  rect: { dx: number; dy: number; dw: number; dh: number },
  color: string,
  intensidad: number,
  densidad: number,
  suavidad: number,
  direccion: DireccionImpacto,
  p: number,
  tiempo: number,
  lz: LienzosContorno,
  trans: Trans = {},
) {
  if (vw <= 0 || vh <= 0) return
  // el alfa de las líneas 3D solo sube al arrancar y se mantiene: la desaparición ya no es
  // un desvanecido global sino el barrido de salida de `revelar`, que borra en la misma
  // dirección en que aparecieron. así entra y sale por el mismo lado
  if (p <= 0 || p >= 1) return
  const rampa = 0.04 + Math.max(0, Math.min(1, suavidad)) * 0.42
  const sube = Math.min(1, p / rampa)
  const env = sube * sube * (3 - 2 * sube)
  const info = luminancia(video, vw, vh, lz)
  if (!info) return
  const { w, h, lum, rctx } = info
  const [cr, cg, cb] = aRgb(color)
  const amp = Math.max(0, Math.min(100, intensidad)) / 100
  const dens = Math.max(0, Math.min(100, densidad)) / 100
  // número de bandas de luz: más densidad, más curvas siguiendo el volumen
  const bandas = 4 + Math.round(dens * 14)
  const paso = 255 / bandas
  const nivel = (v: number) => Math.floor(v / paso)

  const salida = rctx.createImageData(w, h)
  const out = salida.data
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const o = y * w + x
      if (lum[o] < UMBRAL_OBJETO) continue // solo el objeto (lo iluminado)
      const n0 = nivel(lum[o])
      // frontera entre bandas: si el vecino de la derecha o el de abajo está en otra
      // banda, este píxel es una curva de nivel
      if (n0 !== nivel(lum[o + 1]) || n0 !== nivel(lum[o + w])) {
        const k = o * 4
        out[k] = cr
        out[k + 1] = cg
        out[k + 2] = cb
        out[k + 3] = 255
      }
    }
  }
  ;(lz.linea as HTMLCanvasElement).width = w
  ;(lz.linea as HTMLCanvasElement).height = h
  const lctx = lz.linea.getContext('2d') as CanvasRenderingContext2D
  lctx.putImageData(salida, 0, 0)
  revelar(lctx, w, h, direccion, p)

  const flick = 0.85 + 0.15 * ruido(Math.floor(tiempo * 20))
  ctx.save()
  aplicarTransformCanvas(ctx, rect.dx + rect.dw / 2, rect.dy + rect.dh / 2, trans)
  volcarNeon(ctx, lz.linea, rect, w, amp, env * flick)
  ctx.restore()
}

// impacto "rayos": un resplandor del color que emana de las partes brillantes del
// OBJETO y lo envuelve, creciendo al aparecer. se aíslan los píxeles claros, se tiñen
// hacia el color y se vuelcan muy difuminados en modo additivo, en varias pasadas, para
// ese halo intenso con destellos que sube alrededor del objeto
export function dibujarRayos(
  ctx: CanvasRenderingContext2D,
  video: CanvasImageSource,
  vw: number,
  vh: number,
  rect: { dx: number; dy: number; dw: number; dh: number },
  color: string,
  intensidad: number,
  suavidad: number,
  p: number,
  tiempo: number,
  lz: LienzosContorno,
  trans: Trans = {},
) {
  if (vw <= 0 || vh <= 0) return
  const env = envolvente(p, suavidad)
  if (env <= 0) return
  const info = luminancia(video, vw, vh, lz)
  if (!info) return
  const { w, h, lum, rctx } = info
  const [cr, cg, cb] = aRgb(color)
  const amp = Math.max(0, Math.min(100, intensidad)) / 100

  // se aíslan las zonas claras del objeto y se tiñen hacia el color, dejando algo de
  // blanco en lo más brillante (el núcleo del destello)
  const salida = rctx.createImageData(w, h)
  const out = salida.data
  const umbral = 120 - amp * 55
  for (let o = 0, k = 0; o < lum.length; o++, k += 4) {
    const L = lum[o]
    if (L < umbral) continue
    const f = Math.min(1, (L - umbral) / (255 - umbral))
    // mezcla del color con blanco según lo brillante: el corazón tiende a blanco
    out[k] = Math.round(cr + (255 - cr) * f)
    out[k + 1] = Math.round(cg + (255 - cg) * f)
    out[k + 2] = Math.round(cb + (255 - cb) * f)
    out[k + 3] = Math.round(120 + 135 * f)
  }
  ;(lz.linea as HTMLCanvasElement).width = w
  ;(lz.linea as HTMLCanvasElement).height = h
  const lctx = lz.linea.getContext('2d') as CanvasRenderingContext2D
  lctx.putImageData(salida, 0, 0)

  const flick = 0.85 + 0.15 * ruido(Math.floor(tiempo * 30))
  const alfa = env * flick
  const esc = rect.dw / w
  // el resplandor crece con el impacto: empieza ceñido y se expande envolviendo
  const crece = 0.5 + env * 0.9

  ctx.save()
  aplicarTransformCanvas(ctx, rect.dx + rect.dw / 2, rect.dy + rect.dh / 2, trans)
  ctx.globalCompositeOperation = 'lighter'
  // varias pasadas de halo, de más ancho y tenue a más ceñido y fuerte
  const capas: [number, number][] = [
    [(26 + amp * 34) * esc * crece, 0.5],
    [(12 + amp * 16) * esc * crece, 0.7],
    [(4 + amp * 6) * esc, 0.9],
  ]
  for (const [radio, peso] of capas) {
    ctx.globalAlpha = Math.min(1, alfa * peso)
    ctx.filter = `blur(${Math.max(1, radio).toFixed(1)}px)`
    ctx.drawImage(lz.linea, rect.dx, rect.dy, rect.dw, rect.dh)
  }
  // núcleo nítido
  ctx.filter = 'none'
  ctx.globalAlpha = Math.min(1, alfa)
  ctx.drawImage(lz.linea, rect.dx, rect.dy, rect.dw, rect.dh)
  ctx.restore()
}
