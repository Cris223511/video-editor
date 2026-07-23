import { MouseEvent as ReactMouseEvent } from 'react'
import Tooltip from '../../../components/ui/Tooltip'
import { Capa } from '../../../types/layers'
import { useEditorStore } from '../../../store/useEditorStore'
import { buscarTransicion } from '../../../lib/transiciones/catalogo'

// cuña de la transición de entrada de una capa, sobre su borde izquierdo. es el
// mismo lenguaje visual que la de los clips de video: su ancho es la duración
// real y se arrastra el tirador para cambiarla, hasta la mitad del elemento
export default function TransicionCapaBlock({
  capa,
  pxPorSegundo,
}: {
  capa: Capa
  pxPorSegundo: number
}) {
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const tr = capa.transicion
  const tipo = tr?.tipo ?? 'ninguna'
  const duracion = tr?.duracion ?? 0
  if (tipo === 'ninguna' || duracion <= 0) return null

  const ancho = Math.max(duracion * pxPorSegundo, 6)
  const maximo = capa.duracion / 2

  function estirar(e: ReactMouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const inicioX = e.clientX
    const original = duracion
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - inicioX) / pxPorSegundo
      const nueva = Math.min(maximo, Math.max(0.1, original + delta))
      actualizarCapa(capa.id, { transicion: { tipo, duracion: Number(nueva.toFixed(2)) } })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <Tooltip texto={`Entrada · ${buscarTransicion(tipo).nombre} · ${duracion.toFixed(2)} s`}>
      <div
        className="group/tr absolute left-0 top-0 z-10 h-full"
        style={{ width: ancho }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none h-full w-full rounded-l-md"
          style={{
            background: 'linear-gradient(to right, rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.1))',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
        <div
          onMouseDown={estirar}
          title="Arrastra para cambiar la duración"
          className="absolute right-0 top-0 flex h-full w-1.5 cursor-ew-resize items-center justify-center rounded-r-sm bg-white/70 transition-colors duration-150 group-hover/tr:bg-white"
        >
          <span className="h-2.5 w-px bg-black/40" />
        </div>
      </div>
    </Tooltip>
  )
}
