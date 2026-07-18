import { ReactNode } from 'react'

// pequeños controles reutilizables para los paneles de opciones. se mantienen
// simples y acordes al tema

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[color:var(--muted)]">{etiqueta}</span>
      {children}
    </label>
  )
}

export function Deslizador({
  valor,
  min,
  max,
  paso = 1,
  onChange,
}: {
  valor: number
  min: number
  max: number
  paso?: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={paso}
      value={valor}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full cursor-pointer accent-brand"
    />
  )
}

export function ColorCampo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 shrink-0 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/10"
      />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/10 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-brand dark:border-white/10"
      />
    </div>
  )
}

export function Interruptor({
  etiqueta,
  activo,
  onChange,
}: {
  etiqueta: string
  activo: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!activo)}
      className="flex w-full items-center justify-between"
    >
      <span className="text-sm">{etiqueta}</span>
      <span
        className={[
          'relative h-5 w-9 rounded-full transition-colors',
          activo ? 'bg-brand' : 'bg-black/20 dark:bg-white/20',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            activo ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </button>
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
    <div className="flex gap-1">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={o.titulo}
          onClick={() => onChange(o.valor)}
          className={[
            'flex h-8 flex-1 items-center justify-center rounded-lg border text-sm transition-colors',
            valor === o.valor
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
          ].join(' ')}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
