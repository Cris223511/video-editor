import { EfectoClip } from '../../types/timeline'

// los efectos animados no son un filtro de color: son texturas que se mueven con el
// tiempo (grano que baila, rayas de cine, líneas de vhs, destellos que entran). se
// pintan por cuadro encima del video, tanto en el visor como en la exportación, y todo
// lo que cambia se deriva del tiempo del fotograma, así el archivo sale idéntico a lo
// que se vio al montar. nada de Math.random en el dibujo, o cada pasada saldría distinta

export type TipoAnimado =
  | 'grano'
  | 'cineviejo'
  | 'cinemudo'
  | 'vhs'
  | 'crt'
  | 'cam2000'
  | 'estatica'
  | 'glitch'
  | 'destellos'
  | 'fugascolor'
  | 'bokeh'
  | 'nieve'
  | 'lluvia'
  | 'polvo'
  | 'retro'
  | 'proyector'
  | 'interferencia'

export interface EfectoAnimado {
  tipo: 'animado'
  animado: TipoAnimado
  intensidad: number // 0 a 100
  // cantidad de grano/ruido, de 0 a 100, como mando aparte del nivel general. de momento solo
  // lo usa la Cámara 2000, que pedía regular el ruido por separado; el resto de efectos lo
  // ignora y sigue derivando el grano de su propia intensidad. sin definir vale un valor medio
  ruido?: number
}

// catálogo para el panel: id interno y nombre visible. el orden es el que se ve en la
// rejilla, agrupando por parecido (texturas de película, fallos de señal, partículas,
// ambiente) para que sea fácil encontrarlos
export const TIPOS_ANIMADOS: { id: TipoAnimado; nombre: string }[] = [
  { id: 'grano', nombre: 'Grano de película' },
  { id: 'cineviejo', nombre: 'Cine viejo' },
  { id: 'cinemudo', nombre: 'Cine mudo (1920)' },
  { id: 'proyector', nombre: 'Proyector viejo' },
  { id: 'polvo', nombre: 'Polvo y arañazos' },
  { id: 'vhs', nombre: 'VHS' },
  { id: 'crt', nombre: 'Monitor CRT' },
  { id: 'cam2000', nombre: 'Cámara 2000' },
  { id: 'estatica', nombre: 'Estática de TV' },
  { id: 'glitch', nombre: 'Glitch digital' },
  { id: 'interferencia', nombre: 'Interferencia' },
  { id: 'retro', nombre: 'Neón 80' },
  { id: 'destellos', nombre: 'Destellos de luz' },
  { id: 'fugascolor', nombre: 'Fugas de color' },
  { id: 'bokeh', nombre: 'Luces bokeh' },
  { id: 'nieve', nombre: 'Nieve' },
  { id: 'lluvia', nombre: 'Lluvia' },
]

// el primer efecto animado del clip, si lo hay. solo puede haber uno activo a la vez:
// apilar dos texturas encima del video ensuciaría la imagen sin aportar
export function efectoAnimado(efectos: EfectoClip[] = []): (EfectoAnimado & { id: string }) | null {
  for (const e of efectos) {
    if (e.tipo === 'animado' && e.intensidad > 0) return e as EfectoAnimado & { id: string }
  }
  return null
}

export function hayEfectoAnimado(efectos: EfectoClip[] = []): boolean {
  return efectoAnimado(efectos) !== null
}

