import {
  MAX_VIDEO_BYTES,
  VIDEO_EXTENSIONS,
  VIDEO_MAGIC,
  AUDIO_EXTENSIONS,
  IMAGEN_EXTENSIONS,
} from '../../config/constants'
import { ClaseMedio } from '../../types/media'

export interface ResultadoValidacion {
  ok: boolean
  clase?: ClaseMedio
  motivo?: string
}

function extension(nombre: string): string {
  return nombre.split('.').pop()?.toLowerCase() ?? ''
}

function enLista(nombre: string, lista: readonly string[]): boolean {
  return lista.includes(extension(nombre))
}

// deduce a qué familia pertenece un archivo mirando primero el tipo que declara
// el navegador y, si no ayuda, la extensión. devuelve null cuando no encaja en
// ninguna de las tres, para poder avisar con claridad
export function clasificarArchivo(file: File): ClaseMedio | null {
  const tipo = file.type
  if (tipo.startsWith('video/')) return 'video'
  if (tipo.startsWith('audio/')) return 'audio'
  if (tipo.startsWith('image/')) return 'imagen'
  if (enLista(file.name, VIDEO_EXTENSIONS)) return 'video'
  if (enLista(file.name, AUDIO_EXTENSIONS)) return 'audio'
  if (enLista(file.name, IMAGEN_EXTENSIONS)) return 'imagen'
  return null
}

// lee los primeros bytes y confirma que el contenido corresponde de verdad a un
// contenedor de video conocido; así un archivo con la extensión cambiada a mano
// no logra colarse. solo se aplica al video, que es lo que luego se decodifica
// fotograma a fotograma
async function firmaVideoValida(file: File): Promise<boolean> {
  const buffer = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const empiezaCon = (offset: number, firma: number[]) =>
    firma.every((b, i) => buffer[offset + i] === b)

  return (
    empiezaCon(4, VIDEO_MAGIC.ftyp) ||
    empiezaCon(0, VIDEO_MAGIC.ebml) ||
    empiezaCon(0, VIDEO_MAGIC.riff) ||
    empiezaCon(0, VIDEO_MAGIC.oggs)
  )
}

// validación de un archivo que se quiere importar. reconoce las tres familias
// (video, audio, imagen) y comprueba tamaño; el video además pasa por la firma
// binaria. devuelve la clase para que el importador sepa cómo analizarlo
export async function validarMedio(file: File): Promise<ResultadoValidacion> {
  const clase = clasificarArchivo(file)
  if (!clase) {
    return { ok: false, motivo: 'No es un video, audio ni imagen que se reconozca.' }
  }
  if (file.size === 0) {
    return { ok: false, motivo: 'El archivo está vacío.' }
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, motivo: 'Cada archivo puede pesar como máximo 1.5 GB.' }
  }
  // el audio y la imagen se fían del tipo o de la extensión: no se decodifican a
  // mano, así que no hace falta la barrera binaria. el video sí, porque de él se
  // leen fotogramas y un archivo disfrazado daría problemas
  if (clase === 'video' && !(await firmaVideoValida(file))) {
    return { ok: false, motivo: 'El contenido no parece un video real.' }
  }
  return { ok: true, clase }
}

// se conserva el nombre anterior por si algún sitio aún valida solo video, pero
// ahora se apoya en el validador general
export async function validarVideo(file: File): Promise<ResultadoValidacion> {
  const r = await validarMedio(file)
  if (r.ok && r.clase !== 'video') {
    return { ok: false, motivo: 'El archivo no es un video compatible.' }
  }
  return r
}

// atributo accept para los input de archivo: las tres familias a la vez
export const ACEPTA_MEDIOS = 'video/*,audio/*,image/*'
