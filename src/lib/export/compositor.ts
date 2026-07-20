import { Clip } from '../../types/timeline'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTexto } from '../../types/layers'
import { Marco } from '../../types/marco'
import { clipEnTiempo } from '../timeline/clips'
import { posicionCapa } from '../layers/motion'
import { esTonoNeutro, filtroCss } from '../color/tono'
import { REPETICIONES_BRILLO, desenfoqueBrillo } from '../layers/defaults'
import { anterior, pintarTransicion, progreso } from '../transiciones/pintar'

export interface Escena {
  ancho: number
  alto: number
  colorFondo: string
  // 'desenfoque' rellena las bandas con el propio video ampliado y borroso, en
  // lugar de con un color plano
  fondo?: 'color' | 'desenfoque'
  desenfoqueFondo?: number
  clips: Clip[] // ya ordenados por inicio
  capas: Capa[]
  marco: Marco
}


function rectRedondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function dibujarTexto(ctx: CanvasRenderingContext2D, c: CapaTexto, ancho: number, alto: number, t: number) {
  const pos = posicionCapa(c, t)
  ctx.save()
  ctx.globalAlpha = c.opacidad / 100
  ctx.translate(pos.x * ancho, pos.y * alto)
  ctx.font = `${c.cursiva ? 'italic ' : ''}${c.negrita ? '700' : '400'} ${c.tamano}px '${c.fuente}', sans-serif`
  ctx.textAlign = c.alineacion
  ctx.textBaseline = 'middle'

  const lineas = (c.texto || '').split('\n')
  const lh = c.tamano * 1.2
  const anchoMax = Math.max(1, ...lineas.map((l) => ctx.measureText(l).width))
  const startY = -((lineas.length - 1) * lh) / 2

  if (c.fondo) {
    const padX = 0.36 * c.tamano
    const padY = 0.18 * c.tamano
    const bw = anchoMax + padX * 2
    const bh = lineas.length * lh + padY * 2
    ctx.save()
    ctx.globalAlpha = (c.opacidad / 100) * (c.opacidadFondo / 100)
    ctx.fillStyle = c.colorFondo
    rectRedondeado(ctx, -bw / 2, -bh / 2, bw, bh, c.radioFondo ?? 6)
    ctx.fill()
    ctx.restore()
  }

  // el resplandor va bajo el texto real: se pinta el mismo texto varias veces
  // con una sombra difuminada del color elegido y sin desplazamiento, lo que
  // deja un halo que envuelve las letras. su propio save/restore evita que esta
  // sombra se mezcle con la del efecto de sombra normal
  if (c.brillo && c.intensidadBrillo > 0) {
    ctx.save()
    ctx.shadowColor = c.colorBrillo
    ctx.shadowBlur = desenfoqueBrillo(c.tamano, c.intensidadBrillo)
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.fillStyle = c.color
    lineas.forEach((linea, i) => {
      const y = startY + i * lh
      for (let k = 0; k < REPETICIONES_BRILLO; k++) ctx.fillText(linea, 0, y)
    })
    ctx.restore()
  }

  if (c.sombra) {
    ctx.shadowColor = 'rgba(0,0,0,.6)'
    ctx.shadowBlur = c.tamano * 0.16
    ctx.shadowOffsetY = c.tamano * 0.04
  }

  lineas.forEach((linea, i) => {
    const y = startY + i * lh
    if (c.contorno) {
      ctx.lineWidth = c.grosorContorno
      ctx.strokeStyle = c.colorContorno
      ctx.lineJoin = 'round'
      ctx.strokeText(linea, 0, y)
    }
    ctx.fillStyle = c.color
    ctx.fillText(linea, 0, y)
    if (c.subrayado) {
      const w = ctx.measureText(linea).width
      const x0 = c.alineacion === 'left' ? 0 : c.alineacion === 'right' ? -w : -w / 2
      ctx.strokeStyle = c.color
      ctx.lineWidth = Math.max(1, c.tamano * 0.06)
      ctx.beginPath()
      ctx.moveTo(x0, y + c.tamano * 0.42)
      ctx.lineTo(x0 + w, y + c.tamano * 0.42)
      ctx.stroke()
    }
  })
  ctx.restore()
}

