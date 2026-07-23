import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import { useState } from 'react'
import { useProjectStore } from '../../../store/useProjectStore'
import { CATEGORIAS_EFECTO, buscarEfecto, esFiltro } from '../../../lib/efectos/catalogo'

// valores de partida al añadir el desenfoque: intensidad media y barrido
// horizontal, que es la dirección más habitual en un travelling
const DESENFOQUE_INICIAL = {
  tipo: 'desenfoque-movimiento' as const,
  intensidad: 40,
  angulo: 0,
}

// panel de efectos del clip seleccionado. de momento solo el desenfoque de
// movimiento, pero la lista está pensada para encadenar varios efectos: cada uno
// se añade, se regula en vivo y se quita por separado
export default function EffectsPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const agregarEfecto = useEditorStore((s) => s.agregarEfecto)
  const actualizarEfecto = useEditorStore((s) => s.actualizarEfecto)
  const quitarEfecto = useEditorStore((s) => s.quitarEfecto)

  const medios = useProjectStore((s) => s.medios)
  const clip = clips.find((c) => c.id === clipSeleccionado)
  const miniatura = clip ? medios.find((m) => m.id === clip.assetId)?.miniatura : undefined

  if (!clip) {
    return (
      <SinSeleccion icono="efectos" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para aplicarle efectos como el desenfoque de movimiento.
      </SinSeleccion>
    )
  }

  const efectos = clip.efectos ?? []

  return (
    <div className="flex flex-col gap-4">
      {efectos.length === 0 && (
        <p className="text-[13px] italic leading-relaxed text-[color:var(--muted)]">
          Todavía no hay ningún efecto en este clip. Añade un desenfoque de movimiento para dar
          sensación de velocidad; se combina sin problema con la cámara lenta.
        </p>
      )}

      {efectos.map((e) => {
        return (
          <div
            key={e.id}
            className="flex flex-col gap-3 rounded-xl border p-3"
            style={{ borderColor: 'rgb(var(--border) / 0.14)' }}
          >
            <div className="flex items-center gap-2">
              <Icon name="efectos" size={15} className="text-brand" />
              <span className="text-sm font-medium">
                {esFiltro(e)
                  ? (buscarEfecto(e.filtro)?.nombre ?? 'Efecto')
                  : 'Desenfoque de movimiento'}
              </span>
              <button
                onClick={() => quitarEfecto(clip.id, e.id)}
                aria-label="Quitar efecto"
                className="interactivo -mr-1 ml-auto grid h-7 w-7 place-items-center rounded-lg text-[color:var(--muted)] hover:text-rose-500"
              >
                <Icon name="papelera" size={15} />
              </button>
            </div>

            <Campo etiqueta="Nivel" valor={e.intensidad}>
              <Deslizador
                valor={e.intensidad}
                min={0}
                max={100}
                onChange={(v) => actualizarEfecto(clip.id, e.id, { intensidad: v })}
              />
            </Campo>

            {/* la dirección y el ángulo solo tienen sentido en el desenfoque; los
                del catálogo se gobiernan únicamente con su nivel */}
            {!esFiltro(e) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[color:var(--muted)]">Dirección</span>
              <Segmentado
                valor={e.angulo >= 45 && e.angulo <= 135 ? 'vertical' : 'horizontal'}
                opciones={[
                  { valor: 'horizontal', etiqueta: 'Horizontal' },
                  { valor: 'vertical', etiqueta: 'Vertical' },
                ]}
                onChange={(v) =>
                  actualizarEfecto(clip.id, e.id, { angulo: v === 'vertical' ? 90 : 0 })
                }
              />
            </div>
            )}

            {!esFiltro(e) && (
            <Campo etiqueta={`Ángulo (${Math.round(e.angulo)}°)`}>
              <Deslizador
                valor={Math.round(e.angulo)}
                min={0}
                max={180}
                onChange={(v) => actualizarEfecto(clip.id, e.id, { angulo: v })}
              />
            </Campo>
            )}
          </div>
        )
      })}

      <button
        onClick={() => agregarEfecto(clip.id, { id: crypto.randomUUID(), ...DESENFOQUE_INICIAL })}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="mas" size={16} /> Añadir desenfoque de movimiento
      </button>

      {/* catálogo. cada muestra enseña el efecto ya puesto sobre el propio
          material; al pasar el cursor sube a su intensidad plena y al salir vuelve
          a la mitad, que es como se aplica al elegirlo */}
      <Catalogo
        miniatura={miniatura}
        onElegir={(id) =>
          agregarEfecto(clip.id, { id: crypto.randomUUID(), tipo: 'filtro', filtro: id, intensidad: 50 })
        }
      />
    </div>
  )
}

// rejilla del catálogo, repartida en subcategorías
function Catalogo({
  miniatura,
  onElegir,
}: {
  miniatura?: string
  onElegir: (id: string) => void
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_EFECTO[0].id)
  const [encima, setEncima] = useState<string | null>(null)
  const actual = CATEGORIAS_EFECTO.find((c) => c.id === categoria) ?? CATEGORIAS_EFECTO[0]
  const fondo = miniatura
    ? { backgroundImage: `url(${miniatura})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {
        backgroundImage:
          'linear-gradient(135deg, #3b82f6 0%, #22d3ee 35%, #a3e635 65%, #fbbf24 100%)',
      }

  return (
    <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
      <span className="text-xs font-medium text-[color:var(--muted)]">Catálogo de efectos</span>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CATEGORIAS_EFECTO.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.id)}
            className={[
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              c.id === categoria ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:text-brand',
            ].join(' ')}
            style={c.id === categoria ? undefined : { background: 'rgb(var(--border) / 0.1)' }}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {actual.efectos.map((e) => (
          <button
            key={e.id}
            onClick={() => onElegir(e.id)}
            onMouseEnter={() => setEncima(e.id)}
            onMouseLeave={() => setEncima(null)}
            title={e.nombre}
            className="group flex flex-col gap-1 text-left"
          >
            <span
              className="block h-12 w-full overflow-hidden rounded-lg border border-black/10 transition-all duration-200 group-hover:border-brand dark:border-white/10"
              style={{ ...fondo, filter: e.css(encima === e.id ? 100 : 50) }}
            />
            <span className="truncate text-[10px] leading-tight text-[color:var(--muted)]">
              {e.nombre}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
