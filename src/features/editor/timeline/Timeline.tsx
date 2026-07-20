import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
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

const MIN = 0.1
// alto de la regla de tiempo, replicado en la columna de cabeceras para que las
// filas de ambas columnas queden a la misma altura
const ALTO_REGLA = 29

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
  const dividirEnCabezal = useEditorStore((s) => s.dividirEnCabezal)
  const numPistas = useEditorStore((s) => s.numPistas)
  const altosPista = useEditorStore((s) => s.altosPista)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const agregarPista = useEditorStore((s) => s.agregarPista)
  const medios = useProjectStore((s) => s.medios)

  const scrollRef = useRef<HTMLDivElement>(null)
  const total = duracionTotal(clips)
  const anchoContenido = Math.max(total * pxPorSegundo + 200, 600)

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

  function moverCabezal(clientX: number) {
    const cont = scrollRef.current
    if (!cont) return
    const rect = cont.getBoundingClientRect()
    const x = clientX - rect.left + cont.scrollLeft
    irA(x / pxPorSegundo)
  }

  function alPresionarRegla(e: MouseEvent) {
    moverCabezal(e.clientX)
    const mover = (ev: globalThis.MouseEvent) => moverCabezal(ev.clientX)
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
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
          <Tooltip texto="Añadir un nivel de video encima" lado="abajo">
            <button
              onClick={agregarPista}
              disabled={numPistas >= 6}
              className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon name="video" size={17} />
            </button>
          </Tooltip>
          <span className="mx-1 h-5 w-px" style={{ background: 'rgb(var(--border) / 0.14)' }} />
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

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        {/* columna fija con la cabecera de cada nivel, alineada con sus filas */}
        <div
          className="w-44 shrink-0"
          style={{ borderRight: '1px solid rgb(var(--border) / 0.1)' }}
        >
          <div style={{ height: ALTO_REGLA }} />
          <div className="mt-2 flex flex-col" style={{ gap: HUECO_PISTA }}>
            {filas.map((p) => (
              <PistaHeader key={p} indice={p} alto={altosPista[p]} />
            ))}
          </div>
          {/* añadir un nivel desde el pie de la columna de cabeceras, además del
              botón de la barra superior. se apaga al llegar al tope de niveles */}
          <button
            onClick={agregarPista}
            disabled={numPistas >= 6}
            className="interactivo mt-1.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-40"
            style={{ border: '1px dashed rgb(var(--border) / 0.2)' }}
          >
            <Icon name="video" size={14} />
            Agregar nivel
          </button>
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
        className={[
          'relative min-h-0 flex-1 overflow-x-auto overflow-y-auto transition-colors duration-200',
          recibiendo ? 'bg-brand/10 ring-2 ring-inset ring-brand/40' : '',
        ].join(' ')}
      >
        <div className="relative h-full" style={{ width: anchoContenido }}>
          <div onMouseDown={alPresionarRegla}>
            <TimeRuler total={total} pxPorSegundo={pxPorSegundo} ancho={anchoContenido} />
          </div>

          {/* niveles de video, del más alto al más bajo */}
          <div className="mt-2 flex flex-col" style={{ gap: HUECO_PISTA }}>
            {filas.map((p) => {
              const fila = porPista.get(p)
              const vacio = !fila || fila.clips.length === 0
              const oculta = pistasMeta[p]?.oculta
              return (
                <div
                  key={p}
                  className="relative rounded-md transition-opacity duration-200"
                  style={{
                    height: altosPista[p],
                    background: vacio ? 'rgb(var(--border) / 0.05)' : undefined,
                    // un nivel oculto no se pinta en el visor; en la pista se
                    // atenúa para recordarlo sin sacarlo de en medio
                    opacity: oculta ? 0.4 : 1,
                  }}
                >
                  {vacio && p === 0 && clips.length === 0 && (
                    <div className="flex h-full items-center gap-2 px-4 text-xs text-[color:var(--muted)]">
                      <Icon name="subir" size={14} />
                      Arrastra un video desde el panel de medios hasta aquí.
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
                </div>
              )
            })}
          </div>

          {/* pista de capas */}
          <div className="relative mt-1.5 h-9">
            {capas.map((c) => (
              <CapaBlock key={c.id} capa={c} pxPorSegundo={pxPorSegundo} puntos={puntos} />
            ))}
          </div>

          {/* pista de audio */}
          <div className="relative mt-1.5 h-8">
            {audioRegiones.map((r) => (
              <AudioBlock key={r.id} region={r} pxPorSegundo={pxPorSegundo} puntos={puntos} />
            ))}
          </div>

          <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-brand"
            style={{ left: playhead * pxPorSegundo }}
          >
            <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-sm bg-brand" />
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
