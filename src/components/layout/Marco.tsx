import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import PieSitio from './PieSitio'
import { RUTAS } from '../../rutas'

// las vistas de sitio llevan pie; el editor no, porque ahí cada píxel de alto
// cuenta para la línea de tiempo
const CON_PIE = [RUTAS.portada, RUTAS.terminos, RUTAS.privacidad, RUTAS.proyectos]

// armazón común a todas las rutas: barra arriba, la vista en medio y el pie
// cuando corresponde
export default function Marco() {
  const { pathname } = useLocation()

  // al cambiar de ruta la página vuelve arriba. sin esto, saltar de un
  // documento legal largo a la portada la dejaría abierta por la mitad
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  const conPie = CON_PIE.includes(pathname as (typeof CON_PIE)[number]) || pathname.startsWith('/proyectos')

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
      {conPie && <PieSitio />}
    </div>
  )
}
