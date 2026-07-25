import { buscarTransicion } from './catalogo'

// traducción de una transición del catálogo a la entrada de un elemento suelto
// (una capa de texto, figura, imagen, dibujo o censura). a diferencia del clip de
// video, que mezcla dos planos en el lienzo, aquí hay un único elemento que
// aparece sobre lo que ya está debajo. por eso las técnicas se reinterpretan como
// una animación del propio elemento: se desvanece, crece o se desliza. el
// progreso p va de 0 (recién nace) a 1 (ya del todo presente).
//
// los valores salen en forma numérica y neutra respecto al tamaño: el visor y el
// exportador construyen con ellos el mismo movimiento, cada uno en sus unidades,
// así lo que se edita y lo que se exporta quedan idénticos

export interface EstiloEntrada {
  // multiplicador de opacidad, de 0 a 1
  opacidad: number
  // factor de escala; 1 es tamaño natural
  escala: number
  // desplazamiento horizontal y vertical, en fracción del lado menor del lienzo.
  // así no depende del tamaño del elemento, que el lienzo del exportador no siempre
  // puede medir (por ejemplo un texto), y ambos lados lo aplican igual
  tx: number
  ty: number
}

const NEUTRO: EstiloEntrada = { opacidad: 1, escala: 1, tx: 0, ty: 0 }

// una curva suave para que la entrada no se sienta lineal ni brusca
function suave(p: number): number {
  const t = Math.min(1, Math.max(0, p))
  return 1 - Math.pow(1 - t, 3)
}

// entrada ya resuelta para un tipo de transición y un progreso. al llegar a 1 se
// devuelve el estado neutro para no dejar la capa desplazada un pelo ni a media
// escala por errores de redondeo
export function estiloEntrada(tipo: string, p: number): EstiloEntrada {
  if (p >= 1 || tipo === 'ninguna' || !tipo) return NEUTRO
  const t = buscarTransicion(tipo)
  const f = suave(p)
  const despl = (1 - f) * 0.35 // fracción del lado menor desde la que entra al deslizar
  switch (t.tecnica) {
    // un solo elemento no puede fundir «a través de negro» como dos planos, así
    // que las atenuaciones se resuelven como un desvanecido de opacidad. las
    // máscaras y revelados tampoco se pueden clonar idénticos en el lienzo sobre un
    // texto de tamaño variable, así que también entran desvaneciéndose
    case 'opacidad':
    case 'negro':
    case 'blanco':
    case 'mascara':
    // las de desenfoque y destello nacieron para mezclar dos planos de video; sobre
    // un elemento suelto no hay un segundo plano al que desenfocar, así que entran
    // con un desvanecido, que es su equivalente más honesto
    case 'desenfoque':
    case 'resplandor':
    case 'flash':
      return { opacidad: f, escala: 1, tx: 0, ty: 0 }
    case 'zoom-desenfoque':
      // el golpe de zoom sí tiene sentido en una capa: entra creciendo un poco
      return { opacidad: f, escala: 1.3 - 0.3 * f, tx: 0, ty: 0 }
    case 'escala': {
      // acercar entra creciendo desde pequeño; alejar entra encogiendo desde grande
      const desde = t.direccion === 'izq' ? 1.4 : 0.6
      return { opacidad: f, escala: desde + (1 - desde) * f, tx: 0, ty: 0 }
    }
    case 'barrido-movimiento':
    case 'desplazamiento': {
      const tx = t.direccion === 'der' ? -despl : t.direccion === 'izq' ? despl : 0
      const ty = t.direccion === 'arr' ? despl : t.direccion === 'aba' ? -despl : 0
      return { opacidad: f, escala: 1, tx, ty }
    }
    default:
      return NEUTRO
  }
}

// transform css de la entrada, con el desplazamiento ya pasado a píxeles a partir
// del lado menor del lienzo mostrado. lo usa el visor
export function transformEntradaCss(e: EstiloEntrada, ladoMenorPx: number): string {
  const partes: string[] = []
  if (e.tx || e.ty) partes.push(`translate(${(e.tx * ladoMenorPx).toFixed(2)}px, ${(e.ty * ladoMenorPx).toFixed(2)}px)`)
  if (e.escala !== 1) partes.push(`scale(${e.escala.toFixed(4)})`)
  return partes.join(' ')
}

// progreso de entrada de una capa en un instante del proyecto. fuera del tramo de
// entrada devuelve 1 (ya presente del todo). sin transición definida, también 1
export function progresoEntrada(
  playhead: number,
  inicio: number,
  transicion: { tipo: string; duracion: number } | undefined,
): number {
  if (!transicion || transicion.tipo === 'ninguna' || transicion.duracion <= 0) return 1
  const dentro = playhead - inicio
  if (dentro <= 0) return 0
  if (dentro >= transicion.duracion) return 1
  return dentro / transicion.duracion
}

// progreso de la salida de una capa, medido desde el final hacia atrás: 0 cuando
// aún no empieza a irse y 1 cuando ya se fue del todo. fuera de la ventana de salida
// devuelve 0, para que el resto del tiempo la capa esté entera
export function progresoSalidaCapa(
  playhead: number,
  inicio: number,
  duracion: number,
  transicion: { tipo: string; duracion: number } | undefined,
): number {
  if (!transicion || transicion.tipo === 'ninguna' || transicion.duracion <= 0) return 0
  const fin = inicio + duracion
  const restante = fin - playhead
  if (restante >= transicion.duracion) return 0
  if (restante <= 0) return 1
  return 1 - restante / transicion.duracion
}

// estilo de la salida de una capa. es el espejo de la entrada: reutiliza la misma
// coreografía pero recorrida al revés, de modo que la capa parte de su estado pleno
// y termina desvanecida, encogida o desplazada. q va de 0 (aún entera) a 1 (ya ida)
export function estiloSalida(tipo: string, q: number): EstiloEntrada {
  if (q <= 0 || tipo === 'ninguna' || !tipo) return NEUTRO
  // al recorrer la entrada desde 1 hacia 0 se obtiene el camino inverso, que es
  // justamente cómo debe verse una salida
  return estiloEntrada(tipo, 1 - q)
}

// combina la entrada y la salida en un solo estilo: las opacidades y las escalas se
// multiplican y los desplazamientos se suman. normalmente solo una de las dos está
// activa, pero en un elemento muy corto pueden solaparse y así no se pisan
export function combinarEntradaSalida(a: EstiloEntrada, b: EstiloEntrada): EstiloEntrada {
  return {
    opacidad: a.opacidad * b.opacidad,
    escala: a.escala * b.escala,
    tx: a.tx + b.tx,
    ty: a.ty + b.ty,
  }
}
