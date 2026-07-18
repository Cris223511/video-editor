import { TipoTransicion } from '../../types/timeline'

interface Muestra {
  tipo: TipoTransicion
  nombre: string
  descripcion: string
}

const MUESTRAS: Muestra[] = [
  {
    tipo: 'ninguna',
    nombre: 'Corte',
    descripcion: 'Un plano entra justo donde acaba el anterior, sin mezcla.',
  },
  {
    tipo: 'fundido',
    nombre: 'Fundido a negro',
    descripcion: 'El plano nace desde el negro. Va bien para separar escenas.',
  },
  {
    tipo: 'desvanecer',
    nombre: 'Fundir con el anterior',
    descripcion: 'Los dos planos se solapan un momento y uno releva al otro.',
  },
]

// la muestra es una animación real en bucle, no un icono: dos planos de colores
// distintos entrando uno tras otro con la transición que representa la tarjeta,
// para poder comparar de un vistazo cómo se comporta cada una
function Demo({ tipo }: { tipo: TipoTransicion }) {
  const base = 'absolute inset-0 rounded-md'
  return (
    <div className="relative h-16 w-full overflow-hidden rounded-md bg-black">
      {/* plano saliente */}
      <div
        className={base}
        style={{ background: 'linear-gradient(135deg, #1861ff, #4c8dff)' }}
      />
      {/* plano entrante, animado según la transición */}
      <div
        className={base}
        style={{
          background: 'linear-gradient(135deg, #ff3ba7, #ff8a5a)',
          animation: `demo-${tipo} 2.6s ease-in-out infinite`,
        }}
      />
      {tipo === 'fundido' && (
        <div
          className={base}
          style={{ background: '#000', animation: 'demo-negro 2.6s ease-in-out infinite' }}
        />
      )}
    </div>
  )
}

// galería para elegir cómo entra un clip. cada tarjeta se ve funcionando antes
// de aplicarla, que es más útil que leer el nombre y probar a ciegas
export default function GaleriaTransiciones({
  actual,
  onElegir,
}: {
  actual: TipoTransicion
  onElegir: (t: TipoTransicion) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {MUESTRAS.map((m) => {
        const elegida = m.tipo === actual
        return (
          <button
            key={m.tipo}
            onClick={() => onElegir(m.tipo)}
            className={[
              'group flex flex-col gap-2 rounded-xl p-2 text-left transition-all duration-200',
              elegida
                ? 'ring-2 ring-brand'
                : 'ring-1 ring-black/10 hover:ring-brand/50 dark:ring-white/10',
            ].join(' ')}
            style={{ background: 'rgb(var(--border) / 0.05)' }}
          >
            <Demo tipo={m.tipo} />
            <div>
              <span
                className={[
                  'block text-xs font-medium',
                  elegida ? 'text-brand' : '',
                ].join(' ')}
              >
                {m.nombre}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[color:var(--muted)]">
                {m.descripcion}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
