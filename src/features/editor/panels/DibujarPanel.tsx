import { Eraser, MousePointer2, Pencil, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { ReactNode } from 'react'
import Tooltip from '../../../components/ui/Tooltip'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaTrazo } from '../../../types/layers'
import { Campo, Deslizador, ColorCampo } from '../../../components/ui/Controls'
import MotionControls from './MotionControls'

// un botón cuadrado de la barrita de modos, con su nombre en el tooltip
function BotonModo({
  etiqueta,
  activo,
  onClick,
  children,
}: {
  etiqueta: string
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip texto={etiqueta} lado="abajo">
      <button
        type="button"
        onClick={onClick}
        aria-label={etiqueta}
        aria-pressed={activo}
        className={[
          'grid h-10 flex-1 place-items-center rounded-lg border transition-colors',
          activo
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-black/10 text-[color:var(--muted)] hover:border-brand hover:text-brand dark:border-white/10',
        ].join(' ')}
      >
        {children}
      </button>
    </Tooltip>
  )
}

// panel del dibujo a mano alzada. arriba hay una barrita de tres modos, lápiz para pintar,
// cursor para elegir y mover lo ya dibujado, y borrador para quitar trazos. debajo están siempre
// a la vista el color, el grosor y la opacidad, de modo que se ajustan antes de pintar o sobre el
// dibujo elegido. no desaparece nada mientras se dibuja
export default function DibujarPanel(_props: { ocultarAgregar?: boolean } = {}) {
  const capas = useEditorStore((s) => s.capas)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const modo = useEditorStore((s) => s.modoDibujo)
  const setModo = useEditorStore((s) => s.setModoDibujo)
  const ajustes = useEditorStore((s) => s.ajustesDibujo)
  const setAjustes = useEditorStore((s) => s.setAjustesDibujo)
  const grosorBorrador = useEditorStore((s) => s.borradorGrosor)
  const setGrosorBorrador = useEditorStore((s) => s.setBorradorGrosor)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)
  const deshacerTrazoDibujo = useEditorStore((s) => s.deshacerTrazoDibujo)
  const limpiarDibujo = useEditorStore((s) => s.limpiarDibujo)

  const capa = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'trazo') as CapaTrazo | undefined

  // los valores que se muestran son los del dibujo elegido, o los que tendrá el próximo si no hay
  // ninguno. al cambiarlos se actualizan los dos: así el siguiente dibujo hereda lo último usado
  const color = capa ? capa.color : ajustes.color
  const grosor = capa ? capa.grosor : ajustes.grosor
  const opacidad = capa ? capa.opacidad : ajustes.opacidad
  function cambiar(campo: 'color' | 'grosor' | 'opacidad', valor: string | number) {
    setAjustes({ [campo]: valor } as Partial<typeof ajustes>)
    if (capa) actualizarCapa(capa.id, { [campo]: valor } as Partial<CapaTrazo>)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <BotonModo etiqueta="Lápiz, pinta al arrastrar" activo={modo === 'lapiz'} onClick={() => setModo('lapiz')}>
          <Pencil size={17} />
        </BotonModo>
        <BotonModo etiqueta="Seleccionar y mover lo dibujado" activo={modo === 'seleccion'} onClick={() => setModo('seleccion')}>
          <MousePointer2 size={17} />
        </BotonModo>
        <BotonModo etiqueta="Borrar trazos" activo={modo === 'borrar'} onClick={() => setModo('borrar')}>
          <Eraser size={17} />
        </BotonModo>
      </div>

      {modo === 'borrar' && (
        <Campo etiqueta={`Tamaño del borrador (${grosorBorrador} px)`}>
          <Deslizador valor={grosorBorrador} min={4} max={200} onChange={setGrosorBorrador} />
        </Campo>
      )}

      <Campo etiqueta="Color">
        <ColorCampo valor={color} onChange={(v) => cambiar('color', v)} />
      </Campo>

      <Campo etiqueta={`Grosor (${grosor} px)`}>
        <Deslizador valor={grosor} min={1} max={40} onChange={(v) => cambiar('grosor', v)} />
      </Campo>

      <Campo etiqueta={`Opacidad (${opacidad}%)`}>
        <Deslizador valor={opacidad} min={0} max={100} onChange={(v) => cambiar('opacidad', v)} />
      </Campo>

      {capa && (
        <>
          <div className="flex gap-2">
            {capa.trazos.length > 0 && (
              <BotonModo etiqueta="Quitar el último trazo" activo={false} onClick={() => deshacerTrazoDibujo(capa.id)}>
                <Undo2 size={17} />
              </BotonModo>
            )}
            <BotonModo etiqueta="Eliminar este dibujo" activo={false} onClick={() => quitarCapa(capa.id)}>
              <Trash2 size={17} />
            </BotonModo>
            {capa.trazos.length > 0 && (
              <BotonModo etiqueta="Vaciar el dibujo" activo={false} onClick={() => limpiarDibujo(capa.id)}>
                <RotateCcw size={17} />
              </BotonModo>
            )}
          </div>

          <MotionControls capa={capa} />
        </>
      )}
    </div>
  )
}
