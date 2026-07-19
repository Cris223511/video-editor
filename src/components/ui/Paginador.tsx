import { ChevronLeft, ChevronRight } from 'lucide-react'

// decide qué números se muestran. la idea es que siempre se vean el primero, el
// último, el actual y sus dos vecinos, y que los saltos se marquen con puntos.
// se devuelve una lista fija para que la fila no cambie de ancho al navegar, que
// es lo que hace que los botones bailen bajo el cursor
export function paginas(actual: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const lista: (number | '...')[] = [1]
  const desde = Math.max(2, actual - 1)
  const hasta = Math.min(total - 1, actual + 1)

  // cerca del principio o del final conviene enseñar más seguidos de ese lado en
  // lugar de dejar puntos pegados al borde
  if (actual <= 3) {
    lista.push(2, 3, 4, '...', total)
    return lista
  }
  if (actual >= total - 2) {
    lista.push('...', total - 3, total - 2, total - 1, total)
    return lista
  }

  lista.push('...')
  for (let i = desde; i <= hasta; i++) lista.push(i)
  lista.push('...', total)
  return lista
}

export default function Paginador({
  actual,
  total,
  onCambiar,
}: {
  actual: number
  total: number
  onCambiar: (p: number) => void
}) {
  if (total <= 1) return null
  const lista = paginas(actual, total)

  const boton =
    'grid h-9 min-w-9 place-items-center rounded-xl px-2.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-35'

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Paginación">
      <button
        onClick={() => onCambiar(actual - 1)}
        disabled={actual === 1}
        aria-label="Página anterior"
        className={`${boton} text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand hover:shadow-sm`}
        style={{ border: '1px solid rgb(var(--border) / 0.1)' }}
      >
        <ChevronLeft size={16} />
      </button>

      {lista.map((p, i) =>
        p === '...' ? (
          <span
            key={`s-${i}`}
            className="grid h-9 w-7 place-items-center text-sm text-[color:var(--muted)]"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onCambiar(p)}
            aria-current={p === actual ? 'page' : undefined}
            className={[
              boton,
              p === actual
                ? 'text-white shadow-sm'
                : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand hover:shadow-sm',
            ].join(' ')}
            style={
              p === actual
                ? { background: 'rgb(var(--accent-boton))' }
                : { border: '1px solid rgb(var(--border) / 0.1)' }
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onCambiar(actual + 1)}
        disabled={actual === total}
        aria-label="Página siguiente"
        className={`${boton} text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand hover:shadow-sm`}
        style={{ border: '1px solid rgb(var(--border) / 0.1)' }}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
