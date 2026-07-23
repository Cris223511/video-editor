// averigua sobre qué fila de un carril está el cursor. cada fila lleva un atributo
// data-<attr> con su número; se mira qué elementos hay bajo el punto y se devuelve
// el nivel de la primera fila que aparezca. sirve para soltar una capa o un audio
// en otra fila sin arrastre nativo del navegador, solo con la posición del ratón.
// devuelve null cuando el cursor no cae sobre ninguna fila del carril
// margen, en píxeles, dentro del cual se considera que el cursor apunta a la
// separación entre dos filas en vez de a una de ellas. es la franja donde se
// enciende la guía que promete abrir una fila nueva al soltar
const MARGEN_SEPARACION = 6

// igual que nivelBajoCursor, pero además dice si el cursor está sobre la juntura
// entre dos filas. cuando lo está devuelve el nivel encima del cual nacería la
// fila nueva; el bloque no se muda a ninguna existente sino que estrena la suya
export function separacionBajoCursor(x: number, y: number, attr: string): number | null {
  const elementos = document.elementsFromPoint(x, y + MARGEN_SEPARACION)
  const arriba = document.elementsFromPoint(x, y - MARGEN_SEPARACION)
  const leer = (lista: Element[]): number | null => {
    for (const el of lista) {
      const v = (el as HTMLElement).dataset?.[attr]
      if (v != null) {
        const n = Number(v)
        if (Number.isFinite(n)) return n
      }
    }
    return null
  }
  const a = leer(arriba)
  const b = leer(elementos)
  // si justo encima y justo debajo hay filas distintas, el cursor cae en la junta
  if (a !== null && b !== null && a !== b) return Math.max(a, b)
  return null
}

export function nivelBajoCursor(x: number, y: number, attr: string): number | null {
  const elementos = document.elementsFromPoint(x, y)
  for (const el of elementos) {
    const valor = (el as HTMLElement).dataset?.[attr]
    if (valor != null) {
      const n = Number(valor)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}
