import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import RielHerramientas from './RielHerramientas'
import MediaLibrary from './MediaLibrary'
import Preview from './Preview'
import PlaybackControls from './PlaybackControls'
import OptionsPanel from './OptionsPanel'
import Timeline from './timeline/Timeline'
import BarraGlobales from './BarraGlobales'
import MenuContextual from './MenuContextual'
import ExportDialog from './ExportDialog'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import Loader from '../../components/ui/Loader'
import { useAtajos } from './useAtajos'
import { useAutoguardado } from './useAutoguardado'
import { useRestaurarSesion } from './useRestaurarSesion'
import { useProjectStore } from '../../store/useProjectStore'

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

  // cargador que viene encendido desde la pantalla de importar mientras se
  // prepara el proyecto. se apaga cuando el editor ya está montado y pintado; si
  // hay un video en la pista, el visor lo apaga en cuanto lo tiene listo
  const preparando = useProjectStore((s) => s.preparando)
  useEffect(() => {
    if (!preparando) return
    const t = window.setTimeout(() => useProjectStore.setState({ preparando: false }), 350)
    return () => window.clearTimeout(t)
  }, [preparando])

  useAtajos()
  // el proyecto se guarda solo unos segundos después de cada cambio
  useAutoguardado(true)

  // el visor ocupando toda la ventana. es solo cuestión de vista, así que vive en
  // el componente y no en el store del proyecto
  const [visorCompleto, setVisorCompleto] = useState(false)

  // marca la raíz mientras dura la pantalla completa. de eso cuelga la regla que
  // sube la capa del contenido por encima de la barra superior, que si no se
  // quedaba pintada encima del visor
  useEffect(() => {
    const raiz = document.documentElement
    if (visorCompleto) raiz.classList.add('ve-visor-completo')
    else raiz.classList.remove('ve-visor-completo')
    return () => raiz.classList.remove('ve-visor-completo')
  }, [visorCompleto])
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
    // el editor no deja seleccionar texto al arrastrar por sus paneles ni por el
    // visor, que es lo que se espera de una herramienta de este tipo; los campos
    // de escritura vuelven a permitir selección con una regla aparte en el css
    <div className="editor-noselect h-[calc(100dvh-3.5rem)] p-1.5">
      {preparando && <Loader texto="Preparando tu proyecto..." />}
      {/* el riel de herramientas va a la izquierda de todo y de altura completa,
          como una barra lateral. gracias a eso las dos filas arrancan en la misma
          x y los paneles de la izquierda, opciones arriba y medios abajo, quedan
          del mismo ancho y con el mismo mínimo, alineados sea cual sea el tamaño
          de la ventana, que era el descuadre que se venía arrastrando */}
      <div className="flex h-full gap-1.5">
        <RielHerramientas onElegir={() => !verOpciones && alternar(opciones, false)} />
        <div className="min-w-0 flex-1">
      <PanelGroup direction="vertical" autoSaveId="ve-vertical-4">
        {/* fila superior: opciones y visor */}
        <Panel defaultSize={64} minSize={35}>
          <div className="flex h-full gap-1.5">

            {/* con el panel plegado queda esta pestaña fina en su sitio para
                volver a abrirlo */}
            {!verOpciones && (
              <BarraReabrir titulo="Mostrar el panel" onClick={() => alternar(opciones, false)} />
            )}

            <div className="min-w-0 flex-1">
              <PanelGroup direction="horizontal" autoSaveId="ve-horizontal-4">
                <Panel
                  ref={opciones}
                  id="opciones"
                  order={1}
                  collapsible
                  collapsedSize={0}
                  // mismo default y mismo mínimo que el panel de medios de abajo;
                  // al compartir grupo y ancho, sus bordes coinciden siempre
                  defaultSize={21}
                  minSize={18}
                  maxSize={42}
                  onCollapse={() => setVerOpciones(false)}
                  onExpand={() => setVerOpciones(true)}
                  className={`flex ${suave}`}
                >
                  <OptionsPanel onOcultar={() => alternar(opciones, true)} plegando={plegando} />
                </Panel>

                <Tirador orientacion="vertical" onDobleClic={() => alternar(opciones, verOpciones)} />

                <Panel id="visor" order={2} minSize={30} className={`flex ${suave}`}>
                  {/* el mismo contenedor cambia de vestido al pasar a pantalla
                      completa en lugar de montarse otro aparte. así el visor no se
                      reinicia: el video sigue donde estaba y las capas encima no
                      parpadean. el primer hijo (el visor en sí) se redondea para que
                      la imagen no llegue a tocar los bordes de la pantalla */}
                  <div
                    className={
                      visorCompleto
                        ? 'fixed inset-0 z-[70] flex flex-col overflow-hidden p-6 backdrop-blur-2xl [&>*:first-child]:overflow-hidden [&>*:first-child]:rounded-2xl'
                        : 'panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl'
                    }
                    // el fondo va en el estilo y no en una clase para que no dependa
                    // del tema: a pantalla completa siempre se quiere oscuro, tanto
                    // en claro como en oscuro, y así el video destaca de verdad
                    style={
                      visorCompleto
                        ? { animation: 'fundido-in 0.25s ease-out', background: 'rgb(6 10 20 / 0.94)' }
                        : undefined
                    }
                  >
                    <Preview />
                    <PlaybackControls
                      visorCompleto={visorCompleto}
                      onAlternarCompleto={() => setVisorCompleto((v) => !v)}
                    />
                    {/* a pantalla completa solo cierra la equis, nada de clic al
                        fondo ni escape, que es como se pidió */}
                    {visorCompleto && (
                      <button
                        onClick={() => setVisorCompleto(false)}
                        aria-label="Cerrar la pantalla completa"
                        className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </Panel>

        <Tirador orientacion="horizontal" />

        {/* fila inferior: medios a la izquierda y línea de tiempo al lado */}
        <Panel defaultSize={36} minSize={18}>
          <div className="flex h-full gap-1.5">
            {/* misma pestaña de reapertura que arriba, ahora para los medios */}
            {!verMedios && (
              <BarraReabrir titulo="Mostrar los medios" onClick={() => alternar(medios, false)} />
            )}

            <div className="min-w-0 flex-1">
              <PanelGroup direction="horizontal" autoSaveId="ve-inferior-4">
                <Panel
                  ref={medios}
                  id="medios"
                  order={1}
                  collapsible
                  collapsedSize={0}
                  // mismo default y mínimo que el panel de opciones de arriba
                  defaultSize={21}
                  minSize={18}
                  maxSize={42}
                  onCollapse={() => setVerMedios(false)}
                  onExpand={() => setVerMedios(true)}
                  className={`flex ${suave}`}
                >
                  <MediaLibrary plegando={plegando} />
                </Panel>

                <Tirador orientacion="vertical" onDobleClic={() => alternar(medios, verMedios)} />

                <Panel id="linea" order={2} minSize={40} className={`flex ${suave}`}>
                  <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
                    {/* las opciones de lo que esté elegido, justo encima de la línea
                        de tiempo. si no hay nada seleccionado no se dibuja */}
                    <BarraGlobales />
                    <Timeline
                      onOcultarMedios={() => alternar(medios, verMedios)}
                      mediosVisibles={verMedios}
                    />
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </Panel>
      </PanelGroup>
        </div>
      </div>

      <ExportDialog />
      {/* menú del botón derecho; vive arriba del todo para poder salir por encima
          de cualquier panel sin que lo recorte ninguno */}
      <MenuContextual />
    </div>
  )
}

