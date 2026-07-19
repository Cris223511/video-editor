import { useRef, useState } from 'react'

// Pieza visual del sitio. En reposo se ve el video quieto y en blanco y negro; al
// pasar el cursor recupera el color y se pone en marcha.
//
// Antes lo que se veía en reposo era la fotografía, y el video solo aparecía una
// vez estaba reproduciendo de verdad. Con eso el reposo enseñaba una foto y no un
// primer fotograma, que es lo que se pedía. Ahora el video se carga con sus
// metadatos y se queda visible desde el principio, detenido en su primer
// fotograma, y la foto pasa a ser lo que se ve solo si el video no llega a cargar.
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
  // vale cuando el video ha llegado a pintar su primer fotograma. hasta entonces,
  // y si la dirección falla, manda la fotografía en lugar de dejar un hueco negro
  const [listo, setListo] = useState(false)

  function entrar() {
    setEncima(true)
    // si el navegador rechaza la reproducción no pasa nada: se queda quieto
    ref.current?.play().catch(() => {})
  }

  function salir() {
    setEncima(false)
    const v = ref.current
    if (!v) return
    v.pause()
    // vuelve al principio, así el reposo siempre enseña el mismo fotograma
    v.currentTime = 0
  }

  const verVideo = Boolean(video) && listo

  return (
    <div
      onMouseEnter={entrar}
      onMouseLeave={salir}
      className={['group relative overflow-hidden rounded-2xl', proporcion, className].join(' ')}
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
          opacity: verVideo ? 0 : 1,
        }}
      />

      {video && (
        <video
          ref={ref}
          src={video}
          muted
          loop
          playsInline
          // con los metadatos basta para tener el primer fotograma en pantalla sin
          // descargar el clip entero antes de que nadie lo pida
          preload="metadata"
          // el sitio va aislado con COEP para poder usar memoria compartida, y bajo
          // esa politica un recurso de otro dominio se rechaza salvo que se pida
          // en modo anonimo. sin esto el video ni siquiera llegaba a cargar y lo
          // que se veia era siempre la fotografia de respaldo
          crossOrigin="anonymous"
          onLoadedMetadata={() => setListo(true)}
          onLoadedData={() => setListo(true)}
          onError={() => setListo(false)}
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out"
          style={{
            filter: encima ? 'grayscale(0)' : 'grayscale(1)',
            transform: encima ? 'scale(1.04)' : 'scale(1)',
            opacity: verVideo ? 1 : 0,
          }}
        />
      )}
    </div>
  )
}
