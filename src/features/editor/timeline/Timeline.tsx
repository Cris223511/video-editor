import { MouseEvent, useMemo, useRef } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { duracionTotal } from '../../../lib/timeline/timeline'
import { formatearDuracion } from '../../../lib/format/bytes'
import TimeRuler from './TimeRuler'
import ClipBlock from './ClipBlock'
import CapaBlock from './CapaBlock'
import AudioBlock from './AudioBlock'

const MIN = 0.1

// línea de tiempo con dos pistas: la de video (clips) y la de capas (texto y,
// más adelante, imagen y censura). permite mover el cabezal por la regla,
// dividir clips en el cabezal, y acercar o alejar
export default function Timeline() {
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const playhead = useEditorStore((s) => s.playhead)
  const pxPorSegundo = useEditorStore((s) => s.pxPorSegundo)
  const irA = useEditorStore((s) => s.irA)
  const aplicarZoom = useEditorStore((s) => s.aplicarZoom)
  const dividirEnCabezal = useEditorStore((s) => s.dividirEnCabezal)
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

  return (
    <div className="glass flex h-72 flex-col border-t border-black/10 dark:border-white/10">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium text-[color:var(--muted)]">
          Línea de tiempo · {formatearDuracion(total)}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={dividirEnCabezal}
            disabled={!puedeDividir}
            title="Dividir en el cabezal (S)"
            className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)] disabled:opacity-40"
          >
            <Icon name="tijeras" size={17} />
          </button>
          <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />
          <button
            onClick={() => aplicarZoom(1 / 1.3)}
            title="Alejar"
            className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
          >
            <Icon name="zoomMenos" size={18} />
          </button>
          <button
            onClick={() => aplicarZoom(1.3)}
            title="Acercar"
            className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
          >
            <Icon name="zoomMas" size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="relative h-full" style={{ width: anchoContenido }}>
          <div onMouseDown={alPresionarRegla}>
            <TimeRuler total={total} pxPorSegundo={pxPorSegundo} ancho={anchoContenido} />
          </div>

          {/* pista de video */}
          <div className="relative mt-2 h-16">
            {clips.length === 0 ? (
              <div className="flex h-full items-center px-4 text-xs text-[color:var(--muted)]">
                Añade clips desde la biblioteca de la izquierda.
              </div>
            ) : (
              clips.map((c) => {
                const asset = medios.find((m) => m.id === c.assetId)
                return (
                  <ClipBlock
                    key={c.id}
                    clip={c}
                    miniatura={asset?.miniatura}
                    nombre={asset?.nombre ?? 'clip'}
                    pxPorSegundo={pxPorSegundo}
                    puntos={puntos}
                  />
                )
              })
            )}
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
  )
}
