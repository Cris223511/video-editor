import { MouseEvent as ReactMouseEvent, useState } from 'react'
import { Capa } from '../../../types/layers'
import { useEditorStore } from '../../../store/useEditorStore'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'

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

  // durante un gesto propio (mover o recortar) el bloque sigue al cursor sin
  // suavizado, para no ir por detrás del ratón; en reposo se anima su posición
  // para que, al cerrar un hueco o acomodarse, se deslice en vez de saltar
  const [interactuando, setInteractuando] = useState(false)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    setInteractuando(true)
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
      setInteractuando(false)
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
    setInteractuando(true)
    const startX = e.clientX
    const inicioBase = capa.inicio
    const finBase = capa.inicio + capa.duracion
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioBase, finBase]
    // el borde se lleva a donde diga el cursor, pero si roza el cabezal, el cero o
    // el borde de otro elemento se pega a él y sale la guía. el desplazamiento se
    // aplica en incrementos hacia el borde ya imantado, para no descuadrarse
    let ultimoBorde = lado === 'inicio' ? inicioBase : finBase
    const mover = (ev: globalThis.MouseEvent) => {
      const bordeBruto = (lado === 'inicio' ? inicioBase : finBase) + (ev.clientX - startX) / pxPorSegundo
      const enganche = imantarBorde(bordeBruto, puntos, umbral, propios)
      const bordeFinal = enganche ? enganche.punto : bordeBruto
      setGuiaImantado(enganche ? enganche.guia : null)
      recortarCapaTiempo(capa.id, lado, bordeFinal - ultimoBorde)
      ultimoBorde = bordeFinal
    }
    const soltar = () => {
      setGuiaImantado(null)
      setInteractuando(false)
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
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-md border px-2 transition-[border-color]',
        seleccionado ? 'border-amber-400' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: capa.inicio * pxPorSegundo,
        width: Math.max(capa.duracion * pxPorSegundo, 8),
        backgroundColor: 'rgba(245, 158, 11, 0.25)',
        // en reposo la posición se anima con una curva suave; durante el arrastre
        // el suavizado se apaga para que el bloque no vaya por detrás del cursor
        transition: interactuando ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
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
