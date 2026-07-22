import { Clip } from '../../types/timeline'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTexto, CapaTrazo } from '../../types/layers'
import { Marco } from '../../types/marco'
import { clipEnTiempo } from '../timeline/clips'
import { posicionCapa } from '../layers/motion'
import { esTonoNeutro, filtroCss, hayEfectoFiltro } from '../color/tono'
import { REPETICIONES_BRILLO, desenfoqueBrillo } from '../layers/defaults'
import { anterior, pintarTransicion, progreso } from '../transiciones/pintar'
import { encuadreDe, rectClip } from '../timeline/encuadre'
import { aplicarTransformCanvas } from '../layers/transform'

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
  // niveles de video escondidos: al elegir el clip visible se saltan, para que
  // lo exportado coincida con lo que muestra el visor
  ocultas?: Set<number>
}


// lienzo auxiliar reutilizado para el desenfoque de movimiento. el video se
// pinta primero aquí con su color y luego se vuelca al lienzo final aplicando
// solo el desenfoque, porque combinar funciones nativas con un filtro svg de
// desenfoque en ctx.filter deja el fotograma en negro. se crea una vez y se
// reajusta de tamaño, para no fabricar un canvas por fotograma
let lienzoDesenfoque: HTMLCanvasElement | null = null
function auxDesenfoque(w: number, h: number): HTMLCanvasElement {
  if (!lienzoDesenfoque) lienzoDesenfoque = document.createElement('canvas')
  if (lienzoDesenfoque.width !== w) lienzoDesenfoque.width = w
  if (lienzoDesenfoque.height !== h) lienzoDesenfoque.height = h
  return lienzoDesenfoque
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
  // ya en el centro del texto: girar y voltear desde aquí sale idéntico al visor
  aplicarTransformCanvas(ctx, 0, 0, c)
  ctx.font = `${c.cursiva ? 'italic ' : ''}${c.negrita ? '700' : '400'} ${c.tamano}px '${c.fuente}', sans-serif`
  ctx.textAlign = c.alineacion
  ctx.textBaseline = 'middle'
  // el espacio entre letras y el interlineado se aplican igual que en el visor,
  // para que el texto salga idéntico en el archivo. letterSpacing afecta también
  // a la medida del ancho, así que va antes de medir
  const ctxLs = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  ctxLs.letterSpacing = `${c.tracking ?? 0}px`

  const lineas = (c.texto || '').split('\n')
  const lh = c.tamano * (c.interlineado ?? 1.2)
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
  const w = c.anchoRel * ancho
  // la caja abarca la imagen entera con su proporción natural; si se deformó a
  // mano manda el alto guardado. el recorte ya no cambia este tamaño, sino que
  // limita luego el dibujo, tapando los lados como hace el recorte del video
  const asp = c.anchoNatural > 0 ? c.anchoNatural / c.altoNatural : 1
  const h = c.altoRel !== undefined ? c.altoRel * alto : w / (asp || 1)
  ctx.save()
  ctx.globalAlpha = c.opacidad / 100
  // se lleva el origen al centro de la imagen para girar y voltear desde ahí, y
  // luego se dibuja alrededor de ese centro
  ctx.translate(pos.x * ancho, pos.y * alto)
  aplicarTransformCanvas(ctx, 0, 0, c)
  // recorte: se acota el dibujo al recuadro que queda, dentro de la misma
  // transformación para que gire y voltee con la imagen. lo de fuera no se pinta
  // y deja ver el fondo, igual que el inset del visor
  if (rec.izq || rec.der || rec.arr || rec.aba) {
    ctx.beginPath()
    ctx.rect(-w / 2 + rec.izq * w, -h / 2 + rec.arr * h, w * (1 - rec.izq - rec.der), h * (1 - rec.arr - rec.aba))
    ctx.clip()
  }
  // el color se resuelve como en el visor: funciones nativas más, si hay
  // temperatura, tinte, ruedas o curvas, el filtro svg de color referenciado
  if (c.tono && !esTonoNeutro(c.tono)) ctx.filter = filtroCss(c.tono, `tono-img-exp-${c.id}`, [])
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.filter = 'none'
  ctx.restore()
}

