import GaleriaTransiciones from './GaleriaTransiciones'
import SinSeleccion from '../../components/ui/SinSeleccion'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'
import { herramientas } from './RielHerramientas'
import { useProjectStore } from '../../store/useProjectStore'
import { formatearDuracion } from '../../lib/format/duracion'
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

// propiedades del clip seleccionado, con su transición de entrada
function Propiedades() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const clips = useEditorStore((s) => s.pista.clips)
  const quitarClip = useEditorStore((s) => s.quitarClip)
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const medios = useProjectStore((s) => s.medios)

  const clip = clips.find((c) => c.id === clipSeleccionado) ?? null
  const asset = clip ? medios.find((m) => m.id === clip.assetId) ?? null : null

  if (!clip || !asset) {
    return (
      <SinSeleccion icono="ajustes" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para ver sus datos y elegir con qué transición entra.
      </SinSeleccion>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <img src={asset.miniatura} alt="" className="w-full rounded-lg bg-black/30 object-cover" />
      <div className="text-sm">
        <p className="truncate font-medium">{asset.nombre}</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {asset.ancho}×{asset.alto}
        </p>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-[color:var(--muted)]">Inicio en la pista</dt>
          <dd>{formatearDuracion(clip.inicio)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[color:var(--muted)]">Duración</dt>
          <dd>{formatearDuracion(clip.duracion)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
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
export default function OptionsPanel({ onOcultar }: { onOcultar?: () => void }) {
  const herramienta = useEditorStore((s) => s.herramienta)

  const paneles: Record<Herramienta, JSX.Element> = {
    proyecto: <ProyectoPanel />,
    propiedades: <Propiedades />,
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
  }

  const actual = herramientas.find((h) => h.id === herramienta)

  return (
    <aside className="panel flex w-full min-w-0 overflow-hidden rounded-xl">
      <div className="flex min-w-0 flex-1 flex-col">
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
                className="interactivo -mr-1 ml-auto grid h-7 w-7 place-items-center rounded-lg text-[color:var(--muted)]"
              >
                <Icon name="atras" size={14} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{paneles[herramienta]}</div>
      </div>
    </aside>
  )
}
