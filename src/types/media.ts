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
}