function dibujarFigura(ctx: CanvasRenderingContext2D, c: CapaFigura, ancho: number, alto: number, t: number, escala: number) {
  const pos = posicionCapa(c, t)
  const w = c.anchoRel * ancho
  const h = c.altoRel * alto
  const g = c.grosorBorde * escala

  ctx.save()
  ctx.globalAlpha = c.opacidad / 100
  // origen al centro para girar y voltear, y de ahí a la esquina superior
  // izquierda: así las figuras se siguen trazando en coordenadas 0..w como antes
  ctx.translate(pos.x * ancho, pos.y * alto)
  aplicarTransformCanvas(ctx, 0, 0, c)
  ctx.translate(-w / 2, -h / 2)
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

// pinta un dibujo a mano alzada: cada trazo es una polilínea del mismo color y
// grosor que en el visor. los puntos van relativos al centro de la capa, así que
// se llevan a coordenadas del lienzo sumándoles la posición, y el giro o volteo se
// aplican alrededor de ese centro para que el archivo salga idéntico a lo editado
function dibujarTrazo(ctx: CanvasRenderingContext2D, c: CapaTrazo, ancho: number, alto: number, t: number) {
  if (!c.trazos.length) return
  const pos = posicionCapa(c, t)
  ctx.save()
  ctx.globalAlpha = c.opacidad / 100
  aplicarTransformCanvas(ctx, pos.x * ancho, pos.y * alto, c)
  // el grosor está en píxeles de la resolución del proyecto, que es la del lienzo
  // de exportación, así que se usa tal cual; en el visor se escala al tamaño en
  // pantalla, de modo que el trazo se ve del mismo grueso al editar y al exportar
  const g = Math.max(1, c.grosor)
  ctx.strokeStyle = c.color
  ctx.fillStyle = c.color
  ctx.lineWidth = g
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const tr of c.trazos) {
    if (tr.length === 0) continue
    // un clic suelto deja un único punto: se pinta como un puntito redondo, que es
    // lo que muestra el visor en ese caso
    if (tr.length === 1) {
      const p = tr[0]
      ctx.beginPath()
      ctx.arc((pos.x + p.x) * ancho, (pos.y + p.y) * alto, g / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    tr.forEach((p, i) => {
      const x = (pos.x + p.x) * ancho
      const y = (pos.y + p.y) * alto
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
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

  const activo = clipEnTiempo(clips, t, escena.ocultas)

  // el clip visible y, si está en plena transición de entrada, el que estaba
  // antes en su misma pista. la coreografía la lleva el motor compartido, así
  // que lo que se exporta es idéntico a lo que se vio al editar
  if (activo) {
    const p = progreso(activo, t)
    const saliente = p < 1 ? anterior(activo, clips) : null

    const pintar = (clip: Clip, alfa: number) => {
      const video = videoDe(clip.id)
      if (!video || !video.videoWidth) return
      // el rect donde va el video sale del encuadre del clip; sin encuadre queda
      // centrado y a tamaño "contener", igual que antes
      const enc = encuadreDe(clip)
      const { dx, dy, dw, dh } = rectClip(video.videoWidth, video.videoHeight, ancho, alto, enc)
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

      // el giro y el espejo del clip se aplican solo al video en sí, no al relleno
      // de fondo, igual que en el visor. va en su propio save para que la
      // transformación no se filtre a lo que se dibuje después
      ctx.save()
      aplicarTransformCanvas(ctx, dx + dw / 2, dy + dh / 2, {
        rotacion: enc.rotacion,
        espejoH: enc.espejoH,
        espejoV: enc.espejoV,
      })

      // recorte de la imagen: se limita el dibujo al recuadro que queda, dentro del
      // mismo bloque de la transformación para que gire y voltee con el video. lo de
      // fuera no se pinta y deja ver el fondo, igual que el inset del visor
      const rec = clip.recorte
      if (rec && (rec.izq || rec.der || rec.arr || rec.aba)) {
        ctx.beginPath()
        ctx.rect(dx + rec.izq * dw, dy + rec.arr * dh, dw * (1 - rec.izq - rec.der), dh * (1 - rec.arr - rec.aba))
        ctx.clip()
      }

      // el color se resuelve como en el visor: funciones nativas más, si hay
      // temperatura o ruedas, el filtro svg de color. el desenfoque de movimiento
      // no puede ir en la misma cadena de ctx.filter (dejaría el canvas negro),
      // así que cuando lo hay se pinta en dos pasadas conservando el mismo orden
      // que el visor: primero el video con su color, después ese resultado con el
      // desenfoque solo
      const efectos = clip.efectos ?? []
      const hayColor = !esTonoNeutro(clip.tono)
      const hayDesenfoque = hayEfectoFiltro(efectos)
      if (hayDesenfoque) {
        const aux = auxDesenfoque(ancho, alto)
        const actx = aux.getContext('2d')
        if (actx) {
          actx.setTransform(1, 0, 0, 1, 0, 0)
          actx.clearRect(0, 0, ancho, alto)
          actx.filter = hayColor ? filtroCss(clip.tono, `tonoexp-${clip.id}`, []) : 'none'
          actx.drawImage(video, dx, dy, dw, dh)
          actx.filter = 'none'
          ctx.filter = `url(#blurexp-${clip.id})`
          ctx.drawImage(aux, 0, 0)
          ctx.filter = 'none'
        }
      } else {
        if (hayColor) ctx.filter = filtroCss(clip.tono, `tonoexp-${clip.id}`, [])
        ctx.drawImage(video, dx, dy, dw, dh)
        ctx.filter = 'none'
      }
      // cierra el espejo del video
      ctx.restore()
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
    else if (c.tipo === 'trazo') dibujarTrazo(ctx, c, ancho, alto, t)
  }

  dibujarMarco(ctx, marco, ancho, alto, escala)
}
