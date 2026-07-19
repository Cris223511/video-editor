import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

interface Opcion {
  texto: string
  a?: string
  al?: () => void
}

// menú que se abre al pasar el cursor y se cierra al salir, con un pequeño
// retraso al cerrar. sin ese retraso, el hueco entre el botón y el panel basta
// para que el menú se cierre en cuanto bajas el ratón hacia una opción, que es
// el fallo más común de este patrón
const ESPERA_CIERRE = 160

export default function Desplegable({
  etiqueta,
  opciones,
  alineado = 'derecha',
}: {
  etiqueta: string
  opciones: Opcion[]
  alineado?: 'izquierda' | 'derecha'
}) {
  const [abierto, setAbierto] = useState(false)
  const temporizador = useRef(0)

  const abrir = () => {
    window.clearTimeout(temporizador.current)
    setAbierto(true)
  }
  const cerrar = () => {
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setAbierto(false), ESPERA_CIERRE)
  }

  return (
    <div
      className="relative"
      onMouseEnter={abrir}
      onMouseLeave={cerrar}
      onFocus={abrir}
      onBlur={cerrar}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={[
          'flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200',
          abierto ? 'text-[color:var(--text)]' : 'text-[color:var(--muted)]',
        ].join(' ')}
      >
        {etiqueta}
        <ChevronDown
          size={14}
          className="transition-transform duration-300"
          style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* el panel se mantiene montado y solo cambia de estado, así la salida se
          anima igual que la entrada en lugar de desaparecer de golpe */}
      <div
        className={[
          'absolute top-full z-50 min-w-[15rem] pt-2 transition-all duration-200 ease-out',
          alineado === 'derecha' ? 'right-0' : 'left-0',
          abierto
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        ].join(' ')}
      >
        <div
          className="flex flex-col gap-0.5 rounded-2xl p-2 shadow-xl"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.1)',
          }}
        >
          {opciones.map((o, i) =>
            o.a ? (
              <Link
                key={o.texto}
                to={o.a}
                // cada opción entra escalonada, de arriba abajo
                style={{ transitionDelay: abierto ? `${i * 35}ms` : '0ms' }}
                className={[
                  'interactivo rounded-full px-3.5 py-2 text-sm text-[color:var(--muted)] transition-all duration-200',
                  abierto ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
                ].join(' ')}
              >
                {o.texto}
              </Link>
            ) : (
              <button
                key={o.texto}
                onClick={o.al}
                style={{ transitionDelay: abierto ? `${i * 35}ms` : '0ms' }}
                className={[
                  'interactivo rounded-full px-3.5 py-2 text-left text-sm text-[color:var(--muted)] transition-all duration-200',
                  abierto ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
                ].join(' ')}
              >
                {o.texto}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
