import { demuxVideo } from './demux'

// dice si el navegador trae WebCodecs de video, que es lo que permite decodificar y
// codificar sin pasar por elementos <video> a 1x. sin esto se usa la ruta clásica
export function haiWebCodecs(): boolean {
  return typeof VideoDecoder !== 'undefined' && typeof VideoEncoder !== 'undefined'
}

export interface MedidaDecode {
  frames: number
  ms: number
  duracion: number
  fps: number
  // cuántas veces más rápido que la reproducción a 1x: si es > 1, decodificar por
  // WebCodecs vale la pena; si ronda 1, no acelera y no compensa el pipeline nuevo
  factor: number
}

// prueba de humo del decodificador rápido: desarma el video, lo decodifica entero con
// WebCodecs contando cuadros y mide el tiempo. sirve para confirmar, antes de montar
// todo el pipeline, que de verdad decodifica más rápido que a 1x en este equipo
export async function medirDecodeRapido(archivo: Blob): Promise<MedidaDecode> {
  const { config, chunks, info } = await demuxVideo(archivo)
  const soporte = await VideoDecoder.isConfigSupported(config)
  if (!soporte.supported) throw new Error('El códec del video no lo soporta WebCodecs: ' + config.codec)

  let frames = 0
  const t0 = performance.now()
  await new Promise<void>((resolve, reject) => {
    const decoder = new VideoDecoder({
      output: (frame) => {
        frames++
        // se cierra al instante: solo interesa el conteo y el tiempo, no guardarlos
        frame.close()
      },
      error: (e) => reject(e),
    })
    decoder.configure(config)
    for (const chunk of chunks) decoder.decode(chunk)
    decoder
      .flush()
      .then(() => {
        decoder.close()
        resolve()
      })
      .catch(reject)
  })
  const ms = performance.now() - t0
  // factor = cuántas veces cabe la duración real en lo que tardó decodificar
  const factor = ms > 0 ? (info.duracion * 1000) / ms : 0
  return { frames, ms: Math.round(ms), duracion: info.duracion, fps: info.fps, factor: +factor.toFixed(1) }
}
