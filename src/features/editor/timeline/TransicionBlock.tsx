import { MouseEvent as ReactMouseEvent } from 'react'
import Tooltip from '../../../components/ui/Tooltip'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'

const NOMBRES: Record<string, string> = {
  fundido: 'Fundido a negro',
  desvanecer: 'Fundir con el anterior',
}

// transición de entrada de un clip, dibujada sobre su borde izquierdo con un
// degradado en diagonal, como en un editor de escritorio. su ancho es la
// duración real, así que se ve cuánto dura; arrastrando su borde derecho se
// alarga o se acorta, sin pasar de la mitad del clip
export default function TransicionBlock({
  clip,
  pxPorSegundo,
}: {
  clip: Clip
  pxPorSegundo: number
}) {
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const { tipo, duracion } = clip.transicion
  if (tipo === 'ninguna' || duracion <= 0) return null

  const ancho = Math.max(duracion * pxPorSegundo, 6)
  const maximo = clip.duracion / 2

  function estirar(e: ReactMouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const inicioX = e.clientX
    const original = duracion

    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - inicioX) / pxPorSegundo
      // entre un mínimo visible y la mitad del clip, para que la transición
      // nunca se coma el plano entero
      const nueva = Math.min(maximo, Math.max(0.1, original + delta))
      setTransicion(clip.id, { duracion: Number(nueva.toFixed(2)) })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <Tooltip texto={`${NOMBRES[tipo] ?? tipo} · ${duracion.toFixed(2)} s`}>
      <div
        className="group/tr absolute left-0 top-0 z-10 h-full"
        style={{ width: ancho }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none h-full w-full"
          style={{
            background:
              'linear-gradient(105deg, rgb(255 255 255 / 0.85) 0%, rgb(255 255 255 / 0.25) 55%, transparent 100%)',
          }}
        />
        {/* tirador para alargar o acortar la transición */}
        <div
          onMouseDown={estirar}
          title="Arrastra para cambiar la duración"
          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/70 opacity-0 transition-opacity duration-200 group-hover/tr:opacity-100"
        />
      </div>
    </Tooltip>
  )
}
