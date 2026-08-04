import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  MkvOutputFormat,
  CanvasSource,
  AudioBufferSource,
  canEncodeVideo,
  type VideoCodec,
} from 'mediabunny'

// contenedores de salida que ofrecemos además del mp4 de siempre. el mp4 por defecto sigue saliendo
// por el otro escritor (mp4-muxer), intacto; este maneja los formatos nuevos con mediabunny
export type Contenedor = 'mp4' | 'webm' | 'mkv'
// códec de video elegible. vp9 solo tiene sentido en webm; h264/h265 en mp4 y mkv
export type CodecVideo = 'h264' | 'h265' | 'vp9'

// traduce nuestro nombre corto de códec al que usa mediabunny
const CODEC_MB: Record<CodecVideo, VideoCodec> = { h264: 'avc', h265: 'hevc', vp9: 'vp9' }

// tipo mime y extensión reales de cada contenedor, para el blob final y el nombre del archivo
const MIME: Record<Contenedor, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
}

// ¿puede este equipo codificar h265? no todos traen el codificador por hardware (chrome no ofrece
// software de respaldo para hevc), así que se consulta antes de ofrecerlo en la interfaz
export async function soportaH265(ancho: number, alto: number): Promise<boolean> {
  try {
    return await canEncodeVideo('hevc', { width: ancho, height: alto })
  } catch {
    return false
  }
}

// datos mínimos del audio ya mezclado, igual que en el otro escritor
export interface InfoAudioMedios {
  sampleRate: number
  canales: number
}

// escritor de video sobre mediabunny, con la MISMA interfaz que EscritorVideo (agregar/escribirAudio/
// finalizar), para que exportarRapido lo use sin cambiar su bucle. compone a partir del lienzo que ya
// dibuja el compositor y saca mp4, webm o mkv con el códec pedido
export class EscritorMedios {
  private output: Output
  private target: BufferTarget
  private videoSource: CanvasSource
  private audioSource: AudioBufferSource | null = null
  private fps: number
  private contenedor: Contenedor

  private constructor(
    canvas: HTMLCanvasElement,
    fps: number,
    bitrate: number,
    contenedor: Contenedor,
    codec: CodecVideo,
    audio: InfoAudioMedios | null,
  ) {
    this.fps = fps
    this.contenedor = contenedor
    const format =
      contenedor === 'webm' ? new WebMOutputFormat() : contenedor === 'mkv' ? new MkvOutputFormat() : new Mp4OutputFormat()
    this.target = new BufferTarget()
    this.output = new Output({ format, target: this.target })
    // el video se codifica capturando el lienzo cuadro a cuadro; keyframe cada dos segundos, lo habitual
    // para poder saltar por el archivo sin descargarlo entero
    this.videoSource = new CanvasSource(canvas, { codec: CODEC_MB[codec], bitrate, keyFrameInterval: 2 })
    this.output.addVideoTrack(this.videoSource, { frameRate: fps })
    if (audio) {
      // el audio del contenedor: aac en mp4 y mkv, opus en webm, que es su códec estándar
      const codecAudio = contenedor === 'webm' ? 'opus' : 'aac'
      this.audioSource = new AudioBufferSource({ codec: codecAudio, bitrate: 160_000 })
      this.output.addAudioTrack(this.audioSource)
    }
  }

  static async crear(
    canvas: HTMLCanvasElement,
    _ancho: number,
    _alto: number,
    fps: number,
    bitrate: number,
    contenedor: Contenedor,
    codec: CodecVideo,
    audio: InfoAudioMedios | null = null,
  ): Promise<EscritorMedios> {
    const esc = new EscritorMedios(canvas, fps, bitrate, contenedor, codec, audio)
    // las pistas se declaran antes de arrancar; una vez arrancado ya se pueden ir sumando cuadros
    await esc.output.start()
    return esc
  }

  // agrega el cuadro actual del lienzo. la firma recibe la fuente y el tiempo en microsegundos igual que
  // el otro escritor, pero mediabunny lee el lienzo al que ya está atado, así que solo importa el tiempo
  async agregar(_fuente: CanvasImageSource, tMicros: number): Promise<void> {
    await this.videoSource.add(tMicros / 1_000_000, 1 / this.fps)
  }

  // mete la mezcla de audio completa (un AudioBuffer); mediabunny la trocea y codifica por dentro
  async escribirAudio(buffer: AudioBuffer): Promise<void> {
    if (!this.audioSource) return
    await this.audioSource.add(buffer)
  }

  // cierra codificadores, empaqueta y devuelve el archivo con su tipo real
  async finalizar(): Promise<Blob> {
    await this.output.finalize()
    const buf = this.target.buffer
    if (!buf) throw new Error('No se pudo empaquetar el archivo.')
    return new Blob([buf], { type: MIME[this.contenedor] })
  }
}
