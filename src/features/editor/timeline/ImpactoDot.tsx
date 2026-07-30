import { PointerEvent as ReactPointerEvent } from 'react'
import { Impacto } from '../../../types/impacto'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'

interface Props {
  impacto: Impacto
  clip: Clip
  pxPorSegundo: number
}

// la bolita de un impacto, colocada encima de su clip en el segundo donde ocurre.
// debajo lleva una rayita que dibuja cuánto dura, de dónde a dónde. se arrastra a
// los lados para cambiar el momento, y un clic la selecciona para editarla. el
// tirador del extremo de la rayita alarga o acorta la duración
export default function ImpactoDot({ impacto, clip, pxPorSegundo }: Props) {
  const seleccionado = useEditorStore((s) => s.impactoSeleccionado === impacto.id)
  const moverImpacto = useEditorStore((s) => s.moverImpacto)
  const recortarImpacto = useEditorStore((s) => s.recortarImpacto)
  const seleccionarImpacto = useEditorStore((s) => s.seleccionarImpacto)
  const duplicarImpacto = useEditorStore((s) => s.duplicarImpacto)
  // la línea guía celeste que cruza la línea de tiempo mientras se arrastra la
  // bolita, para saber en qué segundo va a caer el impacto
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)

  // posición dentro del clip: los píxeles desde el borde izquierdo del bloque
  const izquierda = (impacto.t - clip.inicio) * pxPorSegundo
  const anchoLinea = Math.max(2, impacto.duracion * pxPorSegundo)

  function iniciarMover(e: ReactPointerEvent) {
    if (e.button !== 0) return
    // no dejar que el gesto arranque el arrastre del clip de debajo
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const tOriginal = impacto.t
    // con Alt pulsado el arrastre saca una copia y mueve la copia, dejando el
    // original clavado donde estaba. mismo gesto que con clips y capas
    const conCopia = e.altKey
    let idArrastrado = impacto.id
    let copiado = false
    let movido = false
    const mover = (ev: globalThis.PointerEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      if (!movido && Math.abs(ev.clientX - startX) < 3) return
      movido = true
      // la copia nace en cuanto arranca el arrastre de verdad, sobre el original, y a
      // partir de ahí es a ella a la que se mueve
      if (conCopia && !copiado) {
        const nuevo = duplicarImpacto(impacto.id, tOriginal)
        if (nuevo) idArrastrado = nuevo
        copiado = true
      }
      const nuevoT = Math.max(0, tOriginal + dx)
      moverImpacto(idArrastrado, nuevoT)
      // la línea guía marca dónde quedará la bolita mientras se arrastra
      setGuiaImantado(nuevoT)
    }
    const soltar = () => {
      // un clic seco, sin arrastrar, solo selecciona para abrir su editor
      if (!movido) seleccionarImpacto(impacto.id)
      setGuiaImantado(null)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  function iniciarDuracion(e: ReactPointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    seleccionarImpacto(impacto.id)
    const startX = e.clientX
    const durOriginal = impacto.duracion
    const mover = (ev: globalThis.PointerEvent) => {
      recortarImpacto(impacto.id, durOriginal + (ev.clientX - startX) / pxPorSegundo)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
    <span className="pointer-events-none absolute left-0 top-0 z-30" style={{ transform: `translateX(${izquierda}px)` }}>
      {/* la rayita de duración, arrancando desde el centro de la bolita, a color pleno
          para que se lea igual que la bolita y no se vea desvaída */}
      <span
        className="pointer-events-auto absolute top-[6px] h-[3px] cursor-ew-resize rounded-full"
        style={{
          width: anchoLinea,
          background: impacto.color,
        }}
        onPointerDown={iniciarDuracion}
      />
      {/* la bolita */}
      <span
        className="pointer-events-auto absolute top-[1px] h-3 w-3 -translate-x-1/2 cursor-grab rounded-full ring-2 transition-transform duration-150 hover:scale-125 active:cursor-grabbing"
        style={{
          background: impacto.color,
          borderColor: '#fff',
          boxShadow: `0 0 6px ${impacto.color}`,
          ['--tw-ring-color' as string]: seleccionado ? '#ffffff' : `${impacto.color}88`,
          outline: seleccionado ? '2px solid #fff' : 'none',
          outlineOffset: 1,
        }}
        onPointerDown={iniciarMover}
      />
    </span>
  )
}
