import { PointerEvent as ReactPointerEvent } from 'react'
import Tooltip from '../../../components/ui/Tooltip'
import { Capa } from '../../../types/layers'
import { useEditorStore } from '../../../store/useEditorStore'
import { buscarTransicion } from '../../../lib/transiciones/catalogo'

// cuña de la transición de una capa, sobre su borde izquierdo si es de entrada o el
// derecho si es de salida. mismo lenguaje visual que la de los clips de video: el ancho
// es la duración real y se arrastra el tirador para cambiarla, hasta la mitad del
// elemento. así una capa puede abrir de una forma y cerrar de otra, igual que un clip
export default function TransicionCapaBlock({
  capa,
  pxPorSegundo,
  lado = 'entrada',
}: {
  capa: Capa
  pxPorSegundo: number
  lado?: 'entrada' | 'salida'
}) {
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const esSalida = lado === 'salida'
  const tr = esSalida ? capa.transicionSalida : capa.transicion
  const tipo = tr?.tipo ?? 'ninguna'
  const duracion = tr?.duracion ?? 0
  if (tipo === 'ninguna' || duracion <= 0) return null

  const ancho = Math.max(duracion * pxPorSegundo, 6)
  const maximo = capa.duracion / 2

  // por eventos de puntero y cortando la propagación, para que arrastrar el tirador
  // no acabe moviendo la capa entera (que también escucha el pointerdown)
  function estirar(e: ReactPointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    const inicioX = e.clientX
    const original = duracion
    const mover = (ev: globalThis.PointerEvent) => {
      // la de salida se estira hacia la izquierda, así que su delta va al revés
      const delta = ((ev.clientX - inicioX) / pxPorSegundo) * (esSalida ? -1 : 1)
      const nueva = Math.min(maximo, Math.max(0.1, original + delta))
      const cambio = { tipo, duracion: Number(nueva.toFixed(2)) }
      actualizarCapa(capa.id, esSalida ? { transicionSalida: cambio } : { transicion: cambio })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  return (
    <Tooltip texto={`${esSalida ? 'Salida' : 'Entrada'} · ${buscarTransicion(tipo).nombre} · ${duracion.toFixed(2)} s`}>
      <div
        // la cuña no captura el puntero: el clic la atraviesa hasta el propio elemento
        // (para moverlo o recortarlo); solo el tirador de duración lo captura
        className={`group/tr pointer-events-none absolute top-0 z-10 h-full ${esSalida ? 'right-0' : 'left-0'}`}
        style={{ width: ancho }}
      >
        <div
          className={`pointer-events-none h-full w-full ${esSalida ? 'rounded-r-md' : 'rounded-l-md'}`}
          style={{
            background: esSalida
              ? 'linear-gradient(to left, rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.1))'
              : 'linear-gradient(to right, rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.1))',
            clipPath: esSalida ? 'polygon(100% 0, 100% 100%, 0 100%)' : 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
        <div
          onPointerDown={estirar}
          className={`pointer-events-auto absolute top-0 flex h-full w-1.5 cursor-ew-resize items-center justify-center bg-white/70 transition-colors duration-150 group-hover/tr:bg-white ${esSalida ? 'left-0 rounded-l-sm' : 'right-0 rounded-r-sm'}`}
        >
          <span className="h-2.5 w-px bg-black/40" />
        </div>
      </div>
    </Tooltip>
  )
}
