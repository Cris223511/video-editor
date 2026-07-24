import { EfectoClip } from '../../types/timeline'

// parámetros del efecto de nitidez y brillo de un clip. la nitidez afila los
// bordes y el brillo enciende un resplandor en las zonas claras. ambos van de 0 a
// 100 y se editan por separado
export interface ParamsNB {
  nitidez: number
  brillo: number
}

// el primer efecto de nitidez y brillo del clip que aporte algo. si no hay ninguno
// activo devuelve null, y entonces ni se monta el filtro ni se pinta la pasada
export function paramsNB(efectos: EfectoClip[] = []): ParamsNB | null {
  for (const e of efectos) {
    if (e.tipo === 'nitidez-brillo' && (e.nitidez > 0 || e.brillo > 0)) {
      return { nitidez: e.nitidez, brillo: e.brillo }
    }
  }
  return null
}

// un nodo del filtro svg descrito como datos, para que el visor lo pinte como
// elemento de react y la exportación lo cree con createElementNS a partir de la
// misma receta. así los dos caminos no se desincronizan nunca. children anida las
// funciones de canal dentro de un feComponentTransfer
export interface NodoFiltro {
  tag: string
  attrs: Record<string, string>
  children?: NodoFiltro[]
}

// las tres funciones de canal (r, g, b) con los mismos parámetros, que es lo
// habitual para tratar por igual el color al aislar o atenuar
function canales(attrs: Record<string, string>): NodoFiltro[] {
  return ['feFuncR', 'feFuncG', 'feFuncB'].map((tag) => ({ tag, attrs }))
}

// arma el grafo del filtro a partir de los dos mandos. la nitidez sale de una
// convolución 3x3 (el clásico realce de bordes), y el brillo aísla las luces, las
// difumina y las vuelve a sumar en modo pantalla, que es lo que da ese halo
// luminoso sin quemar el resto de la imagen
export function nodosFiltroNB(p: ParamsNB): NodoFiltro[] {
  const nodos: NodoFiltro[] = []

  // realce por máscara de desenfoque (unsharp mask): se difumina un poco la imagen
  // y se resta esa versión suave de la original amplificada. resultado = orig*(1+a)
  // - desenfoque*a, que marca los bordes sin el corte crudo ni los artefactos que
  // da feConvolveMatrix en el navegador. a 0 devuelve la imagen intacta
  const a = (p.nitidez / 100) * 1.2
  nodos.push({
    tag: 'feGaussianBlur',
    attrs: { in: 'SourceGraphic', stdDeviation: '1.1', edgeMode: 'duplicate', result: 'nbDesenf' },
  })
  nodos.push({
    tag: 'feComposite',
    attrs: {
      in: 'SourceGraphic',
      in2: 'nbDesenf',
      operator: 'arithmetic',
      k1: '0',
      k2: (1 + a).toFixed(3),
      k3: (-a).toFixed(3),
      k4: '0',
      result: 'nbSharp',
    },
  })

  if (p.brillo > 0) {
    // se quedan solo las zonas claras: la recta empuja las sombras a cero y deja
    // pasar de la mitad alta para arriba, que es de donde nace el resplandor
    nodos.push({
      tag: 'feComponentTransfer',
      attrs: { in: 'nbSharp', result: 'nbLuces' },
      children: canales({ type: 'linear', slope: '4', intercept: '-2.4' }),
    })

    // el halo: se difumina lo aislado. cuanto más brillo, más se expande
    const radio = 2 + (p.brillo / 100) * 8
    nodos.push({
      tag: 'feGaussianBlur',
      attrs: { in: 'nbLuces', stdDeviation: radio.toFixed(2), result: 'nbHalo' },
    })

    // se atenúa el halo según la intensidad elegida antes de sumarlo, para ir de un
    // brillo sutil a uno marcado sin cambiar de fórmula
    const fuerza = (p.brillo / 100).toFixed(3)
    nodos.push({
      tag: 'feComponentTransfer',
      attrs: { in: 'nbHalo', result: 'nbHaloAtenuado' },
      children: canales({ type: 'linear', slope: fuerza, intercept: '0' }),
    })

    // se combina el halo con la imagen afilada en modo pantalla, que aclara sin
    // tapar: es lo que se lee como «brilloso»
    nodos.push({
      tag: 'feBlend',
      attrs: { mode: 'screen', in: 'nbSharp', in2: 'nbHaloAtenuado' },
    })
  }

  return nodos
}
