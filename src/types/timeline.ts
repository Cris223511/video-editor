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
  transicion: Transicion // cómo entra el clip respecto al anterior
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
  nombre: string
  silenciada: boolean
  oculta: boolean
  bloqueada: boolean
}
