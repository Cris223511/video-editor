import { JSX, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Icon, { NombreIcono } from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore } from '../../store/useEditorStore'
import { Transiciones } from './OptionsPanel'
import TonePanel from './panels/TonePanel'
import EffectsPanel from './panels/EffectsPanel'
import SpeedPanel from './panels/SpeedPanel'
import RecortarPanel from './panels/RecortarPanel'
import TransformarPanel from './panels/TransformarPanel'
import TextPanel from './panels/TextPanel'
import FiguraPanel from './panels/FiguraPanel'
import CensuraPanel from './panels/CensuraPanel'
import DibujarPanel from './panels/DibujarPanel'
import AudioPanel from './panels/AudioPanel'
import AudioClipPanel from './panels/AudioClipPanel'

// una categoría del panel de la derecha: su icono en el sub-riel y el panel de
// controles que abre. cada tipo de elemento ofrece las suyas
interface Categoria {
  id: string
  icono: NombreIcono
  etiqueta: string
  panel: JSX.Element
}

// categorías de un clip de video: todo lo que se configura de ese plano en
// concreto, sin las herramientas que son de todo el proyecto
const CLIP: Categoria[] = [
  { id: 'transiciones', icono: 'transiciones', etiqueta: 'Transiciones', panel: <Transiciones /> },
  { id: 'tono', icono: 'tono', etiqueta: 'Ajustar colores', panel: <TonePanel /> },
  { id: 'efectos', icono: 'efectos', etiqueta: 'Efectos', panel: <EffectsPanel /> },
  { id: 'velocidad', icono: 'velocidad', etiqueta: 'Velocidad', panel: <SpeedPanel /> },
  { id: 'recortar', icono: 'recortar', etiqueta: 'Recortar', panel: <RecortarPanel /> },
  { id: 'transformar', icono: 'transformar', etiqueta: 'Transformar', panel: <TransformarPanel /> },
]

// según el tipo de la capa elegida, sus propias categorías. el estilo del
// elemento va primero, luego lo compartido (transición de entrada y transformar)
function categoriasCapa(tipo: string): Categoria[] {
  const trans: Categoria = { id: 'transiciones', icono: 'transiciones', etiqueta: 'Transiciones', panel: <Transiciones /> }
  const transf: Categoria = { id: 'transformar', icono: 'transformar', etiqueta: 'Transformar', panel: <TransformarPanel /> }
  switch (tipo) {
    case 'texto':
      return [{ id: 'texto', icono: 'texto', etiqueta: 'Texto', panel: <TextPanel ocultarAgregar /> }, trans, transf]
    case 'figura':
      return [{ id: 'figura', icono: 'figura', etiqueta: 'Figura', panel: <FiguraPanel /> }, trans, transf]
    case 'imagen':
      return [
        { id: 'tono', icono: 'tono', etiqueta: 'Ajustar colores', panel: <TonePanel /> },
        { id: 'recortar', icono: 'recortar', etiqueta: 'Recortar', panel: <RecortarPanel /> },
        trans,
        transf,
      ]
    case 'censura':
      return [{ id: 'censura', icono: 'censura', etiqueta: 'Censura', panel: <CensuraPanel ocultarAgregar /> }, trans]
    case 'trazo':
      return [{ id: 'dibujar', icono: 'dibujar', etiqueta: 'Dibujo', panel: <DibujarPanel ocultarAgregar /> }, trans, transf]
    default:
      return [trans, transf]
  }
}

