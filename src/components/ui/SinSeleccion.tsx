import Icon, { NombreIcono } from './Icon'

// mensaje que muestra un panel cuando todavía no hay nada que ajustar. antes
// cada panel resolvía esto con un párrafo suelto, así que unos se leían como
// aviso y otros como instrucción. con una sola pieza todos dicen lo mismo de la
// misma forma: qué falta y qué hacer para llegar ahí
export default function SinSeleccion({
  icono = 'ajustes',
  titulo,
  children,
}: {
  icono?: NombreIcono
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-2 py-8 text-center">
      <span
        className="grid h-11 w-11 place-items-center rounded-full text-brand"
        style={{ background: 'rgb(var(--accent) / 0.1)' }}
      >
        <Icon name={icono} size={20} />
      </span>
      <p className="font-display text-sm font-bold">{titulo}</p>
      <p className="text-xs leading-relaxed text-[color:var(--muted)]">{children}</p>
    </div>
  )
}
