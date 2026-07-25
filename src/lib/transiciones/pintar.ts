import { Clip } from '../../types/timeline'
import { buscarTransicion } from './catalogo'
import { desplazamiento, escalas, opacidades, trazarForma } from './motor'

// cuánto ha avanzado la transición de entrada de un clip en un instante dado.
// devuelve 1 cuando ya terminó, así que fuera de la ventana todo sigue igual
export function progreso(clip: Clip, t: number): number {
  const tr = clip.transicion
  if (tr.tipo === 'ninguna' || tr.duracion <= 0) return 1
  const e = t - clip.inicio
  if (e >= tr.duracion) return 1
  return Math.max(0, e / tr.duracion)
}

// cuánto ha avanzado la transición de salida de un clip. devuelve 1 mientras no
// haya empezado, igual que la de entrada, de modo que fuera de su ventana no
// cambia nada. la salida se mide desde el final del clip hacia atrás
export function progresoSalida(clip: Clip, t: number): number {
  const tr = clip.transicionSalida
  if (!tr || tr.tipo === 'ninguna' || tr.duracion <= 0) return 1
  const fin = clip.inicio + clip.duracion
  const restante = fin - t
  if (restante >= tr.duracion) return 1
  return Math.max(0, Math.min(1, 1 - restante / tr.duracion))
}

// el clip que entra justo después de este en su misma pista. durante la salida es
// el que va apareciendo por debajo; si no hay ninguno, se ve el fondo del lienzo
export function posterior(clip: Clip, clips: Clip[]): Clip | null {
  const mismos = clips
    .filter((c) => c.pista === clip.pista && c.inicio >= clip.inicio + clip.duracion - 0.001)
    .sort((a, b) => a.inicio - b.inicio)
  return mismos.length ? mismos[0] : null
}

// el clip que estaba en pantalla justo antes que este en su misma pista. es el
// que debe verse debajo mientras dura la transición
export function anterior(clip: Clip, clips: Clip[]): Clip | null {
  const mismos = clips
    .filter((c) => c.pista === clip.pista && c.inicio + c.duracion <= clip.inicio + 0.001)
    .sort((a, b) => a.inicio - b.inicio)
  return mismos.length ? mismos[mismos.length - 1] : null
}

export interface Pintor {
  // dibuja un clip cubriendo el lienzo, con su tono ya aplicado. el llamante lo
  // aporta porque el visor y la exportación obtienen el fotograma de sitios
  // distintos, pero la coreografía de la transición es la misma
  (clip: Clip, alfa: number): void
}

// dibuja un clip con un filtro css (desenfoque, brillo...) y, si hace falta, un
// leve acercamiento para que el desenfoque no deje asomar el borde transparente
// del lienzo. lo comparten las transiciones de la familia de desenfoque
function conFiltro(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  clip: Clip,
  pintar: Pintor,
  filtro: string,
  zoom: number,
) {
  ctx.save()
  ctx.filter = filtro
  if (zoom !== 1) {
    ctx.translate(ancho / 2, alto / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-ancho / 2, -alto / 2)
  }
  pintar(clip, 1)
  ctx.restore()
}

