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

  // el corte está en el inicio del que entra. cada lado de la junta tiene su propio medio ancho:
  // el de entrada sale de la duración del cruce y el de salida de `duracionSalida` (si no está, cae
  // en la misma duración y la junta queda simétrica). cada uno se acota a la cola o cabeza que su
  // clip deja libre, igual que el render centrado
  const corte = entra.inicio
  const topeEntra = entra.duracion * 0.9
  const topeSale = sale.duracion * 0.9
  const medioEntra = Math.min(tr.duracion / 2, topeEntra)
  const medioSale = Math.min((tr.duracionSalida ?? tr.duracion) / 2, topeSale)
  if (medioEntra + medioSale <= 0) return null
  const separado = tr.duracionSalida !== undefined

  const izquierda = (corte - medioSale) * pxPorSegundo
  const ancho = (medioSale + medioEntra) * pxPorSegundo
  // dónde cae el corte dentro del bloque, en fracción: con lados iguales queda en el centro, y si
  // uno es más largo se corre hacia ese lado. la pajarita se cruza justo ahí
  const fracCorte = (medioSale / (medioSale + medioEntra)) * 100

  // arrastrar un tirador cambia el medio ancho de SU lado. sin shift, los dos lados se mueven por
  // igual (la junta crece o mengua entera, como siempre); con shift, solo el lado que se agarró, y
  // así cada mitad puede tener su propio tiempo: una empieza más rápido que la otra
  function estirar(e: ReactPointerEvent, lado: 'izq' | 'der') {
    e.stopPropagation()
    e.preventDefault()
    seleccionar(entra.id)
    const inicioX = e.clientX
    // el tirador derecho gobierna el lado de ENTRADA; el izquierdo, el de SALIDA
    const esEntrada = lado === 'der'
    const medioOriginal = esEntrada ? medioEntra : medioSale
    const topeLado = esEntrada ? topeEntra : topeSale
    const mover = (ev: globalThis.PointerEvent) => {
      const delta = ((ev.clientX - inicioX) / pxPorSegundo) * (lado === 'izq' ? -1 : 1)
      const nuevo = Math.min(topeLado, Math.max(0.1, medioOriginal + delta))
      const dur = Number((nuevo * 2).toFixed(2))
      if (ev.shiftKey) {
        // solo este lado: separa la junta en dos tiempos distintos
        if (esEntrada) setTransicion(entra.id, { duracion: dur, duracionSalida: Number((medioSale * 2).toFixed(2)) })
        else setTransicion(entra.id, { duracionSalida: dur })
      } else {
        // los dos lados por igual: un solo valor y vuelven a quedar enlazados
        setTransicion(entra.id, { duracion: dur, duracionSalida: undefined })
      }
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
              clipPath: `polygon(0 0, ${fracCorte}% 50%, 0 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'rgb(24 97 255 / 0.5)',
              clipPath: `polygon(100% 0, ${fracCorte}% 50%, 100% 100%)`,
            }}
          />
          {/* línea del corte: cae donde se cruzan los dos planos, corrida si un lado es más largo */}
          <span className="absolute inset-y-0 w-px -translate-x-1/2 bg-white/50" style={{ left: `${fracCorte}%` }} />
          {/* cuando los dos lados tienen tiempos distintos, un punto marca que la junta está separada */}
          {separado && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80" title="Lados con tiempos distintos" />
          )}
        </div>
        {tirador('izq')}
        {tirador('der')}
      </div>
    </Tooltip>
  )
}
