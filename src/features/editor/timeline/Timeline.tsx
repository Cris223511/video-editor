import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { UnfoldHorizontal } from 'lucide-react'
import Icon from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
import BarraGlobales from '../BarraGlobales'
import { OndaAudio } from './AudioBlock'
import FantasmaArrastre from './FantasmaArrastre'
import { TIPO_ARRASTRE, tipoClaseArrastre } from '../MediaLibrary'
import { nivelBajoCursor, separacionBajoCursor, porDebajoDelUltimo } from './nivelCursor'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { duracionProyecto } from '../../../lib/timeline/clips'
import { formatearDuracion } from '../../../lib/format/duracion'
import TimeRuler from './TimeRuler'
import ClipBlock from './ClipBlock'
import CruceBlock from './CruceBlock'
import Hueco from './Hueco'
import PistaHeader from './PistaHeader'
import { HUECO_PISTA } from './ClipBlock'
import { anterior } from '../../../lib/transiciones/pintar'
import CapaBlock from './CapaBlock'
import AudioBlock from './AudioBlock'
import AudioClipBlock from './AudioClipBlock'
import CarrilHeader from './CarrilHeader'
import AgregarNivelGuia from './AgregarNivelGuia'
import GuiaEntreCarriles from './GuiaEntreCarriles'
import { resolverDestinoVertical } from './destinoVertical'

const MIN = 0.1
// hueco entre la columna de cabeceras y las filas (gap-2), en píxeles. junto con
// el ancho de la columna (ajustable, vive en el store) se resta del ancho visible
// para saber cuánto espacio real les queda a las filas y llenarlo sin franjas muertas
const HUECO_COLUMNAS = 12
// alto de la regla de tiempo, replicado en la columna de cabeceras para que las
// filas de ambas columnas queden a la misma altura
const ALTO_REGLA = 29
// separación vertical entre secciones (el hueco que despega el carril de texto
// del bloque de video y el de audio del de texto). se aplica idéntica en la
// columna de cabeceras y en las filas del lado derecho para que no se
// desalineen. el hueco entre niveles de video vive en HUECO_PISTA
const SEP_SECCION = 12
// alto de cada fila de los carriles de texto y de audio, y el hueco entre filas
// de un mismo carril. la cabecera de la columna izquierda se dibuja a la altura
// total de su bloque de filas para que ambas columnas cuadren
const GAP_FILAS = 4

// alto total que ocupa un carril con varias filas: la suma de las filas más los
// huecos que quedan entre ellas
function altoCarril(filas: number, altoFila: number): number {
  return filas * altoFila + Math.max(0, filas - 1) * GAP_FILAS
}

// transición del deslizamiento de las filas al reordenarlas: corta y con una
// curva de salida suave, para que una pista que cambia de sitio se vea resbalar
// hasta su nueva posición en vez de saltar de golpe
const DESLIZA = { duration: 0.24, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }

// espacios vacíos entre clips consecutivos de un mismo nivel, incluido el que
// pueda quedar antes del primero
function calcularHuecos(clips: { inicio: number; duracion: number }[]) {
  const ordenados = [...clips].sort((a, b) => a.inicio - b.inicio)
  const resultado: { desde: number; hasta: number }[] = []
  let cursor = 0
  for (const c of ordenados) {
    if (c.inicio > cursor + 0.02) resultado.push({ desde: cursor, hasta: c.inicio })
    cursor = Math.max(cursor, c.inicio + c.duracion)
  }
  return resultado
}

