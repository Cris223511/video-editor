import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaFigura } from '../../../types/layers'
import { Campo, Deslizador, ColorCampo, Interruptor } from '../../../components/ui/Controls'
import MotionControls from './MotionControls'

const FORMAS: { valor: CapaFigura['forma']; etiqueta: string }[] = [
  { valor: 'rectangulo', etiqueta: 'Rectángulo' },
  { valor: 'redondeado', etiqueta: 'Redondeado' },
  { valor: 'elipse', etiqueta: 'Elipse' },
  { valor: 'triangulo', etiqueta: 'Triángulo' },
  { valor: 'estrella', etiqueta: 'Estrella' },
  { valor: 'linea', etiqueta: 'Línea' },
  { valor: 'flecha', etiqueta: 'Flecha' },
]

// panel de figuras: forma, relleno y borde (o color y grosor para línea y
// flecha), opacidad y movimiento
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
      <button
        onClick={agregarFigura}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
      >
        <Icon name="mas" size={16} /> Agregar figura
      </button>

      {!capa ? (
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">
          Añade una figura, una línea o un bloque de color sobre el video. Podrás moverla y
          redimensionarla en el visor y fijar su franja de tiempo.
        </p>
      ) : (
        <>
          <Campo etiqueta="Forma">
            <div className="grid grid-cols-2 gap-2">
              {FORMAS.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => editar('forma', f.valor)}
                  className={[
                    'rounded-lg border py-2 text-sm font-medium transition-colors',
                    capa.forma === f.valor
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
                  ].join(' ')}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
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
