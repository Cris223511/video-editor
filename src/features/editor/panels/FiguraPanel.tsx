import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaFigura } from '../../../types/layers'
import { Campo, Deslizador, ColorCampo, Interruptor } from '../../../components/ui/Controls'
import MotionControls from './MotionControls'

// dato que viaja al arrastrar una forma desde el panel hasta el visor. lleva el
// nombre de la forma; al soltarla, el visor crea la figura donde cayó el cursor
export const TIPO_FIGURA = 'application/x-ve-figura'

const FORMAS: { valor: CapaFigura['forma']; etiqueta: string }[] = [
  { valor: 'rectangulo', etiqueta: 'Rectángulo' },
  { valor: 'redondeado', etiqueta: 'Redondeado' },
  { valor: 'elipse', etiqueta: 'Elipse' },
  { valor: 'triangulo', etiqueta: 'Triángulo' },
  { valor: 'estrella', etiqueta: 'Estrella' },
  { valor: 'linea', etiqueta: 'Línea' },
  { valor: 'flecha', etiqueta: 'Flecha' },
]

// dibujito de cada forma en un lienzo de 32 por 32. es solo una miniatura para
// reconocer la forma de un vistazo, no la figura real que termina en el video
function FormaSVG({ forma }: { forma: CapaFigura['forma'] }) {
  const trazo = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
      {forma === 'rectangulo' && <rect x="5" y="8" width="22" height="16" {...trazo} />}
      {forma === 'redondeado' && <rect x="5" y="8" width="22" height="16" rx="5" {...trazo} />}
      {forma === 'elipse' && <ellipse cx="16" cy="16" rx="12" ry="8" {...trazo} />}
      {forma === 'triangulo' && <path d="M16 5 L28 26 L4 26 Z" {...trazo} />}
      {forma === 'estrella' && (
        <path
          d="M16 4 L19.5 12.4 L28.5 13 L21.6 18.9 L23.8 27.6 L16 22.8 L8.2 27.6 L10.4 18.9 L3.5 13 L12.5 12.4 Z"
          {...trazo}
        />
      )}
      {forma === 'linea' && <line x1="5" y1="26" x2="27" y2="6" {...trazo} />}
      {forma === 'flecha' && (
        <path d="M5 26 L27 6 M27 6 L18 6 M27 6 L27 15" {...trazo} />
      )}
    </svg>
  )
}

// cuadrícula de formas: cada celda agrega la figura al centro con un clic y se
// puede arrastrar hasta el visor para soltarla en un punto concreto
function RejillaFormas({
  agregar,
  actual,
}: {
  agregar: (forma: CapaFigura['forma']) => void
  actual?: CapaFigura['forma']
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {FORMAS.map((f) => {
        const activa = f.valor === actual
        return (
          <button
            key={f.valor}
            onClick={() => agregar(f.valor)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TIPO_FIGURA, f.valor)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            title={`${f.etiqueta} · haz clic o arrástrala al visor`}
            className={[
              'group flex aspect-square cursor-grab flex-col items-center justify-center gap-1.5 rounded-xl p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:cursor-grabbing',
              activa
                ? 'bg-brand/10 text-brand ring-2 ring-brand'
                : 'text-[color:var(--muted)] ring-1 ring-black/10 hover:text-brand hover:ring-brand/50 dark:ring-white/10',
            ].join(' ')}
            style={{ background: activa ? undefined : 'rgb(var(--border) / 0.05)' }}
          >
            <FormaSVG forma={f.valor} />
            <span className="text-[11px] font-medium leading-none">{f.etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}

// panel de figuras: las formas se ofrecen ya como opciones arrastrables al visor.
// con una figura seleccionada, aparecen debajo sus ajustes de relleno, borde,
// opacidad y movimiento
export default function FiguraPanel() {
  const capas = useEditorStore((s) => s.capas)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const agregarFigura = useEditorStore((s) => s.agregarFigura)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)

  const capa = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'figura') as
    | CapaFigura
    | undefined

  function editar<K extends keyof CapaFigura>(campo: K, valor: CapaFigura[K]) {
    if (capa) actualizarCapa(capa.id, { [campo]: valor } as Partial<CapaFigura>)
  }

  const esTrazo = capa && (capa.forma === 'linea' || capa.forma === 'flecha')

  return (
    <div className="flex flex-col gap-4">
      {!capa ? (
        <>
          <p className="text-sm leading-relaxed text-[color:var(--muted)]">
            Elige una forma para colocarla sobre el video. Haz clic para agregarla al centro o
            arrástrala hasta el punto exacto del visor.
          </p>
          <RejillaFormas agregar={(f) => agregarFigura(f)} />
        </>
      ) : (
        <>
          <Campo etiqueta="Formas">
            {/* la misma cuadrícula sirve para agregar otra figura o cambiar la
                actual de golpe; la forma en uso queda resaltada */}
            <RejillaFormas agregar={(f) => editar('forma', f)} actual={capa.forma} />
          </Campo>

          {esTrazo ? (
            <>
              <Campo etiqueta="Color">
                <ColorCampo valor={capa.colorRelleno} onChange={(v) => editar('colorRelleno', v)} />
              </Campo>
              <Campo etiqueta={`Grosor (${capa.grosorBorde})`}>
                <Deslizador valor={capa.grosorBorde} min={1} max={60} onChange={(v) => editar('grosorBorde', v)} />
              </Campo>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
                <Interruptor etiqueta="Relleno" activo={capa.relleno} onChange={(v) => editar('relleno', v)} />
                {capa.relleno && (
                  <ColorCampo valor={capa.colorRelleno} onChange={(v) => editar('colorRelleno', v)} />
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
                <Interruptor etiqueta="Borde" activo={capa.borde} onChange={(v) => editar('borde', v)} />
                {capa.borde && (
                  <>
                    <ColorCampo valor={capa.colorBorde} onChange={(v) => editar('colorBorde', v)} />
                    <Campo etiqueta={`Grosor del borde (${capa.grosorBorde})`}>
                      <Deslizador valor={capa.grosorBorde} min={1} max={60} onChange={(v) => editar('grosorBorde', v)} />
                    </Campo>
                  </>
                )}
              </div>
            </>
          )}

          <Campo etiqueta={`Opacidad (${capa.opacidad}%)`}>
            <Deslizador valor={capa.opacidad} min={0} max={100} onChange={(v) => editar('opacidad', v)} />
          </Campo>

          <MotionControls capa={capa} />

          <button
            onClick={() => quitarCapa(capa.id)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Icon name="papelera" size={16} /> Eliminar figura
          </button>
        </>
      )}
    </div>
  )
}
