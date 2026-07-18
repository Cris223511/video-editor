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
        position="bottom-right"
        theme={tema}
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '13px',
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
