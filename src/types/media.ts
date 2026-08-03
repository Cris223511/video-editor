// a qué familia pertenece un medio importado. de ahí depende cómo se analiza,
// cómo se muestra en la biblioteca y a qué pista va al arrastrarlo
export type ClaseMedio = 'video' | 'audio' | 'imagen'

// descripción de un medio ya importado al proyecto. el motor de edición se
// construye sobre estos tipos, sin depender de react, para poder separar la
// lógica de la interfaz. según la clase, algunos campos no aplican: el audio no
// tiene ancho, alto ni miniatura, y la imagen no tiene duración
export interface MediaAsset {
  id: string
  clase: ClaseMedio
  file: File
  nombre: string
  tamano: number
  tipo: string
  duracion: number // en segundos; 0 en las imágenes
  ancho: number // 0 en el audio
  alto: number // 0 en el audio
  url: string // object url para previsualizar sin recodificar
  miniatura: string // data url de portada; vacía en el audio
  // el archivo ya no se puede leer: pasa cuando se guardó una referencia al fichero
  // del disco y el usuario lo borró de su explorador. el medio sigue en el proyecto,
  // pero se muestra como "no encontrado" y no se intenta cargar para no llenar la
  // consola de errores ni dejar el visor en negro
  faltante?: boolean
  // el archivo de video no trae pista de sonido. cuando es así, un clip suyo no muestra las opciones
  // de audio (volumen, fundidos, silencio), porque no hay nada que sonar. detectarlo sin reproducir
  // el video no es fiable en el navegador, así que se marca solo cuando se puede saber con certeza
  sinAudio?: boolean
}
