// catálogo de transiciones. cada una se describe con datos y no con código
// suelto repartido por el visor y el compositor, que es lo que garantiza que lo
// que se ve al editar sea idéntico a lo que sale exportado

export type Grupo =
  | 'sin-transicion'
  | 'atenuaciones'
  | 'barridos'
  | 'formas'
  | 'movimiento'

// cómo se dibuja la transición. la distinción importa porque cada familia
// necesita una técnica distinta en el lienzo
export type Tecnica =
  | 'corte' // el plano nuevo aparece de golpe
  | 'opacidad' // se mezclan los dos planos
  | 'negro' // se pasa por negro entre uno y otro
  | 'blanco' // igual pero por blanco
  | 'mascara' // el plano nuevo se revela recortado por una forma
  | 'desplazamiento' // el plano nuevo empuja o se desliza sobre el anterior
  | 'escala' // el plano nuevo crece o el anterior se aleja

// forma del recorte para las transiciones de máscara. el progreso va de 0 a 1
export type Forma =
  | 'barrido-izq'
  | 'barrido-der'
  | 'barrido-arr'
  | 'barrido-aba'
  | 'diagonal'
  | 'persianas'
  | 'puertas-h'
  | 'puertas-v'
  | 'circulo'
  | 'rombo'
  | 'tercios'

export type Direccion = 'izq' | 'der' | 'arr' | 'aba'

export interface Transicion {
  id: string
  nombre: string
  grupo: Grupo
  tecnica: Tecnica
  forma?: Forma
  direccion?: Direccion
  // suaviza el borde del recorte, en fracción del lado menor del lienzo. un
  // barrido con borde duro se ve barato; con un poco de difuminado parece hecho
  // a propósito
  suavizado?: number
  descripcion: string
}

