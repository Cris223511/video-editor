// marco decorativo del lienzo, a nivel de proyecto. se dibuja encima de toda la
// composición
export type TipoMarco =
  | 'ninguno'
  | 'solido'
  | 'doble'
  | 'discontinuo'
  | 'punteado'
  | 'redondeado'
  | 'sombra'
  | 'neon'
  | 'degradado'
  | 'vineta'
  | 'polaroid'

export interface Marco {
  tipo: TipoMarco
  color: string
  grosor: number // en píxeles a un lienzo de 1080 de alto; se escala al mostrar
  radio: number // radio de esquinas para el marco redondeado
}
