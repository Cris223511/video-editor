import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { FormatoExotico, MIME_EXOTICO } from './formatos'
// el core de ffmpeg (js + wasm) se referencia como url de asset: Vite lo emite como archivo aparte y solo
// se descarga cuando de verdad se usa (este módulo entra por import dinámico). la versión de un solo hilo
// no necesita cabeceras COOP/COEP, así que funciona en cualquier host estático
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

// argumentos de ffmpeg por formato. donde el códec (H.264/AAC) ya cabe en el envase se hace remux con
// "-c copy": no recodifica, así que sale sin pérdida y rápido. wmv es la excepción, su envase (ASF) no
// admite H.264, de modo que hay que recomprimir a los códecs propios de windows media
function argumentos(formato: FormatoExotico, ent: string, sal: string): string[] {
  if (formato === 'wmv') {
    return ['-i', ent, '-c:v', 'wmv2', '-b:v', '5M', '-c:a', 'wmav2', '-b:a', '192k', sal]
  }
  // el faststart deja el índice al inicio del archivo, para que se pueda reproducir mientras se descarga
  const extra = formato === 'mov' ? ['-movflags', '+faststart'] : []
  return ['-i', ent, '-c', 'copy', ...extra, sal]
}

// una sola instancia de ffmpeg, cargada la primera vez que se usa y reutilizada después
let instancia: FFmpeg | null = null
async function cargar(): Promise<FFmpeg> {
  if (instancia) return instancia
  const ff = new FFmpeg()
  // toBlobURL descarga el core y lo sirve como blob del mismo origen, que es lo que el worker de ffmpeg
  // necesita para cargarlo sin problemas de origen cruzado
  await ff.load({
    coreURL: await toBlobURL(coreURL, 'text/javascript'),
    wasmURL: await toBlobURL(wasmURL, 'application/wasm'),
  })
  instancia = ff
  return ff
}

// convierte el mp4 ya exportado al formato exótico pedido y devuelve el archivo terminado
export async function transcodificar(entrada: Blob, formato: FormatoExotico): Promise<Blob> {
  const ff = await cargar()
  const ent = 'entrada.mp4'
  const sal = `salida.${formato}`
  await ff.writeFile(ent, await fetchFile(entrada))
  await ff.exec(argumentos(formato, ent, sal))
  const datos = await ff.readFile(sal)
  // se liberan los archivos del sistema virtual para no acumular memoria entre exportaciones
  await ff.deleteFile(ent).catch(() => {})
  await ff.deleteFile(sal).catch(() => {})
  const bytes = datos instanceof Uint8Array ? datos : new TextEncoder().encode(String(datos))
  // se copia a un buffer propio (no compartido) para que sirva como cuerpo del blob sin quejas de tipos
  const copia = new Uint8Array(bytes.length)
  copia.set(bytes)
  return new Blob([copia], { type: MIME_EXOTICO[formato] })
}
