import Icon, { NombreIcono } from '../../components/ui/Icon'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { formatearDuracion } from '../../lib/format/bytes'
import { Campo, Deslizador, Segmentado } from '../../components/ui/controls'
import TextPanel from './panels/TextPanel'
import ImagePanel from './panels/ImagePanel'
import AudioPanel from './panels/AudioPanel'
import SpeedPanel from './panels/SpeedPanel'
import CensuraPanel from './panels/CensuraPanel'
import TonePanel from './panels/TonePanel'
import LienzoPanel from './panels/LienzoPanel'
import MarcoPanel from './panels/MarcoPanel'
import FiguraPanel from './panels/FiguraPanel'

const herramientas: { id: Herramienta; icono: NombreIcono; etiqueta: string }[] = [
  { id: 'propiedades', icono: 'ajustes', etiqueta: 'Propiedades' },
  { id: 'lienzo', icono: 'lienzo', etiqueta: 'Lienzo' },
  { id: 'marco', icono: 'marco', etiqueta: 'Marco' },
  { id: 'texto', icono: 'texto', etiqueta: 'Texto' },
  { id: 'imagen', icono: 'imagen', etiqueta: 'Imagen' },
  { id: 'figura', icono: 'figura', etiqueta: 'Figura' },
  { id: 'audio', icono: 'audio', etiqueta: 'Audio' },
  { id: 'censura', icono: 'censura', etiqueta: 'Censura' },
  { id: 'velocidad', icono: 'velocidad', etiqueta: 'Velocidad' },
  { id: 'tono', icono: 'tono', etiqueta: 'Tono' },
]

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
      <p className="text-sm leading-relaxed text-[color:var(--muted)]">
        Selecciona un clip en la línea de tiempo para ver y ajustar sus propiedades.
      </p>
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
        <Segmentado
          valor={clip.transicion.tipo}
          opciones={[
            { valor: 'ninguna', etiqueta: 'Ninguna' },
            { valor: 'fundido', etiqueta: 'Fundido' },
            { valor: 'desvanecer', etiqueta: 'Fundir' },
          ]}
          onChange={(v) => setTransicion(clip.id, { tipo: v })}
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
export default function OptionsPanel() {
  const herramienta = useEditorStore((s) => s.herramienta)
  const setHerramienta = useEditorStore((s) => s.setHerramienta)

  const paneles: Record<Herramienta, JSX.Element> = {
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
  }

  return (
    <aside className="flex w-60 shrink-0 border-r border-black/10 md:w-72 dark:border-white/10">
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-black/10 py-2 dark:border-white/10">
        {herramientas.map((h) => (
          <button
            key={h.id}
            onClick={() => setHerramienta(h.id)}
            title={h.etiqueta}
            className={[
              'grid h-12 w-12 place-items-center rounded-lg transition-colors',
              herramienta === h.id
                ? 'bg-brand/10 text-brand'
                : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
            ].join(' ')}
          >
            <Icon name={h.icono} size={19} />
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h2 className="mb-3 text-sm font-semibold">
          {herramientas.find((h) => h.id === herramienta)?.etiqueta}
        </h2>
        {paneles[herramienta]}
      </div>
    </aside>
  )
}