function dibujarImagen(
  ctx: CanvasRenderingContext2D,
  c: CapaImagen,
  ancho: number,
  alto: number,
  t: number,
  img: HTMLImageElement | undefined,
) {
  if (!img) return
  const pos = posicionCapa(c, t)
  const rec = c.recorte
  const sw = Math.max(1, (1 - rec.izq - rec.der) * c.anchoNatural)
  const sh = Math.max(1, (1 - rec.arr - rec.aba) * c.altoNatural)
  const w = c.anchoRel * ancho
  // si la imagen se deformó a mano manda su alto guardado; si no, se respeta la
  // proporción del trozo visible tras el recorte
  const h = c.altoRel !== undefined ? c.altoRel * alto : w * (sh / sw)
  ctx.save()
  ctx.globalAlpha = c.opacidad / 100
  ctx.drawImage(
    img,
    rec.izq * c.anchoNatural,
    rec.arr * c.altoNatural,
    sw,
    sh,
    pos.x * ancho - w / 2,
    pos.y * alto - h / 2,
    w,
    h,
  )
  ctx.restore()
}

function dibujarFigura(ctx: CanvasRenderingContext2D, c: CapaFigura, ancho: number, alto: number, t: number, escala: number) {
  const pos = posicionCapa(c, t)
  const w = c.anchoRel * ancho
  const h = c.altoRel * alto
  const g = c.grosorBorde * escala
  const x = pos.x * ancho - w / 2
  const y = pos.y * alto - h / 2

  ctx.save()
  ctx.globalAlpha = c.opacidad / 100
  ctx.translate(x, y)
  const fill = c.relleno ? c.colorRelleno : null
  const stroke = c.borde ? c.colorBorde : null
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const trazar = () => {
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke && g > 0) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = g
      ctx.stroke()
    }
  }

  const i = (stroke ? g : 0) / 2
  if (c.forma === 'rectangulo') {
    ctx.beginPath()
    ctx.rect(i, i, Math.max(0, w - 2 * i), Math.max(0, h - 2 * i))
    trazar()
  } else if (c.forma === 'redondeado') {
    rectRedondeado(ctx, i, i, Math.max(0, w - 2 * i), Math.max(0, h - 2 * i), Math.min(w, h) * 0.15)
    trazar()
  } else if (c.forma === 'elipse') {
    ctx.beginPath()
    ctx.ellipse(w / 2, h / 2, Math.max(0, w / 2 - i), Math.max(0, h / 2 - i), 0, 0, Math.PI * 2)
    trazar()
  } else if (c.forma === 'triangulo') {
    ctx.beginPath()
    ctx.moveTo(w / 2, i)
    ctx.lineTo(w - i, h - i)
    ctx.lineTo(i, h - i)
    ctx.closePath()
    trazar()
  } else if (c.forma === 'estrella') {
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) / 2 - i
    const r = R * 0.42
    ctx.beginPath()
    for (let k = 0; k < 10; k++) {
      const ang = ((k * 36 - 90) * Math.PI) / 180
      const rr = k % 2 === 0 ? R : r
      const px = cx + rr * Math.cos(ang)
      const py = cy + rr * Math.sin(ang)
      if (k === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    trazar()
  } else if (c.forma === 'linea') {
    ctx.strokeStyle = c.colorRelleno
    ctx.lineWidth = g
    ctx.beginPath()
    ctx.moveTo(g, h / 2)
    ctx.lineTo(w - g, h / 2)
    ctx.stroke()
  } else if (c.forma === 'flecha') {
    const y = h / 2
    const cabeza = g * 3
    ctx.strokeStyle = c.colorRelleno
    ctx.fillStyle = c.colorRelleno
    ctx.lineWidth = g
    ctx.beginPath()
    ctx.moveTo(g, y)
    ctx.lineTo(Math.max(g, w - cabeza), y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(w - g, y)
    ctx.lineTo(w - cabeza, y - cabeza / 1.6)
    ctx.lineTo(w - cabeza, y + cabeza / 1.6)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function dibujarCensura(
  ctx: CanvasRenderingContext2D,
  c: CapaCensura,
  ancho: number,
  alto: number,
  t: number,
  video: HTMLVideoElement | null,
  off: HTMLCanvasElement,
  colorFondo: string,
) {
  const pos = posicionCapa(c, t)
  let dx = 0
  let dy = 0
  let w = 0
  let h = 0
  ctx.save()
  ctx.beginPath()
  if (c.forma === 'pincel') {
    const radio = c.grosorPincel * alto
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const trazo of c.trazos) {
      for (const p of trazo) {
        const px = (pos.x + p.x) * ancho
        const py = (pos.y + p.y) * alto
        ctx.moveTo(px + radio, py)
        ctx.arc(px, py, radio, 0, Math.PI * 2)
        if (px - radio < minX) minX = px - radio
        if (py - radio < minY) minY = py - radio
        if (px + radio > maxX) maxX = px + radio
        if (py + radio > maxY) maxY = py + radio
      }
    }
    if (!isFinite(minX)) {
      ctx.restore()
      return
    }
    dx = minX
    dy = minY
    w = maxX - minX
    h = maxY - minY
  } else {
    w = c.anchoRel * ancho
    h = c.altoRel * alto
    const cx = pos.x * ancho
    const cy = pos.y * alto
    dx = cx - w / 2
    dy = cy - h / 2
    if (c.forma === 'circulo') ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
    else ctx.rect(dx, dy, w, h)
  }
  ctx.clip()

  if (c.efecto === 'transparente' || !video || !video.videoWidth) {
    ctx.fillStyle = colorFondo
    ctx.fillRect(dx, dy, w, h)
    ctx.restore()
    return
  }

  // la imagen del video ocupa el lienzo con object-contain; se calcula su rect
  const escala = Math.min(ancho / video.videoWidth, alto / video.videoHeight)
  const dw = video.videoWidth * escala
  const dh = video.videoHeight * escala
  const ox = (ancho - dw) / 2
  const oy = (alto - dh) / 2
  const escX = video.videoWidth / dw
  const escY = video.videoHeight / dh

  if (c.efecto === 'difuminar') {
    const m = c.intensidad
    ctx.filter = `blur(${Math.max(1, c.intensidad * 0.5)}px)`
    ctx.drawImage(
      video,
      (dx - ox - m) * escX,
      (dy - oy - m) * escY,
      (w + 2 * m) * escX,
      (h + 2 * m) * escY,
      dx - m,
      dy - m,
      w + 2 * m,
      h + 2 * m,
    )
    ctx.filter = 'none'
  } else {
    const bloque = Math.max(3, c.intensidad)
    const pw = Math.max(1, Math.round(w / bloque))
    const phx = Math.max(1, Math.round(h / bloque))
    off.width = pw
    off.height = phx
    const octx = off.getContext('2d')
    if (octx) {
      octx.imageSmoothingEnabled = false
      octx.drawImage(video, (dx - ox) * escX, (dy - oy) * escY, w * escX, h * escY, 0, 0, pw, phx)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(off, 0, 0, pw, phx, dx, dy, w, h)
      ctx.imageSmoothingEnabled = true
    }
  }
  ctx.restore()
}

function dibujarMarco(ctx: CanvasRenderingContext2D, marco: Marco, ancho: number, alto: number, escala: number) {
  if (marco.tipo === 'ninguno') return
  const g = marco.grosor * escala
  const r = marco.radio * escala
  ctx.save()
  ctx.strokeStyle = marco.color
  ctx.fillStyle = marco.color
  ctx.lineWidth = g

  switch (marco.tipo) {
    case 'solido':
      ctx.strokeRect(g / 2, g / 2, ancho - g, alto - g)
      break
    case 'doble':
      ctx.lineWidth = g / 3
      ctx.strokeRect(g / 6, g / 6, ancho - g / 3, alto - g / 3)
      ctx.strokeRect(g - g / 6, g - g / 6, ancho - 2 * g + g / 3, alto - 2 * g + g / 3)
      break
    case 'discontinuo':
      ctx.setLineDash([g * 2, g])
      ctx.strokeRect(g / 2, g / 2, ancho - g, alto - g)
      break
    case 'punteado':
      ctx.setLineDash([g / 2, g])
      ctx.lineCap = 'round'
      ctx.strokeRect(g / 2, g / 2, ancho - g, alto - g)
      break
    case 'redondeado':
      rectRedondeado(ctx, g / 2, g / 2, ancho - g, alto - g, r)
      ctx.stroke()
      break
    case 'sombra':
      ctx.shadowColor = 'rgba(0,0,0,.55)'
      ctx.shadowBlur = g * 2
      ctx.lineWidth = g
      ctx.strokeStyle = 'rgba(0,0,0,.55)'
      ctx.strokeRect(g, g, ancho - 2 * g, alto - 2 * g)
      break
    case 'neon':
      ctx.shadowColor = marco.color
      ctx.shadowBlur = g
      ctx.lineWidth = Math.max(1, g / 3)
      ctx.strokeRect(g / 2, g / 2, ancho - g, alto - g)
      break
    case 'degradado': {
      const grad = ctx.createLinearGradient(0, 0, ancho, alto)
      grad.addColorStop(0, '#ff6b6b')
      grad.addColorStop(0.4, '#f9d423')
      grad.addColorStop(0.7, '#4ecdc4')
      grad.addColorStop(1, '#556270')
      ctx.strokeStyle = grad
      ctx.strokeRect(g / 2, g / 2, ancho - g, alto - g)
      break
    }
    case 'vineta': {
      const grad = ctx.createRadialGradient(
        ancho / 2,
        alto / 2,
        Math.min(ancho, alto) * 0.35,
        ancho / 2,
        alto / 2,
        Math.max(ancho, alto) * 0.62,
      )
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,.75)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, ancho, alto)
      break
    }
    case 'polaroid':
      ctx.fillRect(0, 0, ancho, g)
      ctx.fillRect(0, 0, g, alto)
      ctx.fillRect(ancho - g, 0, g, alto)
      ctx.fillRect(0, alto - g * 3, ancho, g * 3)
      break
  }
  ctx.restore()
}

