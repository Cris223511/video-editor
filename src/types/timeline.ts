// ajuste de tono por clip, al estilo Lumetri. cada valor va de -100 a 100 y 0
// es neutro
export interface AjusteTono {
  exposicion: number
  contraste: number
  saturacion: number
  temperatura: number
  tinte: number
  // corrección por zonas tonales. queda sin definir mientras no se toquen las
  // ruedas, para no arrastrar datos de más en clips sin corregir
  ruedas?: import('../lib/color/ruedas').Ruedas
  // curvas por canal y maestra, también sin definir mientras sigan siendo la
  // diagonal que no cambia nada
  curvas?: import('../lib/color/curvas').Curvas
}

// efecto de desenfoque de movimiento. la intensidad va de 0 a 100 y el ángulo
// en grados marca la dirección del barrido: 0 es horizontal, 90 vertical, y los
// valores intermedios reparten el desenfoque entre ambos ejes
export interface EfectoDesenfoque {
  tipo: 'desenfoque-movimiento'
  intensidad: number
  angulo: number
}

// un efecto aplicado a un clip. lleva su propio id para poder encadenar varios y
// editarlos o quitarlos por separado. de momento solo existe el desenfoque de
// movimiento, pero el campo tipo deja la puerta abierta a sumar más sin rehacer
// el modelo: basta con añadir otra variante a esta unión
export type EfectoClip = { id: string } & EfectoDesenfoque

// encuadre del clip dentro del lienzo. x e y son el centro del video en
// coordenadas del lienzo, de 0 a 1, con 0.5 en el medio; escala multiplica el
// tamaño con el que el video cabe "contenido". neutro (centrado y escala 1) es
// el encaje de toda la vida, así que un clip sin encuadre se ve igual que antes.
// el centro puede salirse del rango 0..1 a propósito: sacar parte del video
// fuera del lienzo es válido, y lo que sobresale no se exporta
export interface Encuadre {
  x: number
  y: number
  escala: number
}

// el identificador sale del catálogo de transiciones. es una cadena libre para
// que ampliar el catálogo no obligue a tocar el modelo ni rompa lo ya guardado
export type TipoTransicion = string

// transición con la que entra un clip. fundido va a través de negro y
// desvanecer mezcla con el clip anterior
export interface Transicion {
  tipo: TipoTransicion
  duracion: number
}

// modelo de la línea de tiempo. un clip apunta a un medio importado y define
// qué trozo de ese medio se usa y en qué posición de la pista aparece
export interface Clip {
  id: string
  assetId: string
  inicio: number // posición en la línea de tiempo, en segundos
  pista: number // en qué nivel se apila; 0 es el de abajo y el mayor manda al superponerse
  duracion: number // cuánto dura el clip en la pista
  recorteInicio: number // punto de entrada dentro del video fuente
  duracionFuente: number // duración total del video original, tope para recortar
  velocidad: number // 1 es normal; mayor acelera y ocupa menos en la pista
  tono: AjusteTono // corrección de color del clip
  efectos: EfectoClip[] // cadena de efectos, vacía mientras no se aplique ninguno
  transicion: Transicion // cómo entra el clip respecto al anterior
  encuadre?: Encuadre // posición y tamaño del video en el lienzo; ausente = centrado a escala 1
}

export interface Track {
  id: string
  tipo: 'video'
  clips: Clip[]
}

// metadatos de cada nivel de video. viven en un array paralelo a altosPista e
// indexado igual que el campo pista de los clips: la posición i describe el
// nivel i. guardan el rótulo del nivel y sus tres interruptores, más el orden
// que el usuario le haya dado al subirlo o bajarlo
export interface PistaMeta {
  // identificador estable del nivel, independiente de su posición. viaja con la
  // pista cuando se reordena, y es lo que deja animar el deslizamiento de las
  // filas al permutarlas en lugar de que salten de golpe
  id: string
  nombre: string
  silenciada: boolean
  oculta: boolean
  bloqueada: boolean
}
