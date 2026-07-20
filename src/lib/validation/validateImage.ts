const MAX_BYTES = 5 * 1024 * 1024
const EXTENSIONES = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif']

export interface ResultadoValidacion {
  ok: boolean
  motivo?: string
}

// valida una imagen antes de usarla como capa: tipo, extensión, tamaño y firma
// binaria. la firma evita que un archivo con la extensión cambiada se cuele
export async function validarImagen(file: File): Promise<ResultadoValidacion> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, motivo: 'El archivo no es una imagen.' }
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EXTENSIONES.includes(ext)) {
    return { ok: false, motivo: 'Ese formato de imagen no está soportado.' }
  }
  if (file.size === 0) {
    return { ok: false, motivo: 'El archivo está vacío.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, motivo: 'La imagen no debe superar los 5 MB.' }
  }

  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const coincide = (offset: number, firma: number[]) => firma.every((x, i) => b[offset + i] === x)

  const valida =
    coincide(0, [0x89, 0x50, 0x4e, 0x47]) || // png
    coincide(0, [0xff, 0xd8, 0xff]) || // jpg
    coincide(0, [0x47, 0x49, 0x46, 0x38]) || // gif
    coincide(0, [0x42, 0x4d]) || // bmp
    (coincide(0, [0x52, 0x49, 0x46, 0x46]) && coincide(8, [0x57, 0x45, 0x42, 0x50])) || // webp
    coincide(4, [0x66, 0x74, 0x79, 0x70]) // avif

  if (!valida) {
    return { ok: false, motivo: 'El contenido no parece una imagen válida.' }
  }
  return { ok: true }
}
