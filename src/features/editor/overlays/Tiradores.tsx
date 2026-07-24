import { MouseEvent as ReactMouseEvent } from 'react'
import { Ancla, ANCLAS, CURSORES, POSICION } from '../../../lib/layers/resize'

// los ocho puntos de agarre que rodean a un elemento seleccionado. cada uno
// estira hacia su lado y deja quieto el borde contrario; con Shift el elemento
// conserva su proporción
export default function Tiradores({
  onAgarrar,
  soloEsquinas = false,
}: {
  onAgarrar: (ancla: Ancla, e: ReactMouseEvent) => void
  soloEsquinas?: boolean
}) {
  const anclas = soloEsquinas ? ANCLAS.filter((a) => a.length === 2) : ANCLAS

  return (
    <>
      {anclas.map((a) => (
        <div
          key={a}
          onMouseDown={(e) => onAgarrar(a, e)}
          className="pointer-events-auto absolute h-2.5 w-2.5 rounded-[3px] border-2 border-white bg-brand shadow-sm transition-transform duration-150 hover:scale-125"
          style={{
            left: POSICION[a].left,
            top: POSICION[a].top,
            cursor: CURSORES[a],
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </>
  )
}
