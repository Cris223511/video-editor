import { Clip, Encuadre } from '../../types/timeline'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTexto, CapaTrazo } from '../../types/layers'
import { Marco } from '../../types/marco'
import { clipEnTiempo } from '../timeline/clips'
import { posicionCapa } from '../layers/motion'
import { puntosEstrella } from '../layers/figuras'
import { estadoImpactosEn } from '../impactos/catalogo'
import { dibujarContorno, dibujarLineas3d, dibujarRayos, crearLienzosContorno, LienzosContorno } from '../impactos/contorno'
import { dibujarManchas } from '../impactos/manchas'
import { Impacto } from '../../types/impacto'
import { esTonoNeutro, filtroCss, hayEfectoFiltro, usaMatriz, usaNitidez } from '../color/tono'
import { REPETICIONES_BRILLO, desenfoqueBrillo } from '../layers/defaults'
import { anterior, posterior, pintarTransicion, progreso, progresoSalida, esTransicionGlobal, efectoGlobalTrans, cruceCentradoEn } from '../transiciones/pintar'
import { buscarTransicion } from '../transiciones/catalogo'
import { fundidoEn } from '../audio/ganancia'
import { estiloEntrada, progresoEntrada, estiloSalida, progresoSalidaCapa, combinarEntradaSalida } from '../transiciones/entrada'
import { mezclarTono, mezclarEfectos, mixEntradaEfecto } from '../color/mezcla'
import { cssEfectos } from '../efectos/catalogo'
import { paramsNB } from '../efectos/nitidezBrillo'
import { paramsGoPro } from '../efectos/goPro'
import { paramsCromatico } from '../efectos/cromatico'
import { efectoAnimado, pintarAnimado } from '../efectos/animados'
import { encuadreDe, rectClip, ENCUADRE_NEUTRO } from '../timeline/encuadre'
import { aplicarTransformCanvas } from '../layers/transform'

export interface Escena {
  ancho: number
  alto: number
  colorFondo: string
  // 'desenfoque' rellena las bandas con el propio video ampliado y borroso, en
  // lugar de con un color plano
  fondo?: 'color' | 'desenfoque'
  desenfoqueFondo?: number
  // giro del relleno borroso, en pasos de 90°
  fondoGiro?: number
  clips: Clip[] // ya ordenados por inicio
  capas: Capa[]
  // impactos: efectos momentáneos que deforman el cuadro entero en su tramo
  impactos?: Impacto[]
  marco: Marco
  // niveles de video escondidos: al elegir el clip visible se saltan, para que
  // lo exportado coincida con lo que muestra el visor
  ocultas?: Set<number>
}


