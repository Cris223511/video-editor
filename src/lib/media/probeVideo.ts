import { MediaAsset } from '../../types/media'

// obtiene duración, dimensiones y un fotograma de portada cargando el video en
// memoria. nada de esto sale del navegador: se lee un object url local y se
// dibuja un frame en un canvas para la miniatura
export function analizarVideo(file: File): Promise<Omit<MediaAsset, 'id'>> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = url

    video.onloadedmetadata = () => {
      // la portada sale de la mitad exacta del video, no del arranque. el primer
      // fotograma suele venir en negro o con un rótulo, y un punto al azar no
      // representa el clip; la mitad da una imagen bastante fiel de lo que hay
      const dur = isFinite(video.duration) ? video.duration : 0
      video.currentTime = dur > 0 ? dur / 2 : 0
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      let miniatura = ''
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        miniatura = canvas.toDataURL('image/jpeg', 0.6)
      }
      resolve({
        file,
        nombre: file.name,
        tamano: file.size,
        tipo: file.type || 'video',
        duracion: video.duration,
        ancho: video.videoWidth,
        alto: video.videoHeight,
        url,
        miniatura,
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer el video.'))
    }
  })
}