// pestaña delgada que reemplaza a un panel plegado. ocupa su hueco a la
// izquierda y, al pulsarla, vuelve a desplegarlo. la flecha hacia la derecha y
// el cursor de mano dejan claro que sirve para abrir
function BarraReabrir({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <Tooltip texto={titulo} lado="derecha">
      <button
        type="button"
        onClick={onClick}
        aria-label={titulo}
        className="panel group grid w-6 shrink-0 cursor-pointer place-items-center rounded-xl text-[color:var(--muted)] transition-colors hover:bg-brand/10 hover:text-brand"
      >
        <Icon
          name="desplegar"
          size={16}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>
    </Tooltip>
  )
}

// separador entre paneles. en reposo no se dibuja nada, para que las secciones se
// separen por el aire y no por una raya fija cruzando la pantalla; la línea del
// color de marca solo aparece, y con un fundido suave, al pasar el cursor por la
// junta o mientras se arrastra. la zona sensible es más ancha de lo que se ve.
// la línea no llega hasta los extremos: se retira un trecho en cada punta (RETIRO)
// para que, donde un separador vertical se topa con el horizontal, no se dibuje
// una cruz sino un hueco limpio. el área arrastrable ocupa todo el largo igual
const RETIRO = 12
function Tirador({
  orientacion,
  onDobleClic,
}: {
  orientacion: 'vertical' | 'horizontal'
  // al hacer doble clic sobre el separador se pliega el panel de al lado, un
  // atajo habitual para ganar espacio sin ir a buscar el botón
  onDobleClic?: () => void
}) {
  const esVertical = orientacion === 'vertical'
  return (
    <PanelResizeHandle
      onDoubleClick={onDobleClic}
      className={[
        'group relative shrink-0',
        // algo más de grosor que antes para que las secciones respiren entre sí
        esVertical ? 'w-2.5 cursor-col-resize' : 'h-2.5 cursor-row-resize',
      ].join(' ')}
    >
      {/* el color va siempre puesto y lo que se anima es la opacidad. antes el
          fondo se fijaba en el estilo en línea, que gana a la clase del hover, así
          que la línea se quedaba gris para siempre y el azul no llegaba a verse */}
      <div
        className="absolute inset-0 m-auto rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100"
        style={{
          width: esVertical ? 2 : `calc(100% - ${RETIRO * 2}px)`,
          height: esVertical ? `calc(100% - ${RETIRO * 2}px)` : 2,
          background: 'rgb(var(--brand))',
        }}
      />
    </PanelResizeHandle>
  )
}