// generador pseudoaleatorio con semilla (mulberry32): mismo número para la misma
// semilla, que es justo lo que hace falta para que el grano y las rayas caigan igual
// en el visor y en el archivo. se siembra con el número de cuadro y el índice de cada
// elemento, nunca con el reloj
function prng(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ruido en una casilla que se repite: se generan varias, una por "cuadro" del grano,
// para poder cambiarlas sin recalcular. cada una es gris medio con desviaciones, así
// que en modo overlay el gris no toca nada y solo el ruido aclara u oscurece
const CASILLA = 128
const CUADROS_GRANO = 24
let casillasGrano: HTMLCanvasElement[] | null = null
function tejerCasillasGrano(): HTMLCanvasElement[] {
  if (casillasGrano) return casillasGrano
  const lista: HTMLCanvasElement[] = []
  for (let k = 0; k < CUADROS_GRANO; k++) {
    const cv = document.createElement('canvas')
    cv.width = CASILLA
    cv.height = CASILLA
    const ctx = cv.getContext('2d')
    if (!ctx) continue
    const img = ctx.createImageData(CASILLA, CASILLA)
    const r = prng(1000 + k * 7919)
    for (let i = 0; i < img.data.length; i += 4) {
      // grano monocromo: un gris con desviación fuerte, centrado en 128 para que el
      // overlay lo tome como neutro y solo empuje hacia las luces o las sombras
      const v = 128 + (r() - 0.5) * 235
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    lista.push(cv)
  }
  casillasGrano = lista
  return lista
}

// cuántos "cuadros" de textura por segundo. el grano de cine no cambia a 60 por
// segundo, va más lento, y así se ve orgánico en vez de hervir
const FPS_TEXTURA = 20

export interface RectDest {
  dx: number
  dy: number
  dw: number
  dh: number
}

// pinta el grano encima del rectángulo del video. usa un patrón repetido de la casilla
// que toca según el tiempo, desplazado un poco cada cuadro para que no se vea fijo
function pintarGrano(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number, alfaMax = 0.5) {
  const casillas = tejerCasillasGrano()
  if (!casillas.length) return
  const cuadro = Math.floor(t * FPS_TEXTURA)
  const casilla = casillas[((cuadro % casillas.length) + casillas.length) % casillas.length]
  const patron = ctx.createPattern(casilla, 'repeat')
  if (!patron) return
  const r = prng(cuadro * 2654435761)
  const ox = Math.floor(r() * CASILLA)
  const oy = Math.floor(r() * CASILLA)
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = Math.min(1, fuerza * alfaMax)
  ctx.beginPath()
  ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.clip()
  ctx.translate(ox, oy)
  ctx.fillStyle = patron
  ctx.fillRect(dst.dx - ox, dst.dy - oy, dst.dw, dst.dh)
  ctx.restore()
}

// viñeta: oscurece las esquinas con un degradado radial. es fija (no se anima) pero da
// mucho el aire de proyector viejo, así que va dentro de los efectos de época
function pintarVineta(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number) {
  const cx = dst.dx + dst.dw / 2
  const cy = dst.dy + dst.dh / 2
  const radio = Math.hypot(dst.dw, dst.dh) / 2
  const g = ctx.createRadialGradient(cx, cy, radio * 0.55, cx, cy, radio)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, fuerza * 0.8)})`)
  ctx.save()
  ctx.beginPath()
  ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.clip()
  ctx.fillStyle = g
  ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.restore()
}

// rayas verticales del cine: unas pocas líneas claras finas que saltan de sitio cada
// pocos cuadros, como el rayado del celuloide gastado. su cantidad y posición salen del
// número de cuadro, de modo que el archivo repite el mismo baile que el visor
function pintarRayas(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  // las rayas cambian más lento que el grano, dan saltos secos
  const paso = Math.floor(t * 10)
  const r = prng(paso * 40503 + 17)
  const cuantas = 2 + Math.floor(r() * 3)
  ctx.save()
  ctx.beginPath()
  ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.clip()
  for (let i = 0; i < cuantas; i++) {
    const x = dst.dx + r() * dst.dw
    const ancho = 0.6 + r() * 1.4
    const clara = r() > 0.4
    const alfa = (0.1 + r() * 0.25) * Math.min(1, fuerza * 1.2)
    ctx.fillStyle = clara ? `rgba(255,255,245,${alfa})` : `rgba(20,15,10,${alfa})`
    ctx.fillRect(x, dst.dy, ancho, dst.dh)
  }
  ctx.restore()
}

// parpadeo de luz: un velo negro cuya opacidad late suave, como la lámpara del
// proyector que no da una luz pareja. se deriva del tiempo con dos senos desfasados
// para que el pulso no sea mecánico
function pintarParpadeo(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  const pulso = Math.sin(t * 8.7) * 0.5 + Math.sin(t * 21.3) * 0.5 // -1 a 1 aprox
  const alfa = Math.max(0, pulso) * 0.16 * fuerza
  if (alfa <= 0.001) return
  ctx.save()
  ctx.fillStyle = `rgba(0,0,0,${alfa})`
  ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.restore()
}

// líneas de escaneo del vhs: un patrón de rayas horizontales oscuras cada pocos
// píxeles, que baja despacio para dar el temblor de sincronía. se arma una casilla alta
// de 3 px (dos claras, una oscura) y se repite
let casillaScan: HTMLCanvasElement | null = null
function tejerScan(): HTMLCanvasElement | null {
  if (casillaScan) return casillaScan
  const cv = document.createElement('canvas')
  cv.width = 4
  cv.height = 3
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 4, 3)
  ctx.fillStyle = 'rgba(0,0,0,1)'
  ctx.fillRect(0, 2, 4, 1)
  casillaScan = cv
  return cv
}

function pintarVHS(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.clip()

  // líneas de escaneo que bajan lento
  const scan = tejerScan()
  if (scan) {
    const patron = ctx.createPattern(scan, 'repeat')
    if (patron) {
      const desliz = (t * 30) % 3
      ctx.save()
      ctx.globalAlpha = Math.min(0.6, fuerza * 0.55)
      ctx.translate(0, desliz)
      ctx.fillStyle = patron
      ctx.fillRect(dst.dx, dst.dy - 3, dst.dw, dst.dh + 6)
      ctx.restore()
    }
  }

  // franjas de color desplazadas (el corrimiento de crominancia del vhs): dos bandas
  // tenues, una magenta y otra verde, que se mueven en vertical a distinta velocidad
  const banda = (color: string, vel: number, alto: number, fase: number) => {
    const y = dst.dy + (((t * vel + fase) % 1) * (dst.dh + alto)) - alto
    const g = ctx.createLinearGradient(0, y, 0, y + alto)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = Math.min(1, fuerza * 0.5)
    ctx.fillStyle = g
    ctx.fillRect(dst.dx, y, dst.dw, alto)
    ctx.restore()
  }
  banda('rgba(255,60,220,0.5)', 0.13, dst.dh * 0.18, 0)
  banda('rgba(60,255,180,0.4)', 0.09, dst.dh * 0.22, 0.5)

  // línea de seguimiento: una banda clara y fina que salta por la parte de abajo, el
  // ruido de tracking típico de una cinta gastada. cambia rápido de sitio
  const paso = Math.floor(t * 12)
  const r = prng(paso * 2246822519)
  if (r() > 0.35) {
    const y = dst.dy + dst.dh * (0.6 + r() * 0.38)
    const alto = 2 + r() * 6
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = Math.min(1, fuerza * 0.5)
    ctx.fillStyle = 'rgba(230,230,255,0.5)'
    ctx.fillRect(dst.dx, y, dst.dw, alto)
    ctx.restore()
  }

  // un pelín de grano encima, que el vhs nunca está limpio
  ctx.restore()
  pintarGrano(ctx, dst, fuerza * 0.6, t, 0.35)
}

// destellos de luz (light leaks): un par de manchas cálidas que entran desde un borde
// y se desplazan con el tiempo, sumándose en modo pantalla como fugas de luz sobre la
// película. la posición y el brillo salen de senos del tiempo, así que es continuo y
// determinista
function pintarDestellos(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'

  const fuga = (color: string, velX: number, velY: number, faseX: number, faseY: number, tam: number, faseB: number) => {
    const cx = dst.dx + (0.5 + 0.55 * Math.sin(t * velX + faseX)) * dst.dw
    const cy = dst.dy + (0.5 + 0.55 * Math.sin(t * velY + faseY)) * dst.dh
    const radio = tam * Math.min(dst.dw, dst.dh)
    const brillo = (0.5 + 0.5 * Math.sin(t * 1.7 + faseB)) * fuerza
    if (brillo <= 0.01) return
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio)
    g.addColorStop(0, color.replace('ALFA', String(Math.min(1, brillo * 0.75))))
    g.addColorStop(0.5, color.replace('ALFA', String(Math.min(1, brillo * 0.3))))
    g.addColorStop(1, color.replace('ALFA', '0'))
    ctx.fillStyle = g
    ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
  }
  // una fuga anaranjada grande y lenta, y una rojiza más pequeña y rápida
  fuga('rgba(255,140,50,ALFA)', 0.5, 0.37, 0, 1.5, 0.75, 0)
  fuga('rgba(255,70,60,ALFA)', 0.8, 0.63, 2.1, 0.4, 0.5, 1.2)
  fuga('rgba(255,210,120,ALFA)', 0.32, 0.29, 4.0, 3.1, 0.6, 2.4)

  ctx.restore()
}

// abre un recorte al rectángulo del video, ejecuta el dibujo y lo cierra. casi todos los
// efectos pintan dentro de este recorte, así que tenerlo aparte quita ruido repetido
function conRecorte(ctx: CanvasRenderingContext2D, dst: RectDest, dibujo: () => void) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(dst.dx, dst.dy, dst.dw, dst.dh)
  ctx.clip()
  dibujo()
  ctx.restore()
}

// polvo y arañazos: motas claras y oscuras que aparecen y desaparecen, más algún
// arañazo suelto. es el desgaste del celuloide sin llegar al blanco y negro del cine
// mudo, así que sirve para ensuciar cualquier plano con aire de archivo
function pintarPolvo(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  const paso = Math.floor(t * 12)
  const r = prng(paso * 99991 + 5)
  const cuantas = 5 + Math.floor(fuerza * 22)
  conRecorte(ctx, dst, () => {
    for (let i = 0; i < cuantas; i++) {
      const x = dst.dx + r() * dst.dw
      const y = dst.dy + r() * dst.dh
      const rad = 0.4 + r() * 2.2
      ctx.globalAlpha = (0.12 + r() * 0.4) * fuerza
      ctx.fillStyle = r() > 0.5 ? '#fdfbf4' : '#0a0805'
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (r() > 0.55) {
      const x = dst.dx + r() * dst.dw
      ctx.fillStyle = `rgba(250,246,235,${(0.15 + r() * 0.25) * fuerza})`
      ctx.fillRect(x, dst.dy, 0.7 + r() * 1.2, dst.dh)
    }
  })
}

// cine mudo: la película de los años veinte. el blanco y negro contrastado lo pone el
// filtro base; aquí encima va el grano grueso, rayas verticales, mucho parpadeo, motas de
// polvo, la viñeta cerrada y, de vez en cuando, un salto de cuadro (una banda que cruza,
// como cuando el proyector perdía el encuadre)
function pintarCineMudo(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  pintarParpadeo(ctx, dst, fuerza * 1.4, t)
  pintarGrano(ctx, dst, fuerza, t, 0.7)
  pintarRayas(ctx, dst, fuerza * 1.2, t)
  pintarPolvo(ctx, dst, fuerza * 0.8, t)
  // salto de cuadro: una banda horizontal oscura que aparece unos instantes cada tanto,
  // fingiendo el corte entre fotogramas al desincronizarse el proyector
  const ciclo = (t * 0.7) % 1
  if (ciclo < 0.06) {
    const y = dst.dy + ((t * 53) % 1) * dst.dh
    conRecorte(ctx, dst, () => {
      const g = ctx.createLinearGradient(0, y - 8, 0, y + 8)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(0.5, `rgba(0,0,0,${0.6 * fuerza})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(dst.dx, y - 8, dst.dw, 16)
    })
  }
  pintarVineta(ctx, dst, Math.min(1, fuerza * 1.1))
}

