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
        hover ? 'hover:-translate-y-1 hover:shadow-lg' : '',
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
      className="flex gap-3 rounded-xl p-4"
      style={{
        background: 'rgb(var(--accent) / 0.06)',
        border: '1px solid rgb(var(--accent) / 0.16)',
      }}
    >
      <Info size={17} className="mt-0.5 shrink-0 text-brand" />
      <div>
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">{children}</p>
      </div>
    </div>
  )
}

// píldora para etiquetas y nombres de tecnología
export function Chip({ children, activo = false }: { children: ReactNode; activo?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200"
      style={
        activo
          ? { background: 'rgb(var(--accent-boton))', color: '#fff' }
          : {
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.12)',
              color: 'var(--muted)',
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
