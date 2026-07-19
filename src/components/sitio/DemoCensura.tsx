import { MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { Circle, Droplet, EyeOff, Grid2x2, Move, Square } from 'lucide-react'
import { Deslizador } from '../ui/Controls'

const FOTO =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=70'

// más bajo que antes: a 500 de alto la pieza dominaba la sección entera
const ANCHO = 880
const ALTO = 400

type Efecto = 'pixelar' | 'difuminar' | 'transparente'
type Forma = 'rectangulo' | 'circulo'

const EFECTOS: { id: Efecto; nombre: string; icono: JSX.Element }[] = [
  { id: 'pixelar', nombre: 'Pixelar', icono: <Grid2x2 size={13} /> },
  { id: 'difuminar', nombre: 'Difuminar', icono: <Droplet size={13} /> },
  { id: 'transparente', nombre: 'Tapar', icono: <EyeOff size={13} /> },
]

const FORMAS: { id: Forma; nombre: string; icono: JSX.Element }[] = [
  { id: 'rectangulo', nombre: 'Rectángulo', icono: <Square size={13} /> },
  { id: 'circulo', nombre: 'Círculo', icono: <Circle size={13} /> },
]

// las cuatro esquinas, con el cursor que corresponde a cada una
const ESQUINAS = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
] as const

