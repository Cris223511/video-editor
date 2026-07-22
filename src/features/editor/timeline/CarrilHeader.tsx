import Icon, { NombreIcono } from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'

// cabecera de un carril que no es de video (el de texto y figuras, y el de
// audio). vive en la misma columna izquierda que las cabeceras de las pistas,
// alineada con sus filas. su papel es dejar claro qué tipo de contenido ocupa
// esa sección; el acento de color en la franja y en el icono es lo que la separa
// de un vistazo de las pistas de video. cuando el carril admite varias filas lleva
// además un botón para añadir una más, hasta el tope
export default function CarrilHeader({
  icono,
  titulo,
  acento,
  alto,
  onAgregar,
  puedeAgregar = false,
}: {
  icono: NombreIcono
  titulo: string
  acento: string
  alto: number
  onAgregar?: () => void
  puedeAgregar?: boolean
}) {
  return (
    <div
      className="relative flex items-center gap-2 overflow-hidden rounded-lg pl-3 pr-2"
      style={{
        height: alto,
        background: 'rgb(var(--border) / 0.06)',
      }}
    >
      {/* la franja vertical del color propio del carril es la marca que lo
          diferencia de las pistas de video, que no la llevan */}
      <span
        className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
        style={{ background: acento }}
      />
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
        style={{ background: `${acento}22`, color: acento }}
      >
        <Icon name={icono} size={14} />
      </span>
      <span className="truncate text-[12px] font-medium text-[color:var(--muted)]">{titulo}</span>
      {onAgregar && (
        <Tooltip texto={puedeAgregar ? 'Añadir una fila' : 'Máximo de filas alcanzado'} lado="derecha">
          <button
            onClick={onAgregar}
            disabled={!puedeAgregar}
            aria-label="Añadir una fila a este carril"
            className="interactivo ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-40"
          >
            <Icon name="mas" size={15} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
