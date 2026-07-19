import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { CATALOGO, Transicion } from '../../lib/transiciones/catalogo'
import { pintarTransicion } from '../../lib/transiciones/pintar'
import { Clip } from '../../types/timeline'

const PLANO_A =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=70'
const PLANO_B =
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=70'

// proporción más baja: a 16 por 9 la pieza se comía la sección entera
const ANCHO = 880
const ALTO = 400
const DURACION = 1500

// una selección corta del catálogo, con una de cada familia. mostrar las
// veintiuna aquí convertiría la sección en un panel de trabajo
const ELEGIDAS = [
  'desvanecer',
  'fundido',
  'barrido-der',
  'circulo',
  'persianas',
  'puertas-h',
  'empujar-izq',
  'acercar',
]

function clipFalso(id: string, tipo: string, inicio: number): Clip {
  return {
    id,
    assetId: id,
    inicio,
    pista: 0,
    duracion: 1,
    recorteInicio: 0,
    duracionFuente: 1,
    velocidad: 1,
    tono: { exposicion: 0, contraste: 0, saturacion: 0, temperatura: 0, tinte: 0 },
    transicion: { tipo, duracion: 1 },
  }
}

// prueba de transiciones sobre dos fotos. no es una imitación: ejecuta el mismo
// motor que aplica la transición al video y a la exportación, así que lo que se
// ve aquí es exactamente lo que hace el editor
export default function DemoTransiciones() {
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const imagenes = useRef<HTMLImageElement[]>([])
  const bucle = useRef(0)
  const [elegida, setElegida] = useState('desvanecer')
  const [listo, setListo] = useState(false)

  const lista = CATALOGO.filter((t) => ELEGIDAS.includes(t.id))

  function dibujar(t: Transicion, p: number) {
    const c = lienzo.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || imagenes.current.length < 2) return
    ctx.clearRect(0, 0, ANCHO, ALTO)
    const pintar = (clip: Clip, alfa: number) => {
      const img = clip.id === 'b' ? imagenes.current[1] : imagenes.current[0]
      ctx.save()
      ctx.globalAlpha = alfa
      ctx.drawImage(img, 0, 0, ANCHO, ALTO)
      ctx.restore()
    }
    pintarTransicion(ctx, ANCHO, ALTO, clipFalso('b', t.id, 1), clipFalso('a', 'ninguna', 0), p, pintar)
  }

  // carga de las dos fotos, una sola vez
  useEffect(() => {
    let vivas = 0
    const cargadas: HTMLImageElement[] = []
    ;[PLANO_A, PLANO_B].forEach((src, i) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        cargadas[i] = img
        if (++vivas === 2) {
          imagenes.current = [cargadas[0], cargadas[1]]
          setListo(true)
        }
      }
      img.src = src
    })
  }, [])

  // reproduce la transición elegida una vez y se queda en el plano final
  function reproducir(id: string) {
    const t = CATALOGO.find((x) => x.id === id)
    if (!t) return
    cancelAnimationFrame(bucle.current)
    const inicio = performance.now()
    const paso = () => {
      const p = Math.min(1, (performance.now() - inicio) / DURACION)
      dibujar(t, p)
      if (p < 1) bucle.current = requestAnimationFrame(paso)
    }
    bucle.current = requestAnimationFrame(paso)
  }

  useEffect(() => {
    if (listo) reproducir(elegida)
    return () => cancelAnimationFrame(bucle.current)
  }, [elegida, listo])

  return (
    <div
      className="overflow-hidden rounded-2xl p-4 shadow-lg sm:p-5"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
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
        <button
          onClick={() => reproducir(elegida)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#13233d] transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <RotateCw size={12} /> Repetir
        </button>
      </div>

      <div className="flex flex-col">
      <p className="mb-2.5 text-xs font-semibold text-[color:var(--muted)]">
        Elige una transición y se aplica al momento
      </p>
      <div className="flex flex-wrap gap-1.5">
        {lista.map((t) => (
          <button
            key={t.id}
            onClick={() => setElegida(t.id)}
            title={t.descripcion}
            className={[
              'rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5',
              t.id === elegida ? 'text-white shadow-sm' : 'text-[color:var(--muted)]',
            ].join(' ')}
            style={
              t.id === elegida
                ? { background: 'rgb(var(--accent-boton))' }
                : { background: 'rgb(var(--border) / 0.07)', border: '1px solid rgb(var(--border) / 0.1)' }
            }
          >
            {t.nombre}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--muted)]">
        Son ocho de las <b>veintiuna</b> disponibles, una por familia. En el editor las tienes todas
        con buscador y muestra en movimiento.
      </p>
      </div>
      </div>
    </div>
  )
}
