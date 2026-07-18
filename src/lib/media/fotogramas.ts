// tira de fotogramas de un video, para dibujarla dentro de su clip en la línea
// de tiempo. sirve para ver de un vistazo qué hay en cada tramo y saber por
// dónde cortar, en lugar de mostrar una miniatura estirada.
//
// los fotogramas se sacan una sola vez por medio y quedan en memoria: volver a
// pedirlos devuelve la misma promesa, así dos clips del mismo video no repiten
// el trabajo

const ALTO = 64 // alto de cada fotograma en píxeles; el ancho sale del aspecto
const CANTIDAD = 24 // suficientes para que la tira se lea sin tardar demasiado

export interface Tira {
  // fotogramas en orden, repartidos por igual a lo largo del video
  imagenes: string[]
  // instante de cada fotograma, en segundos
  tiempos: number[]
  aspecto: number
}

const cache = new Map<string, Promise<Tira>>()

export function tiraDeFotogramas(assetId: string, url: string, duracion: number): Promise<Tira> {
  const guardada = cache.get(assetId)
  if (guardada) return guardada
  const tarea = extraer(url, duracion)
  cache.set(assetId, tarea)
  return tarea
}

// libera la tira de un medio que ya no está en el proyecto
export function olvidarTira(assetId: string) {
  cache.delete(assetId)
}

function extraer(url: string, duracion: number): Promise<Tira> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.preload = 'auto'
    // sin esto, algunos navegadores no dejan leer los píxeles del video
    video.crossOrigin = 'anonymous'

    const imagenes: string[] = []
    const tiempos: number[] = []
    let lienzo: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D | null
    let aspecto = 16 / 9
    let indice = 0

    const fallo = (e: unknown) => {
      video.removeAttribute('src')
      video.load()
      reject(e)
    }

    video.addEventListener('error', () => fallo(new Error('no se pudo leer el video')))

    video.addEventListener('loadedmetadata', () => {
      aspecto = video.videoWidth / video.videoHeight || 16 / 9
      lienzo = document.createElement('canvas')
      lienzo.height = ALTO
      lienzo.width = Math.round(ALTO * aspecto)
      ctx = lienzo.getContext('2d')
      // el primer fotograma se toma un pelín después del cero, porque en el
      // instante exacto muchos videos aún no tienen imagen decodificada
      buscar(0)
    })

    // cada vez que termina de posicionarse, se dibuja y se pide el siguiente
    video.addEventListener('seeked', () => {
      if (!ctx) return
      try {
        ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height)
        imagenes.push(lienzo.toDataURL('image/jpeg', 0.55))
        tiempos.push(video.currentTime)
      } catch {
        // un fotograma que no se pueda dibujar no debe tumbar la tira entera
      }
      indice += 1
      if (indice >= CANTIDAD) {
        video.removeAttribute('src')
        video.load()
        resolve({ imagenes, tiempos, aspecto })
        return
      }
      buscar(indice)
    })

    function buscar(i: number) {
      const total = duracion || video.duration || 1
      // se reparten a lo largo del video, sin tocar el borde final para no
      // caer en un fotograma vacío
      video.currentTime = Math.min(total * 0.999, (i / CANTIDAD) * total + 0.03)
    }
  })
}
