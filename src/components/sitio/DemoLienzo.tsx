import { useEffect, useRef, useState } from 'react'
import { Palette, Sparkles } from 'lucide-react'
import { Deslizador } from '../ui/Controls'

// una toma vertical, que es justo el caso donde el relleno del lienzo importa
const FOTO =
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=70'

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
  const foto = useRef<HTMLImageElement | null>(null)
  const [proporcion, setProporcion] = useState(PROPORCIONES[1])
  const [relleno, setRelleno] = useState<'color' | 'desenfoque'>('desenfoque')
  const [color, setColor] = useState('#0a1a3a')
  const [desenfoque, setDesenfoque] = useState(45)
  const [listo, setListo] = useState(false)

  function pintar() {
    const c = lienzo.current
    const ctx = c?.getContext('2d')
    const img = foto.current
    if (!c || !ctx || !img) return

    const ancho = BASE
    const alto = Math.round((BASE * proporcion.alto) / proporcion.ancho)
    c.width = ancho
    c.height = alto

    ctx.clearRect(0, 0, ancho, alto)
    ctx.fillStyle = relleno === 'color' ? color : '#000'
    ctx.fillRect(0, 0, ancho, alto)

    // la imagen cabe dentro del lienzo conservando su proporción
    const esc = Math.min(ancho / img.naturalWidth, alto / img.naturalHeight)
    const dw = img.naturalWidth * esc
    const dh = img.naturalHeight * esc

    // relleno con la propia imagen ampliada hasta cubrir, y desenfocada
    if (relleno === 'desenfoque' && (dw < ancho - 1 || dh < alto - 1)) {
      const escB = Math.max(ancho / img.naturalWidth, alto / img.naturalHeight) * 1.12
      const bw = img.naturalWidth * escB
      const bh = img.naturalHeight * escB
      ctx.save()
      // misma fórmula que el compositor: el ajuste de 1 a 100 se traduce a una
      // fracción del alto, así se ve igual en cualquier resolución
      ctx.filter = `blur(${Math.round(alto * 0.001 * desenfoque)}px) brightness(0.72)`
      ctx.drawImage(img, (ancho - bw) / 2, (alto - bh) / 2, bw, bh)
      ctx.restore()
    }

    ctx.drawImage(img, (ancho - dw) / 2, (alto - dh) / 2, dw, dh)
  }

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      foto.current = img
      setListo(true)
    }
    img.src = FOTO
  }, [])

  useEffect(() => {
    if (listo) pintar()
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
            Una toma vertical en un lienzo apaisado deja dos franjas. Rellenarlas con el propio
            video <b>desenfocado</b> evita que queden muertas.
          </p>
        </div>

        <div
          className="flex items-center justify-center rounded-xl p-4"
          style={{
            // fondo con cuadrícula tenue en lugar de un negro plano: así el
            // hueco alrededor del lienzo se lee como espacio de trabajo
            background:
              'repeating-conic-gradient(rgb(var(--border) / 0.06) 0% 25%, transparent 0% 50%) 50% / 18px 18px',
            minHeight: '25rem',
          }}
        >
          <canvas
            ref={lienzo}
            className="max-h-[22rem] max-w-full rounded-lg shadow-2xl transition-all duration-300 sm:max-h-[24rem]"
          />
        </div>
      </div>
    </div>
  )
}
