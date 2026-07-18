import { X } from 'lucide-react'
import Tooltip from '../../../components/ui/Tooltip'
import { useEditorStore } from '../../../store/useEditorStore'

// espacio vacío entre dos clips. en reposo se insinúa con unas rayas tenues, y
// al pasar el cursor aparece el botón que lo cierra, adelantando todo lo que
// viene después. así no hace falta arrastrar los clips a mano para pegarlos
export default function Hueco({
  desde,
  hasta,
  pista,
  pxPorSegundo,
}: {
  desde: number
  hasta: number
  pista: number
  pxPorSegundo: number
}) {
  const cerrarHueco = useEditorStore((s) => s.cerrarHueco)
  const ancho = (hasta - desde) * pxPorSegundo
  // por debajo de unos pocos píxeles no merece la pena mostrarlo
  if (ancho < 6) return null

  return (
    <div
      className="group absolute top-0 h-full"
      style={{ left: desde * pxPorSegundo, width: ancho }}
    >
      <div
        className="absolute inset-y-2 left-0 right-0 rounded-md border border-dashed transition-colors duration-200 group-hover:border-brand/70 group-hover:bg-brand/10"
        style={{ borderColor: 'rgb(var(--border) / 0.25)' }}
      />
      <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Tooltip texto="Cerrar este hueco">
          <button
            onClick={(e) => {
              e.stopPropagation()
              cerrarHueco(desde, pista)
            }}
            aria-label="Cerrar hueco"
            className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white shadow-md transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <X size={13} />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