// censura interactiva sobre una foto: se arrastra el recuadro, se redimensiona
// por sus esquinas y se elige forma y efecto. usa la misma técnica que el
// editor, no un filtro que la imite
export default function DemoCensura() {
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const foto = useRef<HTMLImageElement | null>(null)
  const auxiliar = useRef<HTMLCanvasElement | null>(null)
  const [caja, setCaja] = useState({ x: 0.4, y: 0.26, w: 0.24, h: 0.4 })

  const [efecto, setEfecto] = useState<Efecto>('pixelar')
  const [forma, setForma] = useState<Forma>('rectangulo')
  const [intensidad, setIntensidad] = useState(22)
  const [listo, setListo] = useState(false)

  function recortar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.beginPath()
    if (forma === 'circulo') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    else ctx.rect(x, y, w, h)
  }

  function pintar() {
    const c = lienzo.current
    const ctx = c?.getContext('2d')
    const img = foto.current
    if (!c || !ctx || !img) return

    ctx.clearRect(0, 0, ANCHO, ALTO)
    ctx.drawImage(img, 0, 0, ANCHO, ALTO)

    const x = caja.x * ANCHO
    const y = caja.y * ALTO
    const w = caja.w * ANCHO
    const h = caja.h * ALTO

    if (efecto === 'transparente') {
      ctx.save()
      recortar(ctx, x, y, w, h)
      ctx.clip()
      ctx.fillStyle = '#000'
      ctx.fillRect(x, y, w, h)
      ctx.restore()
    } else if (efecto === 'difuminar') {
      ctx.save()
      recortar(ctx, x, y, w, h)
      ctx.clip()
      ctx.filter = `blur(${Math.max(2, intensidad * 0.6)}px)`
      // se redibuja la foto entera recortada a la zona, así el desenfoque toma
      // color de alrededor y no deja un halo en los bordes
      ctx.drawImage(img, 0, 0, ANCHO, ALTO)
      ctx.restore()
    } else {
      const off = auxiliar.current
      const octx = off?.getContext('2d')
      if (!off || !octx) return
      // cuanto menor sea el lienzo intermedio, más grandes salen los cuadros al
      // volver a ampliar sin suavizado
      const bloque = Math.max(3, intensidad)
      const pw = Math.max(1, Math.round(w / bloque))
      const ph = Math.max(1, Math.round(h / bloque))
      off.width = pw
      off.height = ph
      octx.imageSmoothingEnabled = false
      octx.drawImage(c, x, y, w, h, 0, 0, pw, ph)
      ctx.save()
      recortar(ctx, x, y, w, h)
      ctx.clip()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(off, 0, 0, pw, ph, x, y, w, h)
      ctx.restore()
    }

    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,.9)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 6])
    recortar(ctx, x, y, w, h)
    ctx.stroke()
    ctx.restore()
  }

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      foto.current = img
      setListo(true)
    }
    img.src = FOTO
    auxiliar.current = document.createElement('canvas')
  }, [])

  useEffect(() => {
    if (listo) pintar()
  }, [listo, efecto, forma, intensidad, caja])

  const MINIMO = 0.06

  // arrastre de la caja entera
  function mover(e: ReactMouseEvent) {
    e.preventDefault()
    const cont = (e.currentTarget as HTMLElement).parentElement
    const rect = cont?.getBoundingClientRect()
    if (!rect) return
    const inicio = { ...caja }
    const px = e.clientX
    const py = e.clientY
    const alMover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - px) / rect.width
      const dy = (ev.clientY - py) / rect.height
      setCaja({
        ...inicio,
        x: Math.max(0, Math.min(1 - inicio.w, inicio.x + dx)),
        y: Math.max(0, Math.min(1 - inicio.h, inicio.y + dy)),
      })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', alMover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', alMover)
    window.addEventListener('mouseup', soltar)
  }

  // redimensionado por una esquina: la contraria se queda clavada, igual que en
  // el editor
  function estirar(e: ReactMouseEvent, esquina: (typeof ESQUINAS)[number]) {
    e.preventDefault()
    e.stopPropagation()
    const cont = (e.currentTarget as HTMLElement).parentElement?.parentElement
    const rect = cont?.getBoundingClientRect()
    if (!rect) return
    const inicio = { ...caja }
    const alMover = (ev: globalThis.MouseEvent) => {
      const mx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      const my = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height))
      let { x, y, w, h } = inicio
      if (esquina.x === 1) w = Math.max(MINIMO, mx - inicio.x)
      else {
        const der = inicio.x + inicio.w
        x = Math.min(der - MINIMO, mx)
        w = der - x
      }
      if (esquina.y === 1) h = Math.max(MINIMO, my - inicio.y)
      else {
        const aba = inicio.y + inicio.h
        y = Math.min(aba - MINIMO, my)
        h = aba - y
      }
      setCaja({ x, y, w, h })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', alMover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', alMover)
    window.addEventListener('mouseup', soltar)
  }

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
      {/* controles arriba, en franja: disposición distinta a la de transiciones
          para que las pruebas no se lean como la misma tarjeta repetida */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap gap-1.5">
          {EFECTOS.map((e) => (
            <button
              key={e.id}
              onClick={() => setEfecto(e.id)}
              className={chip(efecto === e.id)}
              style={estiloChip(efecto === e.id)}
            >
              {e.icono} {e.nombre}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {FORMAS.map((f) => (
            <button
              key={f.id}
              onClick={() => setForma(f.id)}
              className={chip(forma === f.id)}
              style={estiloChip(forma === f.id)}
            >
              {f.icono} {f.nombre}
            </button>
          ))}
        </div>

        {/* la intensidad solo tiene sentido en pixelado y desenfoque */}
        {efecto !== 'transparente' && (
          <div className="flex min-w-[12rem] flex-1 items-center gap-3">
            <span className="shrink-0 text-xs font-semibold text-[color:var(--muted)]">
              Intensidad
            </span>
            <div className="flex-1">
              <Deslizador valor={intensidad} min={4} max={60} onChange={setIntensidad} />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold text-brand">
              {intensidad}
            </span>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-black">
        <canvas
          ref={(el) => {
            if (el) {
              el.width = ANCHO
              el.height = ALTO
            }
            lienzo.current = el
          }}
          className="block w-full"
          style={{ aspectRatio: `${ANCHO} / ${ALTO}` }}
        />

        {/* capa de manipulación encima del lienzo: la caja se arrastra por su
            interior y se estira por las cuatro esquinas */}
        <div
          onMouseDown={mover}
          className="absolute cursor-move"
          style={{
            left: `${caja.x * 100}%`,
            top: `${caja.y * 100}%`,
            width: `${caja.w * 100}%`,
            height: `${caja.h * 100}%`,
          }}
        >
          {ESQUINAS.map((q) => (
            <span
              key={q.id}
              onMouseDown={(e) => estirar(e, q)}
              className="absolute h-3 w-3 rounded-sm border-2 border-white bg-brand shadow"
              style={{
                left: `${q.x * 100}%`,
                top: `${q.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                cursor: q.cursor,
              }}
            />
          ))}
        </div>

        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
          <Move size={11} /> Arrastra el recuadro o estíralo por las esquinas
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--muted)]">
        En el editor esto se aplica sobre el video, admite también <b>pincel libre</b> y puedes{' '}
        <b>grabar el recorrido</b> de la zona censurada siguiendo con el cursor lo que se mueve,
        incluso a cámara lenta.
      </p>
    </div>
  )
}
