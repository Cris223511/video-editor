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

// una transición de DISOLUCIÓN entre dos clips vive centrada en el corte, como en los
// editores de escritorio: la mitad se come la cola del que sale y la otra mitad la cabeza
// del que entra, sin mover los clips ni cambiar el largo. la transición se guarda en el
// clip que entra (su .transicion) y el corte es su inicio; la ventana es
// [corte − D/2, corte + D/2]. dado un instante, dice si cae dentro de un cruce así y con
// qué avance. solo las disoluciones (técnica de opacidad) se centran por ahora; las
// geométricas (barridos, puertas) siguen su camino de lienzo
export interface CruceCentrado {
  entra: Clip
  sale: Clip
  p: number // 0 al empezar la ventana (en el corte), 1 al terminarla
  medio: number // duración de la ventana del cruce en segundos, ya acotada
  corte: number // instante del corte entre los dos clips
}
export function cruceCentradoEn(
  clips: Clip[],
  t: number,
  esDisolucion: (tipo: string) => boolean,
): CruceCentrado | null {
  for (const entra of clips) {
    const tr = entra.transicion
    if (!tr || tr.tipo === 'ninguna' || tr.duracion <= 0) continue
    if (!esDisolucion(tr.tipo)) continue
    const sale = anterior(entra, clips)
    if (!sale) continue // sin plano anterior no es un cruce: abre contra el fondo
    // el cruce ARRANCA en el corte y ocupa la cabeza del que entra: la ventana es
    // [corte, corte + D]. la razón es de reproducción: si el cruce estuviera centrado, en su
    // primera mitad el clip que entra tendría que mostrar fotogramas ANTERIORES a su inicio, que
    // no existen cuando el clip está completo (recorteInicio 0), y por eso se quedaba congelado en
    // su primer cuadro hasta llegar al corte. arrancando en el corte, el que entra es el clip
    // ACTIVO durante toda la transición y se reproduce por el camino normal, sin congelarse ni dar
    // un salto; el que sale se funde por encima sostenido en su último cuadro. la duración se acota
    // a la cabeza del que entra para no pisar lo que venga después
    const dur = Math.min(tr.duracion, entra.duracion * 0.95)
    if (dur <= 0) continue
    const corte = entra.inicio
    if (t >= corte && t < corte + dur) {
      const p = (t - corte) / dur // 0 justo en el corte, 1 al cerrar la transición
      return { entra, sale, p: Math.max(0, Math.min(1, p)), medio: dur, corte }
    }
  }
  return null
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
  // fuerza del efecto que trae el clip (borrón o fogonazo). sin definir, un valor medio que
  // reproduce el comportamiento de siempre. las atenuaciones de color no lo usan (van a fondo pleno)
  intensidad = 0.6,
): EfectoGlobalTrans {
  const base: EfectoGlobalTrans = { veloColor: '#000', veloOpacidad: 0, blur: 0, opacidad: 1 }
  // el efecto es máximo en el extremo (recién abre o a punto de cerrar) y nulo cuando el
  // plano se ve limpio; al abrir arranca fuerte y afloja, al cerrar es al revés
  const k = esEntrada ? 1 - p : p
  const i = intensidad
  switch (tecnica) {
    case 'opacidad':
      return { ...base, opacidad: esEntrada ? p : 1 - p }
    case 'negro':
      return { ...base, veloColor: '#000', veloOpacidad: k }
    case 'blanco':
      return { ...base, veloColor: '#fff', veloOpacidad: k }
    case 'desenfoque':
      return { ...base, blur: ladoMenor * 0.1 * i * k }
    case 'resplandor':
      return { ...base, blur: ladoMenor * 0.083 * i * k }
    case 'zoom-desenfoque':
      return { ...base, blur: ladoMenor * 0.045 * k }
    case 'flash':
      return { ...base, veloColor: '#fff', veloOpacidad: Math.min(1, k * (0.6 + 1.7 * i)) }
    case 'flash-camara':
      return { ...base, veloColor: '#fff', veloOpacidad: Math.min(1, Math.pow(k, 0.55) * (0.7 + 2 * i)), blur: ladoMenor * 0.05 * i * k }
    default:
      return base
  }
}

