// posición de inicio de cada bloque (clip, capa, audio o región) cuyo id está en la lista, tomada
// de un vistazo del estado. sirve para arrastrar un conjunto a partir de sus posiciones ORIGINALES
// (cada uno a origen + desplazamiento) en vez de ir sumando sobre la posición actual, que se
// acumulaba fotograma a fotograma y hacía que el grupo se acelerara y no siguiera al cursor
interface ConBloques {
  pista: { clips: { id: string; inicio: number }[] }
  capas: { id: string; inicio: number }[]
  audios: { id: string; inicio: number }[]
  audioRegiones: { id: string; inicio: number }[]
}

export function origenesDe(s: ConBloques, ids: string[]): Record<string, number> {
  const set = new Set(ids)
  const origenes: Record<string, number> = {}
  const anotar = (x: { id: string; inicio: number }) => {
    if (set.has(x.id)) origenes[x.id] = x.inicio
  }
  s.pista.clips.forEach(anotar)
  s.capas.forEach(anotar)
  s.audios.forEach(anotar)
  s.audioRegiones.forEach(anotar)
  return origenes
}
