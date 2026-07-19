import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaCensura } from '../../../types/layers'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import MotionControls from './MotionControls'

// panel de censura: forma (círculo, rectángulo o pincel), efecto (pixelar,
// difuminar o transparente), intensidad y recorrido. con el pincel se dibuja la
// máscara libremente sobre el video
export default function CensuraPanel() {
  const capas = useEditorStore((s) => s.capas)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const agregarCensura = useEditorStore((s) => s.agregarCensura)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)
  const dibujando = useEditorStore((s) => s.dibujandoMascara)
  const setDibujando = useEditorStore((s) => s.setDibujandoMascara)
  const limpiarTrazos = useEditorStore((s) => s.limpiarTrazos)

  const capa = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'censura') as
    | CapaCensura
    | undefined

  function editar<K extends keyof CapaCensura>(campo: K, valor: CapaCensura[K]) {
    if (capa) actualizarCapa(capa.id, { [campo]: valor } as Partial<CapaCensura>)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={agregarCensura}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
      >
        <Icon name="mas" size={16} /> Agregar censura
      </button>

      {!capa ? (
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">
          Añade una censura para tapar caras o datos. Elige la forma y el efecto, colócala en el visor
          y, si el elemento se mueve, graba su recorrido con el cursor.
        </p>
      ) : (
        <>
          <Campo etiqueta="Forma">
            <Segmentado
              valor={capa.forma}
              opciones={[
                { valor: 'circulo', etiqueta: 'Círculo' },
                { valor: 'rectangulo', etiqueta: 'Rect.' },
                { valor: 'pincel', etiqueta: 'Pincel' },
              ]}
              onChange={(v) => editar('forma', v)}
            />
          </Campo>

          <Campo etiqueta="Efecto">
            <Segmentado
              valor={capa.efecto}
              opciones={[
                { valor: 'pixelar', etiqueta: 'Pixelar' },
                { valor: 'difuminar', etiqueta: 'Difuminar' },
                { valor: 'transparente', etiqueta: 'Tapar' },
              ]}
              onChange={(v) => editar('efecto', v)}
            />
          </Campo>

          {capa.efecto !== 'transparente' && (
            <Campo etiqueta={`Intensidad (${capa.intensidad})`}>
              <Deslizador
                valor={capa.intensidad}
                min={2}
                max={80}
                onChange={(v) => editar('intensidad', v)}
              />
            </Campo>
          )}

          {capa.forma === 'pincel' && (
            <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
              <Campo etiqueta={`Grosor del pincel (${Math.round(capa.grosorPincel * 100)})`}>
                <Deslizador
                  valor={Math.round(capa.grosorPincel * 100)}
                  min={1}
                  max={25}
                  onChange={(v) => editar('grosorPincel', v / 100)}
                />
              </Campo>
              <button
                onClick={() => setDibujando(!dibujando)}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                  dibujando
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'border border-black/10 hover:border-brand hover:text-brand dark:border-white/10',
                ].join(' ')}
              >
                <Icon name="censura" size={16} />
                {dibujando ? 'Dibujando: pinta sobre el video' : 'Dibujar máscara'}
              </button>
              {capa.trazos.length > 0 && (
                <button
                  onClick={() => limpiarTrazos(capa.id)}
                  className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
                >
                  Limpiar trazos
                </button>
              )}
            </div>
          )}

          <MotionControls capa={capa} />

          <button
            onClick={() => quitarCapa(capa.id)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Icon name="papelera" size={16} /> Eliminar censura
          </button>
        </>
      )}
    </div>
  )
}