export interface Pintor {
  // dibuja un clip cubriendo el lienzo, con su tono ya aplicado. el llamante lo
  // aporta porque el visor y la exportación obtienen el fotograma de sitios
  // distintos, pero la coreografía de la transición es la misma. el destino opcional
  // permite componer el clip en un lienzo aparte (lo usa la estela de movimiento, que
  // compone una vez y luego repite el resultado en copias baratas)
  (clip: Clip, alfa: number, destino?: CanvasRenderingContext2D): void
}

// lienzo reutilizable donde la estela de movimiento compone el clip una sola vez antes de
// blitear sus copias. se guarda a nivel de módulo para no crear un canvas por cuadro
let _lienzoEstela: HTMLCanvasElement | null = null
function lienzoEstela(ancho: number, alto: number): HTMLCanvasElement {
  if (!_lienzoEstela) _lienzoEstela = document.createElement('canvas')
  if (_lienzoEstela.width !== ancho) _lienzoEstela.width = ancho
  if (_lienzoEstela.height !== alto) _lienzoEstela.height = alto
  return _lienzoEstela
}

// dibuja un clip con un filtro css (desenfoque, brillo...). el desenfoque bordea el borde
// transparente del lienzo y lo dejaba asomar; para taparlo hay dos caminos. `cubrir` pinta
// antes una copia nítida a tamaño natural que hace de fondo, así el borroso puede quedarse sin
// acercar y no se ve zoom. `zoom` es el otro camino, un acercamiento de verdad, reservado a las
// transiciones que SÍ quieren ese efecto (el golpe de zoom)
function conFiltro(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  clip: Clip,
  pintar: Pintor,
  filtro: string,
  zoom: number,
  cubrir = false,
) {
  if (cubrir) pintar(clip, 1)
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

  // fuerza del efecto que algunas transiciones dejan regular por clip (el borrón del desenfoque,
  // el tamaño del acercón, cuánto crece la escala, la potencia del fogonazo). en un cruce vive en
  // la entrada del que releva; en un cierre contra el fondo, en la salida del que se va
  const intens = entrante?.transicion?.intensidad ?? saliente?.transicionSalida?.intensidad ?? 0.6

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
      if (!t.forma) {
        if (saliente) pintar(saliente, 1)
        if (entrante) pintar(entrante, 1)
        return
      }
      // parámetros que el clip puede afinar por su cuenta: el grosor del borde suave
      // (que se puede subir para un degradado ancho o bajar a cero para un corte duro)
      // se lee de la transición del propio clip, y si no trae, manda el del catálogo
      const trParams = tipoForzado ? saliente?.transicionSalida : entrante?.transicion
      const suave = trParams?.grosor ?? t.suavizado ?? 0
      const esquina = trParams?.esquina ?? t.esquina
      // el que entra se pinta entero y luego se conserva solo dentro de la forma con una
      // máscara de borde difuminado (destination-in sobre la silueta desenfocada); el que
      // sale se mete por detrás (destination-over). así el corte lleva un degradado de
      // verdad, cosa que un clip() duro nunca permitió: recortaba con borde seco por más
      // desenfoque que se le pusiera al filtro, porque clip() no mira el filtro
      if (entrante) pintar(entrante, 1)
      ctx.save()
      ctx.globalCompositeOperation = 'destination-in'
      if (suave > 0) {
        const radio = Math.min(ancho, alto) * suave
        ctx.filter = `blur(${radio.toFixed(1)}px)`
      }
      ctx.fillStyle = '#fff'
      trazarForma(ctx, t.forma, p, ancho, alto, esquina)
      ctx.fill()
      ctx.filter = 'none'
      ctx.restore()
      ctx.save()
      ctx.globalCompositeOperation = 'destination-over'
      if (saliente) pintar(saliente, 1)
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
      // cuánto acerca o aleja lo regula el clip; sin ajuste, un valor medio como el de siempre
      const fuerza = entrante?.transicion?.intensidad ?? saliente?.transicionSalida?.intensidad ?? 0.6
      const e = escalas(acercar, p, fuerza)
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
      const maxB = Math.min(ancho, alto) * 0.1 * intens
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, `blur(${(maxB * kUno).toFixed(2)}px)`, 1, true)
        return
      }
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1, true)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1, true)
      }
      return
    }

    case 'resplandor': {
      const maxB = Math.min(ancho, alto) * 0.083 * intens
      const filtro = (k: number) => `blur(${(maxB * k).toFixed(2)}px) brightness(${(1 + 0.9 * k).toFixed(3)})`
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, filtro(kUno), 1, true)
        return
      }
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, filtro(k), 1, true)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, filtro(k), 1, true)
      }
      return
    }

    case 'flash': {
      // la potencia del fogonazo la regula el clip: un valor medio deja el flash de siempre
      const potencia = 0.6 + 1.7 * intens
      if (soloUno) {
        if (unico) pintar(unico, 1)
        // fogonazo blanco que arranca fuerte y se apaga al abrir, o al revés al cerrar
        const veloU = Math.min(1, kUno * potencia)
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
        ctx.globalAlpha = Math.min(1, velo * potencia)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, ancho, alto)
        ctx.restore()
      }
      return
    }

    case 'flash-camara': {
      // como tomar una foto con flash: un leve desenfoque de movimiento a cada lado y
      // un fogonazo blanco muy agudo justo en el corte, más brusco que el flash normal. la
      // potencia del fogonazo y el borrón la regula el clip
      const maxB = Math.min(ancho, alto) * 0.05 * intens
      const potencia = 0.7 + 2 * intens
      const filtroFc = (k: number) => `blur(${(maxB * k).toFixed(2)}px) brightness(${(1 + 0.25 * k).toFixed(3)})`
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, filtroFc(kUno), 1, true)
        const veloU = Math.min(1, Math.pow(kUno, 0.55) * potencia)
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
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, filtroFc(k), 1, true)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, filtroFc(k), 1, true)
      }
      // el fogonazo: pico agudo y saturado justo en la mitad
      const velo = Math.max(0, 1 - Math.abs(p - 0.5) / 0.32)
      if (velo > 0) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, Math.pow(velo, 0.55) * potencia)
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, ancho, alto)
        ctx.restore()
      }
      return
    }

    case 'zoom-desenfoque': {
      const maxB = Math.min(ancho, alto) * 0.045
      // el tamaño del acercón se puede regular por clip. la intensidad va de 0 a 1 y de ahí
      // sale cuánto crece la imagen en el pico (hasta 90 %). esta transición SÍ es de zoom, así
      // que el acercamiento es su gracia, no un defecto
      const zMax = 0.9 * intens
      if (soloUno) {
        if (unico) conFiltro(ctx, ancho, alto, unico, pintar, `blur(${(maxB * kUno).toFixed(2)}px)`, 1 + zMax * kUno)
        return
      }
      if (p < 0.5) {
        const k = p / 0.5
        if (saliente) conFiltro(ctx, ancho, alto, saliente, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1 + zMax * k)
      } else {
        const k = 1 - (p - 0.5) / 0.5
        if (entrante) conFiltro(ctx, ancho, alto, entrante, pintar, `blur(${(maxB * k).toFixed(2)}px)`, 1 + zMax * k)
      }
      return
    }

    case 'barrido-movimiento': {
      // desenfoque de movimiento DIRECCIONAL (whip): la imagen se estira en el eje elegido, como
      // un barrido rápido de cámara, y de esa estela se pasa al otro plano. la clave para que NO
      // se vean copias sueltas (el problema del latigazo viejo) es doble: muchas copias muy
      // juntas a lo largo del eje, promediadas con alfa 1/(i+1) para que el conjunto sea su
      // media, MÁS un desenfoque isótropo pequeño del tamaño de la separación entre copias, que
      // funde unas con otras en una estela continua. como la estela es larga y el desenfoque de
      // fundido es chico, el resultado se lee claramente como movimiento en esa dirección y no
      // como un borroso plano. la fuerza sube hasta el corte y baja después, así el instante más
      // movido esconde el cambio de plano. la dirección puede venir afinada por el propio clip:
      // en un cruce centrado la transición vive en la ENTRADA del que releva (aunque se fuerce el
      // tipo desde fuera), y en un cierre contra el fondo, en la salida del que se va. se miran
      // las dos y manda la primera que la traiga, así funciona en cualquiera de los dos montajes
      const dir =
        entrante?.transicion?.direccion ??
        saliente?.transicionSalida?.direccion ??
        t.direccion ??
        'izq'
      const ux = dir === 'der' ? 1 : dir === 'izq' ? -1 : 0
      const uy = dir === 'aba' ? 1 : dir === 'arr' ? -1 : 0
      // dos ajustes propios del clip: la intensidad (compartida) regula el largo de la estela y el
      // borrón, y el acercamiento dice cuánto se agranda la imagen mientras corre el barrido. el
      // acercamiento por defecto es cero, porque esto es un barrido, no un zoom; quien lo quiera lo sube
      const inten = intens
      const acerc = entrante?.transicion?.acercamiento ?? saliente?.transicionSalida?.acercamiento ?? 0
      const lado = Math.min(ancho, alto)
      const smear = (clip: Clip, k: number) => {
        if (k <= 0.001) {
          pintar(clip, 1)
          return
        }
        // la estela va CENTRADA en la posición natural, no corrida hacia un lado. antes se
        // desplazaba (el "whoosh") y eso dejaba la mitad de un lado nítida y la del otro borrosa,
        // porque la base a tamaño natural asomaba justo por donde la estela se había ido. centrada,
        // el borrón queda igual arriba y abajo (o a los dos lados), sin mitades
        const largo = lado * 0.5 * inten * k // longitud de la estela en píxeles
        // el clip se compone una SOLA vez en un lienzo aparte y de ahí se blitean las copias. así no
        // se repite pintar() entero (color, nitidez, curvatura...) por cada copia, que en la transición
        // se arrastraba durante minutos y parecía que la exportación se colgaba
        const tmp = lienzoEstela(ancho, alto)
        const tctx = tmp.getContext('2d')
        if (!tctx) {
          // sin un segundo lienzo 2d (entorno muy limitado) se cae al camino directo, más lento
          pintar(clip, 1)
          return
        }
        tctx.setTransform(1, 0, 0, 1, 0, 0)
        tctx.clearRect(0, 0, ancho, alto)
        pintar(clip, 1, tctx)
        ctx.save()
        // acercamiento OPCIONAL, gobernado por su ajuste. en cero la imagen no crece nada
        const escala = 1 + acerc * 0.6 * k
        if (escala !== 1) {
          ctx.translate(ancho / 2, alto / 2)
          ctx.scale(escala, escala)
          ctx.translate(-ancho / 2, -alto / 2)
        }
        // base a tamaño natural: ancla el clip en su sitio y cubre los bordes del lienzo
        ctx.drawImage(tmp, 0, 0)
        // estela SIMÉTRICA a lo largo del eje elegido: las copias se reparten por igual a los DOS lados
        // del centro (de -largo/2 a +largo/2) y se promedian. así el CONTENIDO no se corre a ningún lado
        // (queda anclado en su sitio), solo se difumina en esa dirección, como una foto movida. antes las
        // copias iban todas a un mismo lado y arrastraban el clip entero, que es lo que no se quería
        const N = 24
        const sep = largo / N
        ctx.filter = `blur(${Math.max(0.6, sep * 0.9).toFixed(2)}px)`
        for (let i = 0; i < N; i++) {
          const f = i / (N - 1) - 0.5 // de -0.5 a 0.5: mitad hacia un lado, mitad hacia el otro
          const off = f * largo
          ctx.save()
          // alfa decreciente: el conjunto es la MEDIA de las copias, centrada, no una corrida hacia un lado
          ctx.globalAlpha = 1 / (i + 1)
          ctx.translate(ux * off, uy * off)
          ctx.drawImage(tmp, 0, 0)
          ctx.restore()
        }
        ctx.filter = 'none'
        ctx.restore()
      }
      if (soloUno) {
        // un solo plano que abre o cierra contra el fondo, con la estela y sin corte
        if (unico) smear(unico, kUno)
        return
      }
      if (p < 0.5) {
        if (saliente) smear(saliente, p / 0.5)
      } else if (entrante) {
        smear(entrante, 1 - (p - 0.5) / 0.5)
      }
      return
    }
  }
}
