import { useRef, useState } from 'react'

// pieza visual del sitio. en reposo se ve en blanco y negro y quieta; al pasar
// el cursor recupera el color y, si tiene video, arranca. la imagen de fondo
// hace de cartel mientras el video no ha cargado, así que nunca se ve un hueco
// negro esperando
export default function MedioHover({
  imagen,
  video,
  alt,
  proporcion = 'aspect-video',
  className = '',
}: {
  imagen: string
  video?: string
  alt: string
  proporcion?: string
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [encima, setEncima] = useState(false)
  // el video no se da por bueno hasta que empieza a pintar fotogramas. si la
  // dirección falla o tarda, la foto se queda puesta en lugar de dejar un hueco
  const [enMarcha, setEnMarcha] = useState(false)

  function entrar() {
    setEncima(true)
    // si el navegador rechaza la reproducción no pasa nada: se queda el cartel
    ref.current?.play().catch(() => {})
  }

  function salir() {
    setEncima(false)
    setEnMarcha(false)
    const v = ref.current
    if (!v) return
    v.pause()
    v.currentTime = 0
  }

  return (
    <div
      onMouseEnter={entrar}
      onMouseLeave={salir}
      className={[
        'group relative overflow-hidden rounded-2xl',
        proporcion,
        className,
      ].join(' ')}
      style={{ border: '1px solid rgb(var(--border) / 0.1)' }}
    >
      <img
        src={imagen}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out"
        style={{
          filter: encima ? 'grayscale(0)' : 'grayscale(1)',
          transform: encima ? 'scale(1.04)' : 'scale(1)',
          opacity: encima && enMarcha ? 0 : 1,
        }}
      />

      {video && (
        <video
          ref={ref}
          src={video}
          muted
          loop
          playsInline
          preload="none"
          onPlaying={() => setEnMarcha(true)}
          onError={() => setEnMarcha(false)}
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out"
          style={{
            filter: encima ? 'grayscale(0)' : 'grayscale(1)',
            opacity: encima && enMarcha ? 1 : 0,
          }}
        />
      )}


    </div>
  )
}
