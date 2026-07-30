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
  // contorno de neón: detecta los bordes del plano y los enciende como líneas
  // eléctricas del color de la bolita, con un parpadeo que le da vida
  | 'contorno'
  // líneas 3D: curvas de nivel de brillo (topográficas) que envuelven la forma del
  // objeto de delante, como una malla que sigue su volumen. densidad ajustable
  | 'lineas3d'
  // rayos que emanan del objeto: un resplandor con destellos que sale de sus partes
  // brillantes y lo envuelve, apareciendo y creciendo
  | 'rayosObjeto'

// dirección de los impactos que fluyen o arrancan desde un lado
export type DireccionImpacto = 'izq' | 'der' | 'arr' | 'aba'

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
  // dirección del flujo/arranque, para líneas 3D y destello ascendente. sin definir
  // cae a un valor por defecto sensato ('aba' sube desde abajo, etc.)
  direccion?: DireccionImpacto
  // densidad de líneas (0 a 100) para el impacto de líneas 3D: más sube el detalle
  densidad?: number
  // qué tan suave aparece y se va (0 a 100). bajo = entra y sale rápido y seco; alto =
  // aparece y se retira despacio. es independiente de la duración total (que se estira
  // en la línea de tiempo). siempre entra y sale con suavidad, solo cambia el ritmo
  suavidad?: number
}
