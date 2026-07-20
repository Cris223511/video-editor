import { useRef, useState } from 'react'
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import RielHerramientas from './RielHerramientas'
import MediaLibrary from './MediaLibrary'
import Preview from './Preview'
import PlaybackControls from './PlaybackControls'
import OptionsPanel from './OptionsPanel'
import Timeline from './timeline/Timeline'
import ExportDialog from './ExportDialog'
import { useAtajos } from './useAtajos'
import { useAutoguardado } from './useAutoguardado'
import { useRestaurarSesion } from './useRestaurarSesion'

// disposición al estilo de un editor de escritorio: opciones a la izquierda,
// visor al centro, y abajo los medios junto a la línea de tiempo. el reparto lo
// lleva react-resizable-panels, que guarda los tamaños entre sesiones y respeta
// los mínimos de cada panel
export default function EditorView() {
  const opciones = useRef<ImperativePanelHandle>(null)
  const medios = useRef<ImperativePanelHandle>(null)
  const [verOpciones, setVerOpciones] = useState(true)
  const [verMedios, setVerMedios] = useState(true)
  // mientras dura el plegado se deja que el ancho del panel cambie con una
  // transición. fuera de ese momento va sin ella, porque al arrastrar el
  // separador una transición haría que el panel persiguiera al cursor con
  // retraso en lugar de seguirlo
  const [plegando, setPlegando] = useState(false)
  const temporizador = useRef<number>()

  useAtajos()
  // el proyecto se guarda solo unos segundos después de cada cambio
  useAutoguardado(true)
  // al entrar al editor, si no se está trabajando en nada y hay una sesión
  // guardada, se recarga. eso es lo que evita que un refresco deje el editor en
  // blanco con el trabajo aparentemente perdido. la guarda de vacío impide pisar
  // un proyecto recién abierto desde la lista, que ya trae sus medios
  useRestaurarSesion()

  // el plegado se pide al propio panel en lugar de sacarlo del árbol. antes se
  // dejaba de dibujar y react-resizable-panels perdía la correspondencia entre
  // separadores y paneles al volver: el separador quedaba asociado al panel de
  // al lado y arrastrarlo movía el ancho al revés
  function alternar(ref: React.RefObject<ImperativePanelHandle>, visible: boolean) {
    const panel = ref.current
    if (!panel) return
    window.clearTimeout(temporizador.current)
    setPlegando(true)
    if (visible) panel.collapse()
    else panel.expand()
    temporizador.current = window.setTimeout(() => setPlegando(false), 320)
  }

  const suave = plegando ? 'transition-[flex-grow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]' : ''

  return (
    <div className="h-[calc(100dvh-3.5rem)] p-1.5">
      <PanelGroup direction="vertical" autoSaveId="ve-vertical-2">
        {/* fila superior: herramientas, opciones y visor */}
        <Panel defaultSize={64} minSize={35}>
          <div className="flex h-full gap-1.5">
            <RielHerramientas onElegir={() => !verOpciones && alternar(opciones, false)} />

            <div className="min-w-0 flex-1">
              <PanelGroup direction="horizontal" autoSaveId="ve-horizontal-2">
                <Panel
                  ref={opciones}
                  id="opciones"
                  order={1}
                  collapsible
                  collapsedSize={0}
                  defaultSize={22}
                  minSize={16}
                  maxSize={40}
                  onCollapse={() => setVerOpciones(false)}
                  onExpand={() => setVerOpciones(true)}
                  className={`flex ${suave}`}
                >
                  <OptionsPanel onOcultar={() => alternar(opciones, true)} />
                </Panel>

                <Tirador orientacion="vertical" />

                <Panel id="visor" order={2} minSize={30} className={`flex ${suave}`}>
                  <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
                    <Preview />
                    <PlaybackControls />
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </Panel>

        <Tirador orientacion="horizontal" />

        {/* fila inferior: medios a la izquierda y línea de tiempo al lado */}
        <Panel defaultSize={36} minSize={18}>
          <PanelGroup direction="horizontal" autoSaveId="ve-inferior-2">
            <Panel
              ref={medios}
              id="medios"
              order={1}
              collapsible
              collapsedSize={0}
              defaultSize={20}
              minSize={12}
              maxSize={38}
              onCollapse={() => setVerMedios(false)}
              onExpand={() => setVerMedios(true)}
              className={`flex ${suave}`}
            >
              <MediaLibrary />
            </Panel>

            <Tirador orientacion="vertical" />

            <Panel id="linea" order={2} minSize={40} className={`flex ${suave}`}>
              <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
                <Timeline
                  onOcultarMedios={() => alternar(medios, verMedios)}
                  mediosVisibles={verMedios}
                />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      <ExportDialog />
    </div>
  )
}

// separador entre paneles: fino en reposo, azul al pasar el cursor o mientras
// se arrastra, con la zona sensible más ancha de lo que se ve
function Tirador({ orientacion }: { orientacion: 'vertical' | 'horizontal' }) {
  const esVertical = orientacion === 'vertical'
  return (
    <PanelResizeHandle
      className={[
        'group relative shrink-0',
        esVertical ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize',
      ].join(' ')}
    >
      <div
        className="absolute inset-0 m-auto rounded-full transition-colors duration-200 group-hover:bg-brand group-data-[resize-handle-state=drag]:bg-brand"
        style={{
          width: esVertical ? 2 : '100%',
          height: esVertical ? '100%' : 2,
          background: 'rgb(var(--border) / 0.14)',
        }}
      />
    </PanelResizeHandle>
  )
}
