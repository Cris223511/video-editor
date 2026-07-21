import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'

// las tres direcciones que Pexels sirve de verdad. la mayoría de sus enlaces
// directos devuelven 403, así que cada una se comprobó a mano: responden con 206
// y con la cabecera CORS abierta, lo mismo que pide el sitio al cargarlas en
// modo anónimo. son tres clips distintos a los que se usan en el resto de
// pruebas. los nombres quedan como estaban de momento, pendientes de reescribir,
// así que todavía pueden no describir lo que se ve en pantalla
const CLIPS = [
  {
    id: 'cascada',
    nombre: 'Cascada',
    src: 'https://videos.pexels.com/video-files/2098988/2098988-hd_1920_1080_30fps.mp4',
  },
  {
    id: 'costa',
    nombre: 'Costa desde el aire',
    src: 'https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4',
  },
  {
    id: 'equipo',
    nombre: 'Equipo en la oficina',
    src: 'https://videos.pexels.com/video-files/6774633/6774633-hd_1920_1080_30fps.mp4',
  },
]

const VELOCIDADES = [0.25, 0.5, 1, 2]

function reloj(s: number) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

// reproductor con los controles básicos del editor: reproducir, buscar por la
// barra, cambiar la velocidad y silenciar. la cámara lenta está aquí porque es
// la que se usa al grabar un recorrido de censura sobre algo que se mueve
export default function DemoVideo() {
  const video = useRef<HTMLVideoElement | null>(null)
  const [clip, setClip] = useState(CLIPS[0])
  const [sonando, setSonando] = useState(false)
  const [mudo, setMudo] = useState(true)
  const [velocidad, setVelocidad] = useState(1)
  const [t, setT] = useState(0)
  const [total, setTotal] = useState(0)

  // el ritmo se aplica al elemento cada vez que cambia, también al cambiar de
  // clip, porque el navegador lo devuelve a uno con cada fuente nueva
  useEffect(() => {
    const v = video.current
    if (v) v.playbackRate = velocidad
  }, [velocidad, clip])

  function alternar() {
    const v = video.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setSonando(true)
    } else {
      v.pause()
      setSonando(false)
    }
  }

  const chip = (activo: boolean) =>
    [
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5',
      activo ? 'text-white shadow-sm' : 'text-[color:var(--muted)]',
    ].join(' ')
  const estiloChip = (activo: boolean) =>
    activo
      ? { background: 'rgb(var(--accent-boton))', border: '1px solid rgb(var(--accent-boton))' }
      : { background: 'rgb(var(--border) / 0.07)', border: '1px solid rgb(var(--border) / 0.1)' }

  return (
    <div
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl p-4 shadow-lg sm:p-5"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-1.5">
          {CLIPS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setClip(c)
                setSonando(false)
                setT(0)
              }}
              className={chip(clip.id === c.id)}
              style={estiloChip(clip.id === c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            Velocidad:
          </span>
          {VELOCIDADES.map((v) => (
            <button
              key={v}
              onClick={() => setVelocidad(v)}
              className={chip(velocidad === v)}
              style={estiloChip(velocidad === v)}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={video}
          src={clip.src}
          muted={mudo}
          loop
          playsInline
          preload="metadata"
          // Pexels no manda cabecera CORP, y con el sitio aislado por COEP un
          // recurso ajeno sin ella se descarta antes de empezar a descargarse.
          // pidiéndolo en modo anónimo entra por CORS, que sí satisface la
          // política. lo mismo que ya hacía MedioHover con su clip
          crossOrigin="anonymous"
          onLoadedMetadata={(e) => setTotal(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onClick={alternar}
          // el marco es algo más apaisado que los clips que se cargan, así que sin
          // recorte quedaban dos bandas negras a los lados. cubriendo el marco se
          // pierde una franja mínima por arriba y por abajo, que es preferible a
          // enseñar hueco vacío
          className="block w-full cursor-pointer object-cover transition-all duration-700 ease-out"
          style={{
            aspectRatio: '16 / 8',
            // en pausa se ve en blanco y negro y recupera el color al reproducir,
            // igual que las piezas del resto del sitio
            filter: sonando ? 'grayscale(0)' : 'grayscale(1) brightness(0.85)',
          }}
        />

        {/* controles sobre el video, como en el visor del editor */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-3 pt-8"
          style={{
            background: 'linear-gradient(to top, rgb(6 12 24 / 0.85), transparent)',
          }}
        >
          <button
            onClick={alternar}
            aria-label={sonando ? 'Pausar' : 'Reproducir'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#13233d] transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            {sonando ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>

          <span className="shrink-0 font-mono text-[11px] text-white/85">
            {reloj(t)} / {reloj(total)}
          </span>

          {/* barra de posición: arrastrar mueve el video, igual que el cabezal */}
          <input
            type="range"
            min={0}
            max={total || 0}
            step={0.05}
            value={t}
            onChange={(e) => {
              const v = video.current
              if (v) v.currentTime = Number(e.target.value)
            }}
            aria-label="Posición del video"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, rgb(var(--accent)) ${
                total ? (t / total) * 100 : 0
              }%, rgb(255 255 255 / 0.25) 0%)`,
            }}
          />

          <button
            onClick={() => {
              const v = video.current
              if (v) v.currentTime = 0
            }}
            aria-label="Volver al principio"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:text-white"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => setMudo((m) => !m)}
            aria-label={mudo ? 'Activar sonido' : 'Silenciar'}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:text-white"
          >
            {mudo ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--muted)]">
        La <b>cámara lenta</b> te da tiempo de reacción cuando grabas el recorrido de una censura.
        Al seguir con el cursor una cara que se mueve rápido, el trazo sale pegado al movimiento
        real y luego quedan muchos menos puntos que corregir a mano.
      </p>
    </div>
  )
}
