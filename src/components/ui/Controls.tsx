import { ReactNode, useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Ayuda } from './Tooltip'

// estilo común de los botones que agregan un elemento (texto, censura, figura,
// dibujo). van con nuestro celeste primario relleno, igual en claro y en oscuro,
// en vez del fondo blanco de borde fino que se veía básico
export const BOTON_AGREGAR =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95'

// controles reutilizables de los paneles de opciones. todos comparten el mismo
// radio, la misma reacción al pasar el cursor y la posibilidad de llevar una
// ayuda al lado de su etiqueta, para que nada quede sin explicar

export function Campo({
  etiqueta,
  ayuda,
  valor,
  obligatorio = false,
  children,
}: {
  etiqueta: string
  // texto del signo de interrogación, opcional
  ayuda?: string
  // valor actual mostrado a la derecha de la etiqueta, útil en deslizadores
  valor?: ReactNode
  // marca el campo como obligatorio con un asterisco rojo, para distinguirlo de
  // los que se pueden dejar en blanco sin más
  obligatorio?: boolean
  children: ReactNode
}) {
  // la etiqueta acaba en dos puntos salvo que ya traiga su propio signo final
  const rotulo = /[:?]$/.test(etiqueta.trim()) ? etiqueta : `${etiqueta}:`
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-[color:var(--muted)]">
          {rotulo}
          {obligatorio && (
            <span className="ml-0.5 font-semibold" style={{ color: 'rgb(var(--alerta))' }} title="Obligatorio">
              *
            </span>
          )}
        </span>
        {ayuda && <Ayuda texto={ayuda} />}
        {valor !== undefined && (
          <span className="ml-auto text-xs font-semibold tabular-nums text-[color:var(--text)]">
            {valor}
          </span>
        )}
      </span>
      {children}
    </label>
  )
}

export function Deslizador({
  valor,
  min,
  max,
  paso = 1,
  imanes,
  onChange,
}: {
  valor: number
  min: number
  max: number
  paso?: number
  // valores a los que el deslizador se pega cuando pasa cerca. en un control
  // corto cada píxel vale varias unidades, así que sin esto es imposible clavar
  // el 100 a mano: se queda en 97 o en 101 por mucho cuidado que se ponga
  imanes?: number[]
  onChange: (v: number) => void
}) {
  // umbral de enganche proporcional al recorrido, para que se sienta igual de
  // firme en un rango corto que en uno largo
  const umbral = Math.max(1, (max - min) * 0.02)
  const pegar = (v: number) => {
    if (!imanes?.length) return v
    let mejor = v
    let dist = Infinity
    for (const m of imanes) {
      const d = Math.abs(m - v)
      if (d < dist && d <= umbral) {
        dist = d
        mejor = m
      }
    }
    return mejor
  }
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={paso}
      value={valor}
      onChange={(e) => onChange(pegar(Number(e.target.value)))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand"
      style={{
        background: `linear-gradient(to right, rgb(var(--accent)) ${
          ((valor - min) / (max - min)) * 100
        }%, rgb(var(--border) / 0.18) ${((valor - min) / (max - min)) * 100}%)`,
      }}
    />
  )
}

// selector de color con la rueda de react-colorful, que se despliega al pulsar
// la muestra. al lado queda el código hexadecimal, editable a mano
export function ColorCampo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  // color que muestra la rueda mientras se arrastra. se mantiene local y se vuelca
  // al proyecto acompasado a los fotogramas, no en cada micro-movimiento del cursor.
  // así el resto de la app deja de re-renderizarse a lo loco durante el arrastre
  const [local, setLocal] = useState(valor)
  const raf = useRef<number | null>(null)

  // cuando el valor llega de fuera (deshacer, otro control) la rueda se pone al día
  useEffect(() => {
    setLocal(valor)
  }, [valor])

  // vuelca al proyecto una sola vez por fotograma como mucho, para no atragantar la
  // app durante un arrastre continuo
  function empujar(v: string) {
    setLocal(v)
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      onChange(v)
    })
  }

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // la rueda se cierra solo con Escape o con un clic fuera de ella. nunca por soltar
  // el cursor a media edición: por eso el botón de la muestra solo abre (ver abajo),
  // así el clic que a veces genera el navegador al terminar un arrastre no la cierra
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  return (
    <div ref={caja} className="relative flex items-center gap-2">
      {/* la muestra solo ABRE la rueda; cerrar es cosa de Escape o de un clic fuera.
          al terminar un arrastre dentro de la rueda el navegador dispara a veces un
          clic sobre esta muestra, y si aquí se alternara, ese clic la cerraba sola */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Elegir color"
        className="h-9 w-11 shrink-0 rounded-lg border transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: valor, borderColor: 'rgb(var(--border) / 0.2)' }}
      />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus:border-brand"
        style={{ borderColor: 'rgb(var(--border) / 0.15)' }}
      />

      {/* el desplegable va con una animación de entrada por css, no con
          AnimatePresence: bajo los re-renders rápidos del arrastre, el montaje y
          desmontaje de framer-motion llegaba a sacar la rueda de en medio */}
      {abierto && (
        <div
          className="absolute left-0 top-full z-50 mt-2 rounded-xl p-3 shadow-xl"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.14)',
            animation: 'fundido-in 0.16s ease-out',
          }}
        >
          <HexColorPicker color={local} onChange={empujar} />
        </div>
      )}
    </div>
  )
}

export function Interruptor({
  etiqueta,
  ayuda,
  activo,
  onChange,
}: {
  etiqueta: string
  ayuda?: string
  activo: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="flex items-center gap-1.5">
        <span className="text-sm">{etiqueta}</span>
        {ayuda && <Ayuda texto={ayuda} />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onChange(!activo)}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        style={{
          background: activo ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.22)',
        }}
      >
        <span
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: activo ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: T; etiqueta: ReactNode; titulo?: string }[]
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div
      className="flex gap-1 rounded-xl p-1"
      style={{ background: 'rgb(var(--border) / 0.07)' }}
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={o.titulo}
          onClick={() => onChange(o.valor)}
          className={[
            'flex h-8 flex-1 items-center justify-center rounded-lg text-sm transition-colors duration-100',
            valor === o.valor
              ? 'bg-brand text-white shadow-sm'
              : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
          ].join(' ')}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
