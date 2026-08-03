import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { buscarTransicion } from '../../../lib/transiciones/catalogo'
import { Deslizador } from '../../../components/ui/Controls'

// transición de entrada de un clip, dibujada sobre su borde izquierdo con un
// degradado en diagonal, como en un editor de escritorio. su ancho es la
// duración real, así que se ve cuánto dura; arrastrando su borde derecho se
// alarga o se acorta, sin pasar de la mitad del clip
export default function TransicionBlock({
  clip,
  pxPorSegundo,
  // lado del clip en el que se dibuja. la de entrada abre por la izquierda y la
  // de salida cierra por la derecha, con la cuña reflejada
  lado = 'entrada',
}: {
  clip: Clip
  pxPorSegundo: number
  lado?: 'entrada' | 'salida'
}) {
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const setTransicionSalida = useEditorStore((s) => s.setTransicionSalida)
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const setHerramienta = useEditorStore((s) => s.setHerramienta)
  const esSalida = lado === 'salida'
  const tr = esSalida ? clip.transicionSalida : clip.transicion
  const tipo = tr?.tipo ?? 'ninguna'
  const duracion = tr?.duracion ?? 0
  // duración de la transición del OTRO lado (solo si es una de verdad), para que esta no la cruce
  const otroTr = esSalida ? clip.transicion : clip.transicionSalida
  const otroDur = otroTr && otroTr.tipo !== 'ninguna' && otroTr.tipo !== 'corte' ? otroTr.duracion : 0
  // panel de ajustes del borde, que se abre con el engranaje de la cuña
  const [ajustes, setAjustes] = useState(false)
  const cajaRef = useRef<HTMLDivElement>(null)

  // el borde suave solo tiene sentido en las transiciones que recortan con una forma
  // (barridos, redondeados, puertas...). el catálogo trae su valor por defecto, y el
  // clip lo puede pisar con el suyo propio
  const def = buscarTransicion(tipo)
  const esMascara = def.tecnica === 'mascara'
  const grosorPct = Math.round(((tr?.grosor ?? def.suavizado ?? 0) as number) * 100)

  // cerrar el panel al pulsar fuera o con escape
  useEffect(() => {
    if (!ajustes) return
    const fuera = (e: MouseEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAjustes(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAjustes(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [ajustes])

  if (tipo === 'ninguna' || duracion <= 0) return null

  // ancho mínimo generoso: aunque la transición sea de una décima, la cuña no baja de
  // aquí, para que su tirador quede separado del tirador de recorte del clip y se pueda
  // volver a agarrar y agrandar sin confundirlos
  const ancho = Math.max(duracion * pxPorSegundo, 14)
  // tope fijo de 10 s; si el clip dura menos, manda el clip. además esta transición no puede pasar de
  // lo que deja libre la del otro lado, para que la de inicio y la de final no se crucen. al igualar
  // ambas con shift, el tope es la mitad del clip (las dos juntas caben sin cruzarse)
  const MAX = 10
  const maxIndividual = Math.min(MAX, clip.duracion - otroDur)
  const maxIgual = Math.min(MAX, clip.duracion / 2)

  function aplicar(cambios: Partial<{ duracion: number; grosor: number }>) {
    if (esSalida) setTransicionSalida(clip.id, cambios)
    else setTransicion(clip.id, cambios)
  }

  // el tirador maneja el gesto por eventos de puntero, igual que el clip, y corta la
  // propagación: si se quedara en eventos de ratón, el pointerdown seguiría subiendo
  // hasta el bloque del clip y arrastrar la transición terminaba moviendo el clip entero
  function estirar(e: ReactPointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    // al agarrar el tirador se selecciona el clip y se abre el panel de transiciones, aunque sea con shift
    seleccionar(clip.id)
    setHerramienta('transiciones')
    const inicioX = e.clientX
    const original = duracion

    const mover = (ev: globalThis.PointerEvent) => {
      // la de salida se estira hacia la izquierda, así que su delta va al revés
      const delta = ((ev.clientX - inicioX) / pxPorSegundo) * (esSalida ? -1 : 1)
      // el shift se mira EN VIVO: se puede empezar a arrastrar normal y, al presionar shift a mitad,
      // pasa a igualar ambos lados desde ese momento. manda la que se agarró y la otra la iguala
      const igualar = ev.shiftKey
      const tope = igualar ? maxIgual : maxIndividual
      const nueva = Math.min(tope, Math.max(0.1, original + delta))
      const d = Number(nueva.toFixed(2))
      if (igualar) {
        setTransicion(clip.id, { duracion: d })
        setTransicionSalida(clip.id, { duracion: d })
      } else {
        aplicar({ duracion: d })
      }
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
      <div
        // la cuña no captura el puntero: así, aunque esté encima del borde del clip, el
        // clic la atraviesa y llega al propio clip (para moverlo o recortar su inicio).
        // solo el tirador de duración, más abajo, sí lo captura para estirar la transición
        className={`group/tr pointer-events-none absolute top-0 z-10 h-full ${esSalida ? 'right-0' : 'left-0'}`}
        style={{ width: ancho }}
      >
        {/* cuña diagonal, como la que dibujan los editores de escritorio: se lee de
            un vistazo hacia dónde abre la transición y cuánto ocupa. antes era un
            degradado blanco plano que ensuciaba la miniatura y no decía gran cosa */}
        <div
          className={`pointer-events-none h-full w-full ${esSalida ? 'rounded-r-lg' : 'rounded-l-lg'}`}
          style={{
            background: esSalida
              ? 'linear-gradient(to left, rgb(24 97 255 / 0.55), rgb(24 97 255 / 0.12))'
              : 'linear-gradient(to right, rgb(24 97 255 / 0.55), rgb(24 97 255 / 0.12))',
            clipPath: esSalida ? 'polygon(100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
        <div
          className={`pointer-events-none absolute inset-0 ${esSalida ? 'rounded-r-lg' : 'rounded-l-lg'}`}
          style={
            esSalida
              ? { border: '1px solid rgb(255 255 255 / 0.35)', borderLeft: 'none' }
              : { border: '1px solid rgb(255 255 255 / 0.35)', borderRight: 'none' }
          }
        />

        {/* engranaje de ajustes del borde, solo en las transiciones de forma. aparece
            al pasar el cursor por la cuña; al pulsarlo abre el deslizador del grosor */}
        {esMascara && (
          <div ref={cajaRef} className={`pointer-events-auto absolute top-1 z-20 ${esSalida ? 'left-1' : 'right-1'}`}>
            <button
              type="button"
              title="Ajustar el borde de la transición"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setAjustes((v) => !v)
              }}
              className={`grid h-4 w-4 place-items-center rounded bg-black/45 text-white/90 opacity-0 transition-opacity hover:bg-black/70 group-hover/tr:opacity-100 ${
                ajustes ? 'opacity-100' : ''
              }`}
            >
              <SlidersHorizontal size={11} />
            </button>
            {ajustes && (
              <div
                className="absolute top-5 z-30 w-48 rounded-xl p-3 shadow-xl"
                style={{
                  background: 'rgb(var(--surface))',
                  border: '1px solid rgb(var(--border) / 0.16)',
                  animation: 'fundido-in 0.14s ease-out',
                  [esSalida ? 'left' : 'right']: 0,
                }}
              >
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[color:var(--muted)]">
                  <span>Grosor del borde</span>
                  <span className="tabular-nums text-[color:var(--text)]">{grosorPct}%</span>
                </div>
                {/* de cero (corte duro) a un borde ancho y degradado. cae sobre esta
                    transición del clip, así cada corte puede llevar su propio grosor */}
                <Deslizador
                  valor={grosorPct}
                  min={0}
                  max={40}
                  onChange={(v) => aplicar({ grosor: Number((v / 100).toFixed(3)) })}
                />
              </div>
            )}
          </div>
        )}

        {/* tirador de duración, siempre a la vista para que se sepa que se puede
            estirar sin tener que descubrirlo pasando el cursor por encima */}
        <div
          onPointerDown={estirar}
          className={`pointer-events-auto absolute top-0 flex h-full w-2.5 cursor-ew-resize flex-col items-center justify-between bg-white/80 py-1 transition-colors duration-150 group-hover/tr:bg-white ${esSalida ? 'left-0 rounded-l-sm' : 'right-0 rounded-r-sm'}`}
        >
          <span className="h-2 w-px bg-black/40" />
          <span className="h-2 w-px bg-black/40" />
        </div>
      </div>
  )
}