// filtro svg del barrido direccional del impacto de Movimiento: un feGaussianBlur en un solo eje,
// referenciado desde ctx.filter con url(#...). se crea una vez en el documento y se reajusta su
// desviación por fotograma; así el export deja la misma estela que el visor, no un blur redondo
let feBarridoImpacto: Element | null = null
function filtroBarridoImpacto(sx: number, sy: number): string {
  if (!feBarridoImpacto) {
    const NS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('style', 'position:absolute;width:0;height:0')
    const f = document.createElementNS(NS, 'filter')
    f.setAttribute('id', 'impacto-mov-exp')
    f.setAttribute('x', '-15%')
    f.setAttribute('y', '-15%')
    f.setAttribute('width', '130%')
    f.setAttribute('height', '130%')
    f.setAttribute('color-interpolation-filters', 'sRGB')
    const b = document.createElementNS(NS, 'feGaussianBlur')
    b.setAttribute('edgeMode', 'duplicate')
    f.appendChild(b)
    svg.appendChild(f)
    document.body.appendChild(svg)
    feBarridoImpacto = b
  }
  feBarridoImpacto.setAttribute('stdDeviation', `${sx.toFixed(2)} ${sy.toFixed(2)}`)
  return 'url(#impacto-mov-exp)'
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

// segundo lienzo auxiliar, para cuando hay que encadenar dos filtros svg en el
// mismo clip (por ejemplo desenfoque de movimiento y luego nitidez y brillo): cada
// filtro svg necesita su propia pasada, y no se puede filtrar un canvas sobre sí
// mismo, así que el resultado de una pasada aterriza aquí antes de la siguiente
let lienzoSegundo: HTMLCanvasElement | null = null
function auxSegundo(w: number, h: number): HTMLCanvasElement {
  if (!lienzoSegundo) lienzoSegundo = document.createElement('canvas')
  if (lienzoSegundo.width !== w) lienzoSegundo.width = w
  if (lienzoSegundo.height !== h) lienzoSegundo.height = h
  return lienzoSegundo
}

// lienzo aparte para el recorte en óvalo con difuminado o viñeta: el clip se pinta
// aquí, se enmascara con la silueta suave y luego se vuelca sobre el principal, que
// es la única forma de que el borde se funda a transparente sin agujerear el fondo
let lienzoRecorte: HTMLCanvasElement | null = null
function auxRecorte(w: number, h: number): HTMLCanvasElement {
  if (!lienzoRecorte) lienzoRecorte = document.createElement('canvas')
  if (lienzoRecorte.width !== w) lienzoRecorte.width = w
  if (lienzoRecorte.height !== h) lienzoRecorte.height = h
  return lienzoRecorte
}

// lienzo aparte para la textura animada (grano, cine viejo, vhs, destellos). el efecto
// se pinta aquí sobre transparente, exactamente igual que en el visor, y luego se vuelca
// sobre el clip. hacerlo en su propio lienzo es lo que hace que el archivo coincida con
// la vista previa: si se pintara directo encima del video, el modo de fusión actuaría
// contra los píxeles del video y no contra el transparente, y saldría distinto
let lienzoAnim: HTMLCanvasElement | null = null
function auxAnim(w: number, h: number): HTMLCanvasElement {
  if (!lienzoAnim) lienzoAnim = document.createElement('canvas')
  if (lienzoAnim.width !== w) lienzoAnim.width = w
  if (lienzoAnim.height !== h) lienzoAnim.height = h
  return lienzoAnim
}

// lienzo aparte para el impacto: el cuadro ya compuesto se copia aquí y se vuelve
// a volcar escalado, desplazado y desenfocado, porque un canvas no se puede
// transformar sobre sí mismo en una sola pasada
let lienzoImpacto: HTMLCanvasElement | null = null
function auxImpacto(w: number, h: number): HTMLCanvasElement {
  if (!lienzoImpacto) lienzoImpacto = document.createElement('canvas')
  if (lienzoImpacto.width !== w) lienzoImpacto.width = w
  if (lienzoImpacto.height !== h) lienzoImpacto.height = h
  return lienzoImpacto
}

// lienzo aparte para el relleno borroso de las bandas cuando hay un impacto: se dibuja
// aquí para dejarlo fuera del transform del golpe, de modo que el impacto solo deforme
// el video y lo que va delante, no el fondo. luego se recompone quieto por detrás
let lienzoFondoImp: HTMLCanvasElement | null = null
function auxFondo(w: number, h: number): HTMLCanvasElement {
  if (!lienzoFondoImp) lienzoFondoImp = document.createElement('canvas')
  if (lienzoFondoImp.width !== w) lienzoFondoImp.width = w
  if (lienzoFondoImp.height !== h) lienzoFondoImp.height = h
  return lienzoFondoImp
}

// lienzos de trabajo del impacto de contorno, reaprovechados entre fotogramas
let lienzosContornoExp: LienzosContorno | null = null

// gradiente radial del óvalo, de negro sólido a transparente según el difuminado.
// sirve tanto para la máscara del recorte como para confinar la viñeta blanca
function gradienteOvalo(
  ctx: CanvasRenderingContext2D,
  difuminado: number,
  colorDentro: string,
  colorFuera: string,
): CanvasGradient {
  // el gradiente se traza en un espacio escalado para que el óvalo sea un círculo,
  // así los dos radios se respetan. lo aplica quien llama dentro de su propio scale
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  const solido = Math.max(0, Math.min(1, 1 - difuminado / 100))
  g.addColorStop(0, colorDentro)
  g.addColorStop(solido, colorDentro)
  g.addColorStop(1, colorFuera)
  return g
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
    // misma estrella que el visor: llena su caja para que no deje aire
    const pts = puntosEstrella(w, h, i)
    ctx.beginPath()
    pts.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
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
  enc: Encuadre,
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

  // rectángulo real del video dentro del lienzo, con su encaje "contener" y el
  // encuadre del clip (posición y escala). la censura muestrea a partir de aquí para
  // tapar justo lo que se ve debajo, en su sitio y tamaño, sin ampliarlo. es el mismo
  // cálculo que usa el visor, así que lo censurado coincide con lo que se editó
  const vr = rectClip(video.videoWidth, video.videoHeight, ancho, alto, enc)
  const dw = vr.dw
  const dh = vr.dh
  const ox = vr.dx
  const oy = vr.dy
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
  const { ancho, alto, colorFondo, fondo, desenfoqueFondo = 45, fondoGiro = 0, clips, capas, marco } = escena
  const escala = alto / 1080
  // referencia al lienzo real de salida. pintar() suele componer aquí, pero puede recibir un
  // lienzo aparte (una transición con estela lo aprovecha para componer el clip una sola vez)
  const ctxPrincipal = ctx

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ancho, alto)

  // el impacto se calcula ya, para decidir si hay que apartar el relleno borroso. un
  // impacto no debe deformar las bandas de fondo: cuando lo hay y el relleno es borroso,
  // ese relleno se pinta en su propio lienzo (fondoCtx) y se recompone quieto por detrás
  const imp = estadoImpactosEn(escena.impactos ?? [], t)
  const hayImpacto =
    imp.escala !== 1 || imp.desenfoque > 0 || imp.desenfoqueX > 0 || imp.desenfoqueY > 0 || imp.x !== 0 || imp.y !== 0
  const separarFondo = fondo === 'desenfoque' && hayImpacto
  let fondoCtx: CanvasRenderingContext2D | null = null
  if (separarFondo) {
    const fc = auxFondo(ancho, alto)
    fondoCtx = fc.getContext('2d')
    if (fondoCtx) {
      fondoCtx.setTransform(1, 0, 0, 1, 0, 0)
      fondoCtx.clearRect(0, 0, ancho, alto)
    }
  }
  // el color de fondo va a la base, salvo al apartar el relleno borroso: entonces el
  // lienzo arranca transparente en las bandas para que el fondo quieto asome por detrás,
  // y el color y el relleno se ponen como base al recomponer con el impacto
  if (!separarFondo) {
    ctx.fillStyle = colorFondo
    ctx.fillRect(0, 0, ancho, alto)
  }

  const activo = clipEnTiempo(clips, t, escena.ocultas)

  // velo y desenfoque de una transición que abre o cierra un clip aislado: se guardan
  // aquí para aplicarlos al final, sobre TODA la escena ya compuesta (clip, capas y
  // marco), igual que en el visor, en vez de dejarlos solo sobre el video
  let veloTransOp = 0
  let veloTransCol = '#000'
  let blurTransG = 0

  // el clip visible y, si está en plena transición de entrada, el que estaba
  // antes en su misma pista. la coreografía la lleva el motor compartido, así
  // que lo que se exporta es idéntico a lo que se vio al editar
  if (activo) {
    const p = progreso(activo, t)
    const saliente = p < 1 ? anterior(activo, clips) : null
    // ¿la transición del clip abre o cierra contra el fondo, con una técnica que se
    // pinta encima de todo? entonces el clip se pinta normal y el velo/desenfoque se
    // aplican al final, sobre las capas
    const qG = progresoSalida(activo, t)
    const tecEntG = buscarTransicion(activo.transicion.tipo).tecnica
    const tecSalG =
      activo.transicionSalida && activo.transicionSalida.tipo !== 'ninguna'
        ? buscarTransicion(activo.transicionSalida.tipo).tecnica
        : 'corte'
    const ladoM = Math.min(ancho, alto)
    const entG = !anterior(activo, clips) && p < 1 && esTransicionGlobal(tecEntG) ? efectoGlobalTrans(tecEntG, p, true, ladoM, activo.transicion?.intensidad) : null
    const salG = !posterior(activo, clips) && qG < 1 && esTransicionGlobal(tecSalG) ? efectoGlobalTrans(tecSalG, qG, false, ladoM, activo.transicionSalida?.intensidad) : null
    const globalAisladaTrans = !!(entG || salG)
    const vE = entG?.veloOpacidad ?? 0
    const vS = salG?.veloOpacidad ?? 0
    veloTransOp = Math.max(vE, vS)
    veloTransCol = vE >= vS ? entG?.veloColor ?? '#000' : salG?.veloColor ?? '#000'
    blurTransG = (entG?.blur ?? 0) + (salG?.blur ?? 0)

    const pintar = (clip: Clip, alfa: number, destino?: CanvasRenderingContext2D) => {
      // por defecto se compone en el lienzo principal; una transición con estela puede pedir
      // que el clip se componga en un lienzo aparte, para luego blitear muchas copias baratas
      // en lugar de repetir toda la maquinaria de pintado (color, nitidez, relleno) por copia
      const ctx = destino ?? ctxPrincipal
      const video = videoDe(clip.id)
      if (!video || !video.videoWidth) return
      // el rect donde va el video sale del encuadre del clip; sin encuadre queda
      // centrado y a tamaño "contener", igual que antes
      const enc = encuadreDe(clip)
      const { dx, dy, dw, dh } = rectClip(video.videoWidth, video.videoHeight, ancho, alto, enc)
      ctx.save()
      ctx.globalAlpha = alfa

      // relleno con el propio video ampliado y borroso, para que una toma
      // vertical en un lienzo cuadrado no deje dos franjas planas. cuando hay un impacto,
      // el relleno va a su propio lienzo (fondoCtx) para quedar fuera del transform del
      // golpe; si no, va directo al lienzo principal como siempre
      if (fondo === 'desenfoque' && (dw < ancho - 1 || dh < alto - 1)) {
        const fCtx = separarFondo && fondoCtx ? fondoCtx : ctx
        // al girar el fondo un cuarto de vuelta se amplía más para que siga cubriendo
        const cuarto = fondoGiro % 180 === 90
        const cobertura = cuarto ? Math.max(ancho / alto, alto / ancho) : 1
        const escB = Math.max(ancho / video.videoWidth, alto / video.videoHeight) * 1.12 * cobertura
        const bw = video.videoWidth * escB
        const bh = video.videoHeight * escB
        fCtx.save()
        // en una transición el relleno hereda la opacidad del plano; en el lienzo aparte
        // hay que ponérsela a mano porque no está bajo el save con globalAlpha del clip
        fCtx.globalAlpha = alfa
        // el ajuste va de 1 a 100 y se traduce a una fracción del alto, así el
        // resultado se ve igual en cualquier resolución
        fCtx.filter = `blur(${Math.round(alto * 0.001 * desenfoqueFondo)}px) brightness(0.72)`
        if (fondoGiro) {
          fCtx.translate(ancho / 2, alto / 2)
          fCtx.rotate((fondoGiro * Math.PI) / 180)
          fCtx.translate(-ancho / 2, -alto / 2)
        }
        fCtx.drawImage(video, (ancho - bw) / 2, (alto - bh) / 2, bw, bh)
        fCtx.restore()
      }

      // el recorte en óvalo con difuminado no se puede resolver con un simple recorte
      // del lienzo (el borde suave agujerearía el fondo), así que en ese caso el clip se
      // pinta en un lienzo aparte, se le pone la máscara suave y luego se vuelca sobre el
      // principal. el rectángulo y el óvalo limpio siguen yendo con un recorte normal
      const rec = clip.recorte
      const ovaloRec = rec?.forma === 'elipse' || rec?.forma === 'circulo'
      const usaMascara = !!(rec && ovaloRec && (rec.difuminado ?? 0) > 0)
      let dst = ctx
      let rctx: CanvasRenderingContext2D | null = null
      if (usaMascara) {
        const rl = auxRecorte(ancho, alto)
        rctx = rl.getContext('2d')
        if (rctx) {
          rctx.setTransform(1, 0, 0, 1, 0, 0)
          rctx.clearRect(0, 0, ancho, alto)
          dst = rctx
        }
      }

      // el giro y el espejo del clip se aplican solo al video en sí, no al relleno
      // de fondo, igual que en el visor. va en su propio save para que la
      // transformación no se filtre a lo que se dibuje después
      dst.save()
      aplicarTransformCanvas(dst, dx + dw / 2, dy + dh / 2, {
        rotacion: enc.rotacion,
        espejoH: enc.espejoH,
        espejoV: enc.espejoV,
      })

      // recorte duro (rectángulo o óvalo limpio): se limita el dibujo al recuadro
      // que queda. lo de fuera no se pinta y deja ver el fondo. el óvalo con borde
      // suave no recorta aquí, su máscara se aplica después sobre el lienzo aparte
      if (rec && !usaMascara) {
        dst.beginPath()
        if (ovaloRec) {
          dst.ellipse(
            dx + ((rec.izq + (1 - rec.der)) / 2) * dw,
            dy + ((rec.arr + (1 - rec.aba)) / 2) * dh,
            Math.max(0.5, ((1 - rec.der - rec.izq) / 2) * dw),
            Math.max(0.5, ((1 - rec.aba - rec.arr) / 2) * dh),
            0,
            0,
            Math.PI * 2,
          )
          dst.clip()
        } else if (rec.izq || rec.der || rec.arr || rec.aba) {
          dst.rect(dx + rec.izq * dw, dy + rec.arr * dh, dw * (1 - rec.izq - rec.der), dh * (1 - rec.arr - rec.aba))
          dst.clip()
        }
      }

      // el color se resuelve como en el visor: funciones nativas más, si hay
      // temperatura o ruedas, el filtro svg de color. el desenfoque de movimiento
      // no puede ir en la misma cadena de filter (dejaría el canvas negro), así que
      // cuando lo hay se pinta en dos pasadas: primero el video con su color, luego
      // ese resultado con el desenfoque solo. aparición progresiva incluida
      const mixEf = mixEntradaEfecto(clip.inicio, clip.transicionEfecto, t)
      const tonoEf = mezclarTono(clip.tono, mixEf)
      const efectos = mezclarEfectos(clip.efectos ?? [], mixEf)
      const hayColor = !esTonoNeutro(tonoEf)
      const hayDesenfoque = hayEfectoFiltro(efectos)
      const hayNB = !!paramsNB(efectos)
      const hayGoPro = !!paramsGoPro(efectos)
      const hayCromatico = !!paramsCromatico(efectos)
      // la nitidez del tono también va por filtro svg (lleva un desenfoque dentro para la máscara
      // de realce), así que un clip con solo nitidez ya obliga al camino de pasadas
      const conTonoUrl = usaMatriz(tonoEf) || usaNitidez(tonoEf)
      if (hayDesenfoque || hayNB || hayGoPro || hayCromatico || usaNitidez(tonoEf)) {
        // cada filtro svg va en su propia pasada, porque mezclarlo con las funciones nativas en el
        // mismo ctx.filter deja el fotograma en negro (sobre todo si el filtro lleva un desenfoque).
        // primero el video con sus funciones de color NATIVAS y los efectos css; luego, en pasadas
        // sueltas, el color por matriz/tablas más la nitidez (filtro del tono), el desenfoque de
        // movimiento, la nitidez-brillo, la curvatura y la aberración cromática. cada pasada aterriza
        // en un lienzo auxiliar (dos, ping-pong), porque no se puede filtrar un canvas sobre sí mismo
        const aux = auxDesenfoque(ancho, alto)
        const actx = aux.getContext('2d')
        if (actx) {
          actx.setTransform(1, 0, 0, 1, 0, 0)
          actx.clearRect(0, 0, ancho, alto)
          const nativo = hayColor
            ? `brightness(${1 + tonoEf.exposicion / 100}) contrast(${1 + tonoEf.contraste / 100}) saturate(${1 + tonoEf.saturacion / 100})`
            : ''
          const ef = cssEfectos(efectos)
          actx.filter = `${nativo} ${ef}`.trim() || 'none'
          actx.drawImage(video, dx, dy, dw, dh)
          actx.filter = 'none'

          let fuente: HTMLCanvasElement = aux
          const pasar = (url: string) => {
            const destino = fuente === aux ? auxSegundo(ancho, alto) : aux
            const dc = destino.getContext('2d')
            if (!dc) return
            dc.setTransform(1, 0, 0, 1, 0, 0)
            dc.clearRect(0, 0, ancho, alto)
            dc.filter = url
            dc.drawImage(fuente, 0, 0)
            dc.filter = 'none'
            fuente = destino
          }
          if (conTonoUrl) pasar(`url(#tonoexp-${clip.id})`)
          if (hayDesenfoque) pasar(`url(#blurexp-${clip.id})`)
          if (hayNB) pasar(`url(#nbexp-${clip.id})`)
          if (hayGoPro) pasar(`url(#goproexp-${clip.id})`)
          if (hayCromatico) pasar(`url(#cromaticoexp-${clip.id})`)
          dst.drawImage(fuente, 0, 0)
        }
      } else {
        {
          const base = hayColor ? filtroCss(tonoEf, `tonoexp-${clip.id}`, []) : ''
          const ef = cssEfectos(efectos)
          const cadena = `${base} ${ef}`.trim()
          if (cadena) dst.filter = cadena
        }
        dst.drawImage(video, dx, dy, dw, dh)
        dst.filter = 'none'
      }
      // cierra el espejo del video
      dst.restore()

      // óvalo con borde suave: se recorta el contenido con la silueta difuminada y el
      // resultado se vuelca al lienzo principal respetando el alfa del clip
      if (usaMascara && rctx && rec) {
        const rl = rctx.canvas
        const cx = dx + ((rec.izq + (1 - rec.der)) / 2) * dw
        const cy = dy + ((rec.arr + (1 - rec.aba)) / 2) * dh
        const rx = Math.max(0.5, ((1 - rec.der - rec.izq) / 2) * dw)
        const ry = Math.max(0.5, ((1 - rec.aba - rec.arr) / 2) * dh)
        rctx.save()
        rctx.globalCompositeOperation = 'destination-in'
        rctx.translate(cx, cy)
        rctx.scale(rx, ry)
        rctx.fillStyle = gradienteOvalo(rctx, rec.difuminado ?? 0, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)')
        rctx.beginPath()
        rctx.arc(0, 0, 1, 0, Math.PI * 2)
        rctx.fill()
        rctx.restore()
        ctx.drawImage(rl, 0, 0)
      }

      // textura animada (grano, cine viejo, vhs, destellos) por encima del clip ya
      // compuesto. se pinta en un lienzo transparente aparte, recortada al recuadro
      // visible del video y con el tiempo del fotograma, y de ahí se vuelca sobre el
      // clip. igual que el visor, así el archivo repite lo que se vio. la aparición
      // progresiva y el alfa del clip la atenúan al volcarla
      const anim = efectoAnimado(clip.efectos ?? [])
      if (anim) {
        const capa = auxAnim(ancho, alto)
        const actx = capa.getContext('2d')
        if (actx) {
          actx.setTransform(1, 0, 0, 1, 0, 0)
          actx.clearRect(0, 0, ancho, alto)
          const rec3 = clip.recorte
          actx.save()
          actx.beginPath()
          actx.rect(
            dx + (rec3?.izq ?? 0) * dw,
            dy + (rec3?.arr ?? 0) * dh,
            dw * (1 - (rec3?.izq ?? 0) - (rec3?.der ?? 0)),
            dh * (1 - (rec3?.arr ?? 0) - (rec3?.aba ?? 0)),
          )
          actx.clip()
          pintarAnimado(actx, anim, t, { dx, dy, dw, dh }, mixEf)
          actx.restore()
          ctx.drawImage(capa, 0, 0)
        }
      }

      ctx.restore()
    }

    // una disolución entre dos clips se centra en el corte (mitad cola del que sale, mitad
    // cabeza del que entra), igual que en el visor. si el instante cae dentro de una, se
    // pinta ese cruce y se ignora el despacho normal por clip activo. el motor dibuja el
    // que sale entero y el que entra encima con opacidad p, con los dos videos ya colocados
    // en su tiempo (frameCompuesto y el bucle de export traen sus colas)
    const cruce = cruceCentradoEn(clips, t, (tipo) => tipo !== 'ninguna' && tipo !== 'corte')
    // misma decisión que en el visor: la salida manda sobre la entrada mientras
    // dura, para que el archivo exportado coincida con lo que se vio al montar
    const q = progresoSalida(activo, t)
    if (cruce) {
      pintarTransicion(ctx, ancho, alto, cruce.entra, cruce.sale, cruce.p, pintar, cruce.entra.transicion.tipo)
    } else if (globalAisladaTrans) {
      // el clip se pinta normal; su velo y desenfoque se aplican al final, sobre todo
      pintar(activo, 1)
    } else if (q < 1 && activo.transicionSalida) {
      pintarTransicion(ctx, ancho, alto, posterior(activo, clips), activo, q, pintar, activo.transicionSalida.tipo)
    } else if (saliente && activo.transicion && activo.transicion.tipo !== 'ninguna' && activo.transicion.tipo !== 'corte') {
      // la entrada de este clip es un CRUCE CENTRADO (tiene plano anterior y una transición real):
      // toda su coreografía ya la cubre la ventana del cruce, arriba. la ventana de `progreso` va de
      // inicio a inicio+duración, más larga que la del cruce (centrada, mitad y mitad), así que fuera
      // del cruce `progreso` seguía < 1 y esta rama volvía a pintar la entrada: la transición
      // "reaparecía" un instante después de haber terminado. ya pasado el cruce el clip va limpio
      pintar(activo, 1)
    } else {
      pintarTransicion(ctx, ancho, alto, activo, saliente, p, pintar)
    }
  }

  const activoVideo = activo ? videoDe(activo.id) : null

  // primero las censuras (van bajo el resto de capas, como en el visor)
  for (const c of capas) {
    if (c.tipo !== 'censura') continue
    if (t < c.inicio || t >= c.inicio + c.duracion) continue
    dibujarCensura(ctx, c, ancho, alto, t, activoVideo, off, colorFondo, activo ? encuadreDe(activo) : ENCUADRE_NEUTRO)
  }

  // luego texto, imagen y figuras en orden. el fundido de la capa se aplica
  // rebajando su opacidad antes de dibujarla, que es exactamente lo que hace el
  // visor, así que ninguna función de dibujo necesita enterarse
  for (const cOrig of capas) {
    if (t < cOrig.inicio || t >= cOrig.inicio + cOrig.duracion) continue
    const f = fundidoEn(t, cOrig.inicio, cOrig.duracion, cOrig.fundidoEntrada, cOrig.fundidoSalida)
    // entrada de la capa: la opacidad rebaja el alfa igual que el fundido; la
    // escala y el deslizamiento se aplican como una transformación del lienzo
    // anclada al centro de la capa, para que el archivo salga idéntico al visor
    const entrada = combinarEntradaSalida(
      estiloEntrada(cOrig.transicion?.tipo ?? 'ninguna', progresoEntrada(t, cOrig.inicio, cOrig.transicion)),
      estiloSalida(
        cOrig.transicionSalida?.tipo ?? 'ninguna',
        progresoSalidaCapa(t, cOrig.inicio, cOrig.duracion, cOrig.transicionSalida),
      ),
    )
    const c = f >= 1 && entrada.opacidad >= 1
      ? cOrig
      : ({ ...cOrig, opacidad: cOrig.opacidad * f * entrada.opacidad } as typeof cOrig)
    const mueve = entrada.escala !== 1 || entrada.tx !== 0 || entrada.ty !== 0
    ctx.save()
    if (mueve) {
      const pos = posicionCapa(c, t)
      const cx = pos.x * ancho
      const cy = pos.y * alto
      const menor = Math.min(ancho, alto)
      // mismo orden que el visor: se centra en la capa, se desplaza (en fracción
      // del lado menor) y luego se escala alrededor de ese centro
      ctx.translate(cx, cy)
      if (entrada.tx || entrada.ty) ctx.translate(entrada.tx * menor, entrada.ty * menor)
      if (entrada.escala !== 1) ctx.scale(entrada.escala, entrada.escala)
      ctx.translate(-cx, -cy)
    }
    if (c.tipo === 'texto') dibujarTexto(ctx, c, ancho, alto, t)
    else if (c.tipo === 'imagen') dibujarImagen(ctx, c, ancho, alto, t, imagenDe(c.id))
    else if (c.tipo === 'figura') dibujarFigura(ctx, c, ancho, alto, t, escala)
    else if (c.tipo === 'trazo') dibujarTrazo(ctx, c, ancho, alto, t)
    ctx.restore()
  }

  dibujarMarco(ctx, marco, ancho, alto, escala)

  // impactos de neón (contorno, líneas 3D, rayos): con el mismo motor que el visor, por
  // encima de todo, para que el archivo salga idéntico. los tres muestrean el video
  const neones = (escena.impactos ?? []).filter(
    (i) =>
      (i.tipo === 'contorno' || i.tipo === 'lineas3d' || i.tipo === 'rayosObjeto') &&
      t >= i.t &&
      t < i.t + i.duracion,
  )
  if (neones.length && activoVideo && activoVideo.videoWidth > 0) {
    if (!lienzosContornoExp) lienzosContornoExp = crearLienzosContorno()
    const enc = activo ? encuadreDe(activo) : ENCUADRE_NEUTRO
    const vr = rectClip(activoVideo.videoWidth, activoVideo.videoHeight, ancho, alto, enc)
    const trans = { rotacion: enc.rotacion, espejoH: enc.espejoH, espejoV: enc.espejoV }
    const dst = { dx: vr.dx, dy: vr.dy, dw: vr.dw, dh: vr.dh }
    const vw = activoVideo.videoWidth
    const vh = activoVideo.videoHeight
    for (const im of neones) {
      const p = (t - im.t) / im.duracion
      const suav = (im.suavidad ?? 50) / 100
      if (im.tipo === 'lineas3d') {
        dibujarLineas3d(ctx, activoVideo, vw, vh, dst, im.color, im.intensidad, im.densidad ?? 55, suav, im.direccion ?? 'der', p, t, lienzosContornoExp, trans)
      } else if (im.tipo === 'rayosObjeto') {
        dibujarRayos(ctx, activoVideo, vw, vh, dst, im.color, im.intensidad, suav, p, t, lienzosContornoExp, trans)
      } else {
        dibujarContorno(ctx, activoVideo, vw, vh, dst, im.color, im.intensidad, suav, p, t, lienzosContornoExp, trans)
      }
    }
  }

  // impacto de manchas: los blobs se pintan sobre el cuadro ya compuesto en modo DIFERENCIA, que
  // invierte el color de lo que tapan, igual que en el visor (allí lo hace mix-blend-mode). va aquí,
  // antes de la deformación geométrica, para que si coincide con otro impacto también se sacuda
  const manchasImp = (escena.impactos ?? []).filter((i) => i.tipo === 'manchas' && t >= i.t && t < i.t + i.duracion)
  for (const im of manchasImp) {
    const p = (t - im.t) / im.duracion
    const suav = (im.suavidad ?? 50) / 100
    ctx.save()
    ctx.globalCompositeOperation = 'difference'
    dibujarManchas(ctx, 0, 0, ancho, alto, im.color, im.intensidad, suav, p, t)
    ctx.restore()
  }

  // impactos: deforman el video y lo que va delante (capas, marco), igual que en el
  // visor. el geométrico se aplica copiando el contenido a un lienzo aparte y volviéndolo
  // a volcar escalado y desenfocado; el relleno borroso, si se apartó, se recompone
  // quieto por detrás para que el golpe no lo sacuda. el velo se pinta encima
  if (hayImpacto) {
    const aux = auxImpacto(ancho, alto)
    const actx = aux.getContext('2d')
    if (actx) {
      actx.clearRect(0, 0, ancho, alto)
      actx.drawImage(ctx.canvas, 0, 0)
      ctx.clearRect(0, 0, ancho, alto)
      ctx.fillStyle = colorFondo
      ctx.fillRect(0, 0, ancho, alto)
      // el relleno borroso, quieto, va detrás del contenido que el impacto sí deforma
      if (separarFondo) ctx.drawImage(auxFondo(ancho, alto), 0, 0)
      ctx.save()
      // barrido direccional (impacto Movimiento) por filtro svg en un eje; si no, el blur redondo
      const impBX = imp.desenfoqueX * alto
      const impBY = imp.desenfoqueY * alto
      ctx.filter =
        impBX > 0.1 || impBY > 0.1
          ? filtroBarridoImpacto(impBX, impBY)
          : imp.desenfoque > 0
            ? `blur(${(imp.desenfoque * alto).toFixed(2)}px)`
            : 'none'
      ctx.translate(ancho / 2 + imp.x * alto, alto / 2 + imp.y * alto)
      ctx.scale(imp.escala, imp.escala)
      ctx.translate(-ancho / 2, -alto / 2)
      ctx.drawImage(aux, 0, 0)
      ctx.restore()
    }
  }
  if (imp.veloOpacidad > 0) {
    ctx.save()
    ctx.globalAlpha = imp.veloOpacidad
    ctx.fillStyle = imp.veloColor
    ctx.fillRect(0, 0, ancho, alto)
    ctx.restore()
  }

  // desenfoque de una transición que difumina toda la escena ya compuesta: se copia el
  // cuadro a un lienzo aparte y se vuelve a volcar borroso, igual que el impacto, para
  // que el difuminado alcance también las capas, no solo el video
  if (blurTransG > 0) {
    const aux = auxImpacto(ancho, alto)
    const actx = aux.getContext('2d')
    if (actx) {
      actx.clearRect(0, 0, ancho, alto)
      actx.drawImage(ctx.canvas, 0, 0)
      ctx.clearRect(0, 0, ancho, alto)
      ctx.fillStyle = colorFondo
      ctx.fillRect(0, 0, ancho, alto)
      ctx.save()
      ctx.filter = `blur(${blurTransG.toFixed(2)}px)`
      ctx.drawImage(aux, 0, 0)
      ctx.restore()
    }
  }
  // velo de la transición (fundido a negro o a blanco, flash) por encima de todo
  if (veloTransOp > 0) {
    ctx.save()
    ctx.globalAlpha = veloTransOp
    ctx.fillStyle = veloTransCol
    ctx.fillRect(0, 0, ancho, alto)
    ctx.restore()
  }
}
