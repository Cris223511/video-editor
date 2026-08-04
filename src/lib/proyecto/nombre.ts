// extensiones de medios que se recortan del final del nombre del proyecto al guardarlo o exportarlo.
// solo se quita si el nombre TERMINA en la extensión: "Counter-Strike ...22-45-50.mp4" pierde el
// ".mp4", pero "Counter-Strike ...22-45-50.mp4 ads asdasd" NO se toca, porque termina en "asdasd"
const EXTENSION_FINAL =
  /\.(mp4|mov|webm|mkv|avi|m4v|flv|wmv|mpg|mpeg|3gp|ts|mp3|wav|aac|ogg|oga|m4a|flac|opus|weba|jpg|jpeg|png|gif|webp|bmp|heic|heif|svg|tiff)$/i

// deja el nombre del proyecto sin la extensión de archivo pegada al final. el usuario puede escribir
// lo que quiera; esto solo limpia el descuido de dejar ".mp4" (u otra) al terminar
export function sinExtensionMedia(nombre: string): string {
  const limpio = nombre.replace(EXTENSION_FINAL, '').trimEnd()
  return limpio || nombre
}
