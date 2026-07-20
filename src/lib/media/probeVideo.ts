import { MediaAsset } from '../../types/media'

// captura un fotograma de un video en el segundo pedido y lo devuelve como
// dataURL. sirve para armar la portada de un proyecto a partir del instante que
// toque, sin depender de la miniatura ya guardada del medio. si algo falla
// devuelve cadena vacía, para que quien llama caiga a su respaldo
export function frameDeVideo(url: string, segundo: number): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url

    const fallar = () => resolve('')
    video.onloadeddata = () => {
      const dur = isFinite(video.duration) ? video.duration : 0
      video.currentTime = Math.max(0, dur > 0 ? Math.min(segundo, dur - 0.05) : 0)
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 16
      canvas.height = video.videoHeight || 9
      const ctx = canvas.getContext('2d')
      if (!ctx) return fallar()
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    video.onerror = fallar
  })
}

// mira si el fotograma dibujado está prácticamente en negro. muestrea de salto en
// salto para no recorrer millones de píxeles y promedia el brillo; por debajo de
// un umbral bajo se considera negro y conviene probar otro instante del video
function fotogramaNegro(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let suma = 0
  let n = 0
  for (let i = 0; i < data.length; i += 4 * 20) {
    suma += data[i] + data[i + 1] + data[i + 2]
    n++
  }
  return n > 0 && suma / n / 3 < 6
}

// obtiene duración, dimensiones y un fotograma de portada cargando el video en
// memoria. nada de esto sale del navegador: se lee un object url local y se
// dibuja un frame en un canvas para la miniatura
export function analizarVideo(file: File): Promise<Omit<MediaAsset, 'id'>> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    // con 'auto' el navegador baja lo suficiente para que, al saltar a un
    // instante, el fotograma esté decodificado cuando se dibuja. con 'metadata'
    // el frame llegaba en blanco y la portada salía negra en videos largos
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url

    let duracion = 0
    // orden de instantes a intentar: primero la mitad exacta, que es la más
    // representativa; si ahí el video está en negro (un corte, un fundido), se
    // tantean otros puntos alrededor antes de rendirse
    const fracciones = [0.5, 0.4, 0.6, 0.25, 0.75, 0.15]
    let intento = 0

    const terminar = (miniatura: string) => {
      resolve({
        file,
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'video',
        duracion,
        ancho: video.videoWidth,
        alto: video.videoHeight,
        url,
        miniatura,
      })
    }

    // dibuja el fotograma actual del video en un canvas del tamaño del video
    const capturar = (): HTMLCanvasElement | null => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 16
      canvas.height = video.videoHeight || 9
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas
    }

    // salta al siguiente instante de la lista; si se agotan, se acepta lo que haya
    const siguienteInstante = () => {
      if (duracion <= 0) {
        video.currentTime = 0
        return
      }
      video.currentTime = fracciones[intento] * duracion
    }

    video.onloadedmetadata = () => {
      duracion = isFinite(video.duration) ? video.duration : 0
      siguienteInstante()
    }

    video.onseeked = () => {
      const canvas = capturar()
      if (!canvas) {
        terminar('')
        return
      }
      intento++
      // se acepta el fotograma si tiene imagen, o si ya no quedan puntos por
      // probar; así en el peor caso la portada es el último frame en lugar de
      // quedarse colgada buscando uno que no llega
      if (!fotogramaNegro(canvas) || intento >= fracciones.length || duracion <= 0) {
        terminar(canvas.toDataURL('image/jpeg', 0.6))
      } else {
        siguienteInstante()
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer el video.'))
    }
  })
}
