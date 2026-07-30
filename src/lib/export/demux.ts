import { createFile, DataStream, MP4BoxBuffer, Endianness } from 'mp4box'

// datos que necesita el decodificador de WebCodecs para arrancar, más los cuadros
// codificados del video ya listos para meterse en él, en orden
export interface VideoDemux {
  config: VideoDecoderConfig
  chunks: EncodedVideoChunk[]
  // metadatos útiles para medir y para el resto del pipeline
  info: { ancho: number; alto: number; duracion: number; fps: number; nSamples: number }
}

// mp4box entrega los boxes ya parseados; para arrancar el VideoDecoder hace falta la
// "description" (el avcC/hvcC/... con los parámetros del códec). se localiza dentro del
// stsd del track y se serializa quitándole la cabecera de 8 bytes del box
function descripcionCodec(entry: unknown): Uint8Array | undefined {
  const e = entry as Record<string, { write: (s: DataStream) => void } | undefined>
  const box = e.avcC || e.hvcC || e.vpcC || e.av1C
  if (!box) return undefined
  const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN)
  box.write(stream)
  // los primeros 8 bytes son tamaño + tipo del box; el decodificador quiere solo el resto
  return new Uint8Array(stream.buffer, 8)
}

// desarma un mp4 (sin pasar por un elemento <video>) y devuelve la config del track de
// video y todos sus cuadros codificados. es el primer paso de la exportación rápida:
// tener los cuadros crudos para decodificarlos con WebCodecs mucho más rápido que a 1x
export function demuxVideo(archivo: Blob): Promise<VideoDemux> {
  return new Promise((resolve, reject) => {
    const file = createFile()
    const chunks: EncodedVideoChunk[] = []
    let resuelto = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file.onError = (e: any) => {
      if (!resuelto) reject(new Error('No se pudo desarmar el video: ' + e))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    file.onReady = (info: any) => {
      const track = info.videoTracks?.[0]
      if (!track) {
        reject(new Error('El video no tiene una pista de imagen legible.'))
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trak = (file as any).getTrackById(track.id)
      const entry = trak?.mdia?.minf?.stbl?.stsd?.entries?.[0]
      const description = entry ? descripcionCodec(entry) : undefined

      const config: VideoDecoderConfig = {
        codec: track.codec,
        codedWidth: track.video?.width ?? track.track_width,
        codedHeight: track.video?.height ?? track.track_height,
        ...(description ? { description } : {}),
      }

      const duracion = info.duration / info.timescale
      const fps = track.nb_samples / (track.samples_duration / track.timescale)
      const infoDemux = {
        ancho: config.codedWidth ?? 0,
        alto: config.codedHeight ?? 0,
        duracion,
        fps: isFinite(fps) ? fps : 30,
        nSamples: track.nb_samples,
      }

      // se piden todas las muestras del track de una vez; llegan por onSamples
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(file as any).setExtractionOptions(track.id, null, { nbSamples: track.nb_samples })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      file.onSamples = (_id: number, _user: unknown, samples: any[]) => {
        for (const s of samples) {
          chunks.push(
            new EncodedVideoChunk({
              type: s.is_sync ? 'key' : 'delta',
              timestamp: (s.cts * 1_000_000) / s.timescale,
              duration: (s.duration * 1_000_000) / s.timescale,
              data: s.data,
            }),
          )
        }
        // cuando ya están todas, se cierra
        if (chunks.length >= infoDemux.nSamples && !resuelto) {
          resuelto = true
          resolve({ config, chunks, info: infoDemux })
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(file as any).start()
    }

    // se vuelca el archivo entero al parser. mp4box en 2.x quiere un MP4BoxBuffer con su
    // posición de inicio; con un solo bloque basta poner 0
    archivo
      .arrayBuffer()
      .then((ab) => {
        const buf = MP4BoxBuffer.fromArrayBuffer(ab, 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(file as any).appendBuffer(buf)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(file as any).flush()
      })
      .catch((e) => reject(e))
  })
}