export const CATALOGO: Transicion[] = [
  {
    id: 'ninguna',
    nombre: 'Corte',
    grupo: 'sin-transicion',
    tecnica: 'corte',
    descripcion: 'Un plano entra justo donde acaba el anterior, sin mezcla.',
  },

  {
    id: 'desvanecer',
    nombre: 'Fundir con el anterior',
    grupo: 'atenuaciones',
    tecnica: 'opacidad',
    descripcion: 'Los dos planos se solapan y uno releva al otro.',
  },
  {
    id: 'fundido',
    nombre: 'Fundido a negro',
    grupo: 'atenuaciones',
    tecnica: 'negro',
    descripcion: 'Se pasa por negro. Separa escenas con claridad.',
  },
  {
    id: 'fundido-blanco',
    nombre: 'Fundido a blanco',
    grupo: 'atenuaciones',
    tecnica: 'blanco',
    descripcion: 'Se pasa por blanco. Da un aire más luminoso que el negro.',
  },

  {
    id: 'barrido-der',
    nombre: 'Barrido a la derecha',
    grupo: 'barridos',
    tecnica: 'mascara',
    forma: 'barrido-der',
    suavizado: 0.03,
    descripcion: 'El plano nuevo entra desde el borde izquierdo.',
  },
  {
    id: 'barrido-izq',
    nombre: 'Barrido a la izquierda',
    grupo: 'barridos',
    tecnica: 'mascara',
    forma: 'barrido-izq',
    suavizado: 0.03,
    descripcion: 'El plano nuevo entra desde el borde derecho.',
  },
  {
    id: 'barrido-aba',
    nombre: 'Barrido hacia abajo',
    grupo: 'barridos',
    tecnica: 'mascara',
    forma: 'barrido-aba',
    suavizado: 0.03,
    descripcion: 'El plano nuevo baja desde el borde superior.',
  },
  {
    id: 'barrido-arr',
    nombre: 'Barrido hacia arriba',
    grupo: 'barridos',
    tecnica: 'mascara',
    forma: 'barrido-arr',
    suavizado: 0.03,
    descripcion: 'El plano nuevo sube desde el borde inferior.',
  },
  {
    id: 'diagonal',
    nombre: 'Barrido diagonal',
    grupo: 'barridos',
    tecnica: 'mascara',
    forma: 'diagonal',
    suavizado: 0.05,
    descripcion: 'El corte avanza en diagonal desde una esquina.',
  },

  {
    id: 'persianas',
    nombre: 'Persianas',
    grupo: 'formas',
    tecnica: 'mascara',
    forma: 'persianas',
    descripcion: 'El plano nuevo aparece por franjas verticales a la vez.',
  },
  {
    id: 'puertas-h',
    nombre: 'Puertas horizontales',
    grupo: 'formas',
    tecnica: 'mascara',
    forma: 'puertas-h',
    suavizado: 0.02,
    descripcion: 'El plano anterior se abre por el centro hacia los lados.',
  },
  {
    id: 'puertas-v',
    nombre: 'Puertas verticales',
    grupo: 'formas',
    tecnica: 'mascara',
    forma: 'puertas-v',
    suavizado: 0.02,
    descripcion: 'El plano anterior se abre por el centro hacia arriba y abajo.',
  },
  {
    id: 'circulo',
    nombre: 'Barrido circular',
    grupo: 'formas',
    tecnica: 'mascara',
    forma: 'circulo',
    suavizado: 0.04,
    descripcion: 'El plano nuevo crece desde el centro en círculo.',
  },
  {
    id: 'rombo',
    nombre: 'Rombo',
    grupo: 'formas',
    tecnica: 'mascara',
    forma: 'rombo',
    suavizado: 0.03,
    descripcion: 'Igual que el circular, pero con forma de rombo.',
  },
  {
    id: 'tercios',
    nombre: 'Tercios',
    grupo: 'formas',
    tecnica: 'mascara',
    forma: 'tercios',
    descripcion: 'La imagen se divide en tres franjas que entran escalonadas.',
  },

  {
    id: 'empujar-der',
    nombre: 'Empujar a la derecha',
    grupo: 'movimiento',
    tecnica: 'desplazamiento',
    direccion: 'der',
    descripcion: 'El plano nuevo empuja al anterior fuera de cuadro.',
  },
  {
    id: 'empujar-izq',
    nombre: 'Empujar a la izquierda',
    grupo: 'movimiento',
    tecnica: 'desplazamiento',
    direccion: 'izq',
    descripcion: 'Igual que el anterior pero hacia el otro lado.',
  },
  {
    id: 'empujar-arr',
    nombre: 'Empujar hacia arriba',
    grupo: 'movimiento',
    tecnica: 'desplazamiento',
    direccion: 'arr',
    descripcion: 'El plano nuevo sube empujando al anterior.',
  },
  {
    id: 'empujar-aba',
    nombre: 'Empujar hacia abajo',
    grupo: 'movimiento',
    tecnica: 'desplazamiento',
    direccion: 'aba',
    descripcion: 'El plano nuevo baja empujando al anterior.',
  },
  {
    id: 'acercar',
    nombre: 'Acercar',
    grupo: 'movimiento',
    tecnica: 'escala',
    direccion: 'der',
    descripcion: 'El plano nuevo entra creciendo desde el centro.',
  },
  {
    id: 'alejar',
    nombre: 'Alejar',
    grupo: 'movimiento',
    tecnica: 'escala',
    direccion: 'izq',
    descripcion: 'El plano anterior se aleja y deja ver el siguiente.',
  },
]

export const NOMBRES_GRUPO: Record<Grupo, string> = {
  'sin-transicion': 'Sin transición',
  atenuaciones: 'Atenuaciones',
  barridos: 'Barridos',
  formas: 'Formas y aperturas',
  movimiento: 'Zooms y empujes',
}

export const POR_ID = new Map(CATALOGO.map((t) => [t.id, t]))

// las transiciones que ya existían conservan su identificador, así que un
// proyecto guardado antes de esta ampliación se sigue abriendo igual
export function buscarTransicion(id: string): Transicion {
  return POR_ID.get(id) ?? CATALOGO[0]
}

// filtra por texto para el buscador de la galería, sin distinguir mayúsculas ni
// acentos, que es como la gente escribe de verdad
export function filtrar(texto: string): Transicion[] {
  const limpio = texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  if (!limpio) return CATALOGO
  const coincide = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .includes(limpio)
  return CATALOGO.filter(
    (t) => coincide(t.nombre) || coincide(t.descripcion) || coincide(NOMBRES_GRUPO[t.grupo]),
  )
}
