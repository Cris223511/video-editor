import Icon from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
import { useEditorStore } from '../../../store/useEditorStore'

// espacio vacío entre dos clips. se delata con un rayado diagonal para que se lea
// como un hueco a la primera, y en su centro lleva una papelera que lo cierra:
// al pulsarla, lo que viene después se adelanta y, gracias al suavizado de la
// posición de los clips, se desliza hasta pegarse sin dejar el espacio
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
      {/* franja rayada: unas diagonales tenues que se aclaran al pasar el cursor,
          con los bordes redondeados para que no corte de golpe contra los clips */}
      <div
        className="absolute inset-y-2 left-0 right-0 overflow-hidden rounded-md border transition-colors duration-200 group-hover:border-brand/50"
        style={{
          borderColor: 'rgb(var(--border) / 0.22)',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgb(var(--border) / 0.16) 0, rgb(var(--border) / 0.16) 1.5px, transparent 1.5px, transparent 7px)',
        }}
      />
      {/* papelera centrada sobre el rayado. crece un poco al acercar el cursor y
          se hunde al pulsar, para que el gesto se sienta. solo aparece si el hueco
          da sitio a botón; en huecos muy finos se deja solo el rayado */}
      {ancho >= 18 && (
        <div className="absolute inset-0 grid place-items-center">
          <Tooltip texto="Cerrar este hueco">
            <button
              onClick={(e) => {
                e.stopPropagation()
                cerrarHueco(desde, pista)
              }}
              aria-label="Cerrar hueco"
              className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white opacity-80 shadow-md transition-all duration-200 hover:scale-110 hover:opacity-100 active:scale-95"
            >
              <Icon name="papelera" size={13} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
