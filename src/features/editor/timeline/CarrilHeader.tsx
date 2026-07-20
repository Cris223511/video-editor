import Icon, { NombreIcono } from '../../../components/ui/Icon'

// cabecera de un carril que no es de video (el de texto y figuras, y el de
// audio). vive en la misma columna izquierda que las cabeceras de las pistas,
// alineada con su fila. a diferencia de las pistas de video no lleva controles
// de silencio ni reordenamiento, porque hoy es un carril único; su papel es
// dejar claro qué tipo de contenido ocupa esa fila. el acento de color en la
// franja y en el icono es lo que la separa de un vistazo de las pistas de video
export default function CarrilHeader({
  icono,
  titulo,
  acento,
  alto,
}: {
  icono: NombreIcono
  titulo: string
  acento: string
  alto: number
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
    </div>
  )
}