// dibuja un fotograma completo del proyecto en el instante t
export function dibujarFotograma(
  ctx: CanvasRenderingContext2D,
  escena: Escena,
  t: number,
  videoDe: (clipId: string) => HTMLVideoElement | null,
  imagenDe: (capaId: string) => HTMLImageElement | undefined,
  off: HTMLCanvasElement,
) {
  const { ancho, alto, colorFondo, fondo, desenfoqueFondo = 45, clips, capas, marco } = escena
  const escala = alto / 1080

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ancho, alto)
  ctx.fillStyle = colorFondo
  ctx.fillRect(0, 0, ancho, alto)

  const activo = clipEnTiempo(clips, t)

  // el clip visible y, si está en plena transición de entrada, el que estaba
  // antes en su misma pista. la coreografía la lleva el motor compartido, así
  // que lo que se exporta es idéntico a lo que se vio al editar
  if (activo) {
    const p = progreso(activo, t)
    const saliente = p < 1 ? anterior(activo, clips) : null

    const pintar = (clip: Clip, alfa: number) => {
      const video = videoDe(clip.id)
      if (!video || !video.videoWidth) return
      const escC = Math.min(ancho / video.videoWidth, alto / video.videoHeight)
      const dw = video.videoWidth * escC
      const dh = video.videoHeight * escC
      ctx.save()
      ctx.globalAlpha = alfa

      // relleno con el propio video ampliado y borroso, para que una toma
      // vertical en un lienzo cuadrado no deje dos franjas planas
      if (fondo === 'desenfoque' && (dw < ancho - 1 || dh < alto - 1)) {
        const escB = Math.max(ancho / video.videoWidth, alto / video.videoHeight) * 1.12
        const bw = video.videoWidth * escB
        const bh = video.videoHeight * escB
        ctx.save()
        // el ajuste va de 1 a 100 y se traduce a una fracción del alto, así el
        // resultado se ve igual en cualquier resolución
        ctx.filter = `blur(${Math.round(alto * 0.001 * desenfoqueFondo)}px) brightness(0.72)`
        ctx.drawImage(video, (ancho - bw) / 2, (alto - bh) / 2, bw, bh)
        ctx.restore()
      }

      if (!esTonoNeutro(clip.tono)) ctx.filter = filtroCss(clip.tono, `tonoexp-${clip.id}`)
      ctx.drawImage(video, (ancho - dw) / 2, (alto - dh) / 2, dw, dh)
      ctx.filter = 'none'
      ctx.restore()
    }

    pintarTransicion(ctx, ancho, alto, activo, saliente, p, pintar)
  }

  const activoVideo = activo ? videoDe(activo.id) : null

  // primero las censuras (van bajo el resto de capas, como en el visor)
  for (const c of capas) {
    if (c.tipo !== 'censura') continue
    if (t < c.inicio || t >= c.inicio + c.duracion) continue
    dibujarCensura(ctx, c, ancho, alto, t, activoVideo, off, colorFondo)
  }

  // luego texto, imagen y figuras en orden
  for (const c of capas) {
    if (t < c.inicio || t >= c.inicio + c.duracion) continue
    if (c.tipo === 'texto') dibujarTexto(ctx, c, ancho, alto, t)
    else if (c.tipo === 'imagen') dibujarImagen(ctx, c, ancho, alto, t, imagenDe(c.id))
    else if (c.tipo === 'figura') dibujarFigura(ctx, c, ancho, alto, t, escala)
  }

  dibujarMarco(ctx, marco, ancho, alto, escala)
}
