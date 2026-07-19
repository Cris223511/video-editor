import { ReactNode } from 'react'

// estado vacío reutilizable. antes cada pantalla lo resolvía a su manera, así
// que unas salían con fondo gris y otras con un párrafo suelto. la caja va
// blanca con su relleno y el borde discontinuo queda dentro, no en el exterior,
// que es lo que hace que se lea como una zona por llenar y no como un aviso
export default function Vacio({
  icono,
  titulo,
  children,
  accion,
  compacto = false,
}: {
  icono: ReactNode
  titulo: string
  children?: ReactNode
  accion?: ReactNode
  compacto?: boolean
}) {
  return (
    <div
      className={compacto ? 'rounded-2xl p-2' : 'rounded-3xl p-3'}
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div
        className={[
          'flex flex-col items-center justify-center rounded-2xl text-center',
          compacto ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        ].join(' ')}
        // trazo de dos píxeles: a uno solo el punteado casi no se distingue de
        // una línea continua y el recuadro perdía su carácter de zona por llenar
        style={{ border: '2px dashed rgb(var(--border) / 0.22)' }}
      >
        <span
          className={[
            'grid place-items-center rounded-2xl text-brand',
            compacto ? 'h-12 w-12' : 'h-16 w-16',
          ].join(' ')}
          style={{ background: 'rgb(var(--accent) / 0.1)' }}
        >
          {icono}
        </span>
        <p className={['font-display font-bold', compacto ? 'text-sm' : 'text-base'].join(' ')}>
          {titulo}
        </p>
        {children && (
          <p className="max-w-md text-sm leading-relaxed text-[color:var(--muted)]">{children}</p>
        )}
        {accion && <div className="mt-2">{accion}</div>}
      </div>
    </div>
  )
}
