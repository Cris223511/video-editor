import { EfectoClip } from '../../types/timeline'
import { NodoFiltro } from './nitidezBrillo'

// parámetros del efecto de cámara de acción (aire gran angular tipo GoPro). solo la
// curvatura, de 0 a 100 (en 0 el filtro ni se monta). una sola cosa que ajustar: cuánto
// se abomba la imagen hacia adelante, como una lente
export interface ParamsGoPro {
  curvatura: number
}

export function paramsGoPro(efectos: EfectoClip[] = []): ParamsGoPro | null {
  for (const e of efectos) {
    if (e.tipo === 'gopro' && e.curvatura > 0) return { curvatura: e.curvatura }
  }
  return null
}

// mapa de desplazamiento para la distorsión de barril. cada píxel codifica un vector: el
// canal rojo dice cuánto se corre en horizontal y el verde en vertical. lo importante es que
// el desplazamiento es RADIAL: se mide desde el centro y apunta hacia él, creciendo con la
// distancia (proporcional a r al cubo). así la imagen se dobla como una lente de verdad, con
// las líneas ARQUEÁNDOSE hacia el medio y las esquinas recogiéndose, en vez del domo que salía
// al mover cada eje por su cuenta (aquello subía toda la fila de arriba en bloque, sin curvar).
// siempre se muestrea hacia dentro, así que no asoma ninguna franja negra ni se cambia el
// encuadre. se genera a 512 px para que la curva salga limpia y no baje la calidad, y como es
// simétrico y siempre el mismo, se calcula una sola vez
let cacheMapa: string | null = null
function mapaDesplazamiento(): string {
  if (cacheMapa) return cacheMapa
  const n = 512
  const cv = document.createElement('canvas')
  cv.width = n
  cv.height = n
  const ctx = cv.getContext('2d')
  if (!ctx) return ''
  const img = ctx.createImageData(n, n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4
      const nx = (x / (n - 1)) * 2 - 1 // -1 a 1 desde el centro
      const ny = (y / (n - 1)) * 2 - 1
      // r2 es la distancia al centro al cuadrado (0 en el medio, hasta 2 en las esquinas). el
      // vector de barril apunta al centro con magnitud proporcional a r2, así el corrimiento
      // es radial y no separable: una línea horizontal cerca del borde se arquea porque sus
      // puntos se mueven hacia el centro en distinta dirección según dónde estén. el medio 0.5
      // deja el resultado dentro del rango -1..1 que admite la codificación del canal
      const r2 = nx * nx + ny * ny
      const dx = -nx * r2 * 0.5
      const dy = -ny * r2 * 0.5
      img.data[i] = Math.round((dx * 0.5 + 0.5) * 255)
      img.data[i + 1] = Math.round((dy * 0.5 + 0.5) * 255)
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  cacheMapa = cv.toDataURL()
  return cacheMapa
}

// grafo del filtro: el mapa se trae como una imagen del tamaño del cuadro y se desplaza la
// fuente según sus canales. el filtro que lo envuelve declara
// primitiveUnits="objectBoundingBox", así la escala se mide en fracción del elemento y no
// en píxeles: la misma curvatura se ve igual en el visor pequeño y en el archivo grande.
// la fuerza máxima es suave a propósito (un gran angular sutil, no un ojo de pez extremo)
export function nodosFiltroGoPro(p: ParamsGoPro): NodoFiltro[] {
  const escala = ((p.curvatura / 100) * 0.14).toFixed(4)
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
