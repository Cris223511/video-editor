import { PointerEvent as ReactPointerEvent, useState } from 'react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { buscarTransicion } from '../../../lib/transiciones/catalogo'
import { TIPO_TRANSICION } from '../GaleriaTransiciones'
import Tooltip from '../../../components/ui/Tooltip'

// bloque de una transición de cruce (disolución/barrido) entre dos clips pegados. la transición
// ARRANCA en el corte y ocupa la cabeza del que entra (ventana [corte, corte + duración]): así el
// clip que entra se reproduce de verdad durante el cruce en vez de congelarse en su primer cuadro,
// y el que sale se funde por encima. el bloque se dibuja a nivel del carril (que no recorta) para
// poder pisar la cabeza del clip que entra, y un tirador a la derecha alarga o acorta el cruce
export default function CruceBlock({
  entra,
  altoPista,
  pxPorSegundo,
}: {
  // el que entra es el dueño de la transición (su .transicion); el que sale es el anterior. `sale`
  // se recibe por compatibilidad con quien monta el bloque, pero el cruce ya solo se apoya en el
  // que entra (arranca en el corte y ocupa su cabeza)
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

  // el corte está en el inicio del que entra y la transición ocupa desde ahí hacia adelante, sobre
  // su cabeza. la duración se acota a la cabeza libre del clip para no invadir lo que venga después
  const corte = entra.inicio
  const tope = entra.duracion * 0.95
  const dur = Math.min(tr.duracion, tope)
  if (dur <= 0) return null

  const izquierda = corte * pxPorSegundo
  const ancho = dur * pxPorSegundo

  // arrastrar el tirador de la derecha cambia la duración del cruce
  function estirar(e: ReactPointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    seleccionar(entra.id)
    const inicioX = e.clientX
    const durOriginal = dur
    const mover = (ev: globalThis.PointerEvent) => {
      const delta = (ev.clientX - inicioX) / pxPorSegundo
      const nuevo = Number(Math.min(tope, Math.max(0.1, durOriginal + delta)).toFixed(2))
      // se deja un solo valor de duración: al mover-en-el-corte no hay dos lados que separar
      setTransicion(entra.id, { duracion: nuevo, duracionSalida: undefined })
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

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
        {/* cuerpo con un degradado que sube de izquierda a derecha: da a entender que en el corte
            el plano nuevo entra tenue y va tomando el cuadro conforme avanza la transición */}
        <div
          className={`pointer-events-none absolute inset-0 overflow-hidden rounded-md ${soltarEncima || seleccionado ? 'ring-2 ring-inset ring-brand' : ''}`}
          style={{ border: '1px solid rgb(255 255 255 / 0.35)' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgb(24 97 255 / 0.12), rgb(24 97 255 / 0.55))' }}
          />
          {/* línea del corte, pegada al borde izquierdo, donde el plano nuevo releva al anterior */}
          <span className="absolute inset-y-0 left-0 w-px bg-white/60" />
        </div>
        {/* tirador de la derecha para alargar o acortar el cruce */}
        <div
          onPointerDown={estirar}
          className="pointer-events-auto absolute right-0 top-0 flex h-full w-2.5 cursor-ew-resize flex-col items-center justify-between rounded-r-sm bg-white/85 py-1 transition-colors duration-150 group-hover/cruce:bg-white"
        >
          <span className="h-2 w-px bg-black/40" />
          <span className="h-2 w-px bg-black/40" />
        </div>
      </div>
    </Tooltip>
  )
}
