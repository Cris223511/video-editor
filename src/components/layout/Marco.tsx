import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import TopBar from './TopBar'
import NavSitio from './NavSitio'
import Estrellas from '../sitio/Estrellas'
import PieSitio from './PieSitio'
import HaloCursor from '../sitio/HaloCursor'
import { RUTAS } from '../../rutasDef'
import { useScrollSuave } from '../../lib/scroll/useScrollSuave'

// las vistas de sitio llevan pie; el editor no, porque ahí cada píxel de alto
// cuenta para la línea de tiempo
const CON_PIE = [
  RUTAS.portada,
  RUTAS.instrucciones,
  RUTAS.terminos,
  RUTAS.privacidad,
  RUTAS.proyectos,
  RUTAS.medios,
]

// solo el espacio de trabajo lleva la barra del editor, con el título del
// proyecto, guardar y exportar. la pantalla de traer medios todavía no tiene
// nada de eso, así que le corresponde la barra de navegación como al resto
const CON_BARRA_EDITOR = [RUTAS.editor]

// armazón común a todas las rutas: barra arriba, la vista en medio y el pie
// cuando corresponde
export default function Marco() {
  const { pathname } = useLocation()
  // se congela el contenido de la ruta en una variable. `Outlet` devuelve
  // siempre la vista nueva, así que durante la salida se veía ya la siguiente:
  // por eso aparecía entera de golpe, desaparecía y volvía a entrar
  const salida = useOutlet()

  // al cambiar de ruta la página vuelve arriba. sin esto, saltar de un
  // documento legal largo a la portada la dejaría abierta por la mitad
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  const conPie =
    CON_PIE.includes(pathname as (typeof CON_PIE)[number]) || pathname.startsWith('/proyectos')
  const enEditor = CON_BARRA_EDITOR.includes(pathname as (typeof CON_BARRA_EDITOR)[number])

  // el desplazamiento con inercia solo en el sitio: dentro del editor la rueda
  // sirve para acercar la línea de tiempo y debe responder al instante
  useScrollSuave(!enEditor)

  return (
    // el editor ocupa exactamente una pantalla y no desplaza la pagina: es una
    // aplicacion de trabajo a pantalla completa, no un documento que crece. el
    // sitio si usa alto minimo, para que el contenido crezca y el pie quede abajo.
    // fijarlo aqui evita el scroll fantasma que salia en el editor sin nada debajo
    <div className={enEditor ? 'flex h-screen flex-col overflow-hidden' : 'flex min-h-screen flex-col'}>
      {/* el cielo solo en el sitio: dentro del editor competiría con el visor y
          añadiría trabajo de pintado mientras se reproduce un video */}
      {!enEditor && <Estrellas />}
      {/* el halo que sigue al puntero, solo en el sitio y solo en modo oscuro */}
      {!enEditor && <HaloCursor />}
      {enEditor ? <TopBar /> : <NavSitio />}
      <main className="relative z-10 flex-1">
        {/* cada vista entra con un desplazamiento corto. el editor se queda
            fuera: animar un panel de trabajo entero al abrirlo solo estorba */}
        {enEditor ? (
          salida
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {salida}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      {conPie && <PieSitio />}
    </div>
  )
}
