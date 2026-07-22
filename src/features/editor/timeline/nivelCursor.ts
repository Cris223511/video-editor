// averigua sobre qué fila de un carril está el cursor. cada fila lleva un atributo
// data-<attr> con su número; se mira qué elementos hay bajo el punto y se devuelve
// el nivel de la primera fila que aparezca. sirve para soltar una capa o un audio
// en otra fila sin arrastre nativo del navegador, solo con la posición del ratón.
// devuelve null cuando el cursor no cae sobre ninguna fila del carril
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