// línea de tiempo con dos pistas: la de video (clips) y la de capas (texto y,
// más adelante, imagen y censura). permite mover el cabezal por la regla,
// dividir clips en el cabezal, y acercar o alejar
export default function Timeline({
  onOcultarMedios,
  mediosVisibles = true,
}: {
  onOcultarMedios?: () => void
  mediosVisibles?: boolean
}) {
  const clips = useEditorStore((s) => s.pista.clips)
  const fantasmaDup = useEditorStore((s) => s.fantasmaDup)
  const agregarDesdeAsset = useEditorStore((s) => s.agregarDesdeAsset)
  // nivel resaltado mientras se arrastra un medio desde el panel: se ilumina solo
  // esa fila para señalar dónde caería el video. si el cursor está sobre una
  // separación no hay fila resaltada y en su lugar aparece la guía de pista nueva
  const [pistaResaltada, setPistaResaltada] = useState<number | null>(null)
  const capas = useEditorStore((s) => s.capas)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const audios = useEditorStore((s) => s.audios)
  const nivelesTexto = useEditorStore((s) => s.nivelesTexto)
  const nivelesAudio = useEditorStore((s) => s.nivelesAudio)
  const nombreCarrilTexto = useEditorStore((s) => s.nombreCarrilTexto)
  const nombreCarrilAudio = useEditorStore((s) => s.nombreCarrilAudio)
  const renombrarCarril = useEditorStore((s) => s.renombrarCarril)
  const altoFilaAudio = useEditorStore((s) => s.altoFilaAudio)
  const altoFilaTexto = useEditorStore((s) => s.altoFilaTexto)
  const setAltoCarril = useEditorStore((s) => s.setAltoCarril)
  const anchoCabeceras = useEditorStore((s) => s.anchoCabeceras)
  const setAnchoCabeceras = useEditorStore((s) => s.setAnchoCabeceras)
  const congelarLayout = useEditorStore((s) => s.congelarLayout)
  const setCongelarLayout = useEditorStore((s) => s.setCongelarLayout)
  const agregarNivelTexto = useEditorStore((s) => s.agregarNivelTexto)
  const agregarNivelAudio = useEditorStore((s) => s.agregarNivelAudio)
  const ordenCarriles = useEditorStore((s) => s.ordenCarriles)
  const moverCarril = useEditorStore((s) => s.moverCarril)
  const playhead = useEditorStore((s) => s.playhead)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const pxPorSegundo = useEditorStore((s) => s.pxPorSegundo)
  const irA = useEditorStore((s) => s.irA)
  const pausar = useEditorStore((s) => s.pausar)
  const aplicarZoom = useEditorStore((s) => s.aplicarZoom)
  const ajustarZoomAlAncho = useEditorStore((s) => s.ajustarZoomAlAncho)
  const setAnchoTimeline = useEditorStore((s) => s.setAnchoTimeline)
  const limpiarSeleccion = useEditorStore((s) => s.limpiarSeleccion)
  const marcarBloques = useEditorStore((s) => s.marcarBloques)
  const abrirMenuContextual = useEditorStore((s) => s.abrirMenuContextual)
  const dividirEnCabezal = useEditorStore((s) => s.dividirEnCabezal)
  const numPistas = useEditorStore((s) => s.numPistas)
  const insertarPistaEn = useEditorStore((s) => s.insertarPistaEn)
  const altosPista = useEditorStore((s) => s.altosPista)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  // separación entre dos niveles marcada mientras se arrastra un clip: si no es
  // null, ahí se dibuja la guía celeste que promete crear una pista al soltar
  const insercionPista = useEditorStore((s) => s.insercionPista)
  const setInsercionPista = useEditorStore((s) => s.setInsercionPista)
  const insercionAudio = useEditorStore((s) => s.insercionAudio)
  const setInsercionAudio = useEditorStore((s) => s.setInsercionAudio)
  const insercionTexto = useEditorStore((s) => s.insercionTexto)
  const setInsercionTexto = useEditorStore((s) => s.setInsercionTexto)
  // filas que quedan iluminadas cuando el cursor pasa por encima de una fila ya
  // existente al mover un bloque de audio o de texto, el mismo aviso que da la
  // pista de video con el clip. las setean los propios bloques durante el arrastre
  const filaAudioResaltada = useEditorStore((s) => s.filaAudioResaltada)
  const filaTextoResaltada = useEditorStore((s) => s.filaTextoResaltada)
  // instante donde pintar la línea guía del imantado mientras se mueve o recorta
  // un bloque; null cuando ningún borde está enganchado a un anclaje
  const guiaImantado = useEditorStore((s) => s.guiaImantado)
  const medios = useProjectStore((s) => s.medios)

  // único contenedor con desplazamiento: lleva el scroll horizontal y, cuando
  // hacen falta muchos niveles, también el vertical. dentro conviven la columna
  // de cabeceras (pegada a la izquierda) y la zona de filas
  const scrollRef = useRef<HTMLDivElement>(null)
  // temporizador para reactivar las animaciones de posición un instante después de
  // la última rueda de zoom, de modo que un gesto continuo no las vuelva a encender
  const zoomFreno = useRef<number | null>(null)
  // apaga las animaciones de posición durante un instante: el zoom cambia la escala de
  // golpe, y con las animaciones encendidas los bloques se deslizan a su nuevo sitio en
  // vez de quedar clavados, que se ve mal. sirve tanto para la rueda como para los
  // botones de acercar y alejar
  const congelarLayoutUnInstante = useCallback(() => {
    setCongelarLayout(true)
    if (zoomFreno.current) clearTimeout(zoomFreno.current)
    zoomFreno.current = window.setTimeout(() => setCongelarLayout(false), 180)
  }, [setCongelarLayout])
  // junta (corte entre dos clips pegados) sobre la que se está arrastrando una transición.
  // se pinta una sombra centrada ahí, que monta sobre los dos clips, para que se vea que la
  // transición irá al medio y no al borde de uno solo
  const [resalteJunta, setResalteJunta] = useState<{ pista: number; corte: number } | null>(null)
  // al terminar cualquier arrastre (se suelte donde se suelte) se apaga la sombra de la
  // junta, por si el gesto acabó fuera de un clip y no llegó a limpiarla su onDragLeave
  useEffect(() => {
    const limpiar = () => setResalteJunta(null)
    window.addEventListener('dragend', limpiar)
    window.addEventListener('drop', limpiar)
    return () => {
      window.removeEventListener('dragend', limpiar)
      window.removeEventListener('drop', limpiar)
    }
  }, [])
  // zona de las filas propiamente dicha, la que se desplaza en horizontal. sus
  // coordenadas de pantalla ya incluyen el desplazamiento, así que sirve de
  // origen para traducir la posición del cursor a segundos sin sumar scrollLeft
  const contenidoRef = useRef<HTMLDivElement>(null)
  // contenedor de las filas de video; su distancia al borde del contenido sitúa
  // la guía de inserción a la altura exacta de cada separación entre niveles
  const filasRef = useRef<HTMLDivElement>(null)
  // contenedor de las filas de audio; sirve para situar la guía de inserción de
  // audio cuando se arrastra un audio desde el panel de medios
  const filasAudioRef = useRef<HTMLDivElement>(null)
  // fila de audio resaltada mientras se arrastra un audio desde el panel de medios
  const [audioResaltado, setAudioResaltado] = useState<number | null>(null)
  // ancho visible del contenedor con desplazamiento. se mide en vivo para que la
  // regla y las filas cubran todo el ancho disponible aunque el proyecto sea
  // corto o esté vacío, y no se corten a media pista
  const [anchoVisible, setAnchoVisible] = useState(0)
  // segundo bajo el cursor mientras se pasea por la línea de tiempo, para dibujar
  // el scrubber (una línea fina de previsualización) y su etiqueta de tiempo. es
  // null cuando el cursor está fuera de la zona
  const [hoverSeg, setHoverSeg] = useState<number | null>(null)
  // se enciende mientras se arrastra el cabezal para mostrar su etiqueta de
  // tiempo junto a la manija
  const [cabezalActivo, setCabezalActivo] = useState(false)
  // recuadro de selección múltiple: se dibuja al arrastrar desde una zona vacía de
  // la línea de tiempo y, al soltar, marca todos los bloques que toca. es el mismo
  // gesto que el marquee del visor, pero aquí opera sobre los bloques de tiempo
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const total = duracionProyecto(clips, capas, audios, audioRegiones)

  // añade un nivel al carril indicado, usado por la guía que sale entre grupos
  const NOMBRE_CARRIL: Record<string, string> = {
    video: 'Video',
    audio: nombreCarrilAudio,
    texto: nombreCarrilTexto,
  }
  const agregarNivelDe = (carril: string) => {
    if (carril === 'audio') agregarNivelAudio()
    else if (carril === 'texto') agregarNivelTexto()
    else if (carril === 'video') insertarPistaEn(numPistas)
  }

  // arrastre del borde derecho de la columna de cabeceras para ensancharla o
  // estrecharla. así los nombres largos dejan de quedar cortados. el store acota el
  // valor entre su mínimo y su máximo
  const estirarCabeceras = (e: React.PointerEvent) => {
    e.preventDefault()
    const inicioX = e.clientX
    const original = anchoCabeceras
    // mientras dura el arrastre se apagan las animaciones de posición para que los
    // bloques se peguen al ancho nuevo sin ir por detrás del cursor con suavizado
    setCongelarLayout(true)
    const mover = (ev: globalThis.PointerEvent) => setAnchoCabeceras(original + (ev.clientX - inicioX))
    const soltar = () => {
      setCongelarLayout(false)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'ew-resize'
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // arranca el arrastre que cambia el alto de las filas de un carril. el mismo
  // gesto que el de las pistas de video: se sigue el cursor en vertical y el store
  // acota el valor a su mínimo y máximo. cada carril lleva su propio alto, así que
  // estirar uno no arrastra a los de al lado
  const estirarCarril = (carril: 'audio' | 'texto', altoActual: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    const inicioY = e.clientY
    const mover = (ev: globalThis.PointerEvent) => setAltoCarril(carril, altoActual + (ev.clientY - inicioY))
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'ns-resize'
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }
  // arrastre de una fila de audio para reordenarla entre las demás. las filas se
  const anchoBase = Math.max(total * pxPorSegundo + 200, anchoVisible || 600)
  // durante un recorte activo el ancho del contenido no debe MENGUAR: al acortar el último clip,
  // `total` baja, el contenido se encoge y el navegador re-clampea el scroll, con lo que la vista
  // saltaba y arrastraba el tirador lejos del cursor. mientras dura el recorte se congela hacia
  // abajo (solo puede crecer); al soltar, se recalcula limpio
  const recortando = useEditorStore((s) => s.previsualizacion) !== null
  const anchoRef = useRef(0)
  if (!recortando) anchoRef.current = anchoBase
  const anchoContenido = recortando ? Math.max(anchoBase, anchoRef.current) : anchoBase

  // instantes a los que se imantan clips y capas: el cero, el cabezal y los
  // bordes de todos los elementos
  const puntos = useMemo(() => {
    const p = [0, playhead]
    clips.forEach((c) => p.push(c.inicio, c.inicio + c.duracion))
    capas.forEach((c) => p.push(c.inicio, c.inicio + c.duracion))
    audioRegiones.forEach((r) => p.push(r.inicio, r.inicio + r.duracion))
    audios.forEach((a) => p.push(a.inicio, a.inicio + a.duracion))
    return p
  }, [clips, capas, audioRegiones, audios, playhead])

  // durante la reproducción la línea de tiempo sigue al cabezal: cuando este se sale
  // de la vista (avanzando por la derecha, o al reiniciarse al inicio tras llegar al
  // final) se reencuadra el desplazamiento para que quede visible, sin arrastrarse en
  // continuo. así, al acabar y volver a dar play, el scroll también vuelve al arranque
  useEffect(() => {
    if (!reproduciendo) return
    const cont = scrollRef.current
    if (!cont) return
    const x = playhead * pxPorSegundo
    const margen = 48
    if (x < cont.scrollLeft + margen || x > cont.scrollLeft + cont.clientWidth - margen) {
      // salto de página: en cuanto el cabezal toca el borde de lo visible, el
      // desplazamiento salta de golpe al siguiente bloque y deja el cabezal pegado al
      // borde izquierdo, con toda la ventana por delante para seguir avanzando. así se
      // pasa al bloque nuevo de una vez, sin quedarse a media vista ni con suavizado
      cont.style.scrollBehavior = 'auto'
      cont.scrollLeft = Math.max(0, x - margen)
    }
  }, [playhead, reproduciendo, pxPorSegundo])

  const puedeDividir = clips.some(
    (c) => playhead > c.inicio + MIN && playhead < c.inicio + c.duracion - MIN,
  )

  // filas dibujadas de arriba a abajo: el nivel más alto encabeza la lista, como
  // en cualquier editor donde lo de arriba tapa lo de abajo
  const filas = useMemo(
    () => Array.from({ length: numPistas }, (_, i) => numPistas - 1 - i),
    [numPistas],
  )

  // clips y huecos de cada nivel, recalculados solos al mover, recortar o
  // cambiar un clip de pista
  const porPista = useMemo(() => {
    const mapa = new Map<number, { clips: typeof clips; huecos: ReturnType<typeof calcularHuecos> }>()
    for (let p = 0; p < numPistas; p++) {
      const propios = clips.filter((c) => c.pista === p)
      mapa.set(p, { clips: propios, huecos: calcularHuecos(propios) })
    }
    return mapa
  }, [clips, numPistas])

  // zoom con la rueda mientras se mantiene control, con el cursor sobre la línea
  // de tiempo. el listener se pone a mano y no como propiedad de react porque
  // hace falta declararlo como no pasivo: de lo contrario el navegador ignora la
  // cancelación y la página acaba desplazándose además de acercarse
  useEffect(() => {
    const cont = scrollRef.current
    if (!cont) return

    function alGirar(e: WheelEvent) {
      // la rueda sola sube y baja por los niveles, sin tocar el recorrido a lo
      // ancho. para moverse en el tiempo está la barra de abajo, que se arrastra
      // con el cursor. el control es lo único que cambia el gesto, y lo dedica al
      // acercamiento
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const zona = contenidoRef.current
      if (!zona) return
      // distancia en píxeles desde el borde izquierdo de las filas hasta el
      // cursor. como el rect ya trae aplicado el desplazamiento, no hace falta
      // sumar scrollLeft aparte
      const d = e.clientX - zona.getBoundingClientRect().left
      const st = useEditorStore.getState()
      const pxAntes = st.pxPorSegundo
      // el zoom cambia la escala de golpe, no es un desplazamiento: si las animaciones
      // de posición siguen encendidas, cada paso de rueda hace que los bloques se
      // deslicen hacia su nuevo sitio y, al acercar o alejar rápido, se cruzan entre sí
      // y parece que se reordenan. se congelan mientras dura el gesto y se reactivan un
      // instante después de la última rueda, para que la escala se aplique clavada
      congelarLayoutUnInstante()
      st.aplicarZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)
      const pxDespues = useEditorStore.getState().pxPorSegundo
      // se conserva bajo el cursor el mismo instante: al crecer la escala, el
      // punto que estaba a d píxeles pasa a estar a d·(nueva/vieja), y el scroll
      // compensa esa diferencia para que el zoom tire hacia donde se mira
      cont!.scrollLeft += d * (pxDespues / pxAntes - 1)
    }

    cont.addEventListener('wheel', alGirar, { passive: false })
    return () => cont.removeEventListener('wheel', alGirar)
  }, [congelarLayoutUnInstante])

  // el resalte de la fila y la guía de nueva pista solo deben vivir mientras dura
  // un arrastre. si el gesto termina fuera de la línea de tiempo no llega ni el
  // drop ni el dragleave, y el aro azul se quedaba pegado alrededor de la fila como
  // si fuera un borde fijo. escuchando el final del arrastre en la ventana se apaga
  // siempre, acabe donde acabe
  useEffect(() => {
    const limpiar = () => {
      setPistaResaltada(null)
      setAudioResaltado(null)
      const st = useEditorStore.getState()
      if (st.insercionPista !== null) setInsercionPista(null)
      if (st.insercionAudio !== null) setInsercionAudio(null)
      if (st.insercionTexto !== null) setInsercionTexto(null)
      if (st.filaAudioResaltada !== null) st.setFilaAudioResaltada(null)
      if (st.filaTextoResaltada !== null) st.setFilaTextoResaltada(null)
    }
    window.addEventListener('dragend', limpiar)
    window.addEventListener('drop', limpiar)
    return () => {
      window.removeEventListener('dragend', limpiar)
      window.removeEventListener('drop', limpiar)
    }
  }, [setInsercionPista])

  // el ancho útil de la pista se sigue con un observador: al cambiar el tamaño
  // del panel o plegar los medios, la regla se reajusta para no quedarse a medias
  useEffect(() => {
    const cont = scrollRef.current
    if (!cont) return
    const medir = () => {
      // a las filas les queda el ancho del contenedor menos la columna de
      // cabeceras y el hueco que las separa; ese es el espacio que deben cubrir
      const util = Math.max(0, cont.clientWidth - anchoCabeceras - HUECO_COLUMNAS)
      setAnchoVisible(util)
      // el mismo ancho se comparte con el store, que lo usa para encuadrar el
      // zoom al soltar un video
      setAnchoTimeline(util)
    }
    const ro = new ResizeObserver(medir)
    ro.observe(cont)
    medir()
    return () => ro.disconnect()
  }, [setAnchoTimeline, anchoCabeceras])

  function moverCabezal(clientX: number) {
    const zona = contenidoRef.current
    if (!zona) return
    const rect = zona.getBoundingClientRect()
    const t = Math.max(0, (clientX - rect.left) / pxPorSegundo)
    // el cabezal no se deja arrastrar más allá del final del montaje: pasado el
    // último clip no hay nada que mostrar, así que se topa justo en el total. con la
    // pista vacía (total cero) se deja libre, que ahí sí hace falta para posicionar
    irA(total > 0 ? Math.min(t, total) : t)
  }

  // el cabezal se puede arrastrar agarrando su manija superior, además de
  // pulsando en la regla. el gesto reutiliza moverCabezal, así que el cabezal
  // sigue al cursor mientras se mantiene pulsado
  function arrastrarCabezal(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    // mover el cabezal a mano pausa la reproducción: uno agarra la línea para
    // buscar un fotograma, no para seguir viendo. al soltar se queda quieto ahí
    pausar()
    setCabezalActivo(true)
    moverCabezal(e.clientX)
    const mover = (ev: globalThis.PointerEvent) => moverCabezal(ev.clientX)
    const soltar = () => {
      setCabezalActivo(false)
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    document.body.style.cursor = 'grabbing'
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  function alPresionarRegla(e: React.PointerEvent) {
    // la regla mueve el cabezal, no cambia la selección: por eso corta la
    // propagación antes de que el clic llegue al deseleccionado del fondo
    e.stopPropagation()
    // pulsar o arrastrar por la regla también pausa, para buscar sin que el video
    // siga corriendo por debajo
    pausar()
    setCabezalActivo(true)
    moverCabezal(e.clientX)
    const mover = (ev: globalThis.PointerEvent) => moverCabezal(ev.clientX)
    const soltar = () => {
      setCabezalActivo(false)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // sigue el cursor por la zona de la línea de tiempo y guarda el segundo bajo
  // él para pintar el scrubber. el cálculo replica el de mover el cabezal, pero
  // sin tocar el estado del reproductor: es solo una previsualización
  function seguirScrubber(e: MouseEvent) {
    const zona = contenidoRef.current
    if (!zona) return
    const rect = zona.getBoundingClientRect()
    setHoverSeg(Math.max(0, (e.clientX - rect.left) / pxPorSegundo))
  }

  // arrastrar desde una zona vacía de la línea de tiempo dibuja un recuadro y, al
  // soltar, marca todos los bloques que toca. un clic seco (sin arrastrar) suelta
  // la selección, como antes. los clips, capas, audios y franjas cortan la
  // propagación en su propio mousedown, así que este gesto solo nace en zona libre
  function iniciarMarquee(e: React.PointerEvent) {
    if (e.button !== 0) return
    const cont = contenidoRef.current
    if (!cont) return
    const r = cont.getBoundingClientRect()
    const x0 = e.clientX
    const y0 = e.clientY
    let movido = false
    // los bloques que cruza el recuadro ahora mismo, según sus dos esquinas en
    // pantalla. se usa tanto en vivo (mientras se arrastra) como al soltar
    const bloquesEn = (ex: number, ey: number): string[] => {
      const mx0 = Math.min(x0, ex)
      const my0 = Math.min(y0, ey)
      const mx1 = Math.max(x0, ex)
      const my1 = Math.max(y0, ey)
      const ids: string[] = []
      cont.querySelectorAll('[data-bloque-id]').forEach((el) => {
        const b = el.getBoundingClientRect()
        const cruza = !(b.right < mx0 || b.left > mx1 || b.bottom < my0 || b.top > my1)
        const id = (el as HTMLElement).getAttribute('data-bloque-id')
        if (cruza && id && !ids.includes(id)) ids.push(id)
      })
      return ids
    }
    const mover = (ev: globalThis.PointerEvent) => {
      if (Math.abs(ev.clientX - x0) > 3 || Math.abs(ev.clientY - y0) > 3) movido = true
      setMarquee({
        x: Math.min(x0, ev.clientX) - r.left,
        y: Math.min(y0, ev.clientY) - r.top,
        w: Math.abs(ev.clientX - x0),
        h: Math.abs(ev.clientY - y0),
      })
      // el sombreado tiene que verse mientras se arrastra, no solo al soltar: apenas
      // el recuadro toca un bloque ya queda marcado, y si se sale del recuadro se
      // desmarca. así el usuario ve en vivo qué va a seleccionar
      if (movido) marcarBloques(bloquesEn(ev.clientX, ev.clientY))
    }
    const soltar = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      setMarquee(null)
      if (!movido) {
        limpiarSeleccion()
        return
      }
      const ids = bloquesEn(ev.clientX, ev.clientY)
      if (ids.length) marcarBloques(ids)
      else limpiarSeleccion()
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // altura, dentro del contenido de la pista, de la separación donde nacería el
  // nivel nuevo. el índice va de 0 (una fila al ras del suelo) a numPistas (una
  // por encima de todo). las filas se dibujan de la pista mayor a la menor, así
  // que el borde inferior de la fila k, más medio hueco, cae justo en su ranura
  function yInsercion(k: number): number {
    const base = filasRef.current?.offsetTop ?? ALTO_REGLA + 8
    if (k >= numPistas) return base - HUECO_PISTA / 2
    let arriba = 0
    for (let u = numPistas - 1; u > k; u--) arriba += altosPista[u] + HUECO_PISTA
    return base + arriba + altosPista[k] + HUECO_PISTA / 2
  }

  // altura de la guía de inserción de audio, relativa al contenedor de sus filas.
  // el nivel 0 (que llega al arrastrar por debajo del carril) cae al pie de todo; el
  // resto se sitúa en el hueco encima de la fila de ese nivel. las filas se dibujan
  // del nivel mayor al menor, igual que en video
  function yInsercionAudio(k: number): number {
    const paso = altoFilaAudio + GAP_FILAS
    if (k <= 0) return nivelesAudio * paso - GAP_FILAS / 2
    // separacionBajoCursor devuelve el nivel de arriba de la juntura (el mayor de
    // los dos). ese nivel se dibuja en la fila de índice nivelesAudio-1-k, y la
    // línea va en su borde inferior, o sea una fila más abajo de su borde superior
    return (nivelesAudio - k) * paso - GAP_FILAS / 2
  }

  // lo mismo para el carril de texto
  function yInsercionTexto(k: number): number {
    const paso = altoFilaTexto + GAP_FILAS
    if (k <= 0) return nivelesTexto * paso - GAP_FILAS / 2
    return (nivelesTexto - k) * paso - GAP_FILAS / 2
  }

  // mientras se pasea un medio por encima de la línea de tiempo se resuelve, con
  // la misma lógica que el arrastre de un clip, si el cursor apunta a una fila (se
  // ilumina ese nivel) o a una separación (se enciende la guía de pista nueva).
  // así el destino queda claro antes de soltar, en lugar de sombrear toda la zona
  // margen, en píxeles, alrededor de la pila de pistas de video dentro del cual el
  // cursor todavía cuenta como apuntando a una separación de arriba o de abajo. más
  // lejos que eso el cursor está sobre el audio o el texto, y ahí no tiene sentido
  // ofrecer una pista de video nueva ni encender la guía
  const MARGEN_PISTAS = 18

  // apaga cualquier resalte o guía del arrastre de medios, de video y de audio
  function apagarSenales() {
    if (insercionPista !== null) setInsercionPista(null)
    if (pistaResaltada !== null) setPistaResaltada(null)
    if (audioResaltado !== null) setAudioResaltado(null)
    if (insercionAudio !== null) setInsercionAudio(null)
  }

  function alArrastrarMedioEncima(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(TIPO_ARRASTRE)) return
    e.preventDefault()
    // un audio se sombrea y se inserta sobre el carril de audio, no sobre las pistas
    // de video. la clase viaja en su propio tipo, que sí se puede leer en el dragover
    if (e.dataTransfer.types.includes(tipoClaseArrastre('audio'))) {
      if (pistaResaltada !== null) setPistaResaltada(null)
      if (insercionPista !== null) setInsercionPista(null)
      const junta = separacionBajoCursor(e.clientX, e.clientY, 'nivelAudio')
      if (junta !== null || porDebajoDelUltimo(e.clientX, e.clientY, 'nivelAudio')) {
        const ins = junta ?? 0
        if (ins !== insercionAudio) setInsercionAudio(ins)
        if (audioResaltado !== null) setAudioResaltado(null)
      } else {
        const n = nivelBajoCursor(e.clientX, e.clientY, 'nivelAudio')
        if (insercionAudio !== null) setInsercionAudio(null)
        if (n !== null && n !== audioResaltado) setAudioResaltado(n)
        else if (n === null && audioResaltado !== null) setAudioResaltado(null)
      }
      return
    }
    // el resto (video e imagen) van a las pistas de video
    const stack = filasRef.current
    if (!stack) return
    if (audioResaltado !== null) setAudioResaltado(null)
    if (insercionAudio !== null) setInsercionAudio(null)
    // si el cursor se fue lejos de las pistas de video (a la zona de audio o texto),
    // no se enciende ninguna guía ni resalte: la guía de pista nueva solo vive
    // pegada a las pistas de video, no paseando por toda la línea de tiempo
    const rect = stack.getBoundingClientRect()
    if (e.clientY < rect.top - MARGEN_PISTAS || e.clientY > rect.bottom + MARGEN_PISTAS) {
      if (insercionPista !== null) setInsercionPista(null)
      if (pistaResaltada !== null) setPistaResaltada(null)
      return
    }
    const { destino, insercion } = resolverDestinoVertical(stack, e.clientY, numPistas)
    if (insercion !== null) {
      if (insercion !== insercionPista) setInsercionPista(insercion)
      if (pistaResaltada !== null) setPistaResaltada(null)
    } else {
      if (insercionPista !== null) setInsercionPista(null)
      const d = destino ?? 0
      if (pistaResaltada !== d) setPistaResaltada(d)
    }
  }

  // se apaga el resalte solo cuando el cursor abandona de verdad la zona, no al
  // cruzar por encima de un clip o una fila hija (que también disparan dragleave)
  function alSalirMedio(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    apagarSenales()
  }

  // al soltar el medio aterriza donde la señal prometía: en la fila bajo el cursor
  // o, si se apuntaba a una separación, en una fila o pista nueva abierta ahí mismo
  function alSoltar(e: React.DragEvent) {
    e.preventDefault()
    const id = e.dataTransfer.getData(TIPO_ARRASTRE)
    const asset = id ? medios.find((m) => m.id === id) : undefined

    // los audios se resuelven contra el carril de audio, igual que en el arrastre
    if (asset?.clase === 'audio') {
      const junta = separacionBajoCursor(e.clientX, e.clientY, 'nivelAudio')
      const debajo = porDebajoDelUltimo(e.clientX, e.clientY, 'nivelAudio')
      apagarSenales()
      if (junta !== null || debajo) agregarDesdeAsset(asset, { insertarAudioEn: junta ?? 0 })
      else {
        const n = nivelBajoCursor(e.clientX, e.clientY, 'nivelAudio')
        agregarDesdeAsset(asset, { audioNivel: n ?? 0 })
      }
      return
    }

    const stack = filasRef.current
    let v = stack
      ? resolverDestinoVertical(stack, e.clientY, numPistas)
      : { destino: 0, insercion: null }
    // soltado lejos de las pistas de video (sobre audio o texto): no se abre una
    // pista nueva, el medio cae en la pista de video más baja
    if (stack) {
      const rect = stack.getBoundingClientRect()
      if (e.clientY < rect.top - MARGEN_PISTAS || e.clientY > rect.bottom + MARGEN_PISTAS) {
        v = { destino: 0, insercion: null }
      }
    }
    apagarSenales()
    if (!asset) return
    if (v.insercion !== null) agregarDesdeAsset(asset, { insertarEn: v.insercion })
    else agregarDesdeAsset(asset, { pista: v.destino ?? 0 })
  }

  return (
    <div className="flex h-full flex-col">
      <FantasmaArrastre />
      <div
        className="flex items-center gap-1 px-3 py-2"
        style={{ borderBottom: '1px solid rgb(var(--border) / 0.1)' }}
      >
        {onOcultarMedios && (
          <Tooltip texto={mediosVisibles ? 'Ocultar medios' : 'Mostrar medios'} lado="abajo">
            <button
              onClick={onOcultarMedios}
              aria-label={mediosVisibles ? 'Ocultar medios' : 'Mostrar medios'}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <Icon name="pelicula" size={16} />
            </button>
          </Tooltip>
        )}
        <span className="text-xs font-medium text-[color:var(--muted)]">
          Línea de tiempo · {formatearDuracion(total)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {/* opciones de lo que esté seleccionado. van pegadas a las tijeras porque
              es donde se está mirando mientras se monta, y aparecen solas al elegir
              algo. cada clip conserva sus propios valores */}
          <BarraGlobales />
          <Tooltip texto="Dividir en el cabezal" atajo="S" lado="abajo">
            <button
              onClick={dividirEnCabezal}
              disabled={!puedeDividir}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon name="tijeras" size={17} />
            </button>
          </Tooltip>
          <span className="mx-1 h-5 w-px" style={{ background: 'rgb(var(--border) / 0.14)' }} />
          <Tooltip texto="Ajustar al ancho" lado="abajo">
            <button
              onClick={() => {
                congelarLayoutUnInstante()
                ajustarZoomAlAncho()
              }}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <UnfoldHorizontal size={18} />
            </button>
          </Tooltip>
          <Tooltip texto="Alejar" lado="abajo">
            <button
              onClick={() => {
                congelarLayoutUnInstante()
                aplicarZoom(1 / 1.3)
              }}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <Icon name="zoomMenos" size={18} />
            </button>
          </Tooltip>
          <Tooltip texto="Acercar" lado="abajo">
            <button
              onClick={() => {
                congelarLayoutUnInstante()
                aplicarZoom(1.3)
              }}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <Icon name="zoomMas" size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* un solo contenedor con desplazamiento para toda la línea de tiempo:
          lleva el scroll horizontal y, cuando se acumulan muchos niveles, el
          vertical. antes había un overflow anidado que sacaba dos barras y
          descuadraba las columnas; ahora la columna de cabeceras va pegada a la
          izquierda y acompaña el mismo scroll, así que nunca se desalinean */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div className="flex w-max gap-3">
          {/* columna de cabeceras anclada a la izquierda: sube y baja con las
              filas al desplazar en vertical, pero se queda fija al desplazar en
              horizontal. el fondo sólido tapa las filas que resbalan por debajo.
              el grupo deja que las guías de «insertar nivel» asomen al pasar el
              cursor por las separaciones */}
          <div
            className="group/cols sticky left-0 z-40 shrink-0"
            style={{
              width: anchoCabeceras,
              background: 'rgb(var(--surface))',
              // la columna va por encima de las capas del área de pistas (cabezal,
              // guías, scrubber) con un z alto, para que ninguna de esas líneas se
              // pinte sobre los rótulos cuando el contenido se desplaza por debajo.
              // el borde derecho, con el gap que ya la separa, marca dónde acaban
              // las cabeceras y empiezan las pistas
              borderRight: '1px solid rgb(var(--border) / 0.16)',
            }}
          >
            <div style={{ height: ALTO_REGLA }} />
            {/* las tres secciones se dibujan en el orden que diga ordenCarriles, y
                esta columna sigue exactamente el mismo para no descuadrarse de las
                filas de la derecha. las cabeceras se ven siempre, aunque el carril
                esté vacío, para que se entienda que ese espacio existe */}
            {ordenCarriles.map((carril, i) => (
              <motion.div
                key={carril}
                layout={congelarLayout || reproduciendo ? false : 'position'}
                transition={DESLIZA}
                className="relative"
                style={{ marginTop: i === 0 ? 8 : SEP_SECCION }}
              >
                {i > 0 && (
                  <GuiaEntreCarriles
                    etiqueta={NOMBRE_CARRIL[ordenCarriles[i - 1]] ?? ordenCarriles[i - 1]}
                    onInsertar={() => agregarNivelDe(ordenCarriles[i - 1])}
                  />
                )}
                {carril === 'video' && (
                  <div className="relative flex flex-col" style={{ gap: HUECO_PISTA }}>
                    {filas.map((p) => (
                      <motion.div key={pistasMeta[p]?.id ?? p} layout={congelarLayout || reproduciendo ? false : 'position'} transition={DESLIZA}>
                        <PistaHeader indice={p} alto={altosPista[p]} />
                      </motion.div>
                    ))}
                    <AgregarNivelGuia />
                  </div>
                )}
                {carril === 'texto' && (
                  <CarrilHeader
                    icono="texto"
                    titulo={nombreCarrilTexto}
                    onRenombrar={(n) => renombrarCarril('texto', n)}
                    onReordenar={(dir) => moverCarril('texto', dir)}
                    acento="#f59e0b"
                    alto={altoCarril(nivelesTexto, altoFilaTexto)}
                    onEstirar={estirarCarril('texto', altoFilaTexto)}
                    onAgregar={agregarNivelTexto}
                    puedeAgregar={nivelesTexto < 6}
                    onSubir={i > 0 ? () => moverCarril('texto', -1) : undefined}
                    onBajar={i < ordenCarriles.length - 1 ? () => moverCarril('texto', 1) : undefined}
                  />
                )}
                {carril === 'audio' && (
                  <CarrilHeader
                    icono="musica"
                    titulo={nombreCarrilAudio}
                    onRenombrar={(n) => renombrarCarril('audio', n)}
                    acento="#10b981"
                    alto={altoCarril(nivelesAudio, altoFilaAudio)}
                    onEstirar={estirarCarril('audio', altoFilaAudio)}
                    onAgregar={agregarNivelAudio}
                    puedeAgregar={nivelesAudio < 6}
                    onSubir={i > 0 ? () => moverCarril('audio', -1) : undefined}
                    onBajar={i < ordenCarriles.length - 1 ? () => moverCarril('audio', 1) : undefined}
                  />
                )}
              </motion.div>
            ))}

            {/* tirador del borde derecho: arrastrándolo se ensancha o estrecha la columna de
                cabeceras. es invisible a propósito (el dueño no quería ver la línea azul al pasar
                el cursor); solo se nota por el cursor de redimensionar y sigue funcionando igual */}
            <div
              onPointerDown={estirarCabeceras}
              title="Arrastra para cambiar el ancho"
              className="absolute inset-y-0 right-0 z-50 w-1.5 cursor-ew-resize"
            />
          </div>

          <div
            ref={contenidoRef}
            onDragOver={alArrastrarMedioEncima}
            onDragLeave={alSalirMedio}
            onDrop={alSoltar}
            onPointerDown={iniciarMarquee}
            onMouseMove={seguirScrubber}
            onMouseLeave={() => setHoverSeg(null)}
            className="relative shrink-0 rounded-lg"
            style={{ width: anchoContenido }}
          >
          <div onPointerDown={alPresionarRegla}>
            <TimeRuler total={total} pxPorSegundo={pxPorSegundo} ancho={anchoContenido} alto={ALTO_REGLA} />
          </div>

          {/* las filas siguen el mismo orden que la columna de cabeceras, para que
              cada sección quede enfrente de su rótulo pase lo que pase */}
          {ordenCarriles.map((carril, i) => (
            <motion.div key={carril} layout={congelarLayout || reproduciendo ? false : 'position'} transition={DESLIZA} style={{ marginTop: i === 0 ? 8 : SEP_SECCION }}>
              {carril === 'video' && (
                <>
              {/* niveles de video, del más alto al más bajo */}
              <div ref={filasRef} data-tracks className="flex flex-col" style={{ gap: HUECO_PISTA }}>
                {filas.map((p) => {
                  const fila = porPista.get(p)
                  // las figuras e imágenes de esta pista de video: se dibujan como
                  // bloques dentro de la fila, junto a los clips, aunque en el visor
                  // siempre queden por encima del video
                  const capasFila = capas.filter(
                    (c) => (c.tipo === 'figura' || c.tipo === 'imagen') && (c.nivel ?? 0) === p,
                  )
                  const vacio = (!fila || fila.clips.length === 0) && capasFila.length === 0
                  const oculta = pistasMeta[p]?.oculta
                  // esta fila es la que recibiría el medio que se arrastra ahora mismo
                  const resaltada = pistaResaltada === p
                  // disoluciones entre dos clips pegados de esta fila: un cruce por cada
                  // clip que entra con una transición de opacidad y un anterior adyacente
                  const crucesFila = (fila?.clips ?? []).flatMap((B) => {
                    if (B.transicion.tipo === 'ninguna' || B.transicion.tipo === 'corte') return []
                    const A = anterior(B, fila?.clips ?? [])
                    return A ? [{ entra: B, sale: A }] : []
                  })
                  return (
                    <motion.div
                      key={pistasMeta[p]?.id ?? p}
                      layout={congelarLayout || reproduciendo ? false : 'position'}
                      transition={DESLIZA}
                      data-fila-pista={p}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'pista', id: String(p) })
                      }}
                      className="relative rounded-lg transition-[opacity,box-shadow,background-color] duration-150"
                      style={{
                        height: altosPista[p],
                        // el azul de marca va literal (rgb del #1861ff) porque el resto
                        // del tema no expone --brand como variable; así el tinte de la
                        // fila objetivo se ve de verdad en lugar de quedar transparente
                        background: resaltada
                          ? 'rgb(24 97 255 / 0.12)'
                          : vacio
                            ? 'rgb(var(--border) / 0.05)'
                            : undefined,
                        // el resalte se queda en un tinte suave. antes llevaba un aro
                        // interior de dos píxeles que se leía como un borde permanente
                        // alrededor de la fila entera, clip y hueco incluidos, y confundía
                        boxShadow: resaltada ? 'inset 0 0 0 1px rgb(24 97 255 / 0.28)' : undefined,
                        // un nivel oculto no se pinta en el visor; en la pista se
                        // atenúa para recordarlo sin sacarlo de en medio
                        opacity: oculta ? 0.4 : 1,
                      }}
                    >
                      {vacio && (
                        <div className="flex h-full items-center gap-2.5 px-6 text-xs text-[color:var(--muted)]">
                          <Icon name="subir" size={14} />
                          <span className="leading-relaxed">
                            Arrastra un video desde el panel de medios hasta aquí.
                          </span>
                        </div>
                      )}
                      {fila?.huecos.map((h) => (
                        <Hueco
                          key={`hueco-${p}-${h.desde}`}
                          desde={h.desde}
                          hasta={h.hasta}
                          pista={p}
                          pxPorSegundo={pxPorSegundo}
                        />
                      ))}
                      {fila?.clips.map((c) => {
                        const asset = medios.find((m) => m.id === c.assetId)
                        return (
                          <ClipBlock
                            key={c.id}
                            clip={c}
                            nombre={asset?.nombre ?? 'clip'}
                            // sin url el bloque muestra "no encontrado"; se fuerza cuando el
                            // archivo ya no está para no intentar sacarle fotogramas
                            url={asset?.faltante ? undefined : asset?.url}
                            altoPista={altosPista[p]}
                            pxPorSegundo={pxPorSegundo}
                            puntos={puntos}
                            // una disolución con un clip anterior pegado se dibuja como un
                            // bloque de cruce que monta sobre ambos, así que el clip oculta
                            // su cuña de entrada para no repetir la transición
                            sinCuñaEntrada={crucesFila.some((x) => x.entra.id === c.id)}
                            onResaltarJunta={(corte) =>
                              setResalteJunta(corte === null ? null : { pista: p, corte })
                            }
                          />
                        )
                      })}
                      {/* sombra de la junta mientras se arrastra una transición sobre el corte
                          entre dos clips pegados: una banda centrada que monta sobre ambos,
                          para que se vea que la transición cae al medio y no al borde de uno */}
                      {resalteJunta && resalteJunta.pista === p && (
                        <div
                          data-junta-sombra
                          className="pointer-events-none absolute top-0 z-30 h-full -translate-x-1/2 rounded-md ring-2 ring-inset ring-brand"
                          style={{
                            left: resalteJunta.corte * pxPorSegundo,
                            width: Math.max(24, 0.5 * pxPorSegundo),
                            background:
                              'linear-gradient(90deg, transparent 0%, rgb(24 97 255 / 0.5) 45%, rgb(24 97 255 / 0.5) 55%, transparent 100%)',
                          }}
                        />
                      )}
                      {/* bloques de cruce (disoluciones entre dos clips): montan sobre el
                          corte, enganchando a los dos, y se estiran simétricos */}
                      {crucesFila.map((x) => (
                        <CruceBlock
                          key={`cruce-${x.entra.id}`}
                          entra={x.entra}
                          sale={x.sale}
                          altoPista={altosPista[p]}
                          pxPorSegundo={pxPorSegundo}
                        />
                      ))}
                      {/* silueta de la copia mientras se arrastra un clip con Alt: verde
                          donde cabe, roja donde pisaría otro clip. no es un clip real
                          hasta soltar en un hueco válido */}
                      {fantasmaDup && fantasmaDup.pista === p && (
                        <div
                          className="pointer-events-none absolute top-0 z-30 h-full rounded-md border-2 border-dashed"
                          style={{
                            left: fantasmaDup.inicio * pxPorSegundo,
                            width: Math.max(fantasmaDup.duracion * pxPorSegundo, 8),
                            borderColor: fantasmaDup.valido ? '#22c55e' : '#ef4444',
                            background: fantasmaDup.valido
                              ? 'rgb(34 197 94 / 0.18)'
                              : 'rgb(239 68 68 / 0.14)',
                          }}
                        />
                      )}
                      {/* figuras e imágenes de esta pista, encima de los clips */}
                      {capasFila.map((c) => (
                        <CapaBlock key={c.id} capa={c} pxPorSegundo={pxPorSegundo} puntos={puntos} />
                      ))}
                    </motion.div>
                  )
                })}
              </div>
                </>
              )}
              {carril === 'texto' && (
                <>
              {/* carril de texto, dibujo y censura, con varias filas para separar
                  bloques que se solapan en el tiempo. cada fila lleva su
                  data-nivel-texto, que es lo que leen los bloques al soltarlos para
                  saber a qué fila mudarse. la fila más alta encabeza la pila. las
                  figuras y las imágenes ya no viven aquí: se fueron a las pistas de
                  video */}
              <div className="relative flex flex-col" style={{ gap: GAP_FILAS }}>
                {Array.from({ length: nivelesTexto }, (_, i) => nivelesTexto - 1 - i).map((n) => {
                  const propias = capas.filter(
                    (c) => c.tipo !== 'imagen' && c.tipo !== 'figura' && (c.nivel ?? 0) === n,
                  )
                  const filaVacia = propias.length === 0
                  // se ilumina en ámbar mientras un bloque de texto se arrastra por
                  // encima, como aviso de dónde va a caer
                  const resaltada = filaTextoResaltada === n
                  return (
                    <div
                      key={`texto-${n}`}
                      data-nivel-texto={n}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'carril-texto', id: String(n) })
                      }}
                      className="relative overflow-hidden rounded-lg transition-[background-color,box-shadow] duration-150"
                      style={{
                        height: altoFilaTexto,
                        background: resaltada ? 'rgb(245 158 11 / 0.16)' : 'rgb(var(--border) / 0.05)',
                        boxShadow: resaltada ? 'inset 0 0 0 1px rgb(245 158 11 / 0.4)' : undefined,
                      }}
                    >
                      {filaVacia && (
                        <div className="pointer-events-none flex h-full items-center gap-2 px-3 text-[11px] text-[color:var(--muted)]">
                          <Icon name="texto" size={13} />
                          <span>Añadir texto</span>
                        </div>
                      )}
                      {propias.map((c) => (
                        <CapaBlock key={c.id} capa={c} pxPorSegundo={pxPorSegundo} puntos={puntos} />
                      ))}
                    </div>
                  )
                })}
                {/* guía de inserción de una fila de texto nueva, en ámbar como el
                    carril, al mover un texto, dibujo o censura sobre una separación */}
                {insercionTexto !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                    style={{ top: yInsercionTexto(insercionTexto) }}
                  >
                    <span
                      className="h-0.5 w-full animate-pulse rounded-full"
                      style={{ background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.9)' }}
                    />
                    <span
                      className="absolute left-2 -translate-y-px rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: '#f59e0b' }}
                    >
                      Nueva fila aquí
                    </span>
                  </div>
                )}
              </div>
                </>
              )}
              {carril === 'audio' && (
                <>
              {/* carril de audio, con varias filas igual que el de texto. la fila 0,
                  cuando el carril entero está vacío, enseña el rótulo y una onda muy
                  tenue de fondo para que no se vea plano. cada fila lleva su
                  data-nivel-audio para recibir el bloque que se suelte encima */}
              <div ref={filasAudioRef} className="relative flex flex-col" style={{ gap: GAP_FILAS }}>
                {Array.from({ length: nivelesAudio }, (_, i) => nivelesAudio - 1 - i).map((n) => {
                  const regionesFila = audioRegiones.filter((r) => (r.nivel ?? 0) === n)
                  const audiosFila = audios.filter((a) => (a.nivel ?? 0) === n)
                  // el nivel está vacío si no tiene ni franjas ni audios propios. así
                  // cada fila añadida se ve igual que la primera y no queda una banda
                  // muerta sin nada que la explique
                  const filaVacia = regionesFila.length === 0 && audiosFila.length === 0
                  // esta fila recibiría el audio que se arrastra ahora mismo, ya sea
                  // uno traído del panel (audioResaltado, local) o un bloque que se
                  // está moviendo por encima de ella (filaAudioResaltada, del store)
                  const resaltada = audioResaltado === n || filaAudioResaltada === n
                  return (
                    <div
                      key={`audio-${n}`}
                      data-nivel-audio={n}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'carril-audio', id: String(n) })
                      }}
                      className="group relative overflow-hidden rounded-lg transition-[background-color,box-shadow] duration-150"
                      style={{
                        height: altoFilaAudio,
                        background: resaltada ? 'rgb(16 185 129 / 0.16)' : 'rgb(var(--border) / 0.05)',
                        boxShadow: resaltada ? 'inset 0 0 0 1px rgb(16 185 129 / 0.4)' : undefined,
                      }}
                    >
                      {filaVacia ? (
                        <>
                          {/* rótulo a la izquierda, limpio */}
                          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center gap-2 px-3 text-[11px] text-[color:var(--muted)]">
                            <Icon name="musica" size={13} />
                            <span>Añadir audio</span>
                          </div>
                          {/* onda tenue de fondo, desde el mismo inicio de la fila, para
                              que la pista de audio vacía se lea como tal de punta a punta
                              y no arranque con un corte tras el rótulo. el rótulo va en una
                              capa por encima, así que se lee bien sobre la onda apagada.
                              cada fila lleva su propia semilla para que su dibujo no sea
                              idéntico al de al lado */}
                          <div className="absolute inset-0">
                            <OndaAudio
                              semilla={`fondo-audio-${n}`}
                              color="rgb(var(--border) / 0.5)"
                              opacidad={0.35}
                              barras={Math.max(80, Math.floor(anchoContenido / 2))}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* franjas de ganancia (verdes) y audios importados (azules)
                              conviven en la misma fila, cada uno con su color */}
                          {regionesFila.map((r) => (
                            <AudioBlock key={r.id} region={r} pxPorSegundo={pxPorSegundo} puntos={puntos} />
                          ))}
                          {audiosFila.map((a) => (
                            <AudioClipBlock
                              key={a.id}
                              audio={a}
                              asset={medios.find((m) => m.id === a.assetId)}
                              pxPorSegundo={pxPorSegundo}
                              puntos={puntos}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )
                })}
                {/* guía de inserción de una fila de audio nueva, en verde como el
                    carril, al arrastrar un audio desde el panel sobre una separación
                    o por debajo del carril */}
                {insercionAudio !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30 flex items-center"
                    style={{ top: yInsercionAudio(insercionAudio) }}
                  >
                    <span
                      className="h-0.5 w-full animate-pulse rounded-full"
                      style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.9)' }}
                    />
                    <span
                      className="absolute left-2 -translate-y-px rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: '#10b981' }}
                    >
                      Nueva fila aquí
                    </span>
                  </div>
                )}
              </div>
                </>
              )}
            </motion.div>
          ))}

          {/* guía de inserción: la línea celeste que cruza la pista mientras se
              arrastra un clip sobre la separación entre dos niveles. anuncia que
              soltar ahí abre una fila nueva justo en ese punto. lleva un rótulo a
              la izquierda para que se entienda la promesa sin adivinar */}
          {insercionPista !== null && (
            <div
              className="pointer-events-none absolute z-30 flex items-center"
              style={{ top: yInsercion(insercionPista) - 1, left: 0, width: anchoContenido }}
            >
              {/* la línea late despacio mientras espera el soltado: quieta pasaba
                  desapercibida entre tanto bloque */}
              <span
                className="h-0.5 w-full animate-pulse rounded-full"
                style={{ background: '#38bdf8', boxShadow: '0 0 8px rgba(56,189,248,0.95)' }}
              />
              <span
                className="absolute left-2 -translate-y-px rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ background: '#38bdf8' }}
              >
                Nueva pista aquí
              </span>
            </div>
          )}

          {/* línea guía del imantado: una vertical fina y de color propio que
              aparece justo donde un borde se enganchó a un anclaje (el cero, el
              cabezal o el borde de otro bloque) mientras se mueve o recorta. sus
              extremos van redondeados y lleva un leve resplandor para que se lea
              limpia, y se esfuma sola al soltar porque el estado vuelve a null */}
          {guiaImantado !== null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-30 w-0.5 -translate-x-px rounded-full"
              style={{
                left: guiaImantado * pxPorSegundo,
                background: '#f472b6',
                boxShadow: '0 0 6px rgba(244,114,182,0.8)',
              }}
            />
          )}

          {/* recuadro azul de selección múltiple, el mismo gesto que en el visor */}
          {marquee && marquee.w > 2 && marquee.h > 2 && (
            <div
              className="pointer-events-none absolute z-40 rounded-[2px] border border-brand"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.w,
                height: marquee.h,
                background: 'rgb(24 97 255 / 0.14)',
              }}
            />
          )}

          {/* scrubber: línea fina de previsualización que sigue al cursor, más
              delgada y tenue que el cabezal, con la etiqueta del segundo sobre la
              regla. no intercepta el ratón para no estorbar a clips ni cabezal */}
          {hoverSeg !== null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10"
              style={{ left: hoverSeg * pxPorSegundo }}
            >
              <span className="absolute bottom-0 top-0 w-px" style={{ background: 'rgb(24 97 255 / 0.5)' }} />
              <span
                className="absolute top-0 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white shadow-sm"
                style={{ background: 'rgb(24 97 255 / 0.9)' }}
              >
                {formatearDuracion(hoverSeg)}
              </span>
            </div>
          )}

          <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-0.5 -translate-x-px bg-brand"
            style={{ left: playhead * pxPorSegundo }}
          >
            {/* etiqueta del tiempo del cabezal, visible mientras se arrastra para
                seguir el segundo exacto al que se mueve */}
            {cabezalActivo && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow">
                {formatearDuracion(playhead)}
              </span>
            )}
            {/* manija superior: se puede agarrar y arrastrar a lo largo de la
                pista para mover el cabezal. es lo único con eventos activos de
                esta capa, el resto de la línea azul no intercepta el ratón */}
            <div
              onPointerDown={arrastrarCabezal}
              title="Arrastra para mover el cabezal"
              className="pointer-events-auto absolute -top-0.5 left-1/2 flex h-4 w-4 -translate-x-1/2 cursor-grab items-start justify-center active:cursor-grabbing"
            >
              <span className="h-3 w-3 rounded-sm bg-brand shadow-sm" />
              {/* puntita inferior que ancla la manija a la línea */}
              <span className="absolute top-2.5 h-1.5 w-1.5 rotate-45 bg-brand" />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
