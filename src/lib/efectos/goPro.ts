import { EfectoClip } from '../../types/timeline'
import { NodoFiltro } from './nitidezBrillo'

// parámetros del efecto de cámara de acción (ojo de pez tipo GoPro). la curvatura va
// de 0 a 100; en 0 no hay nada que hacer y el filtro ni se monta
export interface ParamsGoPro {
  curvatura: number
}

export function paramsGoPro(efectos: EfectoClip[] = []): ParamsGoPro | null {
  for (const e of efectos) {
    if (e.tipo === 'gopro' && e.curvatura > 0) return { curvatura: e.curvatura }
  }
  return null
}

// mapa de desplazamiento para la distorsión de barril. se genera una sola vez y se
// guarda como data-uri. cada píxel codifica un vector: el canal rojo dice cuánto se
// corre en horizontal y el verde en vertical. el desplazamiento apunta hacia el
// centro y crece hacia los bordes (de forma cuadrática, como una lente de verdad),
// así el resultado se curva sin dejar bordes vacíos. es separable por ejes, que es
// una aproximación de barril buena y muchísimo más barata que un mapa radial exacto
let mapaCache: string | null = null
function mapaDesplazamiento(): string {
  if (mapaCache) return mapaCache
  const n = 128
  const cv = document.createElement('canvas')
  cv.width = n
  cv.height = n
  const ctx = cv.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(n, n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const nx = (x / (n - 1)) * 2 - 1 // -1 a 1
      const ny = (y / (n - 1)) * 2 - 1
      // hacia adentro en los bordes: el píxel del borde muestrea desde más cerca del
      // centro. el cuadrado deja el centro casi quieto y aprieta hacia las orillas
      const dx = -nx * Math.abs(nx)
      const dy = -ny * Math.abs(ny)
      img.data[i] = Math.round((dx * 0.5 + 0.5) * 255)
      img.data[i + 1] = Math.round((dy * 0.5 + 0.5) * 255)
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  mapaCache = cv.toDataURL()
  return mapaCache
}

// grafo del filtro: se trae el mapa como una imagen del tamaño del cuadro y se
// desplaza la fuente según sus canales. el filtro que lo envuelve declara
// primitiveUnits="objectBoundingBox", de modo que la escala se mide en fracción del
// elemento y no en píxeles: así la misma curvatura se ve igual en el visor pequeño y
// en el archivo a resolución completa, sin desincronizarse
export function nodosFiltroGoPro(p: ParamsGoPro): NodoFiltro[] {
  const escala = ((p.curvatura / 100) * 0.3).toFixed(4)
  return [
    {
      tag: 'feImage',
      attrs: {
        href: mapaDesplazamiento(),
        x: '0',
        y: '0',
        width: '1',
        height: '1',
        preserveAspectRatio: 'none',
        result: 'gpMapa',
      },
    },
    {
      tag: 'feDisplacementMap',
      attrs: {
        in: 'SourceGraphic',
        in2: 'gpMapa',
        scale: escala,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
      },
    },
  ]
}
