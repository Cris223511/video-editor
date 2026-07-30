import { Escena, dibujarFotograma } from './compositor'
import { clipEnTiempo } from '../timeline/clips'
import { anterior, posterior } from '../transiciones/pintar'
import { mezclarTono, mezclarEfectos, mixEntradaEfecto } from '../color/mezcla'
import { usaMatriz, matrizTono, tablasColor, stdDeviationsDesenfoque } from '../color/tono'
import { paramsNB, nodosFiltroNB, NodoFiltro } from '../efectos/nitidezBrillo'
import { paramsGoPro, nodosFiltroGoPro } from '../efectos/goPro'
import { Clip } from '../../types/timeline'

const NS = 'http://www.w3.org/2000/svg'

// carga un video suelto para leerle un fotograma, sin engancharlo a nada más
function cargarVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.src = src
    v.preload = 'auto'
    v.crossOrigin = 'anonymous'
    v.muted = true
    v.onloadeddata = () => resolve(v)
    v.onerror = () => reject(new Error('video'))
  })
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagen'))
    img.src = src
  })
}

// lleva el video a un segundo concreto y espera a que ese fotograma esté listo. lleva
// una red de seguridad por tiempo para que nunca se quede colgada si el navegador no
// dispara el evento de búsqueda
function buscar(v: HTMLVideoElement, tiempo: number): Promise<void> {
  return new Promise((resolve) => {
    const dur = v.duration || 0
    const objetivo = Math.max(0, dur ? Math.min(tiempo, dur - 0.01) : tiempo)
    if (Math.abs(v.currentTime - objetivo) < 0.02) {
      resolve()
      return
    }
    let listo = false
    const acabar = () => {
      if (listo) return
      listo = true
      v.removeEventListener('seeked', acabar)
      resolve()
    }
    v.addEventListener('seeked', acabar)
    window.setTimeout(acabar, 1200)
    try {
      v.currentTime = objetivo
    } catch {
      acabar()
    }
  })
}

// arma en el dom los filtros svg de color y efectos que el compositor referencia por
// id, exactamente como hace la exportación. sin ellos el tono y los desenfoques no se
// aplicarían al fotograma. devuelve el nodo svg para poder quitarlo al terminar
function montarDefs(clips: Clip[], capas: Escena['capas'], t: number): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('style', 'position:absolute;width:0;height:0')
  const defs = document.createElementNS(NS, 'defs')

  const nodo = (n: NodoFiltro): Element => {
    const el = document.createElementNS(NS, n.tag)
    for (const [k, val] of Object.entries(n.attrs)) el.setAttribute(k, val)
    n.children?.forEach((h) => el.appendChild(nodo(h)))
    return el
  }

  clips.forEach((c) => {
    // los filtros se arman con el tono y los efectos ya mezclados por la aparición
    // progresiva en el instante de la portada, para que salga tal cual se vería
    const mix = mixEntradaEfecto(c.inicio, c.transicionEfecto, t)
    const tono = mezclarTono(c.tono, mix)
    const efectos = mezclarEfectos(c.efectos ?? [], mix)

    if (usaMatriz(tono)) {
      const f = document.createElementNS(NS, 'filter')
      f.setAttribute('id', `tonoexp-${c.id}`)
      f.setAttribute('color-interpolation-filters', 'sRGB')
      const fe = document.createElementNS(NS, 'feColorMatrix')
      fe.setAttribute('type', 'matrix')
      fe.setAttribute('values', matrizTono(tono))
      f.appendChild(fe)
      const tablas = tablasColor(tono)
      if (tablas) {
        const trans = document.createElementNS(NS, 'feComponentTransfer')
        ;(['feFuncR', 'feFuncG', 'feFuncB'] as const).forEach((nombre, i) => {
          const fn = document.createElementNS(NS, nombre)
          fn.setAttribute('type', 'table')
          fn.setAttribute('tableValues', tablas[i])
          trans.appendChild(fn)
        })
        f.appendChild(trans)
      }
      defs.appendChild(f)
    }

    const desenfoques = stdDeviationsDesenfoque(efectos)
    if (desenfoques.length) {
      const fB = document.createElementNS(NS, 'filter')
      fB.setAttribute('id', `blurexp-${c.id}`)
      fB.setAttribute('color-interpolation-filters', 'sRGB')
      desenfoques.forEach((sd) => {
        const b = document.createElementNS(NS, 'feGaussianBlur')
        b.setAttribute('stdDeviation', sd)
        b.setAttribute('edgeMode', 'duplicate')
        fB.appendChild(b)
      })
      defs.appendChild(fB)
    }

    const nb = paramsNB(efectos)
    if (nb) {
      const f = document.createElementNS(NS, 'filter')
      f.setAttribute('id', `nbexp-${c.id}`)
      f.setAttribute('color-interpolation-filters', 'sRGB')
      nodosFiltroNB(nb).forEach((n) => f.appendChild(nodo(n)))
      defs.appendChild(f)
    }

    const gp = paramsGoPro(efectos)
    if (gp) {
      const f = document.createElementNS(NS, 'filter')
      f.setAttribute('id', `goproexp-${c.id}`)
      f.setAttribute('primitiveUnits', 'objectBoundingBox')
      nodosFiltroGoPro(gp).forEach((n) => f.appendChild(nodo(n)))
      defs.appendChild(f)
    }
  })

  // las imágenes de capa que corrigen color van por su propio filtro, con el id que
  // espera el compositor para ellas
  capas.forEach((c) => {
    if (c.tipo !== 'imagen' || !c.tono || !usaMatriz(c.tono)) return
    const f = document.createElementNS(NS, 'filter')
    f.setAttribute('id', `tono-img-exp-${c.id}`)
    f.setAttribute('color-interpolation-filters', 'sRGB')
    const fe = document.createElementNS(NS, 'feColorMatrix')
    fe.setAttribute('type', 'matrix')
    fe.setAttribute('values', matrizTono(c.tono))
    f.appendChild(fe)
    const tablas = tablasColor(c.tono)
    if (tablas) {
      const trans = document.createElementNS(NS, 'feComponentTransfer')
      ;(['feFuncR', 'feFuncG', 'feFuncB'] as const).forEach((nombre, i) => {
        const fn = document.createElementNS(NS, nombre)
        fn.setAttribute('type', 'table')
        fn.setAttribute('tableValues', tablas[i])
        trans.appendChild(fn)
      })
      f.appendChild(trans)
    }
    defs.appendChild(f)
  })

  svg.appendChild(defs)
  document.body.appendChild(svg)
  return svg
}

