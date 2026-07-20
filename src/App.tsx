import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/ui/ToastProvider'
import { TooltipProvider } from './components/ui/Tooltip'
import { router } from './rutas'

// raíz de la aplicación. la navegación la lleva el enrutador, así que cada vista
// tiene su propia dirección y se puede recargar, compartir o volver atrás con el
// botón del navegador
export default function App() {
  // se corta el zoom de página del navegador en toda la aplicación: ni con
  // ctrl y la rueda, ni con ctrl y las teclas más, menos o cero. así la interfaz
  // no se agranda ni se encoge por accidente. el zoom propio de la línea de
  // tiempo sigue igual, porque ese lo maneja su propio manejador con ctrl y rueda
  useEffect(() => {
    const alGirar = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const alTecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault()
    }
    window.addEventListener('wheel', alGirar, { passive: false })
    window.addEventListener('keydown', alTecla)
    return () => {
      window.removeEventListener('wheel', alGirar)
      window.removeEventListener('keydown', alTecla)
    }
  }, [])

  return (
    <TooltipProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </TooltipProvider>
  )
}
