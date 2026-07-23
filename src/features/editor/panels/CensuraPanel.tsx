import { ReactNode, useEffect, useRef } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaCensura } from '../../../types/layers'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import MotionControls from './MotionControls'

// tecla suelta del recordatorio de atajos, con el aspecto de una tecla física
function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="grid min-w-[1.4rem] place-items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--text)]"
      style={{ background: 'rgb(var(--border) / 0.12)', border: '1px solid rgb(var(--border) / 0.16)' }}
    >
      {children}
    </kbd>
  )
}

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

  // la herramienta se abre con un elemento ya puesto y sus controles a la vista.
  // el paso previo que solo describía la herramienta y pedía pulsar un botón
  // estorbaba más de lo que ayudaba
  const yaCreado = useRef(false)
  useEffect(() => {
    // el doble montaje de StrictMode en desarrollo dispararía esto dos veces; el
    // pestillo garantiza que solo nazca un elemento al abrir el panel vacío
    if (yaCreado.current) return
    yaCreado.current = true
    if (!capa) agregarCensura()
    // interesa únicamente el montaje del panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={agregarCensura}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="mas" size={16} /> Agregar otra censura
      </button>

      {capa && (
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

          {/* recordatorio de los atajos de teclado con la censura seleccionada,
              los mismos que se anuncian en la demostración del sitio */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-black/10 p-3 text-[11px] text-[color:var(--muted)] dark:border-white/10">
            <p className="font-semibold text-[color:var(--text)]">Atajos de teclado</p>
            <p className="flex items-center justify-between">
              <span>Mover</span>
              <Tecla>Flechas</Tecla>
            </p>
            <p className="flex items-center justify-between">
              <span>Ancho</span>
              <span className="flex items-center gap-1">
                <Tecla>Alt</Tecla> + <Tecla>←</Tecla> <Tecla>→</Tecla>
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span>Alto</span>
              <span className="flex items-center gap-1">
                <Tecla>Ctrl</Tecla> + <Tecla>↑</Tecla> <Tecla>↓</Tecla>
              </span>
            </p>
          </div>

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
