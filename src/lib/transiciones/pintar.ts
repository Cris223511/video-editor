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

// técnicas cuyo efecto (velo de color, desenfoque u opacidad) se puede aplicar sobre
// TODA la composición a la vez, no solo sobre el video. las geométricas (barridos,
// puertas, empujes) no entran aquí porque recortan o mueven el fotograma y necesitan
// el canvas con los dos planos
export function esTransicionGlobal(tecnica: string): boolean {
  return (
    tecnica === 'negro' ||
    tecnica === 'blanco' ||
    tecnica === 'desenfoque' ||
    tecnica === 'resplandor' ||
    tecnica === 'zoom-desenfoque' ||
    tecnica === 'flash' ||
    tecnica === 'flash-camara'
  )
}

// efecto de una transición de un solo plano (un clip que abre o cierra contra el fondo)
// que se aplica a toda la composición: un velo de color con su opacidad, un desenfoque
// en píxeles y una opacidad general del contenido. así el fundido o el difuminado tapa
// también las capas (censura, texto, figuras), en vez de dejarlas flotando por encima.
// `p` es el avance (0 al empezar la transición, 1 al terminarla) y `ladoMenor` el lado
// corto del lienzo en píxeles, para medir el desenfoque
export interface EfectoGlobalTrans {
  veloColor: string
  veloOpacidad: number
  blur: number
  opacidad: number
}
export function efectoGlobalTrans(
  tecnica: string,
  p: number,
  esEntrada: boolean,
  ladoMenor: number,
): EfectoGlobalTrans {
  const base: EfectoGlobalTrans = { veloColor: '#000', veloOpacidad: 0, blur: 0, opacidad: 1 }
  // el efecto es máximo en el extremo (recién abre o a punto de cerrar) y nulo cuando el
  // plano se ve limpio; al abrir arranca fuerte y afloja, al cerrar es al revés
  const k = esEntrada ? 1 - p : p
  switch (tecnica) {
    case 'opacidad':
      return { ...base, opacidad: esEntrada ? p : 1 - p }
    case 'negro':
      return { ...base, veloColor: '#000', veloOpacidad: k }
    case 'blanco':
      return { ...base, veloColor: '#fff', veloOpacidad: k }
    case 'desenfoque':
      return { ...base, blur: ladoMenor * 0.06 * k }
    case 'resplandor':
      return { ...base, blur: ladoMenor * 0.05 * k }
    case 'zoom-desenfoque':
      return { ...base, blur: ladoMenor * 0.045 * k }
    case 'flash':
      return { ...base, veloColor: '#fff', veloOpacidad: Math.min(1, k * 1.6) }
    case 'flash-camara':
      return { ...base, veloColor: '#fff', veloOpacidad: Math.min(1, Math.pow(k, 0.55) * 1.9), blur: ladoMenor * 0.03 * k }
    default:
      return base
  }
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

  // una transición no siempre está entre dos planos: también sirve para abrir o cerrar
  // un solo clip contra el fondo. cuando falta uno de los dos lados, las técnicas que
  // normalmente cortan a la mitad (negro, desenfoque, flash...) se reinterpretan como un
  // fundido continuo desde su estado extremo, para que el clip empiece del todo negro (o
  // desenfocado, etc.) y llegue a su imagen normal, o al revés al cerrar. sin esto, media
  // transición se quedaba en el fondo del lienzo y el efecto no se veía
  const soloUno = !saliente !== !entrante
  const unico = entrante ?? saliente
  // el plano que existe es el que entra cuando no hay saliente; si el que falta es el
  // entrante, entonces el único es el que se está yendo (una salida contra el fondo)
  const esEntrada = !!entrante && !saliente
  // avance del efecto para un solo plano: máximo en el extremo (recién abre o a punto de
  // cerrar) y cero cuando el plano se ve limpio. así una entrada arranca al tope y afloja,
  // y una salida parte de limpio y llega al tope
  const kUno = esEntrada ? 1 - p : p

  switch (t.tecnica) {
    case 'opacidad': {
      if (saliente) pintar(saliente, 1)
      if (entrante) pintar(entrante, op.entrante)
      return
    }

    case 'negro':
    case 'blanco': {
      const color = t.tecnica === 'negro' ? '#000' : '#fff'
      // un solo clip: se ve siempre, con un velo de color que va de opaco a nada al
      // abrir (arranca del todo cubierto) y de nada a opaco al cerrar
      const velo = soloUno ? kUno : op.velo
      if (soloUno) {
        if (unico) pintar(unico, 1)
      } else {
        // dos planos: en la primera mitad el que sale, en la segunda el que entra
        if (p < 0.5 && saliente) pintar(saliente, 1)
        else if (entrante) pintar(entrante, 1)
      }
      if (velo > 0) {
        ctx.save()
        ctx.globalAlpha = velo
        ctx.fillStyle = color
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
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, `blur(${(maxB * kUno).toFixed(2)}px)`, 1 + 0.06 * kUno)
        return
      }
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
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, filtro(kUno), 1 + 0.05 * kUno)
        return
      }
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
      if (soloUno) {
        if (unico) pintar(unico, 1)
        // fogonazo blanco que arranca fuerte y se apaga al abrir, o al revés al cerrar
        const veloU = Math.min(1, kUno * 1.6)
        if (veloU > 0) {
          ctx.save()
          ctx.globalAlpha = veloU
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, ancho, alto)
          ctx.restore()
        }
        return
      }
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

    case 'flash-camara': {
      // como tomar una foto con flash: un leve desenfoque de movimiento a cada lado y
      // un fogonazo blanco muy agudo justo en el corte, más brusco que el flash normal
      const maxB = Math.min(ancho, alto) * 0.03
      const filtroFc = (k: number) => `blur(${(maxB * k).toFixed(2)}px) brightness(${(1 + 0.25 * k).toFixed(3)})`
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, filtroFc(kUno), 1 + 0.03 * kUno)
        const veloU = Math.min(1, Math.pow(kUno, 0.55) * 1.9)
        if (veloU > 0) {
          ctx.save()
          ctx.globalAlpha = veloU
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, ancho, alto)
          ctx.restore()
        }
        return
      }
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, filtroFc(k), 1 + 0.03 * k)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, filtroFc(k), 1 + 0.03 * k)
      }
      // el fogonazo: pico agudo y saturado justo en la mitad
      const velo = Math.max(0, 1 - Math.abs(p - 0.5) / 0.32)
      if (velo > 0) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, Math.pow(velo, 0.55) * 1.9)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, ancho, alto)
        ctx.restore()
      }
      return
    }

    case 'zoom-desenfoque': {
      const maxB = Math.min(ancho, alto) * 0.045
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, `blur(${(maxB * kUno).toFixed(2)}px)`, 1 + 0.55 * kUno)
        return
      }
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
      if (soloUno) {
        // un solo plano se desliza desde su lado (entrada) o hacia él (salida) mientras
        // se enfoca, sin el corte a mitad de camino
        if (unico) pintarLado(unico, kUno, esEntrada ? -1 : 1)
        return
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
