import { ReactNode, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HexColorPicker } from 'react-colorful'
import { Ayuda } from './Tooltip'

// controles reutilizables de los paneles de opciones. todos comparten el mismo
// radio, la misma reacción al pasar el cursor y la posibilidad de llevar una
// ayuda al lado de su etiqueta, para que nada quede sin explicar

export function Campo({
  etiqueta,
  ayuda,
  valor,
  children,
}: {
  etiqueta: string
  // texto del signo de interrogación, opcional
  ayuda?: string
  // valor actual mostrado a la derecha de la etiqueta, útil en deslizadores
  valor?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-[color:var(--muted)]">{etiqueta}</span>
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

  // un clic fuera cierra la rueda, que es lo que cualquiera espera
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  return (
    <div ref={caja} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
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

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 top-full z-50 mt-2 rounded-xl p-3 shadow-xl"
            style={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.14)',
            }}
          >
            <HexColorPicker color={valor} onChange={onChange} />
          </motion.div>
        )}
      </AnimatePresence>
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