// compone un fotograma real del proyecto editado (con su giro, encuadre, fondo, marco,
// capas, color y efectos) usando el mismo motor que la exportación, y lo devuelve como
// imagen lista para la portada. así la miniatura enseña lo que de verdad se está
// editando, no el video crudo importado. si algo falla, devuelve null y quien llama
// recurre a la miniatura del medio. `t` es el segundo del montaje a retratar
export async function frameCompuesto(
  escena: Escena,
  t: number,
  urlDeAsset: (assetId: string) => string | undefined,
): Promise<string | null> {
  const ordenados = [...escena.clips].sort((a, b) => a.inicio - b.inicio)
  // los que pueden verse en ese instante: el activo y, por si cae en una transición,
  // el de antes y el de después en su pista. con eso basta para retratar el cuadro
  const activo = clipEnTiempo(ordenados, t, escena.ocultas) ?? ordenados[0]
  if (!activo) return null
  const necesarios = new Map<string, Clip>()
  necesarios.set(activo.id, activo)
  const ant = anterior(activo, ordenados)
  const pos = posterior(activo, ordenados)
  if (ant) necesarios.set(ant.id, ant)
  if (pos) necesarios.set(pos.id, pos)

  const svg = montarDefs([...necesarios.values()], escena.capas, t)
  const videos = new Map<string, HTMLVideoElement>()
  const imagenes = new Map<string, HTMLImageElement>()

  try {
    await Promise.all(
      [...necesarios.values()].map(async (c) => {
        const url = urlDeAsset(c.assetId)
        if (!url) return
        try {
          const v = await cargarVideo(url)
          await buscar(v, c.recorteInicio + (t - c.inicio) * c.velocidad)
          videos.set(c.id, v)
        } catch {
          // un clip que no carga no impide componer el resto
        }
      }),
    )

    await Promise.all(
      escena.capas
        .filter((c) => c.tipo === 'imagen')
        .map(async (c) => {
          if (c.tipo !== 'imagen') return
          try {
            imagenes.set(c.id, await cargarImagen(c.src))
          } catch {
            // sin la imagen, esa capa simplemente no sale
          }
        }),
    )

    // la portada se compone a resolución reducida: el alto se limita para que armar la
    // miniatura sea barato, manteniendo la proporción real del proyecto. el motor mide
    // todo en fracción del alto, así que a menor tamaño el resultado se ve igual
    const ratio = escena.ancho / escena.alto
    const alto = Math.min(escena.alto, 480)
    const ancho = Math.max(2, Math.round(alto * ratio))
    const escenaMini: Escena = { ...escena, clips: ordenados, ancho, alto }

    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')
    if (!ctx) return null
    const off = document.createElement('canvas')

    dibujarFotograma(
      ctx,
      escenaMini,
      t,
      (id) => videos.get(id) ?? null,
      (id) => imagenes.get(id),
      off,
    )

    return lienzo.toDataURL('image/jpeg', 0.72)
  } catch {
    return null
  } finally {
    svg.remove()
    videos.forEach((v) => {
      v.pause()
      v.removeAttribute('src')
      v.load()
    })
  }
}
