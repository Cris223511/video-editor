import { MouseEvent as ReactMouseEvent, ReactNode, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react'
import Tooltip from '../../../components/ui/Tooltip'
import Confirmar from '../../../components/ui/Confirmar'
import { useEditorStore } from '../../../store/useEditorStore'

// botón compacto de un interruptor del encabezado. cuando el estado está activo
// (silenciado, oculto o bloqueado) se resalta para que se distinga de un vistazo
function BotonPista({
  etiqueta,
  activo = false,
  disabled = false,
  onClick,
  children,
}: {
  etiqueta: string
  activo?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip texto={etiqueta}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={etiqueta}
        aria-pressed={activo}
        className="interactivo grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
        style={{
          color: activo ? 'rgb(var(--brand))' : 'var(--muted)',
          background: activo ? 'rgb(var(--brand) / 0.14)' : 'transparent',
        }}
      >
        {children}
      </button>
    </Tooltip>
  )
}

// cabecera de un nivel de video, en la columna fija de la izquierda. reúne el
// rótulo, los interruptores de silenciar, ocultar y bloquear, las flechas para
// reordenar el nivel y el borrado con aviso. su borde inferior sirve de tirador
// para cambiar el alto arrastrando arriba o abajo
export default function PistaHeader({ indice, alto }: { indice: number; alto: number }) {
  const numPistas = useEditorStore((s) => s.numPistas)
  const meta = useEditorStore((s) => s.pistasMeta[indice])
  const quitarPista = useEditorStore((s) => s.quitarPista)
  const setAltoPista = useEditorStore((s) => s.setAltoPista)
  const alternarSilencioPista = useEditorStore((s) => s.alternarSilencioPista)
  const alternarOcultarPista = useEditorStore((s) => s.alternarOcultarPista)
  const alternarBloquearPista = useEditorStore((s) => s.alternarBloquearPista)
  const reordenarPista = useEditorStore((s) => s.reordenarPista)
  const [confirmando, setConfirmando] = useState(false)

  function estirar(e: ReactMouseEvent) {
    e.preventDefault()
    const inicioY = e.clientY
    const original = alto
    const mover = (ev: globalThis.MouseEvent) =>
      setAltoPista(indice, original + (ev.clientY - inicioY))
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'ns-resize'
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // arriba del todo va el nivel de índice mayor, así que la flecha de subir se
  // apaga en la cima y la de bajar en el suelo
  const puedeSubir = indice < numPistas - 1
  const puedeBajar = indice > 0
  const nombre = meta?.nombre ?? `Video ${indice + 1}`

  return (
    <div
      className="group relative flex flex-col justify-center gap-1 rounded-l-md px-2 py-1"
      // el borde de la derecha marca dónde acaba la columna de nombres, para que
      // el rótulo no quede pegado al primer clip
      style={{
        height: alto,
        background: 'rgb(var(--border) / 0.06)',
        borderRight: '1px solid rgb(var(--border) / 0.14)',
      }}
    >
      <div className="flex items-center gap-1">
        <span className="truncate text-[12px] font-medium text-[color:var(--muted)]">{nombre}</span>
        <div className="ml-auto flex items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <BotonPista
            etiqueta="Subir el nivel"
            disabled={!puedeSubir}
            onClick={() => reordenarPista(indice, 'arriba')}
          >
            <ChevronUp size={14} />
          </BotonPista>
          <BotonPista
            etiqueta="Bajar el nivel"
            disabled={!puedeBajar}
            onClick={() => reordenarPista(indice, 'abajo')}
          >
            <ChevronDown size={14} />
          </BotonPista>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <BotonPista
          etiqueta={meta?.silenciada ? 'Quitar silencio' : 'Silenciar el nivel'}
          activo={meta?.silenciada}
          onClick={() => alternarSilencioPista(indice)}
        >
          {meta?.silenciada ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </BotonPista>
        <BotonPista
          etiqueta={meta?.oculta ? 'Mostrar el nivel' : 'Ocultar el nivel'}
          activo={meta?.oculta}
          onClick={() => alternarOcultarPista(indice)}
        >
          {meta?.oculta ? <EyeOff size={13} /> : <Eye size={13} />}
        </BotonPista>
        <BotonPista
          etiqueta={meta?.bloqueada ? 'Desbloquear el nivel' : 'Bloquear el nivel'}
          activo={meta?.bloqueada}
          onClick={() => alternarBloquearPista(indice)}
        >
          {meta?.bloqueada ? <Lock size={13} /> : <Unlock size={13} />}
        </BotonPista>
        {numPistas > 1 && (
          <BotonPista etiqueta="Eliminar este nivel y sus clips" onClick={() => setConfirmando(true)}>
            <Trash2 size={13} />
          </BotonPista>
        )}
      </div>

      <div
        onMouseDown={estirar}
        title="Arrastra para cambiar el alto"
        className="absolute inset-x-0 -bottom-0.5 h-1.5 cursor-ns-resize opacity-0 transition-opacity duration-200 hover:opacity-100 group-hover:opacity-60"
        style={{ background: 'rgb(var(--brand) / 0.8)' }}
      />

      <Confirmar
        abierto={confirmando}
        peligro
        titulo="Eliminar nivel"
        mensaje={
          <>
            Se borrará <b>{nombre}</b> junto con todos los clips que contenga. Podrás recuperarlo
            con deshacer si te arrepientes.
          </>
        }
        aceptar="Eliminar"
        onAceptar={() => {
          setConfirmando(false)
          quitarPista(indice)
        }}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  )
}
