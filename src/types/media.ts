// descripción de un medio ya importado al proyecto. el motor de edición se
// construye sobre estos tipos, sin depender de react, para poder separar la
// lógica de la interfaz
export interface MediaAsset {
  id: string
  file: File
  nombre: string
  tamano: number
  tipo: string
  duracion: number // en segundos
  ancho: number
  alto: number
  url: string // object url para previsualizar sin recodificar
  miniatura: string // data url de un fotograma de portada
}
