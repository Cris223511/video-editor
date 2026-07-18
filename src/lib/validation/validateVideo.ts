import {
  MAX_VIDEO_BYTES,
  VIDEO_EXTENSIONS,
  VIDEO_MIME_PREFIX,
  VIDEO_MAGIC,
} from '../../config/constants'

export interface ResultadoValidacion {
  ok: boolean
  motivo?: string
}

// revisa la extensión antes de leer nada del disco
function extensionValida(nombre: string): boolean {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? ''
  return (VIDEO_EXTENSIONS as readonly string[]).includes(ext)
}

// lee los primeros bytes y confirma que el contenido corresponde de verdad a
// un contenedor de video conocido; así un archivo con la extensión cambiada a
// mano no logra colarse
async function firmaValida(file: File): Promise<boolean> {
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

// validación completa que se ejecuta antes de sumar un archivo al proyecto.
// combina tipo declarado, extensión, tamaño y firma binaria
export async function validarVideo(file: File): Promise<ResultadoValidacion> {
  const tipoDeclaradoOk = file.type.startsWith(VIDEO_MIME_PREFIX)

  if (!tipoDeclaradoOk && !extensionValida(file.name)) {
    return { ok: false, motivo: 'El archivo no es un video compatible.' }
  }
  if (!extensionValida(file.name)) {
    return { ok: false, motivo: 'Esa extensión no está soportada.' }
  }
  if (file.size === 0) {
    return { ok: false, motivo: 'El archivo está vacío.' }
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, motivo: 'Cada video puede pesar como máximo 1.5 GB.' }
  }
  if (!(await firmaValida(file))) {
    return { ok: false, motivo: 'El contenido no parece un video real.' }
  }
  return { ok: true }
}
