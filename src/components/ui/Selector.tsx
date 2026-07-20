import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface Opcion {
  valor: string
  etiqueta: string
  estilo?: CSSProperties
  // icono opcional delante del texto. quien no lo pase sigue viendo la línea
  // igual que siempre, sin hueco reservado ni sangría de más
  icono?: ReactNode
}

// selector propio para el editor. sustituye al desplegable nativo, que en cada
// sistema operativo se ve distinto y no admite ningún estilo por dentro. este se
// abre y se cierra con animación, marca la opción elegida y deja aplicar estilos
// a cada línea, que es lo que permite previsualizar una tipografía en su lista
export default function Selector({
  valor,
  opciones,
  onChange,
}: {
  valor: string
  opciones: Opcion[]
  onChange: (v: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // pulsar fuera cierra el menú, igual que espera cualquiera
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  const actual = opciones.find((o) => o.valor === valor)

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-200"
        style={{
          background: 'rgb(var(--border) / 0.06)',
          border: `1px solid rgb(var(--border) / ${abierto ? 0.28 : 0.12})`,
        }}
      >
        {actual?.icono && (
          <span className="grid shrink-0 place-items-center text-[color:var(--muted)]">
            {actual.icono}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate" style={actual?.estilo}>
          {actual?.etiqueta ?? valor}
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 text-[color:var(--muted)] transition-transform duration-300"
          style={{ transform: abierto ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* el panel sigue montado y solo cambia de estado, así la salida se anima
          igual que la entrada en lugar de desaparecer de golpe */}
      <div
        className={[
          'absolute left-0 right-0 top-full z-50 pt-1.5 transition-all duration-200 ease-out',
          abierto
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        ].join(' ')}
      >
        <div
          className="flex max-h-60 flex-col gap-0.5 overflow-y-auto rounded-xl p-1.5 shadow-xl"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.14)',
          }}
        >
          {opciones.map((o, i) => {
            // la entrada escalonada lleva su retardo, pero ese retardo NO debe caer
            // sobre el color del hover: si no, al pasar el cursor la opción tardaba
            // un buen rato en encenderse. por eso se declara la transición a mano,
            // con el retardo solo en opacidad y desplazamiento y el fondo instantáneo
            const retardo = abierto ? `${Math.min(i, 8) * 22}ms` : '0ms'
            return (
            <button
              key={o.valor}
              type="button"
              onClick={() => {
                onChange(o.valor)
                setAbierto(false)
              }}
              style={{
                ...o.estilo,
                transition: `opacity 200ms ease ${retardo}, transform 200ms ease ${retardo}, background-color 110ms ease, color 110ms ease`,
              }}
              className={[
                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-brand/10 hover:text-brand',
                o.valor === valor ? 'text-brand' : 'text-[color:var(--muted)]',
                abierto ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
              ].join(' ')}
            >
              {o.icono && <span className="grid shrink-0 place-items-center">{o.icono}</span>}
              {/* el texto solo ocupa lo suyo. antes llevaba flex-1 y se comía todo
                  el ancho libre, con lo que la marca de elegido acababa pegada al
                  borde contrario y cada línea parecía partida en dos mitades */}
              <span className="min-w-0 truncate">{o.etiqueta}</span>
              {o.valor === valor && <Check size={13} className="shrink-0" />}
            </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
