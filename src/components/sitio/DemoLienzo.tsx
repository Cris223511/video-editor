import { useEffect, useRef, useState } from 'react'
import { Palette, Sparkles } from 'lucide-react'
import { Deslizador } from '../ui/Controls'

// un plano apaisado de manos sobre el teclado: puesto en un lienzo cuadrado o
// vertical deja las bandas arriba y abajo, que es justo lo que esta prueba
// quiere enseñar. es una de las tres direcciones de Pexels ya verificadas
const CLIP = 'https://videos.pexels.com/video-files/852421/852421-hd_1920_1080_30fps.mp4'

const PROPORCIONES = [
  { id: '16-9', nombre: '16:9', ancho: 16, alto: 9, pie: 'YouTube y televisión' },
  { id: '1-1', nombre: '1:1', ancho: 1, alto: 1, pie: 'Publicaciones cuadradas' },
  { id: '4-5', nombre: '4:5', ancho: 4, alto: 5, pie: 'Feed vertical' },
  { id: '9-16', nombre: '9:16', ancho: 9, alto: 16, pie: 'Historias y cortos' },
]

// paleta corta con los fondos que de verdad se usan, más un selector libre
const COLORES = ['#000000', '#ffffff', '#0a1a3a', '#1f2937', '#7c3aed', '#0f766e']

const BASE = 720

