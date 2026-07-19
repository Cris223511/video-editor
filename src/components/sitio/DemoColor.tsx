import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import RuedaColor from '../ui/RuedaColor'
import { PuntoRueda, RUEDAS_NEUTRAS, Ruedas, tablaCanal } from '../../lib/color/ruedas'

const FOTO =
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=70'

const ZONAS: { campo: keyof Ruedas; etiqueta: string }[] = [
  { campo: 'sombras', etiqueta: 'Sombras' },
  { campo: 'medios', etiqueta: 'Medios' },
  { campo: 'altas', etiqueta: 'Luces' },
]

// las ruedas de verdad del editor, funcionando sobre una foto. no es una
// maqueta: usa el mismo control con captura de puntero y el mismo cálculo de
// tablas por canal que se aplica al video y a la exportación
export default function DemoColor() {
  const [ruedas, setRuedas] = useState<Ruedas>(RUEDAS_NEUTRAS)

  function cambiar(zona: keyof Ruedas, p: PuntoRueda) {
    setRuedas((r) => ({ ...r, [zona]: p }))
  }

  const tocada =
    ruedas !== RUEDAS_NEUTRAS &&
    ZONAS.some((z) => Math.abs(ruedas[z.campo].x) > 0.001 || Math.abs(ruedas[z.campo].y) > 0.001)

  // el filtro svg se reconstruye con las tablas de cada canal, igual que en el
  // editor. así lo que se ve aquí es exactamente la corrección real
  const tablas = useMemo(
    () => [tablaCanal(ruedas, 0), tablaCanal(ruedas, 1), tablaCanal(ruedas, 2)],
    [ruedas],
  )

  return (
    <div
      className="overflow-hidden rounded-2xl p-4 shadow-lg"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div className="relative overflow-hidden rounded-xl bg-black">
        <img
          src={FOTO}
          alt="Toma de ejemplo para corregir el color"
          className="aspect-[16/8] w-full object-cover"
          style={{ filter: tocada ? 'url(#demo-color)' : undefined }}
        />
        {!tocada && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-xs font-medium text-white">
            Arrastra una rueda para corregir esta toma
          </span>
        )}
      </div>

      <svg className="absolute h-0 w-0">
        <defs>
          <filter id="demo-color" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={tablas[0]} />
              <feFuncG type="table" tableValues={tablas[1]} />
              <feFuncB type="table" tableValues={tablas[2]} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className="mt-4 flex items-end justify-between gap-2">
        {ZONAS.map((z) => (
          <RuedaColor
            key={z.campo}
            etiqueta={z.etiqueta}
            valor={ruedas[z.campo]}
            onChange={(p) => cambiar(z.campo, p)}
            diametro={72}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
          El cursor se oculta al arrastrar y el movimiento se afina. Con <b>Shift</b> afinas más y
          con <b>doble clic</b> vuelve al centro.
        </p>
        {tocada && (
          <button
            onClick={() => setRuedas(RUEDAS_NEUTRAS)}
            className="interactivo inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--muted)]"
          >
            <RotateCcw size={12} /> Restablecer
          </button>
        )}
      </div>
    </div>
  )
}
