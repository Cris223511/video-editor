import { EfectoClip } from '../../types/timeline'
import { NodoFiltro } from './nitidezBrillo'

// aberración cromática (el aire "3D" de los canales de color corridos). separa los canales
// rojo y azul en direcciones opuestas, dejando el verde en su sitio, así los bordes quedan con
// una orla roja por un lado y cian por el otro, como una lente barata o un glitch. es distinto
// del VHS: el VHS son líneas de escaneo y un sangrado leve de color; esto es el corrimiento
// marcado de los canales. la intensidad de 0 a 100 manda cuánto se separan (en 0 no se monta)
export interface ParamsCromatico {
  intensidad: number
}

export function paramsCromatico(efectos: EfectoClip[] = []): ParamsCromatico | null {
  for (const e of efectos) {
    if (e.tipo === 'cromatico' && e.intensidad > 0) return { intensidad: e.intensidad }
  }
  return null
}

// matrices que dejan pasar un solo canal (y el alfa a pleno), para poder correrlos por separado
const SOLO_R = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
const SOLO_G = '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
const SOLO_B = '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'

// nodos del filtro. el corrimiento va en fracción del elemento (el filtro que lo envuelve usa
// primitiveUnits="objectBoundingBox"), de modo que la misma intensidad se ve igual en el visor
// pequeño y en el archivo a resolución completa. el rojo se corre a un lado, el azul al otro, y
// los tres canales se recombinan en modo pantalla (al ocupar canales distintos, sumarlos así
// reconstruye el color donde coinciden y deja la orla donde no)
export function nodosFiltroCromatico(p: ParamsCromatico): NodoFiltro[] {
  const mag = (p.intensidad / 100) * 0.02 // hasta un 2% del ancho, suficiente para que se note
  const d = mag.toFixed(5)
  const nd = (-mag).toFixed(5)
  return [
    { tag: 'feColorMatrix', attrs: { in: 'SourceGraphic', type: 'matrix', values: SOLO_R, result: 'crR' } },
    { tag: 'feOffset', attrs: { in: 'crR', dx: nd, dy: '0', result: 'crRo' } },
    { tag: 'feColorMatrix', attrs: { in: 'SourceGraphic', type: 'matrix', values: SOLO_B, result: 'crB' } },
    { tag: 'feOffset', attrs: { in: 'crB', dx: d, dy: '0', result: 'crBo' } },
    { tag: 'feColorMatrix', attrs: { in: 'SourceGraphic', type: 'matrix', values: SOLO_G, result: 'crG' } },
    { tag: 'feBlend', attrs: { in: 'crRo', in2: 'crG', mode: 'screen', result: 'crRG' } },
    { tag: 'feBlend', attrs: { in: 'crRG', in2: 'crBo', mode: 'screen' } },
  ]
}
