import { PointerEvent as ReactPointerEvent, useState } from 'react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { buscarTransicion } from '../../../lib/transiciones/catalogo'
import { TIPO_TRANSICION } from '../GaleriaTransiciones'
import Tooltip from '../../../components/ui/Tooltip'

// bloque de una transición de cruce (disolución) entre dos clips pegados. a diferencia de
// las cuñas de entrada y salida, que viven dentro de un clip, este monta sobre el corte y
// engancha a los DOS clips: la mitad cae sobre la cola del que sale y la otra sobre la
// cabeza del que entra. se dibuja a nivel del carril, que no recorta, para poder pisar
// ambos bloques. al arrastrar cualquiera de sus dos tiradores crece o mengua simétrico
export default function CruceBlock({
  entra,
  sale,
  altoPista,
  pxPorSegundo,
}: {
  // el que entra es el dueño de la transición (su .transicion); el que sale es el anterior
  entra: Clip
  sale: Clip
  altoPista: number
  pxPorSegundo: number
}) {
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const seleccionado = useEditorStore((s) => s.clipSeleccionado === entra.id)
  const [soltarEncima, setSoltarEncima] = useState(false)
  const tr = entra.transicion
  const nombre = buscarTransicion(tr.tipo).nombre

  // el corte está en el inicio del que entra. el medio ancho no puede comerse más de la
  // cola o la cabeza disponibles, así que se acota a una fracción de cada duración, igual
  // que hace el render centrado
  const corte = entra.inicio
  const topeMedio = Math.min(entra.duracion * 0.9, sale.duracion * 0.9)
  const medio = Math.min(tr.duracion / 2, topeMedio)
  if (medio <= 0) return null

  const izquierda = (corte - medio) * pxPorSegundo
  const ancho = medio * 2 * pxPorSegundo

  // arrastrar un tirador cambia el medio ancho y, con él, la duración (D = 2·medio). el
  // tirador izquierdo crece hacia la izquierda y el derecho hacia la derecha, pero ambos
  // afectan por igual a los dos lados porque el bloque está centrado en el corte
  function estirar(e: ReactPointerEvent, lado: 'izq' | 'der') {
    e.stopPropagation()
    e.preventDefault()
    const inicioX = e.clientX
    const medioOriginal = medio
    const mover = (ev: globalThis.PointerEvent) => {
      const delta = ((ev.clientX - inicioX) / pxPorSegundo) * (lado === 'izq' ? -1 : 1)
      const nuevo = Math.min(topeMedio, Math.max(0.1, medioOriginal + delta))
      setTransicion(entra.id, { duracion: Number((nuevo * 2).toFixed(2)) })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const tirador = (lado: 'izq' | 'der') => (
    <div
      onPointerDown={(e) => estirar(e, lado)}
      className={`pointer-events-auto absolute top-0 flex h-full w-2.5 cursor-ew-resize flex-col items-center justify-between bg-white/85 py-1 transition-colors duration-150 group-hover/cruce:bg-white ${lado === 'izq' ? 'left-0 rounded-l-sm' : 'right-0 rounded-r-sm'}`}
    >
      <span className="h-2 w-px bg-black/40" />
      <span className="h-2 w-px bg-black/40" />
    </div>
  )

  return (
    <Tooltip texto={`Transición: ${nombre}`} lado="arriba">
      <div
        data-cruce={entra.id}
        onPointerDown={(e) => {
          // seleccionar la transición sin arrancar el arrastre del clip de abajo
          e.stopPropagation()
          seleccionar(entra.id)
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(TIPO_TRANSICION)) {
            e.preventDefault()
            if (!soltarEncima) setSoltarEncima(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setSoltarEncima(false)
        }}
        onDrop={(e) => {
          const tipo = e.dataTransfer.getData(TIPO_TRANSICION)
          if (!tipo) return
          e.preventDefault()
          e.stopPropagation()
          setSoltarEncima(false)
          // soltar una transición sobre la junta cambia el cruce de estos dos clips
          setTransicion(entra.id, { tipo })
          seleccionar(entra.id)
        }}
        className="group/cruce pointer-events-auto absolute top-0 z-20 cursor-pointer"
        style={{ left: izquierda, width: ancho, height: altoPista }}
      >
        {/* cuerpo con dos triángulos que se cruzan en el corte (una pajarita), para leer de
            un vistazo que los dos planos se solapan y uno releva al otro */}
        <div
          className={`pointer-events-none absolute inset-0 overflow-hidden rounded-md ${soltarEncima || seleccionado ? 'ring-2 ring-inset ring-brand' : ''}`}
          style={{ background: 'rgb(24 97 255 / 0.16)', border: '1px solid rgb(255 255 255 / 0.35)' }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'rgb(24 97 255 / 0.5)',
              clipPath: 'polygon(0 0, 50% 50%, 0 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'rgb(24 97 255 / 0.5)',
              clipPath: 'polygon(100% 0, 50% 50%, 100% 100%)',
            }}
          />
          {/* línea del corte, en el centro */}
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/50" />
        </div>
        {tirador('izq')}
        {tirador('der')}
      </div>
    </Tooltip>
  )
}
