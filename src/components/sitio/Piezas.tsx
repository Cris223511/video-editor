import { ReactNode } from 'react'
import { Info } from 'lucide-react'

// tarjeta blanca de borde suave y esquinas redondeadas, la base de casi todo el
// sitio. con `hover` activo se levanta un poco al pasar el cursor
export function Tarjeta({
  children,
  hover = false,
  className = '',
}: {
  children: ReactNode
  hover?: boolean
  className?: string
}) {
  return (
    <div
      className={[
        'rounded-2xl p-5 transition-all duration-300',
        hover ? 'hover:-translate-y-1 hover:shadow-[0_10px_28px_rgb(21_52_102_/_0.12)]' : '',
        className,
      ].join(' ')}
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      {children}
    </div>
  )
}

// recuadro de aviso con icono, para destacar algo que conviene leer. en el sitio
// se usa sobre todo para explicar que nada sale del equipo
export function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div
      className="flex gap-3.5 rounded-2xl p-4 sm:p-5"
      style={{
        background: 'rgb(var(--accent) / 0.05)',
        border: '1px solid rgb(var(--accent) / 0.14)',
      }}
    >
      {/* el icono y el fondo tenue bastan para que se lea como aviso; la franja
          lateral que había antes ensuciaba el borde */}
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{
          background: 'linear-gradient(140deg, rgb(var(--accent-boton)), rgb(var(--accent-soft)))',
        }}
      >
        <Info size={17} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-sm font-bold">{titulo}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">{children}</p>
      </div>
    </div>
  )
}

// píldora para etiquetas y nombres de tecnología. `destacado` la pinta con el
// azul de la marca sobre un celeste suave, que es lo que lleva la etiqueta de
// encima del título de la portada: ahí la píldora gris se perdía contra el fondo
export function Chip({
  children,
  activo = false,
  destacado = false,
}: {
  children: ReactNode
  activo?: boolean
  destacado?: boolean
}) {
  const resaltada = {
    background: 'rgb(var(--accent) / 0.14)',
    border: '1px solid rgb(var(--accent) / 0.28)',
    // el texto no usa el azul del enlace sino su versión pensada para leerse
    // sobre fondo, así el contraste aguanta en claro y en oscuro
    color: 'rgb(var(--accent-texto))',
    // un halo tenue del propio azul la despega del fondo; sin él la píldora
    // destacada quedaba plana frente a las grises, que sí llevan sombra
    boxShadow: '0 4px 14px rgb(var(--accent) / 0.20)',
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-200',
        destacado ? 'font-semibold' : 'font-medium',
      ].join(' ')}
      style={
        destacado
          ? resaltada
          : activo
          ? { background: 'rgb(var(--accent-boton))', color: '#fff' }
          : {
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.1)',
              color: 'var(--muted)',
              // sombra apenas insinuada, para que la píldora se despegue del
              // fondo sin parecer un botón
              boxShadow: '0 1px 2px rgb(21 52 102 / 0.07), 0 2px 6px rgb(21 52 102 / 0.05)',
            }
      }
    >
      {children}
    </span>
  )
}

// icono dentro de un círculo azul, el que encabeza cada capacidad en la portada
export function IconoCirculo({ children }: { children: ReactNode }) {
  return (
    <span
      className="grid h-12 w-12 place-items-center rounded-full text-white shadow-sm"
      style={{ background: 'linear-gradient(140deg, rgb(var(--accent-boton)), rgb(var(--accent-soft)))' }}
    >
      {children}
    </span>
  )
}

// rejilla vertical muy tenue para el fondo de la portada. va detrás de todo y no
// intercepta el cursor
export function RejillaFondo() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgb(var(--border) / 0.05) 1px, transparent 1px)',
        backgroundSize: '78px 100%',
        maskImage: 'linear-gradient(to bottom, black, transparent 72%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 72%)',
      }}
    />
  )
}
