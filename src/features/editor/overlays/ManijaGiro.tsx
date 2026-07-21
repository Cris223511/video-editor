import { MouseEvent as ReactMouseEvent } from 'react'

// manija de giro que sale por encima de la caja de selección: una varilla corta y
// un círculo que se arrastra para rotar el elemento alrededor de su centro. quien
// la usa resuelve el giro en su propio manejador (cada elemento guarda su rotación
// en su sitio), aquí va solo el mando y su aspecto
export default function ManijaGiro({ onAgarrar }: { onAgarrar: (e: ReactMouseEvent) => void }) {
  return (
    <>
      {/* varilla que une el borde superior de la caja con el círculo de giro */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '50%',
          top: 0,
          width: 1,
          height: 20,
          transform: 'translate(-50%, -100%)',
          background: 'rgb(var(--accent))',
        }}
      />
      {/* círculo que se agarra para girar. el cursor de agarre deja claro que se
          arrastra, y con Shift el giro salta de quince en quince grados */}
      <div
        onMouseDown={onAgarrar}
        title="Arrastra para girar (Shift para saltos de 15°)"
        className="absolute grid h-4 w-4 cursor-grab place-items-center rounded-full border-2 border-white bg-brand shadow-sm transition-transform hover:scale-110 active:cursor-grabbing"
        style={{ left: '50%', top: -20, transform: 'translate(-50%, -100%)' }}
      />
    </>
  )
}

// calcula la rotación en grados a partir del centro del elemento en pantalla y la
// posición del cursor. la manija cuelga arriba (las doce), así que se compensa con
// noventa grados. con Shift el resultado se ajusta al múltiplo de quince más cercano
export function anguloGiro(cx: number, cy: number, ev: globalThis.MouseEvent): number {
  let ang = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90
  if (ev.shiftKey) ang = Math.round(ang / 15) * 15
  return ((Math.round(ang) % 360) + 360) % 360
}