// ejecuta la transición de entrada de un clip sobre el lienzo. toda la
// coreografía vive aquí y no repartida entre el visor y el compositor, que es
// lo que garantiza que lo exportado coincida con lo que se vio al editar
export function pintarTransicion(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  // en una salida el que entra puede no existir (el clip es el último): entonces
  // lo que asoma por debajo es el fondo del lienzo, ya pintado antes
  entrante: Clip | null,
  saliente: Clip | null,
  p: number,
  pintar: Pintor,
  // el tipo se puede imponer desde fuera. lo usa la transición de salida, que no
  // sale del clip entrante sino del que se está yendo
  tipoForzado?: string,
) {
  const t = buscarTransicion(tipoForzado ?? entrante?.transicion.tipo ?? 'ninguna')
  const op = opacidades(t, p)

  // el corte y las transiciones ya terminadas no necesitan nada especial
  if (t.tecnica === 'corte' || p >= 1) {
    if (entrante) pintar(entrante, 1)
    return
  }

  switch (t.tecnica) {
    case 'opacidad': {
      if (saliente) pintar(saliente, 1)
      if (entrante) pintar(entrante, op.entrante)
      return
    }

    case 'negro':
    case 'blanco': {
      // en la primera mitad se ve el plano que sale, en la segunda el que entra,
      // y el velo de color cubre el paso entre ambos
      if (p < 0.5 && saliente) pintar(saliente, 1)
      else if (entrante) pintar(entrante, 1)
      if (op.velo > 0) {
        ctx.save()
        ctx.globalAlpha = op.velo
        ctx.fillStyle = t.tecnica === 'negro' ? '#000' : '#fff'
        ctx.fillRect(0, 0, ancho, alto)
        ctx.restore()
      }
      return
    }

    case 'mascara': {
      if (saliente) pintar(saliente, 1)
      if (!t.forma) {
        if (entrante) pintar(entrante, 1)
        return
      }
      ctx.save()
      // el borde difuminado se consigue con una sombra proyectada sobre la
      // propia máscara: sin él, el corte se ve duro y barato
      if (t.suavizado) {
        const radio = Math.min(ancho, alto) * t.suavizado
        ctx.filter = `blur(${radio}px)`
      }
      trazarForma(ctx, t.forma, p, ancho, alto)
      ctx.clip()
      ctx.filter = 'none'
      if (entrante) pintar(entrante, 1)
      ctx.restore()
      return
    }

    case 'desplazamiento': {
      const d = desplazamiento(t.direccion ?? 'der', p, ancho, alto)
      if (saliente) {
        ctx.save()
        ctx.translate(d.saliente[0], d.saliente[1])
        pintar(saliente, 1)
        ctx.restore()
      }
      if (entrante) {
        ctx.save()
        ctx.translate(d.entrante[0], d.entrante[1])
        pintar(entrante, 1)
        ctx.restore()
      }
      return
    }

    case 'escala': {
      const acercar = t.direccion === 'der'
      const e = escalas(acercar, p)
      const centrar = (f: number) => {
        ctx.translate(ancho / 2, alto / 2)
        ctx.scale(f, f)
        ctx.translate(-ancho / 2, -alto / 2)
      }
      if (saliente) {
        ctx.save()
        centrar(e.saliente)
        pintar(saliente, 1)
        ctx.restore()
      }
      if (entrante) {
        ctx.save()
        centrar(e.entrante)
        // el que entra se funde además de crecer, o el salto se nota demasiado
        pintar(entrante, p)
        ctx.restore()
      }
      return
    }

    // familia de desenfoque: corte seco a la mitad. en la primera mitad se ve el
    // plano que sale acumulando el efecto hasta el tope; en la segunda, el que entra
    // lo va soltando. el cambio de plano ocurre justo en el punto de máximo efecto,
    // así el corte queda escondido detrás del desenfoque
    case 'desenfoque': {
      const maxB = Math.min(ancho, alto) * 0.06
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1 + 0.06 * k)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1 + 0.06 * k)
      }
      return
    }

    case 'resplandor': {
      const maxB = Math.min(ancho, alto) * 0.05
      const filtro = (k: number) => `blur(${(maxB * k).toFixed(2)}px) brightness(${(1 + 0.9 * k).toFixed(3)})`
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, filtro(k), 1 + 0.05 * k)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, filtro(k), 1 + 0.05 * k)
      }
      return
    }

    case 'flash': {
      if (p < 0.5) {
        if (saliente) pintar(saliente, 1)
      } else if (entrante) {
        pintar(entrante, 1)
      }
      // el velo blanco sube hacia el corte y cae después: pico agudo justo en la
      // mitad, que es donde cambia el plano
      const velo = Math.max(0, 1 - Math.abs(p - 0.5) / 0.5)
      if (velo > 0) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, velo * 1.6)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, ancho, alto)
        ctx.restore()
      }
      return
    }

    case 'zoom-desenfoque': {
      const maxB = Math.min(ancho, alto) * 0.045
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1 + 0.55 * k)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1 + 0.55 * k)
      }
      return
    }

    case 'barrido-movimiento': {
      const maxB = Math.min(ancho, alto) * 0.05
      const dir = t.direccion ?? 'izq'
      const dx = dir === 'izq' ? -ancho : dir === 'der' ? ancho : 0
      const dy = dir === 'arr' ? -alto : dir === 'aba' ? alto : 0
      // se agranda para que el barrido no descubra los bordes del lienzo al correrse
      const pintarLado = (clip: Clip, k: number, signo: number) => {
        ctx.save()
        ctx.filter = `blur(${(maxB * k).toFixed(2)}px)`
        ctx.translate(ancho / 2, alto / 2)
        ctx.scale(1.2, 1.2)
        ctx.translate(-ancho / 2, -alto / 2)
        ctx.translate(signo * dx * 0.16 * k, signo * dy * 0.16 * k)
        pintar(clip, 1)
        ctx.restore()
      }
      if (p < 0.5) {
        if (saliente) pintarLado(saliente, p / 0.5, 1)
      } else if (entrante) {
        pintarLado(entrante, 1 - (p - 0.5) / 0.5, -1)
      }
      return
    }
  }
}
