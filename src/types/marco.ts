// marco decorativo del lienzo, a nivel de proyecto. se dibuja encima de toda la composición. los
// tipos se agrupan en categorías en el panel (clásicos, luz, cine y movimiento) y cada uno ofrece
// solo los controles que le sirven
export type TipoMarco =
  | 'ninguno'
  // clásicos
  | 'solido'
  | 'doble'
  | 'discontinuo'
  | 'punteado'
  | 'redondeado'
  | 'esquinas'
  | 'polaroid'
  | 'sombra'
  | 'vineta'
  | 'degradado'
  // luz
  | 'neon'
  | 'neon-doble'
  | 'brillo'
  // cine
  | 'pelicula'
  | 'cine'
  | 'visor'
  // movimiento
  | 'latido'
  | 'giratorio'
  | 'luces'
  | 'cinta'
  | 'arcoiris'
  | 'respira'
  | 'esquinas-vivas'
  | 'rec'

export interface Marco {
  tipo: TipoMarco
  color: string
  grosor: number // en píxeles a un lienzo de 1080 de alto; se escala al mostrar
  radio: number // radio de esquinas para los marcos redondeados
  // segundo color de los marcos que combinan dos (degradado, neón doble, giratorio, luces, película)
  color2?: string
  // separación del marco respecto al borde del lienzo, en píxeles a 1080 de alto
  separacion?: number
  // rapidez de los marcos con movimiento, de 1 a 100
  velocidad?: number
  // opacidad de todo el marco, de 0 a 100
  opacidad?: number
}