// prueba del lienzo: cambia la proporción del proyecto y decide con qué se
// rellenan las bandas que el video no cubre. es el mismo cálculo que usa el
// compositor al exportar, no una aproximación
export default function DemoLienzo() {
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const medio = useRef<HTMLVideoElement | null>(null)
  const [proporcion, setProporcion] = useState(PROPORCIONES[1])
  const [relleno, setRelleno] = useState<'color' | 'desenfoque'>('desenfoque')
  const [color, setColor] = useState('#0a1a3a')
  const [desenfoque, setDesenfoque] = useState(45)
  const [listo, setListo] = useState(false)

  function pintar() {
    const c = lienzo.current
    const ctx = c?.getContext('2d')
    const img = medio.current
    if (!c || !ctx || !img || !img.videoWidth) return

    const ancho = BASE
    const alto = Math.round((BASE * proporcion.alto) / proporcion.ancho)
    // asignar el tamaño ya limpia el lienzo, pero solo cuando cambia de verdad;
    // repintando sesenta veces por segundo conviene no tocarlo si no hace falta
    if (c.width !== ancho) c.width = ancho
    if (c.height !== alto) c.height = alto

    ctx.clearRect(0, 0, ancho, alto)
    ctx.fillStyle = relleno === 'color' ? color : '#000'
    ctx.fillRect(0, 0, ancho, alto)

    // el fotograma cabe dentro del lienzo conservando su proporción
    const esc = Math.min(ancho / img.videoWidth, alto / img.videoHeight)
    const dw = img.videoWidth * esc
    const dh = img.videoHeight * esc

    // las bandas se tapan con el propio clip ampliado hasta cubrir y desenfocado
    if (relleno === 'desenfoque' && (dw < ancho - 1 || dh < alto - 1)) {
      const escB = Math.max(ancho / img.videoWidth, alto / img.videoHeight) * 1.12
      const bw = img.videoWidth * escB
      const bh = img.videoHeight * escB
      ctx.save()
      // misma fórmula que el compositor: el ajuste de 1 a 100 se traduce a una
      // fracción del alto, así se ve igual en cualquier resolución
      ctx.filter = `blur(${Math.round(alto * 0.001 * desenfoque)}px) brightness(0.72)`
      ctx.drawImage(img, (ancho - bw) / 2, (alto - bh) / 2, bw, bh)
      ctx.restore()
    }

    ctx.drawImage(img, (ancho - dw) / 2, (alto - dh) / 2, dw, dh)
  }

  // se repinta a cada fotograma que va a mostrar la pantalla, así el lienzo
  // enseña el clip en marcha. el bucle se rehace cuando cambia un control, y de
  // ese modo pintar() siempre lee los valores vigentes
  useEffect(() => {
    if (!listo) return
    let id = 0
    const ciclo = () => {
      pintar()
      id = requestAnimationFrame(ciclo)
    }
    id = requestAnimationFrame(ciclo)
    return () => cancelAnimationFrame(id)
  }, [listo, proporcion, relleno, color, desenfoque])

  const chip = (activo: boolean) =>
    [
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5',
      activo ? 'text-white shadow-sm' : 'text-[color:var(--muted)]',
    ].join(' ')
  const estiloChip = (activo: boolean) =>
    activo
      ? {
          background: 'rgb(var(--accent-boton))',
          border: '1px solid rgb(var(--accent-boton))',
        }
      : { background: 'rgb(var(--border) / 0.07)', border: '1px solid rgb(var(--border) / 0.1)' }

  return (
    <div
      className="overflow-hidden rounded-2xl p-4 shadow-lg sm:p-5"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      {/* aquí los controles van en columna a la izquierda, otra disposición más
          para que ninguna prueba repita la anterior */}
      <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Proporción del lienzo:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PROPORCIONES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProporcion(p)}
                  title={p.pie}
                  className={chip(proporcion.id === p.id)}
                  style={estiloChip(proporcion.id === p.id)}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] italic text-[color:var(--muted)]">{proporcion.pie}</p>
          </div>

          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Relleno de las bandas:
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setRelleno('desenfoque')}
                className={chip(relleno === 'desenfoque')}
                style={estiloChip(relleno === 'desenfoque')}
              >
                <Sparkles size={13} /> Video borroso
              </button>
              <button
                onClick={() => setRelleno('color')}
                className={chip(relleno === 'color')}
                style={estiloChip(relleno === 'color')}
              >
                <Palette size={13} /> Color plano
              </button>
            </div>

            {/* la paleta solo aparece con el color elegido: si estuviera siempre,
                ofrecería cambiar algo que en ese momento no se ve */}
            {relleno === 'desenfoque' && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                  Desenfoque: {desenfoque}
                </p>
                <Deslizador valor={desenfoque} min={1} max={100} onChange={setDesenfoque} />
              </div>
            )}

            {relleno === 'color' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Fondo ${c}`}
                    className="h-6 w-6 rounded-full transition-transform duration-200 hover:scale-110"
                    style={{
                      background: c,
                      boxShadow:
                        color === c
                          ? '0 0 0 2px rgb(var(--surface)), 0 0 0 4px rgb(var(--accent))'
                          : '0 0 0 1px rgb(var(--border) / 0.2)',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Elegir otro color"
                  className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
              </div>
            )}
          </div>

          <p className="mt-auto text-[11px] leading-relaxed text-[color:var(--muted)]">
            Un clip apaisado dentro de un lienzo cuadrado o vertical deja dos franjas.
            Rellenarlas con el propio video <b>desenfocado</b> evita que queden muertas.
          </p>
        </div>

        <div
          className="relative flex items-center justify-center rounded-xl p-4"
          style={{
            // fondo con cuadrícula tenue en lugar de un negro plano: así el
            // hueco alrededor del lienzo se lee como espacio de trabajo
            background:
              'repeating-conic-gradient(rgb(var(--border) / 0.06) 0% 25%, transparent 0% 50%) 50% / 18px 18px',
            minHeight: '25rem',
          }}
        >
          {/* el clip no se ve directamente: alimenta al lienzo, que es donde se
              compone la proporción elegida junto con sus bandas */}
          <video
            ref={medio}
            src={CLIP}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            // con COOP y COEP puestas, un video de otro dominio sin petición
            // anónima se rechaza y el lienzo quedaría vacío
            crossOrigin="anonymous"
            onLoadedData={() => setListo(true)}
            aria-hidden
            className="pointer-events-none absolute h-px w-px opacity-0"
          />

          <canvas
            ref={lienzo}
            className="max-h-[22rem] max-w-full rounded-lg shadow-2xl transition-all duration-300 sm:max-h-[24rem]"
          />
        </div>
      </div>
    </div>
  )
}
