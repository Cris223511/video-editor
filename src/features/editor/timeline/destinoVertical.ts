// a partir de la posición vertical del cursor sobre la pila de niveles de video,
// resuelve hacia dónde apunta un arrastre: al cuerpo de una fila (soltar o mover
// en ese nivel) o a una separación entre filas (abrir un nivel nuevo). la misma
// respuesta alimenta dos gestos distintos, el de mover un clip ya colocado y el
// de traer un medio desde el panel, para que ambos se sientan idénticos y no haya
// dos criterios que mantener por separado.

export interface DestinoVertical {
  // nivel bajo el cursor donde aterrizaría el elemento, o null si el cursor está
  // sobre una separación en vez de sobre una fila
  destino: number | null
  // índice donde nacería una pista nueva si se suelta ahí, o null si no se está
  // apuntando a ninguna separación. es el valor que espera insertarPistaEn
  insercion: number | null
}

// tolerancia en píxeles para apuntar a la separación entre dos filas. estar dentro
// del cuerpo de una fila cuenta como «soltar aquí»; solo el hueco entre filas (más
// esta pequeña holgura) o quedar por fuera de la pila abren un nivel nuevo. antes
// se reservaba un tercio de cada fila para insertar, y por eso salía la guía de
// pista nueva con el cursor aún dentro de la fila, que es lo que molestaba
const TOLERANCIA = 7

// tope de niveles: más allá no se ofrece insertar, así que la separación señalada
// se reinterpreta como mover a la fila más cercana. debe coincidir con MAX_PISTAS
// del store y con el que usa la guía de las cabeceras
const MAX_PISTAS = 6

// `stack` es el contenedor con las filas de video (el que lleva data-tracks). sus
// hijos traen data-fila-pista con el índice de cada nivel; se miden en vivo para
// trabajar con la geometría real y no descuadrarse cuando cambian los altos
export function resolverDestinoVertical(
  stack: HTMLElement,
  clientY: number,
  numPistas: number,
): DestinoVertical {
  const filas = [...stack.children]
    .map((el) => ({ p: Number((el as HTMLElement).dataset.filaPista), r: el.getBoundingClientRect() }))
    .filter((f) => Number.isFinite(f.p))
  if (filas.length === 0) return { destino: null, insercion: null }

  // las filas se dibujan de arriba (pista de índice mayor) hacia abajo (la cero)
  const arriba = filas[0]
  const abajo = filas[filas.length - 1]
  const topeAlcanzado = numPistas >= MAX_PISTAS

  let destino: number | null = null
  let insercion: number | null = null

  if (clientY < arriba.r.top) {
    // por encima de todo: nace una pista en la cima
    insercion = numPistas
  } else if (clientY > abajo.r.bottom) {
    // por debajo de todo: nace una pista en el suelo
    insercion = 0
  } else {
    // primero se mira si el cursor está en la separación entre dos filas, con algo
    // de holgura hacia dentro de cada una para que sea cómodo apuntar al hueco. la
    // de arriba marca dónde nace el nivel, porque se acomoda justo debajo de ella
    for (let i = 0; i < filas.length - 1; i++) {
      if (clientY > filas[i].r.bottom - TOLERANCIA && clientY < filas[i + 1].r.top + TOLERANCIA) {
        insercion = filas[i].p
        break
      }
    }
    // si no cae en ninguna separación, está dentro del cuerpo de una fila y ahí se
    // suelta, sin ofrecer pista nueva mientras el cursor siga sobre la fila
    if (insercion === null) {
      const dentro = filas.find((f) => clientY >= f.r.top && clientY <= f.r.bottom)
      destino = dentro ? dentro.p : null
    }
  }

  // con el máximo ocupado ya no cabe insertar, así que la separación señalada se
  // convierte en la fila cuyo centro queda más cerca del cursor. de ese modo el
  // arrastre vertical sigue respondiendo aunque no pueda crear más niveles
  if (insercion !== null && topeAlcanzado) {
    insercion = null
    let mejor = filas[0]
    for (const f of filas) {
      const c = f.r.top + f.r.height / 2
      if (Math.abs(clientY - c) < Math.abs(clientY - (mejor.r.top + mejor.r.height / 2))) mejor = f
    }
    destino = mejor.p
  }

  return { destino, insercion }
}

