import { MouseEvent as ReactMouseEvent } from 'react'
import { RegionAudio } from '../../../types/audio'
import { useEditorStore } from '../../../store/useEditorStore'

interface Props {
  region: RegionAudio
  pxPorSegundo: number
  puntos: number[]
}

const UMBRAL_PX = 8

// bloque de una franja de volumen en su pista de tiempo. define el tramo donde
// se aplica la ganancia; se mueve con imantado y se recorta por los bordes
export default function AudioBlock({ region, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.regionSeleccionada === region.id)
  const seleccionarRegion = useEditorStore((s) => s.seleccionarRegion)
  const moverRegionAudio = useEditorStore((s) => s.moverRegionAudio)
  const recortarRegionAudio = useEditorStore((s) => s.recortarRegionAudio)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    seleccionarRegion(region.id)
    const startX = e.clientX
    const inicioOriginal = region.inicio
    const umbral = UMBRAL_PX / pxPorSegundo

    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      let candidato = Math.max(0, inicioOriginal + dx)
      for (const p of puntos) {
        if (Math.abs(candidato - p) < umbral) {
          candidato = p
          break
        }
        if (Math.abs(candidato + region.duracion - p) < umbral) {
          candidato = Math.max(0, p - region.duracion)
          break
        }
      }
      moverRegionAudio(region.id, candidato)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  function iniciarRecorte(e: ReactMouseEvent, lado: 'inicio' | 'fin') {
    e.stopPropagation()
    e.preventDefault()
    seleccionarRegion(region.id)
    let lastX = e.clientX
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      recortarRegionAudio(region.id, lado, delta)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div
      onMouseDown={iniciarMover}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-md border-2 px-2 transition-[border-color]',
        seleccionado ? 'border-emerald-400' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: region.inicio * pxPorSegundo,
        width: Math.max(region.duracion * pxPorSegundo, 8),
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
      }}
    >
      <span className="pointer-events-none truncate text-[10px] text-white">
        {Math.round(region.ganancia * 100)}%
      </span>

      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}
