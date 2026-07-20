import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
import { OndaAudio } from './AudioBlock'
import { TIPO_ARRASTRE } from '../MediaLibrary'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { duracionTotal } from '../../../lib/timeline/clips'
import { formatearDuracion } from '../../../lib/format/duracion'
import TimeRuler from './TimeRuler'
import ClipBlock from './ClipBlock'
import Hueco from './Hueco'
import PistaHeader from './PistaHeader'
import { HUECO_PISTA } from './ClipBlock'
import CapaBlock from './CapaBlock'
import AudioBlock from './AudioBlock'
import CarrilHeader from './CarrilHeader'
import AgregarNivelMenu from './AgregarNivelMenu'

const MIN = 0.1
// alto de la regla de tiempo, replicado en la columna de cabeceras para que las
// filas de ambas columnas queden a la misma altura
const ALTO_REGLA = 29
// separación vertical entre secciones (el hueco que despega el carril de texto
// del bloque de video y el de audio del de texto). se aplica idéntica en la
// columna de cabeceras y en las filas del lado derecho para que no se
// desalineen. el hueco entre niveles de video vive en HUECO_PISTA
const SEP_SECCION = 12

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
  const agregarDesdeAsset = useEditorStore((s) => s.agregarDesdeAsset)
  const [recibiendo, setRecibiendo] = useState(false)
  const capas = useEditorStore((s) => s.capas)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const playhead = useEditorStore((s) => s.playhead)
  const pxPorSegundo = useEditorStore((s) => s.pxPorSegundo)
  const irA = useEditorStore((s) => s.irA)
  const aplicarZoom = useEditorStore((s) => s.aplicarZoom)
  const setAnchoTimeline = useEditorStore((s) => s.setAnchoTimeline)
  const limpiarSeleccion = useEditorStore((s) => s.limpiarSeleccion)
  const dividirEnCabezal = useEditorStore((s) => s.dividirEnCabezal)
  const numPistas = useEditorStore((s) => s.numPistas)
  const altosPista = useEditorStore((s) => s.altosPista)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  // separación entre dos niveles marcada mientras se arrastra un clip: si no es
  // null, ahí se dibuja la guía celeste que promete crear una pista al soltar
  const insercionPista = useEditorStore((s) => s.insercionPista)
  const medios = useProjectStore((s) => s.medios)

  const scrollRef = useRef<HTMLDivElement>(null)
  // contenedor de las filas de video; su distancia al borde del contenido sitúa
  // la guía de inserción a la altura exacta de cada separación entre niveles
  const filasRef = useRef<HTMLDivElement>(null)
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
  const total = duracionTotal(clips)
  const anchoContenido = Math.max(total * pxPorSegundo + 200, anchoVisible || 600)

  // instantes a los que se imantan clips y capas: el cero, el cabezal y los
  // bordes de todos los elementos
  const puntos = useMemo(() => {
    const p = [0, playhead]
    clips.forEach((c) => p.push(c.inicio, c.inicio + c.duracion))
    capas.forEach((c) => p.push(c.inicio, c.inicio + c.duracion))
    audioRegiones.forEach((r) => p.push(r.inicio, r.inicio + r.duracion))
    return p
  }, [clips, capas, audioRegiones, playhead])

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
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const caja = cont!.getBoundingClientRect()
      const dentro = e.clientX - caja.left
      // el segundo que hay justo bajo el cursor antes de cambiar la escala. se
      // conserva después ajustando el desplazamiento, y así el zoom crece hacia
      // donde se está mirando en lugar de hacia el principio de la pista
      const st = useEditorStore.getState()
      const segundo = (dentro + cont!.scrollLeft) / st.pxPorSegundo
      st.aplicarZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)
      const escala = useEditorStore.getState().pxPorSegundo
      cont!.scrollLeft = segundo * escala - dentro
    }

    cont.addEventListener('wheel', alGirar, { passive: false })
    return () => cont.removeEventListener('wheel', alGirar)
  }, [])

  // el ancho útil de la pista se sigue con un observador: al cambiar el tamaño
  // del panel o plegar los medios, la regla se reajusta para no quedarse a medias
  useEffect(() => {
    const cont = scrollRef.current
    if (!cont) return
    const medir = () => {
      setAnchoVisible(cont.clientWidth)
      // el mismo ancho se comparte con el store, que lo usa para encuadrar el
      // zoom al soltar un video
      setAnchoTimeline(cont.clientWidth)
    }
    const ro = new ResizeObserver(medir)
    ro.observe(cont)
    medir()
    return () => ro.disconnect()
  }, [setAnchoTimeline])

  function moverCabezal(clientX: number) {
    const cont = scrollRef.current
    if (!cont) return
    const rect = cont.getBoundingClientRect()
    const x = clientX - rect.left + cont.scrollLeft
    irA(x / pxPorSegundo)
  }

  // el cabezal se puede arrastrar agarrando su manija superior, además de
  // pulsando en la regla. el gesto reutiliza moverCabezal, así que el cabezal
  // sigue al cursor mientras se mantiene pulsado
  function arrastrarCabezal(e: MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setCabezalActivo(true)
    moverCabezal(e.clientX)
    const mover = (ev: globalThis.MouseEvent) => moverCabezal(ev.clientX)
    const soltar = () => {
      setCabezalActivo(false)
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    document.body.style.cursor = 'grabbing'
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  function alPresionarRegla(e: MouseEvent) {
    // la regla mueve el cabezal, no cambia la selección: por eso corta la
    // propagación antes de que el clic llegue al deseleccionado del fondo
    e.stopPropagation()
    setCabezalActivo(true)
    moverCabezal(e.clientX)
    const mover = (ev: globalThis.MouseEvent) => moverCabezal(ev.clientX)
    const soltar = () => {
      setCabezalActivo(false)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // sigue el cursor por la zona de la línea de tiempo y guarda el segundo bajo
  // él para pintar el scrubber. el cálculo replica el de mover el cabezal, pero
  // sin tocar el estado del reproductor: es solo una previsualización
  function seguirScrubber(e: MouseEvent) {
    const cont = scrollRef.current
    if (!cont) return
    const rect = cont.getBoundingClientRect()
    const x = e.clientX - rect.left + cont.scrollLeft
    setHoverSeg(Math.max(0, x / pxPorSegundo))
  }

  // punto donde el fondo vacío suelta la selección. los clips, capas y regiones
  // cortan la propagación en su propio mousedown, así que solo llega aquí el
  // clic en una zona libre
  function deseleccionarFondo() {
    limpiarSeleccion()
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

  // al soltar un medio arrastrado desde el panel, se añade a la pista
  function alSoltar(e: React.DragEvent) {
    e.preventDefault()
    setRecibiendo(false)
    const id = e.dataTransfer.getData(TIPO_ARRASTRE)
    if (!id) return
    const asset = medios.find((m) => m.id === id)
    if (asset) agregarDesdeAsset(asset)
  }

  return (
    <div className="flex h-full flex-col">
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
          <Tooltip texto="Alejar" lado="abajo">
            <button
              onClick={() => aplicarZoom(1 / 1.3)}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <Icon name="zoomMenos" size={18} />
            </button>
          </Tooltip>
          <Tooltip texto="Acercar" lado="abajo">
            <button
              onClick={() => aplicarZoom(1.3)}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <Icon name="zoomMas" size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* las dos columnas comparten un único desplazamiento vertical (el de este
          contenedor) para que cabeceras y filas suban y bajen juntas sin
          desalinearse. entre ambas queda un hueco limpio, sin línea divisoria */}
      <div className="flex min-h-0 flex-1 gap-2 overflow-y-auto overflow-x-hidden">
        {/* columna fija con la cabecera de cada nivel, alineada con sus filas.
            el grupo permite que el «+» de agregar nivel asome solo al pasar el
            cursor por encima, en vez de ocupar sitio siempre */}
        <div className="group/cols w-44 shrink-0">
          <div style={{ height: ALTO_REGLA }} />
          {/* el bloque de niveles de video es relativo para colgar de su borde
              inferior el «+» de agregar, que asoma al pasar el cursor sin ocupar
              sitio en el flujo y, por tanto, sin descuadrar los carriles */}
          <div className="relative mt-2 flex flex-col" style={{ gap: HUECO_PISTA }}>
            {filas.map((p) => (
              <motion.div key={pistasMeta[p]?.id ?? p} layout="position" transition={DESLIZA}>
                <PistaHeader indice={p} alto={altosPista[p]} />
              </motion.div>
            ))}
            <AgregarNivelMenu />
          </div>
          {/* cabeceras de los carriles de texto y de audio, alineadas con sus
              filas del lado derecho (mismo margen y alto). se muestran siempre,
              aunque el carril esté vacío, para que se entienda que ese espacio
              existe y qué le corresponde */}
          <div style={{ marginTop: SEP_SECCION }}>
            <CarrilHeader icono="texto" titulo="Texto y figuras" acento="#f59e0b" alto={36} />
          </div>
          <div style={{ marginTop: SEP_SECCION }}>
            <CarrilHeader icono="musica" titulo="Audio" acento="#10b981" alto={32} />
          </div>
        </div>

      <div
        ref={scrollRef}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(TIPO_ARRASTRE)) {
            e.preventDefault()
            setRecibiendo(true)
          }
        }}
        onDragLeave={() => setRecibiendo(false)}
        onDrop={alSoltar}
        onMouseDown={deseleccionarFondo}
        onMouseMove={seguirScrubber}
        onMouseLeave={() => setHoverSeg(null)}
        className={[
          'relative min-h-0 flex-1 overflow-x-auto overflow-y-auto transition-colors duration-200',
          recibiendo ? 'bg-brand/10 ring-2 ring-inset ring-brand/40' : '',
        ].join(' ')}
      >
        <div className="relative" style={{ width: anchoContenido }}>
          <div onMouseDown={alPresionarRegla}>
            <TimeRuler total={total} pxPorSegundo={pxPorSegundo} ancho={anchoContenido} alto={ALTO_REGLA} />
          </div>

          {/* niveles de video, del más alto al más bajo */}
          <div ref={filasRef} data-tracks className="mt-2 flex flex-col" style={{ gap: HUECO_PISTA }}>
            {filas.map((p) => {
              const fila = porPista.get(p)
              const vacio = !fila || fila.clips.length === 0
              const oculta = pistasMeta[p]?.oculta
              return (
                <motion.div
                  key={pistasMeta[p]?.id ?? p}
                  layout="position"
                  transition={DESLIZA}
                  data-fila-pista={p}
                  className="relative rounded-lg transition-opacity duration-200"
                  style={{
                    height: altosPista[p],
                    background: vacio ? 'rgb(var(--border) / 0.05)' : undefined,
                    // un nivel oculto no se pinta en el visor; en la pista se
                    // atenúa para recordarlo sin sacarlo de en medio
                    opacity: oculta ? 0.4 : 1,
                  }}
                >
                  {vacio && p === 0 && clips.length === 0 && (
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
                        miniatura={asset?.miniatura}
                        nombre={asset?.nombre ?? 'clip'}
                        url={asset?.url}
                        altoPista={altosPista[p]}
                        pxPorSegundo={pxPorSegundo}
                        puntos={puntos}
                      />
                    )
                  })}
                </motion.div>
              )
            })}
          </div>

          {/* carril de capas (texto y figuras). el margen superior es el mismo
              SEP_SECCION que separa las cabeceras del lado izquierdo, para que
              ambas columnas cuadren. vacío enseña su placeholder con icono */}
          <div
            className="relative h-9 overflow-hidden rounded-lg"
            style={{ marginTop: SEP_SECCION, background: 'rgb(var(--border) / 0.05)' }}
          >
            {capas.length === 0 && (
              <div className="pointer-events-none flex h-full items-center gap-2 px-3 text-[11px] text-[color:var(--muted)]">
                <Icon name="texto" size={13} />
                <span>Añadir texto</span>
              </div>
            )}
            {capas.map((c) => (
              <CapaBlock key={c.id} capa={c} pxPorSegundo={pxPorSegundo} puntos={puntos} />
            ))}
          </div>

          {/* carril de audio. de fondo lleva una onda muy tenue para que no se vea
              plano aunque esté vacío; encima van las regiones con su propia onda */}
          <div
            className="relative h-8 overflow-hidden rounded-lg"
            style={{ marginTop: SEP_SECCION, background: 'rgb(var(--border) / 0.05)' }}
          >
            <OndaAudio semilla="fondo-audio" color="rgb(var(--border) / 0.5)" opacidad={0.35} barras={120} />
            {audioRegiones.length === 0 && (
              <div className="pointer-events-none relative flex h-full items-center gap-2 px-3 text-[11px] text-[color:var(--muted)]">
                <Icon name="musica" size={13} />
                <span>Añadir audio</span>
              </div>
            )}
            {audioRegiones.map((r) => (
              <AudioBlock key={r.id} region={r} pxPorSegundo={pxPorSegundo} puntos={puntos} />
            ))}
          </div>

          {/* guía de inserción: la línea celeste que cruza la pista mientras se
              arrastra un clip sobre la separación entre dos niveles. anuncia que
              soltar ahí abre una fila nueva justo en ese punto. lleva un rótulo a
              la izquierda para que se entienda la promesa sin adivinar */}
          {insercionPista !== null && (
            <div
              className="pointer-events-none absolute z-30 flex items-center"
              style={{ top: yInsercion(insercionPista) - 1, left: 0, width: anchoContenido }}
            >
              <span className="h-0.5 w-full rounded-full" style={{ background: '#38bdf8', boxShadow: '0 0 6px rgba(56,189,248,0.9)' }} />
              <span
                className="absolute left-2 -translate-y-px rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ background: '#38bdf8' }}
              >
                Nueva pista aquí
              </span>
            </div>
          )}

          {/* scrubber: línea fina de previsualización que sigue al cursor, más
              delgada y tenue que el cabezal, con la etiqueta del segundo sobre la
              regla. no intercepta el ratón para no estorbar a clips ni cabezal */}
          {hoverSeg !== null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10"
              style={{ left: hoverSeg * pxPorSegundo }}
            >
              <span className="absolute bottom-0 top-0 w-px" style={{ background: 'rgb(var(--brand) / 0.45)' }} />
              <span
                className="absolute top-0 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white shadow-sm"
                style={{ background: 'rgb(var(--brand) / 0.85)' }}
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
              onMouseDown={arrastrarCabezal}
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
