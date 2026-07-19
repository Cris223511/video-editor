import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { RUTAS } from '../../rutasDef'
import { ANCHO_BARRA, RELLENO } from '../sitio/Contenedor'
import { cristal } from '../sitio/cristal'
import { useThemeStore } from '../../store/useThemeStore'
import Desplegable from '../ui/Desplegable'

// cuánto se mete la píldora de la barra respecto al borde de su contenedor. el
// menú desplegable copia este mismo valor: RELLENO marca dónde empieza el texto
// del sitio, pero el cristal de la barra vuela un poco más ancho que eso, y lo
// que tiene que cuadrar con el menú son los bordes que se ven, no los del texto
const SANGRADO_BARRA = 8

const ENLACES = [
  { texto: 'Inicio', a: RUTAS.portada },
  { texto: 'Editor', a: RUTAS.medios },
  { texto: 'Mis proyectos', a: RUTAS.proyectos },
]

const INFORMACION = [
  { texto: 'Cómo funciona', a: RUTAS.instrucciones },
  { texto: 'Términos y condiciones', a: RUTAS.terminos },
  { texto: 'Política de privacidad', a: RUTAS.privacidad },
]

// barra del sitio. arriba del todo ocupa el ancho completo y, en cuanto se
// desplaza, se despega de los bordes y flota como una píldora redondeada. el
// cambio va animado para que no dé un salto seco
export default function NavSitio() {
  const { pathname } = useLocation()
  const tema = useThemeStore((s) => s.tema)
  const alternar = useThemeStore((s) => s.alternar)
  // se activa al pasar un umbral y a partir de ahí la animación va sola. no
  // sigue la rueda: bajas un poco, se dispara, y la transición hace el resto a
  // su propio ritmo
  const [flotante, setFlotante] = useState(false)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    // dos umbrales distintos para activar y desactivar: con uno solo, quedarse
    // justo en el límite haría parpadear la barra sin parar
    const alDesplazar = () =>
      setFlotante((antes) => (antes ? window.scrollY > 20 : window.scrollY > 56))
    alDesplazar()
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [])

  // al cambiar de página el menú de móvil debe cerrarse solo
  useEffect(() => setAbierto(false), [pathname])

  const activo = (a: string) => pathname === a

  return (
    <div
      className="sticky top-0 z-50"
      style={{
        paddingTop: flotante ? 12 : 0,
        transition: 'padding-top 520ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <header className={`relative mx-auto w-full ${ANCHO_BARRA} ${RELLENO}`}>
        {/* el fondo es una capa aparte que se estrecha por sus lados. animar el
            ancho del contenedor obligaba al navegador a recolocar el texto en
            cada fotograma, y eso era lo que se veía como un estirón */}
        <span
          aria-hidden
          className="absolute inset-y-0 -z-10"
          style={{
            left: flotante ? SANGRADO_BARRA : 'calc(50% - 50vw)',
            right: flotante ? SANGRADO_BARRA : 'calc(50% - 50vw)',
            borderRadius: flotante ? 999 : 0,
            // translúcida pero con el MISMO valor arriba y flotando: así se ve
            // el desenfoque de lo que pasa por detrás y el tono no cambia al
            // desplazar, que era lo que se notaba raro
            ...cristal(0.72, flotante ? 0.13 : 0.06),
            boxShadow: flotante ? '0 12px 34px rgb(6 12 24 / 0.16)' : '0 0 0 rgb(6 12 24 / 0)',
            transition:
              'left 560ms cubic-bezier(0.22,1,0.36,1), right 560ms cubic-bezier(0.22,1,0.36,1), border-radius 460ms ease-out, box-shadow 460ms ease-out, border-color 340ms ease-out',
          }}
        />

        <div
          className="flex w-full items-center gap-3"
          style={{
            height: flotante ? 56 : 68,
            transition: 'height 460ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
        <Link to={RUTAS.portada} className="flex shrink-0 items-center gap-2">
          <img src="/logo-circle.png" alt="" className="h-7 w-7 object-contain" />
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            Video <span className="text-brand">Editor</span>
          </span>
        </Link>

        {/* enlaces en pantalla ancha */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {ENLACES.map((e) => (
            <Link
              key={e.a}
              to={e.a}
              className={[
                'rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                activo(e.a) ? 'text-brand' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
              ].join(' ')}
            >
              {e.texto}
            </Link>
          ))}
          <Desplegable etiqueta="Información" opciones={INFORMACION} />
        </nav>

        <div className={['flex items-center gap-1', 'lg:ml-0 ml-auto'].join(' ')}>
          <button
            onClick={alternar}
            aria-label={tema === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
            className="interactivo grid h-9 w-9 place-items-center rounded-full text-[color:var(--muted)]"
          >
            {tema === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link
            to={RUTAS.medios}
            className="hidden rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95 sm:inline-flex"
          >
            Abrir el editor
          </Link>

          <button
            onClick={() => setAbierto((v) => !v)}
            aria-label="Menú"
            className="interactivo grid h-9 w-9 place-items-center rounded-full text-[color:var(--muted)] lg:hidden"
          >
            {abierto ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        </div>
      </header>

      {/* menú desplegado en pantallas estrechas */}
      <div
        className={[
          'mx-auto overflow-hidden transition-all duration-300 ease-out lg:hidden',
          ANCHO_BARRA,
          abierto ? 'mt-2 max-h-[26rem] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        <nav
          className="flex flex-col gap-1 rounded-3xl p-3 shadow-lg"
          style={{
            background: 'rgb(var(--surface) / 0.94)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            border: '1px solid rgb(var(--border) / 0.1)',
          }}
        >
          {[...ENLACES, ...INFORMACION].map((e) => (
            <Link
              key={e.a}
              to={e.a}
              className={[
                'rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                activo(e.a) ? 'text-brand' : 'text-[color:var(--muted)]',
              ].join(' ')}
            >
              {e.texto}
            </Link>
          ))}
          <Link
            to={RUTAS.medios}
            className="mt-1 rounded-full bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95 sm:hidden"
          >
            Abrir el editor
          </Link>
        </nav>
      </div>
    </div>
  )
}
