import { MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { Circle, Droplet, Grid2x2, Move, Square } from 'lucide-react'
import { Deslizador } from '../ui/Controls'

// escena de laboratorio, con una persona trabajando: tapar una cara que se
// mueve es exactamente el caso que la censura resuelve. dirección tomada de las
// tres de Pexels ya verificadas en DemoVideo
const CLIP = 'https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4'

// más bajo que antes: a 500 de alto la pieza dominaba la sección entera
const ANCHO = 880
const ALTO = 400

type Efecto = 'pixelar' | 'difuminar'
type Forma = 'rectangulo' | 'circulo'

const EFECTOS: { id: Efecto; nombre: string; icono: JSX.Element }[] = [
  { id: 'pixelar', nombre: 'Pixelar', icono: <Grid2x2 size={13} /> },
  { id: 'difuminar', nombre: 'Difuminar', icono: <Droplet size={13} /> },
]

const FORMAS: { id: Forma; nombre: string; icono: JSX.Element }[] = [
  { id: 'rectangulo', nombre: 'Rectángulo', icono: <Square size={13} /> },
  { id: 'circulo', nombre: 'Círculo', icono: <Circle size={13} /> },
]

// atajos de teclado con los que el editor afina la selección: las flechas la
// desplazan y, sujetando un modificador, ajustan su ancho o su alto. la flecha
// en la leyenda representa las cuatro direcciones
const ATAJOS: { teclas: string[]; texto: string }[] = [
  { teclas: ['←', '→', '↑', '↓'], texto: 'mover' },
  { teclas: ['Alt', '←→'], texto: 'ancho' },
  { teclas: ['Ctrl', '↑↓'], texto: 'alto' },
]

// las cuatro esquinas, con el cursor que corresponde a cada una
const ESQUINAS = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
] as const

// censura interactiva sobre un clip en marcha: se arrastra el recuadro, se
// redimensiona por sus esquinas y se elige forma y efecto. usa la misma técnica
// que el editor, no un filtro que la imite
export default function DemoCensura() {
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const medio = useRef<HTMLVideoElement | null>(null)
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
    const img = medio.current
    if (!c || !ctx || !img || !img.videoWidth) return

    if (c.width !== ANCHO) c.width = ANCHO
    if (c.height !== ALTO) c.height = ALTO
    ctx.clearRect(0, 0, ANCHO, ALTO)
    // recorte que cubre, para no deformar el fotograma
    const e = Math.max(ANCHO / img.videoWidth, ALTO / img.videoHeight)
    const iw = img.videoWidth * e
    const ih = img.videoHeight * e
    const ix = (ANCHO - iw) / 2
    const iy = (ALTO - ih) / 2
    ctx.drawImage(img, ix, iy, iw, ih)

    const x = caja.x * ANCHO
    const y = caja.y * ALTO
    const w = caja.w * ANCHO
    const h = caja.h * ALTO

    if (efecto === 'difuminar') {
      ctx.save()
      recortar(ctx, x, y, w, h)
      ctx.clip()
      ctx.filter = `blur(${Math.max(2, intensidad * 0.6)}px)`
      // se redibuja el fotograma entero recortado a la zona, así el desenfoque
      // toma color de alrededor y no deja un halo en los bordes
      ctx.drawImage(img, ix, iy, iw, ih)
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
      // la zona se toma del propio fotograma, no del lienzo ya pintado: hay que
      // deshacer el recorte de cobertura para saber qué trozo del video cae bajo
      // el recuadro. de paso nadie tiene que releer píxeles de un lienzo que un
      // clip de otro dominio podría haber marcado como contaminado
      octx.drawImage(img, (x - ix) / e, (y - iy) / e, w / e, h / e, 0, 0, pw, ph)
      ctx.save()
      recortar(ctx, x, y, w, h)
      ctx.clip()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(off, 0, 0, pw, ph, x, y, w, h)
      ctx.restore()
    }

    // contorno de la selección: un punteado fino y discreto. antes iba a dos
    // píxeles de grosor y con trazos largos, y sobre el clip se leía como un
    // marco pesado que tapaba el borde de lo que se estaba censurando
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,.85)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    recortar(ctx, x, y, w, h)
    ctx.stroke()
    ctx.restore()
  }

  useEffect(() => {
    auxiliar.current = document.createElement('canvas')
  }, [])

  // el repintado va atado a la pantalla: cada fotograma que el navegador va a
  // mostrar se copia al lienzo y encima se aplica la censura. como pintar()
  // se vuelve a crear en cada render, el bucle se relanza cuando cambian los
  // controles y siempre trabaja con los valores actuales
  useEffect(() => {
    if (!listo) return
    let id = 0
    const ciclo = () => {
      pintar()
      id = requestAnimationFrame(ciclo)
    }
    id = requestAnimationFrame(ciclo)
    return () => cancelAnimationFrame(id)
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
      className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl p-4 shadow-lg sm:p-5"
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
      </div>

      <div className="relative overflow-hidden rounded-xl bg-black">
        {/* la fuente del clip vive fuera de la vista: lo que se enseña es el
            lienzo, que es donde ocurre la censura. queda dentro del documento en
            vez de creado a mano porque así el navegador lo decodifica con
            normalidad y no se arriesga a que lo suspenda */}
        <video
          ref={medio}
          src={CLIP}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          // COOP y COEP dejan fuera cualquier recurso ajeno que no venga por CORS,
          // y de paso el modo anónimo evita que el clip contamine el lienzo, cosa
          // que rompería el pixelado al releer la zona ampliada
          crossOrigin="anonymous"
          onLoadedData={() => setListo(true)}
          aria-hidden
          className="pointer-events-none absolute h-px w-px opacity-0"
        />

        <canvas
          ref={lienzo}
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

      {/* atajos de teclado del editor para afinar la selección sin el ratón:
          las flechas la mueven y, con un modificador, cambian su tamaño. se
          enseñan como leyenda porque la demo se maneja con el ratón, pero en el
          editor la selección responde también al teclado */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[color:var(--muted)]">
        {ATAJOS.map((a) => (
          <span key={a.texto} className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1">
              {a.teclas.map((k, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="opacity-60">+</span>}
                  <kbd
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[color:var(--text)]"
                    style={{
                      background: 'rgb(var(--border) / 0.1)',
                      border: '1px solid rgb(var(--border) / 0.18)',
                      boxShadow: '0 1px 0 rgb(var(--border) / 0.2)',
                    }}
                  >
                    {k}
                  </kbd>
                </span>
              ))}
            </span>
            {a.texto}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--muted)]">
        La zona tapada sigue al clip fotograma a fotograma. En el editor admite además{' '}
        <b>pincel libre</b> y puedes{' '}
        <b>grabar el recorrido</b> de la zona censurada siguiendo con el cursor lo que se mueve,
        incluso a cámara lenta.
      </p>
    </div>
  )
}
