import { PointerEvent as ReactPointerEvent } from 'react'

// fundido de sonido de un bloque (un clip de audio, o el propio audio de un clip de video), dibujado
// como una cuña VERDE arrastrable en la franja de ABAJO del bloque: verde = sonido, y va abajo para
// no pisar las transiciones de imagen, que son azules y ocupan todo el alto arriba. la de entrada
// abre por la izquierda, la de salida cierra por la derecha; se estira con su tirador, con un tope de
// la mitad del bloque para que la de entrada y la de salida no se crucen ni se coman todo. si el
// fundido es cero la cuña no se ve, pero el tirador sí queda a la vista para empezar a arrastrar
export default function FundidoAudioBlock({
  pxPorSegundo,
  lado = 'entrada',
  duracion,
  fundidoEntrada = 0,
  fundidoSalida = 0,
  onSetFundido,
  onSetAmbos,
  onSeleccionar,
}: {
  pxPorSegundo: number
  lado?: 'entrada' | 'salida'
  duracion: number
  fundidoEntrada?: number
  fundidoSalida?: number
  onSetFundido: (lado: 'entrada' | 'salida', segundos: number) => void
  onSetAmbos: (segundos: number) => void
  onSeleccionar: () => void
}) {
  const esSalida = lado === 'salida'
  const fund = (esSalida ? fundidoSalida : fundidoEntrada) ?? 0
  const otro = (esSalida ? fundidoEntrada : fundidoSalida) ?? 0
  // tope fijo de 10 s; si el clip dura menos, manda el clip. además, para que la entrada y la salida
  // no se crucen, este fundido no puede pasar de lo que deja libre el otro. al igualar ambos con
  // shift, el tope es la mitad del clip (así los dos juntos caben sin cruzarse)
  const MAX = 10
  const maxIndividual = Math.min(MAX, duracion - otro)
  const maxIgual = Math.min(MAX, duracion / 2)
  const ancho = fund > 0 ? Math.max(fund * pxPorSegundo, 12) : 0

  function estirar(e: ReactPointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    // al agarrar el tirador se selecciona el bloque y se abre su panel de sonido, aunque sea con shift
    onSeleccionar()
    const inicioX = e.clientX
    const original = fund
    const mover = (ev: globalThis.PointerEvent) => {
      const delta = ((ev.clientX - inicioX) / pxPorSegundo) * (esSalida ? -1 : 1)
      // el shift se mira EN VIVO: se puede empezar a arrastrar normal y, al presionar shift a mitad,
      // pasa a igualar los dos lados desde ese momento (no hace falta tener shift antes de agarrar)
      const igualar = ev.shiftKey
      const tope = igualar ? maxIgual : maxIndividual
      const nueva = Math.min(tope, Math.max(0, original + delta))
      const s = Number(nueva.toFixed(2))
      if (igualar) onSetAmbos(s)
      else onSetFundido(lado, s)
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
    <div
      // franja inferior del bloque: deja libre la parte de arriba para las transiciones de imagen
      className={`pointer-events-none absolute bottom-0 z-30 h-[42%] ${esSalida ? 'right-0' : 'left-0'}`}
      style={{ width: Math.max(ancho, 10) }}
    >
      {fund > 0 && (
        <div
          className="pointer-events-none h-full w-full"
          style={{
            width: ancho,
            background: esSalida
              ? 'linear-gradient(to left, rgb(34 197 94 / 0.85), rgb(34 197 94 / 0.18))'
              : 'linear-gradient(to right, rgb(34 197 94 / 0.85), rgb(34 197 94 / 0.18))',
            clipPath: esSalida ? 'polygon(100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 100%, 0 100%)',
          }}
        />
      )}
      <div
        onPointerDown={estirar}
        title={esSalida ? 'Fundido de salida del sonido' : 'Fundido de entrada del sonido'}
        className={`pointer-events-auto absolute bottom-0 flex h-full w-2.5 cursor-ew-resize flex-col items-center justify-center gap-0.5 ${
          esSalida ? 'left-0 rounded-l-sm' : 'right-0 rounded-r-sm'
        }`}
        style={{ background: 'rgb(34 197 94 / 0.9)' }}
      >
        <span className="h-2 w-px bg-black/45" />
      </div>
    </div>
  )
}
