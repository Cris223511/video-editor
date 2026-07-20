// imantado temporal de la línea de tiempo: cuando el borde de un bloque que se
// arrastra o se recorta pasa cerca de un instante de anclaje (el cero, el
// cabezal o el borde de otro bloque), se pega a él y se anuncia con una línea
// guía vertical. es la versión en el tiempo de las guías de alineación del
// lienzo que viven en lib/layers/guias.ts

// umbral en píxeles dentro del cual un borde se considera lo bastante cerca de
// un anclaje como para engancharse. unos ocho píxeles resultan cómodos: se nota
// el enganche sin que el bloque se sienta pegajoso
export const UMBRAL_IMAN_PX = 8

// dos instantes se toman por el mismo cuando su diferencia es despreciable; sirve
// para descartar los bordes propios del bloque que se mueve, que no deben atraerlo
const EPSILON = 0.0005

// quita de la lista de anclajes los instantes que coinciden con los bordes del
// propio bloque, para que no se imante contra sí mismo ni dibuje una guía fantasma
function sinPropios(puntos: number[], propios: number[]): number[] {
  return puntos.filter((p) => !propios.some((q) => Math.abs(p - q) < EPSILON))
}

// busca el anclaje más cercano a alguno de los bordes indicados. devuelve el
// instante ganador y a qué distancia quedó, o null si ninguno entra en el umbral.
// se elige el más próximo para que, con varios anclajes cerca, no compitan y el
// bloque no tiemble
function anclajeMasCercano(
  bordes: number[],
  puntos: number[],
  umbral: number,
): { punto: number; borde: number } | null {
  let mejor: { punto: number; borde: number; dist: number } | null = null
  for (const borde of bordes) {
    for (const p of puntos) {
      const dist = Math.abs(borde - p)
      if (dist <= umbral && (!mejor || dist < mejor.dist)) mejor = { punto: p, borde, dist }
    }
  }
  return mejor ? { punto: mejor.punto, borde: mejor.borde } : null
}

// imanta un bloque que se mueve entero: se prueban su borde inicial y su final
// contra los anclajes y, si alguno engancha, se corre el bloque para que ese
// borde caiga exacto. `propios` son sus bordes de partida, que se excluyen para
// no pegarse a sí mismo. devuelve el nuevo inicio y el instante de la guía (o
// null si nada enganchó)
export function imantarMover(
  inicio: number,
  duracion: number,
  puntos: number[],
  umbral: number,
  propios: number[],
): { inicio: number; guia: number | null } {
  const candidatos = sinPropios(puntos, propios)
  const encaje = anclajeMasCercano([inicio, inicio + duracion], candidatos, umbral)
  if (!encaje) return { inicio, guia: null }
  // si enganchó el borde final, el inicio retrocede la duración entera para que
  // el final quede clavado en el anclaje; si enganchó el inicial, se pega directo
  const nuevoInicio = encaje.borde === inicio ? encaje.punto : encaje.punto - duracion
  return { inicio: Math.max(0, nuevoInicio), guia: encaje.punto }
}

// imanta un único borde que se recorta. devuelve el instante enganchado (al que
// hay que llevar ese borde) y la guía a pintar, o null si no hubo enganche
export function imantarBorde(
  borde: number,
  puntos: number[],
  umbral: number,
  propios: number[],
): { punto: number; guia: number } | null {
  const candidatos = sinPropios(puntos, propios)
  const encaje = anclajeMasCercano([borde], candidatos, umbral)
  return encaje ? { punto: encaje.punto, guia: encaje.punto } : null
}
