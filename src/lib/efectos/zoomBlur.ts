// desenfoque radial (zoom blur): el centro del cuadro queda nítido y los bordes se estiran
// hacia afuera desde el foco, ese aire de "túnel de velocidad" de los aftermovies. no se puede
// expresar con un filtro css/svg (que difuminan por ejes, no en radial), así que se dibuja
// apilando varias copias del cuadro escaladas desde el centro, con poco alfa cada una: donde
// todas coinciden (el foco) queda nítido, y cuanto más lejos, más divergen y más se estira.
// el mismo dibujo lo usan el visor (sobre el lienzo que va encima del video) y la exportación,
// así que lo que se ve al editar es lo que sale en el archivo.

export type FormaZoom = 'circular' | 'cuadrada'

export interface ParamsZoomBlur {
  intensidad: number // 0 a 100
  forma: FormaZoom
}

export interface EfectoZoomBlur {
  tipo: 'zoomblur'
  intensidad: number
  forma: FormaZoom
}

// cuántas copias se apilan para el estirón. suficientes para que la estela salga suave sin
// que pese demasiado por cuadro
const COPIAS = 18

// hasta cuánto se agranda la última copia respecto al cuadro, a intensidad máxima. un 40% da
// un estirón marcado sin deshacer la imagen del todo
const ESTIRON_MAX = 0.4

// arma la máscara que decide dónde se ve el desenfoque: transparente en el centro (deja pasar
// el cuadro nítido de debajo) y opaca hacia los bordes. la forma cambia el contorno de esa zona
// nítida: un óvalo para "circular" o un rectángulo para "cuadrada". el radio de la zona nítida
// se encoge un poco al subir la intensidad, para que a más fuerza el foco nítido sea más chico
function aplicarMascara(
  tctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  forma: FormaZoom,
  fuerza: number,
) {
  const cx = w / 2
  const cy = h / 2
  // el borde interior (todavía nítido) y el exterior (ya del todo borroso). el interior baja
  // con la fuerza para que el desenfoque coma más hacia el centro cuanto más intenso
  const rIn = 0.16 + 0.24 * (1 - fuerza)
  tctx.globalCompositeOperation = 'destination-in'
  if (forma === 'circular') {
    const rOut = Math.hypot(cx, cy)
    const g = tctx.createRadialGradient(cx, cy, rIn * Math.min(w, h), cx, cy, rOut)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,1)')
    tctx.fillStyle = g
    tctx.fillRect(0, 0, w, h)
  } else {
    // para la forma cuadrada se suman cuatro degradados lineales, uno por lado: cada uno va de
    // transparente en el centro a opaco en su borde, y al mezclarse por suma dan una zona nítida
    // rectangular en el medio con el desenfoque creciendo hacia el marco
    const mask = document.createElement('canvas')
    mask.width = Math.max(1, Math.round(w))
    mask.height = Math.max(1, Math.round(h))
    const mctx = mask.getContext('2d')
    if (mctx) {
      mctx.globalCompositeOperation = 'lighter'
      const margen = rIn // fracción del centro que queda nítida por lado
      const lados: [number, number, number, number][] = [
        [cx, cy, 0, cy], // hacia la izquierda
        [cx, cy, w, cy], // hacia la derecha
        [cx, cy, cx, 0], // hacia arriba
        [cx, cy, cx, h], // hacia abajo
      ]
      for (const [x0, y0, x1, y1] of lados) {
        const g = mctx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, 'rgba(0,0,0,0)')
        g.addColorStop(margen, 'rgba(0,0,0,0)')
        g.addColorStop(1, 'rgba(0,0,0,1)')
        mctx.fillStyle = g
        mctx.fillRect(0, 0, w, h)
      }
    }
    tctx.drawImage(mask, 0, 0, w, h)
  }
  tctx.globalCompositeOperation = 'source-over'
}

// pinta el desenfoque radial sobre `dst` componiéndolo ENCIMA de lo que ya haya en ctx ahí
// (que debe ser el cuadro nítido). `fuente` es cualquier cosa dibujable con el cuadro del clip
// (un <video>, <img> o <canvas>). `tmp` es un lienzo de trabajo reutilizable, para no crear uno
// por cuadro; se redimensiona al recuadro destino cuando hace falta.
export function pintarZoomBlur(
  ctx: CanvasRenderingContext2D,
  fuente: CanvasImageSource,
  dst: { dx: number; dy: number; dw: number; dh: number },
  tmp: HTMLCanvasElement,
  params: ParamsZoomBlur,
) {
  const fuerza = Math.max(0, Math.min(1, params.intensidad / 100))
  if (fuerza <= 0) return
  const { dx, dy, dw, dh } = dst
  const w = Math.max(1, Math.round(dw))
  const h = Math.max(1, Math.round(dh))
  if (tmp.width !== w || tmp.height !== h) {
    tmp.width = w
    tmp.height = h
  }
  const tctx = tmp.getContext('2d')
  if (!tctx) return
  tctx.setTransform(1, 0, 0, 1, 0, 0)
  tctx.globalCompositeOperation = 'source-over'
  tctx.clearRect(0, 0, w, h)

  // se apilan las copias escaladas desde el centro. el alfa de cada una es 1/COPIAS, así el
  // conjunto queda a plena opacidad pero promediado, que es lo que da el difuminado
  const estiron = ESTIRON_MAX * fuerza
  tctx.globalAlpha = 1 / COPIAS
  for (let i = 0; i < COPIAS; i++) {
    const s = 1 + estiron * (i / (COPIAS - 1))
    const cw = w * s
    const ch = h * s
    tctx.drawImage(fuente, (w - cw) / 2, (h - ch) / 2, cw, ch)
  }
  tctx.globalAlpha = 1

  aplicarMascara(tctx, w, h, params.forma, fuerza)

  ctx.drawImage(tmp, dx, dy, dw, dh)
}
