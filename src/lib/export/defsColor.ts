import { Clip } from '../../types/timeline'
import { Capa } from '../../types/layers'
import { usaMatriz, matrizTono, tablasColor, stdDeviationsDesenfoque } from '../color/tono'
import { mezclarTono, mezclarEfectos, mixEntradaEfecto } from '../color/mezcla'
import { paramsNB, nodosFiltroNB, NodoFiltro } from '../efectos/nitidezBrillo'
import { paramsGoPro, nodosFiltroGoPro } from '../efectos/goPro'

const NS = 'http://www.w3.org/2000/svg'

export interface DefsColor {
  svg: SVGSVGElement
  // rehace las defs de los clips con aparición progresiva de color/efectos para el
  // instante t; los demás quedan fijos desde el montaje
  refrescar: (t: number) => void
  quitar: () => void
}

function filtroTono(id: string, tono: Clip['tono']): SVGFilterElement | null {
  if (!usaMatriz(tono)) return null
  const filtro = document.createElementNS(NS, 'filter')
  filtro.setAttribute('id', id)
  filtro.setAttribute('color-interpolation-filters', 'sRGB')
  const fe = document.createElementNS(NS, 'feColorMatrix')
  fe.setAttribute('type', 'matrix')
  fe.setAttribute('values', matrizTono(tono))
  filtro.appendChild(fe)
  const tablas = tablasColor(tono)
  if (tablas) {
    const trans = document.createElementNS(NS, 'feComponentTransfer')
    ;(['feFuncR', 'feFuncG', 'feFuncB'] as const).forEach((nombre, i) => {
      const fn = document.createElementNS(NS, nombre)
      fn.setAttribute('type', 'table')
      fn.setAttribute('tableValues', tablas[i])
      trans.appendChild(fn)
    })
    filtro.appendChild(trans)
  }
  return filtro
}

function filtroBlur(id: string, efectos: Clip['efectos']): SVGFilterElement | null {
  const desenfoques = stdDeviationsDesenfoque(efectos ?? [])
  if (!desenfoques.length) return null
  const f = document.createElementNS(NS, 'filter')
  f.setAttribute('id', id)
  f.setAttribute('color-interpolation-filters', 'sRGB')
  desenfoques.forEach((sd) => {
    const b = document.createElementNS(NS, 'feGaussianBlur')
    b.setAttribute('stdDeviation', sd)
    b.setAttribute('edgeMode', 'duplicate')
    f.appendChild(b)
  })
  return f
}

function nodoNB(n: NodoFiltro): Element {
  const el = document.createElementNS(NS, n.tag)
  for (const [k, v] of Object.entries(n.attrs)) el.setAttribute(k, v)
  n.children?.forEach((h) => el.appendChild(nodoNB(h)))
  return el
}

function filtroNB(id: string, efectos: Clip['efectos']): SVGFilterElement | null {
  const p = paramsNB(efectos ?? [])
  if (!p) return null
  const f = document.createElementNS(NS, 'filter')
  f.setAttribute('id', id)
  f.setAttribute('color-interpolation-filters', 'sRGB')
  nodosFiltroNB(p).forEach((n) => f.appendChild(nodoNB(n)))
  return f
}

function filtroGoPro(id: string, efectos: Clip['efectos']): SVGFilterElement | null {
  const p = paramsGoPro(efectos ?? [])
  if (!p) return null
  const f = document.createElementNS(NS, 'filter')
  f.setAttribute('id', id)
  f.setAttribute('primitiveUnits', 'objectBoundingBox')
  nodosFiltroGoPro(p).forEach((n) => f.appendChild(nodoNB(n)))
  return f
}

// monta en el dom los filtros svg que el compositor referencia por id, la misma receta
// que usa la exportación clásica. así el archivo sale con el mismo color y los mismos
// efectos. quien llama se encarga de refrescar en cada cuadro y de quitar el nodo al fin
export function montarDefsColor(clips: Clip[], capas: Capa[]): DefsColor {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('style', 'position:absolute;width:0;height:0')
  const defs = document.createElementNS(NS, 'defs')

  clips.forEach((c) => {
    const fTono = filtroTono(`tonoexp-${c.id}`, c.tono)
    if (fTono) defs.appendChild(fTono)
    const fBlur = filtroBlur(`blurexp-${c.id}`, c.efectos)
    if (fBlur) defs.appendChild(fBlur)
    const fNB = filtroNB(`nbexp-${c.id}`, c.efectos)
    if (fNB) defs.appendChild(fNB)
    const fGP = filtroGoPro(`goproexp-${c.id}`, c.efectos)
    if (fGP) defs.appendChild(fGP)
  })

  // imágenes de capa con corrección de color: su filtro por el id que espera el compositor
  capas.forEach((c) => {
    if (c.tipo !== 'imagen' || !c.tono || !usaMatriz(c.tono)) return
    const f = filtroTono(`tono-img-exp-${c.id}`, c.tono)
    if (f) defs.appendChild(f)
  })

  svg.appendChild(defs)
  document.body.appendChild(svg)

  const progresivos = clips.filter((c) => c.transicionEfecto && c.transicionEfecto > 0)
  const refrescar = (t: number) => {
    for (const c of progresivos) {
      const mix = mixEntradaEfecto(c.inicio, c.transicionEfecto, t)
      ;['tonoexp', 'blurexp', 'nbexp', 'goproexp'].forEach((p) => defs.querySelector(`#${p}-${c.id}`)?.remove())
      const tono = mezclarTono(c.tono, mix)
      const efectos = mezclarEfectos(c.efectos ?? [], mix)
      const fTono = filtroTono(`tonoexp-${c.id}`, tono)
      if (fTono) defs.appendChild(fTono)
      const fBlur = filtroBlur(`blurexp-${c.id}`, efectos)
      if (fBlur) defs.appendChild(fBlur)
      const fNB = filtroNB(`nbexp-${c.id}`, efectos)
      if (fNB) defs.appendChild(fNB)
      const fGP = filtroGoPro(`goproexp-${c.id}`, efectos)
      if (fGP) defs.appendChild(fGP)
    }
  }

  return { svg, refrescar, quitar: () => svg.remove() }
}
