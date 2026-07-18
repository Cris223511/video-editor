import { MouseEvent as ReactMouseEvent } from 'react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'

interface Props {
  clip: Clip
  miniatura?: string
  nombre: string
  pxPorSegundo: number
  puntos: number[] // instantes a los que imantar el clip al moverlo
}

const UMBRAL_PX = 8

// bloque de un clip en la pista. se puede seleccionar, mover con imantado y
// recortar por sus bordes con los tiradores laterales
export default function ClipBlock({ clip, miniatura, nombre, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.clipSeleccionado === clip.id)
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const moverClip = useEditorStore((s) => s.moverClip)
  const recortarClip = useEditorStore((s) => s.recortarClip)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    seleccionar(clip.id)
    const startX = e.clientX
    const inicioOriginal = clip.inicio
    const umbral = UMBRAL_PX / pxPorSegundo

    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      let candidato = Math.max(0, inicioOriginal + dx)
      // imantado: si el inicio o el fin del clip caen cerca de un punto de
      // anclaje, se pegan a él para que sea fácil unir clips sin huecos
      for (const p of puntos) {
        if (Math.abs(candidato - p) < umbral) {
          candidato = p
          break
        }
        if (Math.abs(candidato + clip.duracion - p) < umbral) {
          candidato = Math.max(0, p - clip.duracion)
          break
        }
      }
      moverClip(clip.id, candidato)
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
    seleccionar(clip.id)
    let lastX = e.clientX
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      recortarClip(clip.id, lado, delta)
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
        'group absolute top-0 flex h-full cursor-grab items-end overflow-hidden rounded-lg border-2 transition-[border-color]',
        seleccionado ? 'border-brand' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: clip.inicio * pxPorSegundo,
        width: Math.max(clip.duracion * pxPorSegundo, 8),
        backgroundImage: miniatura ? `url(${miniatura})` : undefined,
        backgroundSize: 'cover',
        backgroundColor: 'rgba(24, 97, 255, 0.2)',
      }}
    >
      <span className="pointer-events-none w-full truncate bg-black/60 px-2 py-0.5 text-[10px] text-white">
        {nombre}
      </span>

      {clip.velocidad !== 1 && (
        <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/70 px-1 text-[9px] font-medium text-white">
          {Number(clip.velocidad.toFixed(2))}x
        </span>
      )}

      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        title="Recortar por el inicio"
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-brand/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        title="Recortar por el final"
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-brand/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}
