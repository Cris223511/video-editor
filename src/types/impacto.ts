// un impacto es un efecto momentáneo que ocurre dentro de un clip: un rebote con
// zoom, una sacudida, un flash a negro o a blanco, etc. se coloca como una bolita
// encima del clip en la línea de tiempo y afecta a todo lo que se ve en ese
// instante (el clip y las imágenes o textos que tenga delante). es como una
// transición, pero sucede dentro del propio plano

export type TipoImpacto =
  | 'rebote'
  | 'zoom'
  | 'sacudida'
  | 'latido'
  | 'flashNegro'
  | 'flashBlanco'
  | 'destello'
  | 'parpadeo'
  | 'flashColor'

export interface Impacto {
  id: string
  // segundo absoluto donde arranca el efecto. la bolita se dibuja aquí encima del
  // clip que haya debajo
  t: number
  // cuánto dura el efecto, en segundos. la rayita bajo la bolita lo representa
  duracion: number
  tipo: TipoImpacto
  // qué tan brusco es, de 0 a 100. escala la amplitud del movimiento o del flash
  intensidad: number
  // color de la bolita en la línea de tiempo, a gusto del usuario. para el tipo
  // flashColor además tiñe el destello
  color: string
}
