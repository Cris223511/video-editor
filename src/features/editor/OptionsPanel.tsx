import GaleriaTransiciones from './GaleriaTransiciones'
import SinSeleccion from '../../components/ui/SinSeleccion'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useCongelarAncho } from './useCongelarAncho'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'
import { herramientas } from './RielHerramientas'
import { Campo, Deslizador } from '../../components/ui/Controls'
import TextPanel from './panels/TextPanel'
import ImagePanel from './panels/ImagePanel'
import AudioPanel from './panels/AudioPanel'
import SpeedPanel from './panels/SpeedPanel'
import CensuraPanel from './panels/CensuraPanel'
import TonePanel from './panels/TonePanel'
import EffectsPanel from './panels/EffectsPanel'
import ProyectoPanel from './panels/ProyectoPanel'
import LienzoPanel from './panels/LienzoPanel'
import MarcoPanel from './panels/MarcoPanel'
import FiguraPanel from './panels/FiguraPanel'
import TransformarPanel from './panels/TransformarPanel'
import RecortarPanel from './panels/RecortarPanel'

// transiciones del clip seleccionado. los datos del medio (dimensiones, formato)
// se consultan desde el panel de Medios, así que aquí va solo lo de las
// transiciones y la acción de quitar el clip. el encuadre se hace directamente en
// el visor, arrastrando el video y sus tiradores
function Transiciones() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const clips = useEditorStore((s) => s.pista.clips)
  const quitarClip = useEditorStore((s) => s.quitarClip)
  const setTransicion = useEditorStore((s) => s.setTransicion)

  const clip = clips.find((c) => c.id === clipSeleccionado) ?? null

  if (!clip) {
    return (
      <SinSeleccion icono="transiciones" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo o en el visor para elegir con qué transición entra.
      </SinSeleccion>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Transición de entrada</span>
        <GaleriaTransiciones
          actual={clip.transicion.tipo}
          onElegir={(t) => setTransicion(clip.id, { tipo: t })}
        />
        {clip.transicion.tipo !== 'ninguna' && (
          <Campo etiqueta={`Duración (${clip.transicion.duracion.toFixed(1)} s)`}>
            <Deslizador
              valor={Math.round(clip.transicion.duracion * 10)}
              min={2}
              max={20}
              onChange={(v) => setTransicion(clip.id, { duracion: v / 10 })}
            />
          </Campo>
        )}
      </div>

      <button
        onClick={() => quitarClip(clip.id)}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
      >
        <Icon name="papelera" size={16} />
        Quitar clip
      </button>
    </div>
  )
}

// panel derecho contextual. la barra de herramientas cambia el contenido; todas
// las herramientas ya tienen su panel funcionando
export default function OptionsPanel({
  onOcultar,
  plegando = false,
}: {
  onOcultar?: () => void
  plegando?: boolean
}) {
  const herramienta = useEditorStore((s) => s.herramienta)
  // mientras el panel se pliega o despliega, su ancho lo dicta este hook para
  // que el texto no se aplaste: el contenido conserva su ancho y se recorta
  const { ref, estiloAncho } = useCongelarAncho(plegando)

  const paneles: Record<Herramienta, JSX.Element> = {
    proyecto: <ProyectoPanel />,
    transiciones: <Transiciones />,
    lienzo: <LienzoPanel />,
    marco: <MarcoPanel />,
    texto: <TextPanel />,
    imagen: <ImagePanel />,
    figura: <FiguraPanel />,
    audio: <AudioPanel />,
    censura: <CensuraPanel />,
    velocidad: <SpeedPanel />,
    tono: <TonePanel />,
    efectos: <EffectsPanel />,
    transformar: <TransformarPanel />,
    recortar: <RecortarPanel />,
  }

  const actual = herramientas.find((h) => h.id === herramienta)

  return (
    <aside ref={ref} className="panel relative w-full overflow-hidden rounded-xl">
      {/* el bloque va en absoluto y con un ancho controlado: al animarse el panel
          este contenido no se estira ni se comprime, solo se descubre o se tapa */}
      <div
        className="absolute inset-y-0 left-0 flex flex-col"
        style={{ width: estiloAncho }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: '1px solid rgb(var(--border) / 0.1)' }}
        >
          {actual && <Icon name={actual.icono} size={14} className="text-brand" />}
          <h2 className="font-display text-[13px] font-bold">{actual?.etiqueta}</h2>
          {onOcultar && (
            <Tooltip texto="Ocultar el panel" lado="abajo">
              <button
                onClick={onOcultar}
                aria-label="Ocultar el panel"
                className="interactivo -mr-1 ml-auto grid h-7 w-7 place-items-center rounded-lg text-[color:var(--muted)]"
              >
                <Icon name="atras" size={14} />
              </button>
            </Tooltip>
          )}
        </div>
        {/* barra de desplazamiento fina, no la gruesa general: en un panel estrecho
            la ancha se veía tosca */}
        <div className="scroll-modal min-h-0 flex-1 overflow-y-auto p-3">{paneles[herramienta]}</div>
      </div>
    </aside>
  )
}
