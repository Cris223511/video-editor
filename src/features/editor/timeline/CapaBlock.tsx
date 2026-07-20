import { MouseEvent as ReactMouseEvent } from 'react'
import { Capa } from '../../../types/layers'
import { useEditorStore } from '../../../store/useEditorStore'
import { imantarMover, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'

interface Props {
  capa: Capa
  pxPorSegundo: number
  puntos: number[]
}

// bloque de una capa en su pista de tiempo. define de qué segundo a qué segundo
// aparece; se mueve con imantado y se recorta por los bordes
export default function CapaBlock({ capa, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.capaSeleccionada === capa.id)
  const seleccionarCapa = useEditorStore((s) => s.seleccionarCapa)
  const moverCapaTiempo = useEditorStore((s) => s.moverCapaTiempo)
  const duplicarCapa = useEditorStore((s) => s.duplicarCapa)
  const recortarCapaTiempo = useEditorStore((s) => s.recortarCapaTiempo)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    // con alt pulsado el arrastre no mueve la capa sino que suelta una copia que
    // sigue al cursor, con la original intacta. sin alt es el movimiento de siempre
    let idGesto = capa.id
    if (e.altKey) {
      const nuevo = duplicarCapa(capa.id)
      if (nuevo) idGesto = nuevo
    } else {
      seleccionarCapa(capa.id)
    }
    const startX = e.clientX
    const inicioOriginal = capa.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioOriginal, inicioOriginal + capa.duracion]

    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      const bruto = Math.max(0, inicioOriginal + dx)
      const { inicio, guia } = imantarMover(bruto, capa.duracion, puntos, umbral, propios)
      setGuiaImantado(guia)
      moverCapaTiempo(idGesto, inicio)
    }
    const soltar = () => {
      setGuiaImantado(null)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  function iniciarRecorte(e: ReactMouseEvent, lado: 'inicio' | 'fin') {
    e.stopPropagation()
    e.preventDefault()
    seleccionarCapa(capa.id)
    let lastX = e.clientX
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      recortarCapaTiempo(capa.id, lado, delta)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const etiqueta =
    capa.tipo === 'texto'
      ? capa.texto || 'Texto'
      : capa.tipo === 'imagen'
        ? 'Imagen'
        : capa.tipo === 'censura'
          ? 'Censura'
          : 'Figura'

  return (
    <div
      onMouseDown={iniciarMover}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-md border-2 px-2 transition-[border-color]',
        seleccionado ? 'border-amber-400' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: capa.inicio * pxPorSegundo,
        width: Math.max(capa.duracion * pxPorSegundo, 8),
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
      }}
    >
      <span className="pointer-events-none truncate text-[10px] text-white">{etiqueta}</span>

      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-amber-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-amber-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}
