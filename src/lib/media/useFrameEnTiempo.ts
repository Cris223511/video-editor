import { useEffect, useState } from 'react'
import { frameDeVideo } from './probeVideo'

// captura el fotograma del video en el segundo indicado y lo devuelve como imagen.
// se usa de fondo estático en las muestras de vista previa (estilos de color,
// efectos...) para que la muestra enseñe el MISMO frame desde el que arranca su
// reproducción al pasar el cursor. antes el fondo era una miniatura genérica del clip
// y al hacer hover se veía un salto a otro fotograma, que es lo que despistaba.
//
// lleva un pequeño respiro antes de capturar para no rehacer el trabajo en cada
// fotograma mientras el video se reproduce: solo captura cuando el cabezal se queda
// quieto un momento, que es cuando de verdad se está mirando la muestra.
export function useFrameEnTiempo(url: string | undefined, segundo: number): string | undefined {
  const [frame, setFrame] = useState<string>()
  useEffect(() => {
    if (!url) {
      setFrame(undefined)
      return
    }
    let vivo = true
    // respiro corto: en reproducción coalesce los fotogramas seguidos, pero al abrir
    // el panel en pausa el frame correcto aparece casi al instante
    const t = window.setTimeout(() => {
      frameDeVideo(url, segundo).then((f) => {
        if (vivo && f) setFrame(f)
      })
    }, 40)
    return () => {
      vivo = false
      window.clearTimeout(t)
    }
  }, [url, segundo])
  return frame
}
