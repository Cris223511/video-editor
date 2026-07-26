import { useEditorStore } from '../../store/useEditorStore'
import Confirmar from '../../components/ui/Confirmar'

// pinta la ventana de confirmación que pide cualquier parte de la app a través del
// store. reutiliza el mismo modal bonito de siempre, en lugar del aviso feo del
// navegador, y al aceptar ejecuta la acción que se guardó
export default function ConfirmacionGlobal() {
  const confirmacion = useEditorStore((s) => s.confirmacion)
  const cerrar = useEditorStore((s) => s.cerrarConfirmacion)

  return (
    <Confirmar
      abierto={!!confirmacion}
      peligro
      titulo={confirmacion?.titulo ?? ''}
      mensaje={confirmacion?.mensaje ?? ''}
      aceptar={confirmacion?.aceptar ?? 'Eliminar'}
      onAceptar={() => {
        confirmacion?.onAceptar()
        cerrar()
      }}
      onCancelar={cerrar}
    />
  )
}
