import { useState } from 'react'
import GaleriaTransiciones from './GaleriaTransiciones'
import SinSeleccion from '../../components/ui/SinSeleccion'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/ToastProvider'
import { useCongelarAncho } from './useCongelarAncho'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { herramientas } from './RielHerramientas'
import { Campo, Deslizador } from '../../components/ui/Controls'
import TextPanel from './panels/TextPanel'
import AudioPanel from './panels/AudioPanel'
import SpeedPanel from './panels/SpeedPanel'
import CensuraPanel from './panels/CensuraPanel'
import TonePanel from './panels/TonePanel'
import EffectsPanel from './panels/EffectsPanel'
import ProyectoPanel from './panels/ProyectoPanel'
import LienzoPanel from './panels/LienzoPanel'
import MarcoPanel from './panels/MarcoPanel'
import FiguraPanel from './panels/FiguraPanel'
import DibujarPanel from './panels/DibujarPanel'
import TransformarPanel from './panels/TransformarPanel'
import RecortarPanel from './panels/RecortarPanel'
import BorradorPanel from './panels/BorradorPanel'

// transiciones del clip seleccionado. los datos del medio (dimensiones, formato)
// se consultan desde el panel de Medios, así que aquí va solo lo de las
// transiciones y la acción de quitar el clip. el encuadre se hace directamente en
// el visor, arrastrando el video y sus tiradores
// transición de entrada de la capa elegida. reutiliza la galería de los clips,
// pero aquí la transición se lee como la entrada del propio elemento sobre lo que
// ya hay debajo, no como una mezcla entre dos planos
function TransicionCapa() {
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const capas = useEditorStore((s) => s.capas)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const capa = capas.find((c) => c.id === capaSeleccionada)
  if (!capa) return null

  const trans = capa.transicion ?? { tipo: 'ninguna', duracion: 0.5 }
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Transición de entrada</span>
      <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
        Elige cómo aparece este elemento cuando llega su turno en la línea de tiempo. La duración
        marca cuánto tarda en asentarse.
      </p>
      <GaleriaTransiciones
        actual={trans.tipo}
        onElegir={(t) => actualizarCapa(capa.id, { transicion: { tipo: t, duracion: trans.duracion } })}
      />
      {trans.tipo !== 'ninguna' && (
        <Campo etiqueta={`Duración (${trans.duracion.toFixed(1)} s)`}>
          <Deslizador
            valor={Math.round(trans.duracion * 10)}
            min={2}
            max={20}
            onChange={(v) => actualizarCapa(capa.id, { transicion: { tipo: trans.tipo, duracion: v / 10 } })}
          />
        </Campo>
      )}
    </div>
  )
}

export function Transiciones() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const clips = useEditorStore((s) => s.pista.clips)
  const quitarClip = useEditorStore((s) => s.quitarClip)
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const setTransicionEfecto = useEditorStore((s) => s.setTransicionEfecto)
  const separarAudio = useEditorStore((s) => s.separarAudio)
  const medios = useProjectStore((s) => s.medios)
  const agregarMedio = useProjectStore((s) => s.agregar)
  const { mostrar } = useToast()
  const [separando, setSeparando] = useState(false)

  const clip = clips.find((c) => c.id === clipSeleccionado) ?? null

  // saca el audio del video a un clip propio en la pista de sonido. en vez de
  // decodificar el mp4 entero (decodeAudioData falla en muchos videos con imagen,
  // que era el motivo de que "no ocurriera nada"), el audio separado reutiliza el
  // propio archivo del video y suena por un <audio> con su url, que reproduce solo
  // la pista de sonido. funciona con cualquier video que el navegador sepa abrir.
  // el clip nuevo queda vinculado al video: se mueven juntos y borrar el video se
  // lo lleva. el video de origen queda mudo para que el sonido no salga dos veces
  async function separar() {
    if (!clip || separando) return
    const asset = medios.find((m) => m.id === clip.assetId)
    if (!asset) return
    setSeparando(true)
    useProjectStore.setState({ preparando: true })
    try {
      // un respiro para que el cargador alcance a verse aunque el trabajo sea casi
      // instantáneo, así queda claro que algo pasó
      await new Promise((r) => setTimeout(r, 250))
      const url = URL.createObjectURL(asset.file)
      const idAudioAsset = crypto.randomUUID()
      agregarMedio({
        id: idAudioAsset,
        clase: 'audio',
        file: asset.file,
        nombre: `Audio de ${asset.nombre}`,
        tamano: asset.tamano,
        tipo: asset.tipo,
        duracion: asset.duracion,
        ancho: 0,
        alto: 0,
        url,
        miniatura: '',
      })
      separarAudio(clip.id, {
        id: crypto.randomUUID(),
        assetId: idAudioAsset,
        inicio: clip.inicio,
        duracion: clip.duracion,
        recorteInicio: clip.recorteInicio,
        duracionFuente: asset.duracion,
        volumen: 1,
        vinculadoA: clip.id,
      })
      mostrar('success', 'Audio separado a la pista de sonido.')
    } catch {
      mostrar('error', 'No se pudo separar el audio de este video.')
    } finally {
      setSeparando(false)
      useProjectStore.setState({ preparando: false })
    }
  }

  if (!clip) {
    // sin clip pero con una capa elegida, esta misma sección gobierna su entrada
    if (capaSeleccionada) return <TransicionCapa />
    return (
      <SinSeleccion icono="transiciones" titulo="Nada seleccionado">
        Pulsa un clip, un texto, una figura o cualquier elemento de la línea de tiempo para elegir
        con qué transición entra.
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

      {/* aparición del color y los efectos del clip. es independiente de la
          transición de entrada del plano: aquí lo que entra poco a poco es la
          corrección de color y los efectos aplicados, no el video en sí */}
      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <span className="text-sm font-medium">El color y los efectos aparecen</span>
          <input
            type="checkbox"
            checked={!!clip.transicionEfecto}
            onChange={(e) => setTransicionEfecto(clip.id, e.target.checked ? 0.6 : 0)}
            className="h-4 w-4 accent-brand"
          />
        </label>
        <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
          Con esto la corrección de color y los efectos del clip no están a pleno desde el primer
          fotograma, sino que se asientan durante los primeros segundos.
        </p>
        {!!clip.transicionEfecto && (
          <Campo etiqueta={`Duración (${clip.transicionEfecto.toFixed(1)} s)`}>
            <Deslizador
              valor={Math.round(clip.transicionEfecto * 10)}
              min={2}
              max={30}
              onChange={(v) => setTransicionEfecto(clip.id, v / 10)}
            />
          </Campo>
        )}
      </div>

      {/* separar el audio del video a la pista de sonido. una vez separado, el
          video queda mudo y el botón deja de ofrecerse */}
      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="text-sm font-medium">Audio del video</span>
        {clip.mudo ? (
          <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
            El audio de este video ya está separado en la pista de sonido, abajo. Muévelo o bórralo
            desde ahí; si borras el video, su audio se va con él.
          </p>
        ) : (
          <button
            onClick={separar}
            disabled={separando}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand disabled:opacity-50 dark:border-white/10"
          >
            <Icon name="musica" size={16} />
            {separando ? 'Separando...' : 'Separar audio'}
          </button>
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
    figura: <FiguraPanel />,
    dibujar: <DibujarPanel />,
    audio: <AudioPanel />,
    censura: <CensuraPanel />,
    velocidad: <SpeedPanel />,
    tono: <TonePanel />,
    efectos: <EffectsPanel />,
    transformar: <TransformarPanel />,
    recortar: <RecortarPanel />,
    borrador: <BorradorPanel />,
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
