import { PointerEvent as ReactPointerEvent } from 'react'
import { Ancla, ANCLAS, cursorGirado, POSICION } from '../../../lib/layers/resize'

// los ocho puntos de agarre que rodean a un elemento seleccionado. cada uno
// estira hacia su lado y deja quieto el borde contrario; con Shift el elemento
// conserva su proporción. el giro y el volteo del elemento se pasan para que la
// flecha del cursor apunte de verdad hacia donde estira cada lado
export default function Tiradores({
  onAgarrar,
  soloEsquinas = false,
  rotacion = 0,
  espejoH = false,
  espejoV = false,
}: {
  onAgarrar: (ancla: Ancla, e: ReactPointerEvent) => void
  soloEsquinas?: boolean
  rotacion?: number
  espejoH?: boolean
  espejoV?: boolean
}) {
  const anclas = soloEsquinas ? ANCLAS.filter((a) => a.length === 2) : ANCLAS

  return (
    <>
      {anclas.map((a) => (
        <div
          key={a}
          onPointerDown={(e) => onAgarrar(a, e)}
          className="pointer-events-auto absolute h-2.5 w-2.5 rounded-[3px] border-2 border-white bg-brand shadow-sm transition-transform duration-150 hover:scale-125"
          style={{
            left: POSICION[a].left,
            top: POSICION[a].top,
            cursor: cursorGirado(a, rotacion, espejoH, espejoV),
            // el dedo estira el tirador en vez de desplazar la página
            touchAction: 'none',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </>
  )
}
