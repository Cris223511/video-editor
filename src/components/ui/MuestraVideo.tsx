import { useRef } from 'react'

// video de una muestra de vista previa (un estilo de color, un efecto...). en vez
// de empezar desde el principio del archivo, arranca en el mismo frame que se está
// viendo en el visor, o sea el del clip bajo el cabezal. así al pasar el cursor la
// muestra continúa justo desde donde va el video, sin dar ese salto al inicio que
// despistaba. cuando llega al final da la vuelta a ese mismo frame, no al segundo cero
export default function MuestraVideo({
  src,
  tiempo,
  className,
}: {
  src: string
  tiempo: number
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)

  // coloca el video en el frame de partida y lo pone a andar. se llama en cuanto
  // hay datos suficientes; recolocar solo si de verdad está lejos evita cortar la
  // reproducción a cada evento
  function alFrame() {
    const v = ref.current
    if (!v) return
    if (Math.abs(v.currentTime - tiempo) > 0.08) {
      try {
        v.currentTime = tiempo
      } catch {
        // si aún no admite el salto (sin metadatos) no pasa nada: al cargar se
        // vuelve a intentar desde onLoadedMetadata
      }
    }
    v.play().catch(() => {})
  }

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      // sin autoPlay a propósito: arrancaría en el segundo cero y se vería el salto.
      // se espera a tener metadatos, se salta al frame y recién ahí se reproduce
      onLoadedMetadata={alFrame}
      onLoadedData={alFrame}
      onEnded={() => {
        const v = ref.current
        if (!v) return
        try {
          v.currentTime = tiempo
        } catch {
          // ignorar: el propio navegador lo dejará listo en el siguiente ciclo
        }
        v.play().catch(() => {})
      }}
      className={className}
    />
  )
}
