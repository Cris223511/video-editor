import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/ui/ToastProvider'
import { TooltipProvider } from './components/ui/Tooltip'
import { router } from './rutas'

// raíz de la aplicación. la navegación la lleva el enrutador, así que cada vista
// tiene su propia dirección y se puede recargar, compartir o volver atrás con el
// botón del navegador
export default function App() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </TooltipProvider>
  )
}
