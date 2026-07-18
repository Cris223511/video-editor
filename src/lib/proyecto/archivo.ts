import { ProyectoGuardado } from './formato'

// un proyecto no cabe en un json: los videos son binarios y meterlos como texto
// los inflaría cerca de un tercio. el archivo se arma a mano con una cabecera
// que describe el contenido y los archivos pegados detrás, tal cual
//
//   [8 bytes: firma] [4 bytes: tamaño de la ficha] [ficha json] [archivo 1] [archivo 2] ...
//
// la ficha dice cuánto ocupa cada archivo, así que al abrirlo se recortan por
// su posición sin tener que buscar separadores
const FIRMA = 'VEPROJ01'
export const EXTENSION = '.veproj'

// se devuelve el búfer y no la vista, porque Blob solo acepta búferes propios y
// TypeScript no da por hecho que el de un Uint8Array lo sea
function texto(s: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(s)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function empaquetar(p: ProyectoGuardado): Promise<Blob> {
  const archivos = p.medios.map((m) => m.archivo)
  const ficha = {
    ...p,
    // los archivos viajan aparte; en la ficha solo queda su tamaño para poder
    // recortarlos después
    medios: p.medios.map((m) => ({ ...m, archivo: undefined, bytes: m.archivo.size })),
  }
  const fichaBytes = texto(JSON.stringify(ficha))
  const cabecera = new ArrayBuffer(4)
  new DataView(cabecera).setUint32(0, fichaBytes.byteLength, false)

  return new Blob([texto(FIRMA), cabecera, fichaBytes, ...archivos], {
    type: 'application/octet-stream',
  })
}

export async function desempaquetar(archivo: Blob): Promise<ProyectoGuardado> {
  const firma = new TextDecoder().decode(await archivo.slice(0, 8).arrayBuffer())
  if (firma !== FIRMA) {
    throw new Error('Ese archivo no es un proyecto de esta aplicación.')
  }

  const largo = new DataView(await archivo.slice(8, 12).arrayBuffer()).getUint32(0, false)
  const inicioFicha = 12
  const inicioArchivos = inicioFicha + largo
  const ficha = JSON.parse(
    new TextDecoder().decode(await archivo.slice(inicioFicha, inicioArchivos).arrayBuffer()),
  )

  // cada archivo se recorta en el orden en que se guardó, avanzando por sus
  // tamaños declarados
  let cursor = inicioArchivos
  const medios = (ficha.medios ?? []).map((m: { bytes: number; tipo: string }) => {
    const trozo = archivo.slice(cursor, cursor + m.bytes, m.tipo || 'application/octet-stream')
    cursor += m.bytes
    return { ...m, bytes: undefined, archivo: trozo }
  })

  if (cursor > archivo.size) {
    throw new Error('El archivo del proyecto está incompleto o dañado.')
  }

  // el proyecto importado recibe identidad nueva, para que traerlo dos veces o
  // compartirlo entre equipos no pise otro que ya estuviera guardado
  const ahora = Date.now()
  return {
    ...ficha,
    id: crypto.randomUUID(),
    modificado: ahora,
    medios,
  } as ProyectoGuardado
}

// nombre de archivo aceptable en cualquier sistema, a partir del título
export function nombreArchivo(titulo: string): string {
  const limpio = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return `${limpio || 'proyecto'}${EXTENSION}`
}
