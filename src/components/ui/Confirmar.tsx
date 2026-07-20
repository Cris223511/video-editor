import { ReactNode } from 'react'
import Modal from './Modal'

// Ventana de confirmación, la misma para toda la aplicación.
//
// Antes cada sitio se pintaba lo suyo dentro de la propia tarjeta, y el aviso de
// borrar un proyecto acababa metido a presión en el pie de la miniatura, con el
// texto seleccionado en azul y dos botones apretados. Un aviso que pregunta si
// borrar algo sin vuelta atrás merece detenerse un momento, no aparecer de lado.
//
// El tono se elige con `peligro`: en rojo cuando lo que se va a hacer no se puede
// deshacer, y con el azul de siempre para lo demás.
export default function Confirmar({
  abierto,
  titulo,
  mensaje,
  aceptar = 'Aceptar',
  cancelar = 'Cancelar',
  peligro = false,
  onAceptar,
  onCancelar,
}: {
  abierto: boolean
  titulo: string
  mensaje: ReactNode
  aceptar?: string
  cancelar?: string
  peligro?: boolean
  onAceptar: () => void
  onCancelar: () => void
}) {
  // no se enfoca ningún botón al abrir. antes el de aceptar llevaba autoFocus, y
  // con la página desplazada el navegador saltaba hasta él para dejarlo a la
  // vista. como este aviso confirma cosas sin vuelta atrás, tampoco conviene que
  // el foco caiga en el botón de borrar: un enter de más lo dispararía. el
  // trampeo de foco de Radix sigue activo, así que tab entra en la ventana y esc
  // la cierra igual
  return (
    <Modal titulo={titulo} abierto={abierto} onCerrar={onCancelar} ancho="max-w-sm">
      <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">{mensaje}</p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancelar}
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--text)]"
          style={{ border: '1px solid rgb(var(--border) / 0.16)' }}
        >
          {cancelar}
        </button>
        <button
          onClick={onAceptar}
          className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          style={{
            background: peligro ? 'rgb(var(--alerta))' : 'rgb(var(--accent-boton))',
          }}
        >
          {aceptar}
        </button>
      </div>
    </Modal>
  )
}
