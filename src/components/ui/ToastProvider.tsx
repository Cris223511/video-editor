import { ReactNode } from 'react'
import { Toaster, toast } from 'sonner'
import { useThemeStore } from '../../store/useThemeStore'

export type TipoToast = 'success' | 'error' | 'warning' | 'info'

// los avisos los pinta Sonner, que ya trae apilado, cola, pausa al pasar el
// cursor y salida animada. aquí solo se le da el aspecto del tema y se
// conserva la firma que ya usaba el resto de la aplicación
export function ToastProvider({ children }: { children: ReactNode }) {
  const tema = useThemeStore((s) => s.tema)

  return (
    <>
      {children}
      <Toaster
        // arriba a la derecha, que es donde no tapa el trabajo ni los controles
        // de la línea de tiempo
        position="top-right"
        theme={tema}
        richColors
        closeButton
        duration={4000}
        // hasta cinco a la vez. los que lleguen de más esperan su turno y
        // aparecen conforme se cierran los anteriores, que es lo que hace Sonner
        // por su cuenta con este límite
        visibleToasts={5}
        // se apilan desplegados en lugar de superpuestos, así se leen todos
        expand
        toastOptions={{
          style: {
            borderRadius: '14px',
            fontSize: '13px',
          },
          classNames: {
            // el mensaje no pasa de dos líneas: uno largo estiraba el aviso
            // hasta ocupar media pantalla
            title: 'line-clamp-2',
            description: 'line-clamp-2',
          },
        }}
      />
    </>
  )
}

// misma firma de antes: mostrar(tipo, mensaje). cada tipo trae su color y su
// icono, así un error no se confunde con un aviso corriente
export function useToast() {
  return {
    mostrar: (tipo: TipoToast, mensaje: string) => {
      if (tipo === 'success') toast.success(mensaje)
      else if (tipo === 'error') toast.error(mensaje)
      else if (tipo === 'warning') toast.warning(mensaje)
      else toast.info(mensaje)
    },
  }
}