// panel contextual de la derecha, estilo sub-riel de iconos. cuando hay un clip o
// un elemento elegido, muestra las categorías que se pueden configurar de él y, al
// pulsar una, sus controles al lado. sin nada elegido reserva su sitio y no empuja
// nada: el hueco existe siempre para que seleccionar no descoloque la vista
export default function PanelClip() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const capas = useEditorStore((s) => s.capas)
  const audios = useEditorStore((s) => s.audios)

  const capa = capas.find((c) => c.id === capaSeleccionada)
  // la selección de audio comparte campo entre un clip de audio importado o
  // separado y una franja de ganancia; se distinguen mirando en qué lista está
  const esClipAudio = regionSeleccionada && audios.some((a) => a.id === regionSeleccionada)
  const categorias: Categoria[] = clipSeleccionado
    ? CLIP
    : capa
      ? categoriasCapa(capa.tipo)
      : esClipAudio
        ? [{ id: 'audio', icono: 'audio', etiqueta: 'Audio', panel: <AudioClipPanel /> }]
        : regionSeleccionada
          ? [{ id: 'audio', icono: 'audio', etiqueta: 'Audio', panel: <AudioPanel /> }]
          : []

  const hayAlgo = categorias.length > 0
  // la categoría abierta vive en el store para que los overlays del visor (el
  // recuadro de recorte) sepan cuándo aparecer. cambia sola a la primera válida al
  // cambiar la selección, para que no quede señalando una que ya no existe
  const activa = useEditorStore((s) => s.categoriaClip)
  const setActiva = useEditorStore((s) => s.setCategoriaClip)
  useEffect(() => {
    // al cambiar de selección no se abre ninguna categoría sola: solo se limpia la
    // que quede señalando algo que ya no existe. el usuario pulsa el icono que
    // quiera para desplegar sus controles, no se despliega automáticamente
    if (!hayAlgo || (activa && !categorias.some((c) => c.id === activa))) setActiva(null)
    // solo interesa reaccionar a qué categorías hay, no a la propia elección
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipSeleccionado, capaSeleccionada, regionSeleccionada, capa?.tipo])

  const abierta = categorias.find((c) => c.id === activa)

  // ancho de la columna de controles, ajustable arrastrando su borde izquierdo.
  // es preferencia de vista, con su mínimo y su máximo
  const [ancho, setAncho] = useState(256)
  const ANCHO_MIN = 220
  const ANCHO_MAX = 460
  const estirar = (e: React.MouseEvent) => {
    e.preventDefault()
    const inicioX = e.clientX
    const base = ancho
    const mover = (ev: globalThis.MouseEvent) =>
      setAncho(Math.round(Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, base + (inicioX - ev.clientX)))))
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'ew-resize'
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div className="flex h-full">
      {/* controles de la categoría abierta. entra con un fundido de arriba abajo,
          y su ancho crece con suavidad para que aparecer no dé un empujón seco */}
      <AnimatePresence initial={false}>
        {hayAlgo && abierta && (
          <motion.div
            key="controles"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: ancho, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="panel relative mr-1.5 overflow-hidden rounded-xl"
          >
            {/* tirador del borde izquierdo: arrastra para ancho, doble clic cierra
                la categoría y suelta su foco en el sub-riel */}
            <div
              onMouseDown={estirar}
              onDoubleClick={() => setActiva(null)}
              title="Arrastra para el ancho, doble clic para cerrar"
              className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize opacity-0 transition-opacity duration-200 hover:opacity-100"
              style={{ background: 'rgb(var(--brand) / 0.8)' }}
            />
            <div className="flex h-full flex-col" style={{ width: ancho }}>
              <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ borderBottom: '1px solid rgb(var(--border) / 0.1)' }}
              >
                <Icon name={abierta.icono} size={14} className="text-brand" />
                <h2 className="font-display text-[13px] font-bold">{abierta.etiqueta}</h2>
              </div>
              <motion.div
                // el contenido cae un poco al entrar, ese aire de aparecer que se pidió
                key={activa}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="scroll-modal min-h-0 flex-1 overflow-y-auto p-3"
              >
                {abierta.panel}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* sub-riel de categorías, siempre presente para que reserve su sitio. sin
          selección los iconos se apagan; con un elemento elegido se encienden */}
      <div
        className="panel flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl py-2"
      >
        {hayAlgo ? (
          categorias.map((c) => {
            const sel = c.id === activa
            return (
              <Tooltip key={c.id} texto={c.etiqueta} lado="izquierda">
                <button
                  onClick={() => setActiva(sel ? null : c.id)}
                  aria-label={c.etiqueta}
                  className={[
                    'grid h-10 w-10 place-items-center rounded-lg transition-colors duration-150',
                    sel ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
                  ].join(' ')}
                >
                  <Icon name={c.icono} size={18} />
                </button>
              </Tooltip>
            )
          })
        ) : (
          // hueco de reposo: unas marcas tenues que dejan claro que aquí saldrán las
          // opciones al elegir algo, sin medir ni mover nada
          <div className="flex flex-col items-center gap-2 pt-1 opacity-30">
            {['transiciones', 'tono', 'efectos', 'velocidad'].map((n) => (
              <div key={n} className="grid h-10 w-10 place-items-center rounded-lg">
                <Icon name={n as NombreIcono} size={18} className="text-[color:var(--muted)]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
