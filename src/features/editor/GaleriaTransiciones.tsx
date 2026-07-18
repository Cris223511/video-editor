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

// las mismas dos fotos en todas las muestras: así lo único que cambia entre una
// tarjeta y otra es la transición, y se pueden comparar de verdad. son dos tomas
// porque una transición siempre ocurre entre dos planos
const PLANO_A =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=60'
const PLANO_B =
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=60'

// la muestra se anima solo al pasar el cursor. con todas las tarjetas moviéndose
// a la vez el panel se vuelve un caos y cuesta distinguir qué hace cada una
function Demo({ tipo }: { tipo: TipoTransicion }) {
  return (
    <div className="demo relative aspect-video w-full overflow-hidden rounded-md bg-black">
      {/* plano saliente */}
      <img src={PLANO_A} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {/* plano entrante, animado según la transición */}
      <img
        src={PLANO_B}
        alt=""
        loading="lazy"
        className={`demo-capa demo-${tipo} absolute inset-0 h-full w-full object-cover`}
      />
      {tipo === 'fundido' && <span className="demo-capa demo-negro absolute inset-0 bg-black" />}
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
              'grupo-demo flex flex-col gap-2 rounded-xl p-2 text-left transition-all duration-200',
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
