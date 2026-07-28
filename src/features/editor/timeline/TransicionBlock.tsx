import { PointerEvent as ReactPointerEvent } from 'react'
import Tooltip from '../../../components/ui/Tooltip'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { nombreTransicion } from '../../../lib/transiciones/catalogo'

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
  const esSalida = lado === 'salida'
  const tr = esSalida ? clip.transicionSalida : clip.transicion
  const tipo = tr?.tipo ?? 'ninguna'
  const duracion = tr?.duracion ?? 0
  if (tipo === 'ninguna' || duracion <= 0) return null

  const ancho = Math.max(duracion * pxPorSegundo, 6)
  const maximo = clip.duracion / 2

  // el tirador maneja el gesto por eventos de puntero, igual que el clip, y corta la
  // propagación: si se quedara en eventos de ratón, el pointerdown seguiría subiendo
  // hasta el bloque del clip y arrastrar la transición terminaba moviendo el clip entero
  function estirar(e: ReactPointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    const inicioX = e.clientX
    const original = duracion

    const mover = (ev: globalThis.PointerEvent) => {
      // la de salida se estira hacia la izquierda, así que su delta va al revés
      const delta = ((ev.clientX - inicioX) / pxPorSegundo) * (esSalida ? -1 : 1)
      // entre un mínimo visible y la mitad del clip, para que la transición
      // nunca se coma el plano entero
      const nueva = Math.min(maximo, Math.max(0.1, original + delta))
      const cambio = { duracion: Number(nueva.toFixed(2)) }
      if (esSalida) setTransicionSalida(clip.id, cambio)
      else setTransicion(clip.id, cambio)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
    <Tooltip texto={`${esSalida ? 'Salida' : 'Entrada'} · ${nombreTransicion(tipo)} · ${duracion.toFixed(2)} s`}>
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
        {/* tirador de duración, siempre a la vista para que se sepa que se puede
            estirar sin tener que descubrirlo pasando el cursor por encima */}
        <div
          onPointerDown={estirar}
          className={`pointer-events-auto absolute top-0 flex h-full w-2 cursor-ew-resize items-center justify-center bg-white/80 transition-colors duration-150 group-hover/tr:bg-white ${esSalida ? 'left-0 rounded-l-sm' : 'right-0 rounded-r-sm'}`}
        >
          <span className="h-3 w-px bg-black/40" />
        </div>
      </div>
    </Tooltip>
  )
}
