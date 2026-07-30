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
    const b = p.brillo / 100
    // se quedan las zonas claras, de donde nace el resplandor. el umbral baja un poco
    // conforme sube el brillo: a poco brillo solo brillan las luces más fuertes, y a
    // mucho brillo el resplandor agarra también los tonos medios y el destello envuelve
    // más al objeto, como el fogonazo que se pega a todo el plano
    const pendiente = (3 + b * 1.5).toFixed(2)
    const corte = (-(1.4 + b * 1.1)).toFixed(2)
    nodos.push({
      tag: 'feComponentTransfer',
      attrs: { in: 'nbSharp', result: 'nbLuces' },
      children: canales({ type: 'linear', slope: pendiente, intercept: corte }),
    })

    // el halo: se difumina lo aislado. cuanto más brillo, más se expande y más lejos
    // llega el resplandor
    const radio = 2 + b * 16
    nodos.push({
      tag: 'feGaussianBlur',
      attrs: { in: 'nbLuces', stdDeviation: radio.toFixed(2), result: 'nbHalo' },
    })

    // se pondera el halo según la intensidad antes de sumarlo. la curva sube más que
    // lineal para que, pasado medio camino, el destello se dispare y de verdad reviente
    // de luz, no un halo tibio
    const fuerza = (b * (0.8 + b * 0.9)).toFixed(3)
    nodos.push({
      tag: 'feComponentTransfer',
      attrs: { in: 'nbHalo', result: 'nbHaloAtenuado' },
      children: canales({ type: 'linear', slope: fuerza, intercept: '0' }),
    })

    // se combina el halo con la imagen afilada en modo pantalla, que aclara sin tapar:
    // es lo que se lee como «brilloso». a brillo alto se suma dos veces para empujar el
    // destello hasta reventar las luces, el aire de los planos con glow marcado
    const doble = b > 0.5
    nodos.push({
      tag: 'feBlend',
      attrs: doble
        ? { mode: 'screen', in: 'nbSharp', in2: 'nbHaloAtenuado', result: 'nbGlow1' }
        : { mode: 'screen', in: 'nbSharp', in2: 'nbHaloAtenuado' },
    })
    if (doble) {
      nodos.push({
        tag: 'feBlend',
        attrs: { mode: 'screen', in: 'nbGlow1', in2: 'nbHaloAtenuado' },
      })
    }
  }

  return nodos
}
