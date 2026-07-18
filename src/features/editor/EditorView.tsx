import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import MediaLibrary from './MediaLibrary'
import Preview from './Preview'
import PlaybackControls from './PlaybackControls'
import OptionsPanel from './OptionsPanel'
import Timeline from './timeline/Timeline'
import ExportDialog from './ExportDialog'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useAtajos } from './useAtajos'

// disposición al estilo de un editor de escritorio: opciones a la izquierda,
// visor al centro, y abajo los medios junto a la línea de tiempo. el reparto lo
// lleva react-resizable-panels, que guarda los tamaños entre sesiones y respeta
// los mínimos de cada panel
export default function EditorView() {
  const [verOpciones, setVerOpciones] = useState(true)
  const [verMedios, setVerMedios] = useState(true)

  useAtajos()

  return (
    <div className="h-[calc(100dvh-3.5rem)] p-1.5">
      <PanelGroup direction="vertical" autoSaveId="ve-vertical">
        {/* fila superior: opciones y visor */}
        <Panel defaultSize={68} minSize={35}>
          <PanelGroup direction="horizontal" autoSaveId="ve-horizontal">
            {verOpciones && (
              <>
                <Panel defaultSize={24} minSize={16} maxSize={40} className="flex">
                  <OptionsPanel onOcultar={() => setVerOpciones(false)} />
                </Panel>
                <Tirador orientacion="vertical" />
              </>
            )}
            {!verOpciones && (
              <Pestana titulo="Mostrar opciones" onClick={() => setVerOpciones(true)} />
            )}

            <Panel minSize={30} className="flex">
              <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
                <Preview />
                <PlaybackControls />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <Tirador orientacion="horizontal" />

        {/* fila inferior: medios a la izquierda y línea de tiempo al lado */}
        <Panel defaultSize={32} minSize={18}>
          <PanelGroup direction="horizontal" autoSaveId="ve-inferior">
            {verMedios && (
              <>
                <Panel defaultSize={20} minSize={12} maxSize={38} className="flex">
                  <MediaLibrary />
                </Panel>
                <Tirador orientacion="vertical" />
              </>
            )}
            {!verMedios && <Pestana titulo="Mostrar medios" onClick={() => setVerMedios(true)} />}

            <Panel minSize={40} className="flex">
              <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
                <Timeline
                  onOcultarMedios={() => setVerMedios(!verMedios)}
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

// pestaña estrecha que devuelve un panel oculto
function Pestana({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <Tooltip texto={titulo} lado="derecha">
      <button
        onClick={onClick}
        className="panel interactivo mr-1.5 flex w-7 shrink-0 items-center justify-center rounded-xl text-[color:var(--muted)]"
      >
        <Icon name="atras" size={15} className="rotate-180" />
      </button>
    </Tooltip>
  )
}
