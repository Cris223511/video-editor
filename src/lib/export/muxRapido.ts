import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

// busca un perfil de H.264 que el navegador sepa codificar a esta resolución. se prueban
// de más capaz (high) a más básico (baseline) hasta dar con uno soportado
async function codecAvcSoportado(w: number, h: number, fps: number, bitrate: number): Promise<string> {
  const candidatos = ['avc1.640028', 'avc1.4d0028', 'avc1.640020', 'avc1.42E01F', 'avc1.42001f']
  for (const codec of candidatos) {
    try {
      const s = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate, framerate: fps })
      if (s.supported) return codec
    } catch {
      // ese perfil no vale; se prueba el siguiente
    }
  }
  return 'avc1.42001f'
}

// escribe un mp4 a partir de cuadros ya compuestos (un canvas por cuadro), codificando
// con WebCodecs y empaquetando con mp4-muxer. no pasa por MediaRecorder ni por un
// elemento <video>, así que la única velocidad la marca el codificador, no el tiempo real
// datos del audio del archivo, si lo hay. la mezcla ya viene hecha; aquí solo se codifica
export interface InfoAudio {
  sampleRate: number
  canales: number
}

export class EscritorVideo {
  private muxer: Muxer<ArrayBufferTarget>
  private encoder: VideoEncoder
  private audioEncoder: AudioEncoder | null = null
  private fps: number
  private n = 0
  private error: unknown = null
  // si es true, se codifica por CALIDAD CONSTANTE (se pasa un QP por cuadro, como un CRF); si no,
  // por bitrate (VBR). el QP es el cuantizador: menor = mejor y más pesado, con keyframes más finos
  private usaQP: boolean
  private qp: number
  private qpKey: number

  private constructor(
    ancho: number,
    alto: number,
    fps: number,
    bitrate: number,
    codec: string,
    audio: InfoAudio | null,
    usaQP: boolean,
    qp: { qp: number; qpKey: number },
  ) {
    this.fps = fps
    this.usaQP = usaQP
    this.qp = qp.qp
    this.qpKey = qp.qpKey
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width: ancho, height: alto },
      ...(audio ? { audio: { codec: 'aac', sampleRate: audio.sampleRate, numberOfChannels: audio.canales } } : {}),
      fastStart: 'in-memory',
    })
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        this.error = e
      },
    })
    // en modo calidad constante no se fija bitrate: manda el QP que se pasa por cuadro. en modo VBR
    // se fija el bitrate objetivo. el cast es porque 'quantizer' es más nuevo que los tipos del DOM
    this.encoder.configure(
      (usaQP
        ? { codec, width: ancho, height: alto, framerate: fps, bitrateMode: 'quantizer' }
        : { codec, width: ancho, height: alto, bitrate, framerate: fps, bitrateMode: 'variable' }) as VideoEncoderConfig,
    )
    if (audio) {
      this.audioEncoder = new AudioEncoder({
        output: (chunk, meta) => this.muxer.addAudioChunk(chunk, meta),
        error: (e) => {
          this.error = e
        },
      })
      this.audioEncoder.configure({
        codec: 'mp4a.40.2',
        sampleRate: audio.sampleRate,
        numberOfChannels: audio.canales,
        bitrate: 160_000,
      })
    }
  }

  static async crear(
    ancho: number,
    alto: number,
    fps: number,
    bitrate: number,
    audio: InfoAudio | null = null,
    qp: { qp: number; qpKey: number } = { qp: 29, qpKey: 25 },
  ): Promise<EscritorVideo> {
    // se prueba primero la CALIDAD CONSTANTE (quantizer): es lo que hace un compresor CRF y deja el
    // archivo mucho más liviano a la misma vista. si ningún perfil la soporta, se usa VBR por bitrate
    let usaQP = false
    let codec = ''
    for (const c of ['avc1.640028', 'avc1.4d0028', 'avc1.640020', 'avc1.42E01F', 'avc1.42001f']) {
      try {
        const s = await VideoEncoder.isConfigSupported(
          { codec: c, width: ancho, height: alto, framerate: fps, bitrateMode: 'quantizer' } as VideoEncoderConfig,
        )
        if (s.supported) {
          codec = c
          usaQP = true
          break
        }
      } catch {
        // ese perfil no admite quantizer; se prueba el siguiente
      }
    }
    if (!usaQP) codec = await codecAvcSoportado(ancho, alto, fps, bitrate)
    return new EscritorVideo(ancho, alto, fps, bitrate, codec, audio, usaQP, qp)
  }

  // mete la mezcla de audio ya hecha (un AudioBuffer). se trocea en bloques y se codifica
  // a AAC. va aparte del video: el muxer ordena ambos por su timestamp al finalizar
  async escribirAudio(buffer: AudioBuffer): Promise<void> {
    const enc = this.audioEncoder
    if (!enc) return
    const canales = buffer.numberOfChannels
    const datos: Float32Array[] = []
    for (let c = 0; c < canales; c++) datos.push(buffer.getChannelData(c))
    const SR = buffer.sampleRate
    const TAM = 4096
    for (let i = 0; i < buffer.length; i += TAM) {
      const n = Math.min(TAM, buffer.length - i)
      // formato planar: primero todas las muestras del canal 0, luego las del 1
      const plano = new Float32Array(n * canales)
      for (let c = 0; c < canales; c++) plano.set(datos[c].subarray(i, i + n), c * n)
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: SR,
        numberOfFrames: n,
        numberOfChannels: canales,
        timestamp: Math.round((i / SR) * 1_000_000),
        data: plano,
      })
      enc.encode(audioData)
      audioData.close()
      if (this.error) throw new Error('Fallo al codificar el audio: ' + this.error)
    }
    await enc.flush()
  }

  // mete un cuadro. el timestamp va en microsegundos. se pone un keyframe cada dos
  // segundos, que es lo habitual para que el archivo permita saltar sin descargarlo entero
  async agregar(fuente: CanvasImageSource, tMicros: number): Promise<void> {
    if (this.error) throw new Error('Fallo al codificar: ' + this.error)
    // si el codificador se atasca, se espera a que baje la cola para no acumular memoria
    while (this.encoder.encodeQueueSize > 30) {
      await new Promise((r) => setTimeout(r, 1))
      if (this.error) throw new Error('Fallo al codificar: ' + this.error)
    }
    const frame = new VideoFrame(fuente, { timestamp: Math.round(tMicros) })
    // un keyframe cada dos segundos para poder saltar sin descargar todo. en modo calidad constante
    // se manda además el QP por cuadro (los keyframes con uno más fino); el `avc.quantizer` es más
    // nuevo que los tipos del DOM, por eso el cast
    const esKey = this.n % (this.fps * 2) === 0
    const opciones = this.usaQP
      ? { keyFrame: esKey, avc: { quantizer: esKey ? this.qpKey : this.qp } }
      : { keyFrame: esKey }
    this.encoder.encode(frame, opciones as VideoEncoderEncodeOptions)
    frame.close()
    this.n++
  }

  // cierra los codificadores, empaqueta y devuelve el mp4 terminado
  async finalizar(): Promise<Blob> {
    await this.encoder.flush()
    if (this.error) throw new Error('Fallo al codificar: ' + this.error)
    this.muxer.finalize()
    this.encoder.close()
    if (this.audioEncoder && this.audioEncoder.state !== 'closed') this.audioEncoder.close()
    return new Blob([this.muxer.target.buffer], { type: 'video/mp4' })
  }
}
