import { demuxVideo } from './demux'

// un canvas que se hace pasar por <video> para el compositor: lleva videoWidth y
// videoHeight además de poder dibujarse. así dibujarFotograma no necesita saber si la
// fuente es un elemento de video real o los cuadros que decodifica WebCodecs
export interface LienzoComoVideo extends HTMLCanvasElement {
  videoWidth: number
  videoHeight: number
}

// proveedor de cuadros de un video a partir de sus paquetes codificados, decodificados
// con WebCodecs. va hacia delante (la exportación recorre el tiempo en orden): pide el
// cuadro que corresponde a un instante de la fuente y lo deja pintado en su lienzo. la
// memoria queda acotada porque se cierran los cuadros ya usados en vez de guardarlos
// todos, que serían gigas de memoria en un video largo
export class FuenteDecodificada {
  private decoder: VideoDecoder
  private chunks: EncodedVideoChunk[]
  private siguiente = 0
  private listas: VideoFrame[] = []
  private actual: VideoFrame | null = null
  private errorDecode: unknown = null
  private drenado = false
  // resolvedores en espera de que el decodificador saque el próximo cuadro
  private esperas: (() => void)[] = []
  readonly lienzo: LienzoComoVideo

  constructor(config: VideoDecoderConfig, chunks: EncodedVideoChunk[], preferirSoftware = false) {
    this.chunks = chunks
    this.lienzo = document.createElement('canvas') as LienzoComoVideo
    this.lienzo.videoWidth = config.codedWidth ?? 0
    this.lienzo.videoHeight = config.codedHeight ?? 0
    this.decoder = new VideoDecoder({
      output: (f) => {
        this.listas.push(f)
        const w = this.esperas.shift()
        if (w) w()
      },
      error: (e) => {
        this.errorDecode = e
        this.esperas.splice(0).forEach((w) => w())
      },
    })
    // por defecto el navegador elige (normalmente hardware, más rápido). el modo software se
    // usa como reintento cuando el hardware se estanca: hay sistemas que solo permiten un
    // decodificador por hardware y en una transición corren dos, así que el segundo se cuelga.
    // por software no hay ese límite (a cambio de ir más lento)
    this.decoder.configure(preferirSoftware ? { ...config, hardwareAcceleration: 'prefer-software' } : config)
  }

  // espera a que el decodificador emita el siguiente cuadro, con una red de seguridad por
  // tiempo para no colgarse si algo va mal
  private esperarSalida(): Promise<void> {
    return new Promise((res) => {
      const id = window.setTimeout(res, 5000)
      this.esperas.push(() => {
        window.clearTimeout(id)
        res()
      })
    })
  }

  // lleva la fuente al cuadro que se ve en el segundo `s` (en segundos de la fuente) y lo
  // deja pintado en el lienzo. decodifica hacia delante lo justo para tener ese cuadro,
  // sin flush entre medias (flush obliga a un keyframe después); los cuadros anteriores,
  // ya sin uso, se cierran para no acumular memoria
  async irAlSegundo(s: number): Promise<void> {
    const sMicros = s * 1_000_000
    // los cuadros salen en orden de decodificación, no de presentación: con B-frames el
    // que se ve en s puede llegar después de otros con tiempo mayor. por eso no basta con
    // ver un cuadro cuyo tiempo pase de s; se decodifica hasta tener un margen de cuadros
    // por delante, que garantiza que ya salieron todos los que van hasta s
    const MARGEN = 3
    const porDelante = () => this.listas.filter((f) => f.timestamp > sMicros).length

    // si el decodificador deja de entregar cuadros y tampoco consume paquetes durante varias
    // esperas seguidas, es que se quedó mudo (un caso típico: el sistema solo deja un
    // decodificador por hardware y en una transición corren dos a la vez, así que el segundo
    // no arranca y no lanza ningún error). en vez de girar en timeouts de 5 s para siempre
    // (la exportación "colgada"), se corta con un error para que el diálogo caiga al otro motor
    let estancado = 0
    while (porDelante() < MARGEN && this.siguiente < this.chunks.length) {
      if (this.errorDecode) throw new Error('Fallo al decodificar el video: ' + this.errorDecode)
      // el decodificador se mantiene alimentado sin pasarse, para que trabaje en paralelo
      while (this.decoder.decodeQueueSize < 24 && this.siguiente < this.chunks.length) {
        this.decoder.decode(this.chunks[this.siguiente++])
      }
      if (this.siguiente >= this.chunks.length && this.decoder.decodeQueueSize === 0) break
      const cuadrosAntes = this.listas.length
      const colaAntes = this.decoder.decodeQueueSize
      await this.esperarSalida()
      // tras esperar: ni salió un cuadro nuevo ni bajó la cola de decodificación
      if (this.listas.length === cuadrosAntes && this.decoder.decodeQueueSize >= colaAntes) {
        estancado++
        if (estancado >= 3) {
          throw new Error('El decodificador de video se detuvo (posible límite de decodificadores del sistema).')
        }
      } else {
        estancado = 0
      }
    }
    // al agotarse los paquetes se drena una vez para que salgan los últimos cuadros
    if (this.siguiente >= this.chunks.length && !this.drenado) {
      this.drenado = true
      await this.decoder.flush()
      if (this.errorDecode) throw new Error('Fallo al decodificar el video: ' + this.errorDecode)
    }

    // el cuadro que se ve en s es el de mayor timestamp que no pasa de s, sin importar en
    // qué orden llegaron. los de tiempo menor ya quedaron atrás y se cierran; los de tiempo
    // mayor se conservan para el próximo instante
    let elegido: VideoFrame | null = null
    for (const f of this.listas) {
      if (f.timestamp <= sMicros && (!elegido || f.timestamp > elegido.timestamp)) elegido = f
    }
    // si ninguno llega a s y todavía no se ha mostrado nada (arranque con s=0 y un primer
    // cuadro cuyo tiempo queda un pelo por encima de cero), se toma el más temprano: es el
    // que se ve al empezar. sin esto el primer fotograma salía en negro
    if (!elegido && !this.actual) {
      for (const f of this.listas) {
        if (!elegido || f.timestamp < elegido.timestamp) elegido = f
      }
    }
    this.listas = this.listas.filter((f) => {
      if (f.timestamp <= sMicros && f !== elegido) {
        f.close()
        return false
      }
      return f !== elegido
    })

    // sin cuadro elegido (todavía antes del primero) se conserva el actual
    if (elegido && elegido !== this.actual) {
      if (this.actual) this.actual.close()
      this.actual = elegido
      this.lienzo.videoWidth = elegido.displayWidth
      this.lienzo.videoHeight = elegido.displayHeight
      this.lienzo.width = elegido.displayWidth
      this.lienzo.height = elegido.displayHeight
      const ctx = this.lienzo.getContext('2d')
      if (ctx) ctx.drawImage(elegido, 0, 0)
    }
  }

  // libera todo: los cuadros vivos y el propio decodificador
  cerrar(): void {
    this.listas.forEach((f) => f.close())
    this.listas = []
    if (this.actual) {
      this.actual.close()
      this.actual = null
    }
    if (this.decoder.state !== 'closed') this.decoder.close()
  }
}

// desarma un video y arma su proveedor de cuadros, listo para pedirle instantes
export async function crearFuente(archivo: Blob): Promise<FuenteDecodificada> {
  const { config, chunks } = await demuxVideo(archivo)
  const soporte = await VideoDecoder.isConfigSupported(config)
  if (!soporte.supported) throw new Error('El códec del video no lo soporta WebCodecs: ' + config.codec)
  return new FuenteDecodificada(config, chunks)
}