// proyector viejo: la lámpara que late (parpadeo cálido), un baño sepia tenue, la viñeta
// y, cada pocos segundos, la "quemadura de cigarrillo" (esos círculos que marcaban el
// cambio de rollo) arriba a la derecha. no llega a blanco y negro, es cine en color
// gastado
function pintarProyector(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  conRecorte(ctx, dst, () => {
    // baño cálido suave
    ctx.fillStyle = `rgba(120,80,30,${0.12 * fuerza})`
    ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
  })
  pintarParpadeo(ctx, dst, fuerza * 1.2, t)
  pintarGrano(ctx, dst, fuerza * 0.7, t, 0.4)
  pintarVineta(ctx, dst, fuerza * 0.9)
  // marca de cambio de rollo: un círculo claro arriba a la derecha, un instante cada ~6 s
  const ciclo = t % 6
  if (ciclo < 0.5) {
    const cx = dst.dx + dst.dw * 0.86
    const cy = dst.dy + dst.dh * 0.14
    const rad = Math.min(dst.dw, dst.dh) * 0.05
    conRecorte(ctx, dst, () => {
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = fuerza
      ctx.strokeStyle = 'rgba(255,245,220,0.85)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, rad, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,240,210,0.25)'
      ctx.beginPath()
      ctx.arc(cx, cy, rad, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

// monitor crt: las líneas de escaneo finas de un tubo, un verde muy leve, la viñeta suave
// y una banda de refresco clara que baja despacio. más limpio y "de computadora" que el
// vhs, que es más sucio
function pintarCRT(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  const scan = tejerScan()
  conRecorte(ctx, dst, () => {
    if (scan) {
      const patron = ctx.createPattern(scan, 'repeat')
      if (patron) {
        ctx.globalAlpha = Math.min(0.55, fuerza * 0.5)
        ctx.fillStyle = patron
        ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
        ctx.globalAlpha = 1
      }
    }
    // tinte verde de fósforo, muy sutil
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `rgba(40,255,120,${0.05 * fuerza})`
    ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
    // banda de refresco que baja
    const y = dst.dy + ((t * 0.4) % 1) * dst.dh
    const alto = dst.dh * 0.18
    const g = ctx.createLinearGradient(0, y, 0, y + alto)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, `rgba(220,255,230,${0.12 * fuerza})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(dst.dx, y, dst.dw, alto)
  })
  pintarVineta(ctx, dst, fuerza * 0.55)
}

// cámara digital de principios de los 2000 (tipo DV 2001-2002): el aire desvaído y con textura
// de aquellas cámaras. la imagen NO se afila, al revés: va un poco suave (el desenfoque leve lo
// pone el filtro base), con los negros levantados por una neblina tenue lavanda-grisácea (el
// típico rango corto de esas cámaras), grano fino regulable y una viñeta suave. sin líneas ni
// nada que se mueva de por medio, que quedaba raro. el grano se controla con `ruido` (0 a 1)
// aparte del nivel general
function pintarCamara2000(
  ctx: CanvasRenderingContext2D,
  dst: RectDest,
  fuerza: number,
  t: number,
  ruido: number,
) {
  // neblina muy suave que levanta un poco los negros y da ese tono lavanda-desvaído: un velo
  // tenue del color, sin llegar a tapar la imagen. es lo que más lo acerca al look de referencia
  conRecorte(ctx, dst, () => {
    ctx.fillStyle = `rgba(150,140,170,${0.07 * fuerza})`
    ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
  })
  // grano fino con su propio mando: a poco ruido apenas se nota, a mucho ensucia como cinta vieja
  pintarGrano(ctx, dst, fuerza * ruido * 0.75, t, 0.36)
  // viñeta suave, para cerrar el aire de cámara de la época
  pintarVineta(ctx, dst, fuerza * 0.5)
}

// estática de televisión: la "nieve" del canal sin señal. se reaprovecha el ruido del
// grano pero a mucha más fuerza y a más cuadros por segundo, más una barra de rodadura
// que cruza. el filtro base la desatura para que se lea como el blanco y negro del ruido
function pintarEstatica(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  const casillas = tejerCasillasGrano()
  if (!casillas.length) return
  const cuadro = Math.floor(t * 30)
  const casilla = casillas[((cuadro % casillas.length) + casillas.length) % casillas.length]
  const patron = ctx.createPattern(casilla, 'repeat')
  const r = prng(cuadro * 2654435761)
  conRecorte(ctx, dst, () => {
    if (patron) {
      ctx.globalAlpha = Math.min(1, fuerza * 0.9)
      ctx.translate(Math.floor(r() * CASILLA), Math.floor(r() * CASILLA))
      ctx.fillStyle = patron
      ctx.fillRect(dst.dx - CASILLA, dst.dy - CASILLA, dst.dw + CASILLA * 2, dst.dh + CASILLA * 2)
    }
  })
  // barra de rodadura vertical: una franja tenue que baja, como la imagen que "rueda"
  const y = dst.dy + ((t * 0.5) % 1) * dst.dh
  conRecorte(ctx, dst, () => {
    const g = ctx.createLinearGradient(0, y - dst.dh * 0.1, 0, y + dst.dh * 0.1)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, `rgba(0,0,0,${0.35 * fuerza})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(dst.dx, y - dst.dh * 0.1, dst.dw, dst.dh * 0.2)
  })
}

// glitch digital: rebanadas horizontales que se desplazan y se tiñen de cian y magenta,
// más algún bloque de color, el corte típico del video que se corrompe. cambia a saltos
// rápidos y secos con el número de cuadro
function pintarGlitch(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  const paso = Math.floor(t * 14)
  const r = prng(paso * 524287 + 3)
  conRecorte(ctx, dst, () => {
    ctx.globalCompositeOperation = 'screen'
    const rebanadas = 2 + Math.floor(fuerza * 7)
    for (let i = 0; i < rebanadas; i++) {
      const y = dst.dy + r() * dst.dh
      const alto = 2 + r() * dst.dh * 0.05
      const desf = (r() - 0.5) * dst.dw * 0.12
      ctx.globalAlpha = (0.18 + r() * 0.4) * fuerza
      ctx.fillStyle = r() > 0.5 ? 'rgba(0,240,255,0.7)' : 'rgba(255,0,170,0.7)'
      ctx.fillRect(dst.dx + desf, y, dst.dw, alto)
    }
    // algún bloque cuadrado de datos rotos
    if (r() > 0.4) {
      const bx = dst.dx + r() * dst.dw * 0.8
      const by = dst.dy + r() * dst.dh * 0.8
      ctx.globalAlpha = 0.5 * fuerza
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillRect(bx, by, dst.dw * (0.06 + r() * 0.12), dst.dh * (0.02 + r() * 0.05))
    }
  })
}

// interferencia: bandas de ruido horizontales que suben lentas y una línea de rasgado que
// salta, como una señal analógica que no engancha. emparentado con el vhs pero más
// agresivo y sin las líneas de escaneo
function pintarInterferencia(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  conRecorte(ctx, dst, () => {
    // dos o tres bandas anchas de brillo/oscuridad que suben
    for (let i = 0; i < 3; i++) {
      const y = dst.dy + (((t * (0.15 + i * 0.05) + i * 0.33) % 1) * (dst.dh + 60)) - 30
      const alto = dst.dh * (0.06 + i * 0.03)
      const claro = i % 2 === 0
      const g = ctx.createLinearGradient(0, y, 0, y + alto)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(0.5, claro ? `rgba(255,255,255,${0.14 * fuerza})` : `rgba(0,0,0,${0.3 * fuerza})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(dst.dx, y, dst.dw, alto)
    }
    // línea de rasgado: una banda fina y clara que salta de sitio rápido
    const paso = Math.floor(t * 10)
    const r = prng(paso * 40961)
    if (r() > 0.4) {
      const y = dst.dy + r() * dst.dh
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = `rgba(230,235,255,${0.5 * fuerza})`
      ctx.fillRect(dst.dx, y, dst.dw, 1 + r() * 3)
    }
  })
  pintarGrano(ctx, dst, fuerza * 0.5, t, 0.3)
}

// neón de los ochenta (synthwave/retrowave): una rejilla en perspectiva que corre hacia
// el horizonte y un resplandor magenta y cian. se pinta en modo pantalla para que las
// líneas brillen sobre el plano sin taparlo
function pintarRetro(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  conRecorte(ctx, dst, () => {
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = Math.min(1, fuerza)
    const hy = dst.dy + dst.dh * 0.62 // línea del horizonte
    const cx = dst.dx + dst.dw / 2
    ctx.strokeStyle = 'rgba(255,45,200,0.55)'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(255,45,200,0.8)'
    ctx.shadowBlur = 6
    // líneas horizontales: se acercan al horizonte con separación decreciente y se
    // desplazan hacia el frente con el tiempo, dando sensación de avance
    const desliz = (t * 0.4) % 1
    for (let i = 0; i < 12; i++) {
      const f = (i + desliz) / 12 // 0 en el horizonte, 1 abajo del todo
      const y = hy + f * f * (dst.dy + dst.dh - hy)
      ctx.beginPath()
      ctx.moveTo(dst.dx, y)
      ctx.lineTo(dst.dx + dst.dw, y)
      ctx.stroke()
    }
    // líneas verticales que convergen al punto de fuga (cx, hy)
    ctx.strokeStyle = 'rgba(60,220,255,0.5)'
    ctx.shadowColor = 'rgba(60,220,255,0.8)'
    for (let i = -6; i <= 6; i++) {
      const x = cx + (i / 6) * dst.dw
      ctx.beginPath()
      ctx.moveTo(cx, hy)
      ctx.lineTo(x, dst.dy + dst.dh)
      ctx.stroke()
    }
    ctx.shadowBlur = 0
    // brillo del sol/horizonte
    const g = ctx.createLinearGradient(0, hy - dst.dh * 0.2, 0, hy)
    g.addColorStop(0, 'rgba(255,90,180,0)')
    g.addColorStop(1, `rgba(255,120,200,${0.25 * fuerza})`)
    ctx.fillStyle = g
    ctx.fillRect(dst.dx, hy - dst.dh * 0.2, dst.dw, dst.dh * 0.2)
  })
}

// fugas de color: como los destellos, pero de varios colores (azul, violeta, ámbar) que
// entran y se pasean, para un aire más soñador y menos cálido
function pintarFugasColor(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  conRecorte(ctx, dst, () => {
    ctx.globalCompositeOperation = 'screen'
    const fuga = (color: string, velX: number, velY: number, faseX: number, faseY: number, tam: number, faseB: number) => {
      const cx = dst.dx + (0.5 + 0.6 * Math.sin(t * velX + faseX)) * dst.dw
      const cy = dst.dy + (0.5 + 0.6 * Math.sin(t * velY + faseY)) * dst.dh
      const radio = tam * Math.min(dst.dw, dst.dh)
      const brillo = (0.5 + 0.5 * Math.sin(t * 1.3 + faseB)) * fuerza
      if (brillo <= 0.01) return
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio)
      g.addColorStop(0, color.replace('ALFA', String(Math.min(1, brillo * 0.7))))
      g.addColorStop(0.5, color.replace('ALFA', String(Math.min(1, brillo * 0.28))))
      g.addColorStop(1, color.replace('ALFA', '0'))
      ctx.fillStyle = g
      ctx.fillRect(dst.dx, dst.dy, dst.dw, dst.dh)
    }
    fuga('rgba(90,120,255,ALFA)', 0.45, 0.33, 0, 1.2, 0.8, 0)
    fuga('rgba(200,80,255,ALFA)', 0.7, 0.55, 2.4, 0.6, 0.55, 1.1)
    fuga('rgba(255,180,70,ALFA)', 0.3, 0.27, 4.2, 3.3, 0.7, 2.6)
  })
}

// partículas flotando: sirve para el bokeh (círculos suaves que suben) y la nieve (motas
// pequeñas y nítidas). cada partícula tiene su carril y su velocidad fijos, sacados de la
// semilla de su índice, y el tiempo la desplaza. el módulo hace que reaparezca por abajo
// al salir por arriba, o al revés, sin cortes
function pintarParticulas(
  ctx: CanvasRenderingContext2D,
  dst: RectDest,
  fuerza: number,
  t: number,
  opciones: { cuantas: number; sube: boolean; radioMin: number; radioMax: number; color: string; glow: boolean; velocidad: number },
) {
  const { cuantas, sube, radioMin, radioMax, color, glow, velocidad } = opciones
  const n = Math.round(cuantas * (0.4 + fuerza * 0.6))
  conRecorte(ctx, dst, () => {
    if (glow) ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < n; i++) {
      const r = prng(i * 2246822519 + 11)
      const carril = r() // x base
      const vel = 0.4 + r() * 0.8
      const rad = radioMin + r() * (radioMax - radioMin)
      const bamboleo = Math.sin(t * (0.5 + r()) + r() * 6.28) * 0.04
      const avance = ((t * velocidad * vel + r()) % 1)
      const fy = sube ? 1 - avance : avance
      const x = dst.dx + (carril + bamboleo) * dst.dw
      const y = dst.dy + fy * dst.dh
      const desvanece = Math.sin(fy * Math.PI) // más tenue en los bordes de arriba y abajo
      ctx.globalAlpha = (glow ? 0.5 : 0.85) * fuerza * (0.4 + 0.6 * desvanece)
      if (glow) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
        g.addColorStop(0, color)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = g
      } else {
        ctx.fillStyle = color
      }
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

// lluvia: rayas finas y diagonales que caen deprisa, con algo de bamboleo. cada gota
// tiene su carril fijo por su índice y el tiempo la hace caer, reapareciendo arriba
function pintarLluvia(ctx: CanvasRenderingContext2D, dst: RectDest, fuerza: number, t: number) {
  const n = Math.round(70 * (0.4 + fuerza * 0.6))
  const largo = dst.dh * 0.06
  const sesgo = dst.dw * 0.03 // inclinación de la gota
  conRecorte(ctx, dst, () => {
    ctx.strokeStyle = `rgba(200,215,235,${0.35 * fuerza})`
    ctx.lineWidth = 1
    for (let i = 0; i < n; i++) {
      const r = prng(i * 374761393 + 7)
      const carril = r()
      const vel = 1.2 + r() * 1.6
      const y = dst.dy + ((t * vel + r()) % 1) * (dst.dh + largo) - largo
      const x = dst.dx + carril * dst.dw
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + sesgo, y + largo)
      ctx.stroke()
    }
  })
}

// filtro css base de algunos efectos animados: los que además de la textura cambian el
// color del propio video (el cine mudo lo pasa a blanco y negro contrastado, la estática
// lo desatura). va por la misma cadena de filtros que el resto, así que se ve igual en el
// visor y en la exportación. la mayoría de efectos no necesita nada y devuelven cadena
// vacía. la intensidad modula el efecto para que a poca fuerza sea sutil
export function cssBaseAnimado(ef: EfectoAnimado): string {
  const p = Math.max(0, Math.min(1, ef.intensidad / 100))
  switch (ef.animado) {
    case 'cinemudo':
      // el cine mudo es blanco y negro de verdad: la escala de grises va a pleno (la
      // intensidad manda sobre el contraste y la textura, no sobre cuánto color queda), con
      // un pelín de sepia para el tono cálido del celuloide viejo
      return `grayscale(1) contrast(${1 + p * 0.3}) brightness(${1 + p * 0.04}) sepia(${p * 0.12})`
    case 'estatica':
      return `saturate(${1 - p * 0.9}) contrast(${1 + p * 0.1})`
    case 'crt':
      return `saturate(${1 + p * 0.1})`
    case 'cam2000':
      // el aire de cámara digital vieja: NO se afila, se ablanda. un desenfoque base leve, el
      // contraste un poco BAJO (rango corto, negros levantados) y una pizca de brillo y
      // saturación, el look desvaído de aquellas cámaras. el tono lavanda lo pone la neblina
      return `blur(${(p * 0.6).toFixed(2)}px) contrast(${(1 - p * 0.09).toFixed(3)}) brightness(${(1 + p * 0.04).toFixed(3)}) saturate(${(1 + p * 0.06).toFixed(3)})`
    default:
      return ''
  }
}

// punto de entrada único: pinta el efecto animado que corresponda sobre el rectángulo
// del video. mezcla es el factor de aparición progresiva (transición de efecto) que
// atenúa todo por igual al arrancar el clip
export function pintarAnimado(
  ctx: CanvasRenderingContext2D,
  ef: EfectoAnimado,
  t: number,
  dst: RectDest,
  mezcla = 1,
) {
  const fuerza = Math.max(0, Math.min(1, (ef.intensidad / 100) * mezcla))
  if (fuerza <= 0 || dst.dw <= 0 || dst.dh <= 0) return
  switch (ef.animado) {
    case 'grano':
      pintarGrano(ctx, dst, fuerza, t, 0.6)
      break
    case 'cineviejo':
      pintarParpadeo(ctx, dst, fuerza, t)
      pintarGrano(ctx, dst, fuerza, t, 0.55)
      pintarRayas(ctx, dst, fuerza, t)
      pintarVineta(ctx, dst, fuerza * 0.9)
      break
    case 'cinemudo':
      pintarCineMudo(ctx, dst, fuerza, t)
      break
    case 'proyector':
      pintarProyector(ctx, dst, fuerza, t)
      break
    case 'polvo':
      pintarPolvo(ctx, dst, fuerza, t)
      break
    case 'vhs':
      pintarVHS(ctx, dst, fuerza, t)
      break
    case 'crt':
      pintarCRT(ctx, dst, fuerza, t)
      break
    case 'cam2000': {
      // el ruido tiene su propio mando; sin definir, un valor medio
      const ruido = Math.max(0, Math.min(1, (ef.ruido ?? 40) / 100))
      pintarCamara2000(ctx, dst, fuerza, t, ruido)
      break
    }
    case 'estatica':
      pintarEstatica(ctx, dst, fuerza, t)
      break
    case 'glitch':
      pintarGlitch(ctx, dst, fuerza, t)
      break
    case 'interferencia':
      pintarInterferencia(ctx, dst, fuerza, t)
      break
    case 'retro':
      pintarRetro(ctx, dst, fuerza, t)
      break
    case 'destellos':
      pintarDestellos(ctx, dst, fuerza, t)
      break
    case 'fugascolor':
      pintarFugasColor(ctx, dst, fuerza, t)
      break
    case 'bokeh':
      pintarParticulas(ctx, dst, fuerza, t, {
        cuantas: 28,
        sube: true,
        radioMin: Math.min(dst.dw, dst.dh) * 0.01,
        radioMax: Math.min(dst.dw, dst.dh) * 0.06,
        color: 'rgba(255,240,200,0.9)',
        glow: true,
        velocidad: 0.08,
      })
      break
    case 'nieve':
      pintarParticulas(ctx, dst, fuerza, t, {
        cuantas: 90,
        sube: false,
        radioMin: 0.6,
        radioMax: 2.4,
        color: 'rgba(255,255,255,0.95)',
        glow: false,
        velocidad: 0.16,
      })
      break
    case 'lluvia':
      pintarLluvia(ctx, dst, fuerza, t)
      break
  }
}
