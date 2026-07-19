import { useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { TipoTransicion } from '../../types/timeline'
import {
  CATALOGO,
  filtrar,
  Grupo,
  NOMBRES_GRUPO,
  Transicion,
} from '../../lib/transiciones/catalogo'
import { pintarTransicion } from '../../lib/transiciones/pintar'
import { Clip } from '../../types/timeline'

// las mismas dos fotos en todas las muestras: así lo único que cambia entre una
// tarjeta y otra es la transición, y se pueden comparar de verdad
const PLANO_A =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=60'
const PLANO_B =
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=60'

const ANCHO = 240
const ALTO = 135

// clips de mentira para poder reutilizar el mismo motor que dibuja de verdad.
// así la muestra no es una imitación: es la transición real ejecutada sobre dos
// fotos en lugar de sobre dos videos
function clipFalso(id: string, tipo: TipoTransicion, inicio: number): Clip {
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

// muestra de una transición. dibuja en su propio lienzo y solo se anima cuando
// el cursor está encima: con todas las tarjetas moviéndose a la vez el panel se
// vuelve ilegible
function Demo({ t, imagenes }: { t: Transicion; imagenes: HTMLImageElement[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const bucle = useRef(0)

  function dibujar(p: number) {
    const lienzo = ref.current
    const ctx = lienzo?.getContext('2d')
    if (!lienzo || !ctx || imagenes.length < 2) return
    ctx.clearRect(0, 0, ANCHO, ALTO)
    const entrante = clipFalso('b', t.id, 1)
    const saliente = clipFalso('a', 'ninguna', 0)
    const pintar = (clip: Clip, alfa: number) => {
      const img = clip.id === 'b' ? imagenes[1] : imagenes[0]
      ctx.save()
      ctx.globalAlpha = alfa
      ctx.drawImage(img, 0, 0, ANCHO, ALTO)
      ctx.restore()
    }
    pintarTransicion(ctx, ANCHO, ALTO, entrante, saliente, p, pintar)
  }

  function arrancar() {
    const inicio = performance.now()
    const paso = () => {
      const transcurrido = ((performance.now() - inicio) % 1800) / 1800
      dibujar(transcurrido)
      bucle.current = requestAnimationFrame(paso)
    }
    bucle.current = requestAnimationFrame(paso)
  }

  function parar() {
    cancelAnimationFrame(bucle.current)
    // al soltar se queda el primer plano quieto, que es el estado en reposo
    dibujar(0)
  }

  return (
    <canvas
      ref={(el) => {
        if (el && imagenes.length >= 2) {
          el.width = ANCHO
          el.height = ALTO
          setTimeout(() => dibujar(0), 0)
        }
      }}
      onMouseEnter={arrancar}
      onMouseLeave={parar}
      className="aspect-video w-full rounded-md bg-black"
    />
  )
}

// galería para elegir cómo entra un clip, con buscador y secciones. cada muestra
// ejecuta la transición de verdad sobre dos fotos, no una imitación en css
export default function GaleriaTransiciones({
  actual,
  onElegir,
}: {
  actual: TipoTransicion
  onElegir: (t: TipoTransicion) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [imagenes, setImagenes] = useState<HTMLImageElement[]>([])

  // las dos fotos se cargan una sola vez y las comparten todas las muestras
  useMemo(() => {
    let vivas = 0
    const cargadas: HTMLImageElement[] = []
    ;[PLANO_A, PLANO_B].forEach((src, i) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        cargadas[i] = img
        if (++vivas === 2) setImagenes([cargadas[0], cargadas[1]])
      }
      img.src = src
    })
  }, [])

  const resultados = useMemo(() => filtrar(busqueda), [busqueda])
  const grupos = useMemo(() => {
    const mapa = new Map<Grupo, Transicion[]>()
    for (const t of resultados) {
      if (!mapa.has(t.grupo)) mapa.set(t.grupo, [])
      mapa.get(t.grupo)!.push(t)
    }
    return [...mapa.entries()]
  }, [resultados])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
        />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar transiciones"
          spellCheck={false}
          className="w-full rounded-lg py-2 pl-8 pr-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand"
          style={{
            background: 'rgb(var(--border) / 0.07)',
            border: '1px solid rgb(var(--border) / 0.1)',
          }}
        />
      </div>

      {resultados.length === 0 && (
        <p className="py-6 text-center text-xs text-[color:var(--muted)]">
          Ninguna transición coincide con <b>{busqueda}</b>.
        </p>
      )}

      {grupos.map(([grupo, lista]) => (
        <div key={grupo}>
          <p className="mb-2 text-xs font-semibold text-[color:var(--muted)]">
            {NOMBRES_GRUPO[grupo]}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {lista.map((t) => {
              const elegida = t.id === actual
              return (
                <button
                  key={t.id}
                  onClick={() => onElegir(t.id)}
                  title={t.descripcion}
                  className={[
                    'flex flex-col gap-1.5 rounded-xl p-1.5 text-left transition-all duration-200',
                    elegida
                      ? 'ring-2 ring-brand'
                      : 'ring-1 ring-black/10 hover:ring-brand/50 dark:ring-white/10',
                  ].join(' ')}
                  style={{ background: 'rgb(var(--border) / 0.05)' }}
                >
                  <Demo t={t} imagenes={imagenes} />
                  <span
                    className={[
                      'truncate px-0.5 text-[11px] font-medium',
                      elegida ? 'text-brand' : '',
                    ].join(' ')}
                  >
                    {t.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-[11px] text-[color:var(--muted)]">
        {CATALOGO.length} transiciones disponibles. Pasa el cursor por una muestra para verla en
        movimiento.
      </p>
    </div>
  )
}
