import { MouseEvent as ReactMouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import Tooltip from '../../../components/ui/Tooltip'
import { useEditorStore } from '../../../store/useEditorStore'

// cabecera de un nivel de video, en la columna fija de la izquierda. muestra su
// nombre, deja eliminarlo y su borde inferior sirve de tirador para cambiarle el
// alto arrastrando hacia abajo o hacia arriba
export default function PistaHeader({ indice, alto }: { indice: number; alto: number }) {
  const numPistas = useEditorStore((s) => s.numPistas)
  const quitarPista = useEditorStore((s) => s.quitarPista)
  const setAltoPista = useEditorStore((s) => s.setAltoPista)

  function estirar(e: ReactMouseEvent) {
    e.preventDefault()
    const inicioY = e.clientY
    const original = alto
    const mover = (ev: globalThis.MouseEvent) =>
      setAltoPista(indice, original + (ev.clientY - inicioY))
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'ns-resize'
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div
      className="group relative flex items-center gap-1 rounded-l-md px-2"
      style={{ height: alto, background: 'rgb(var(--border) / 0.06)' }}
    >
      <span className="truncate text-[11px] font-medium text-[color:var(--muted)]">
        Video {indice + 1}
      </span>
      {numPistas > 1 && (
        <Tooltip texto="Eliminar este nivel y sus clips">
          <button
            onClick={() => quitarPista(indice)}
            aria-label={`Eliminar nivel ${indice + 1}`}
            className="interactivo ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-[color:var(--muted)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <Trash2 size={13} />
          </button>
        </Tooltip>
      )}
      <div
        onMouseDown={estirar}
        title="Arrastra para cambiar el alto"
        className="absolute inset-x-0 -bottom-0.5 h-1.5 cursor-ns-resize opacity-0 transition-opacity duration-200 hover:opacity-100 group-hover:opacity-60"
        style={{ background: 'rgb(var(--brand) / 0.8)' }}
      />
    </div>
  )
}
