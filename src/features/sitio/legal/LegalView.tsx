import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RUTAS } from '../../../rutasDef'
import { irA as irASeccion } from '../../../lib/scroll/useScrollSuave'
import { Documento, PRIVACIDAD, TERMINOS } from './contenido'
import Enriquecido from './Enriquecido'
import { ANCHO_CONTENIDO, RELLENO } from '../../../components/sitio/Contenedor'

// mismo cristal que la barra de navegación. lo comparten todos los paneles
// propios del sitio para que se reconozcan como una misma familia
const CRISTAL = {
  background: 'rgb(var(--surface) / 0.94)',
  backdropFilter: 'blur(20px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
  border: '1px solid rgb(var(--border) / 0.1)',
} as const

// índice lateral. en pantalla ancha queda fijo a la izquierda y en móvil se abre
// como panel, igual que en la referencia
function Indice({
  doc,
  activo,
  onIr,
}: {
  doc: Documento
  activo: string
  onIr: (id: string) => void
}) {
  return (
    <nav>
      <p className="mb-3 text-sm font-semibold">Contenido</p>
      <ul className="flex flex-col gap-1">
        {doc.secciones.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => onIr(s.id)}
              className={[
                'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-200',
                activo === s.id
                  ? 'text-brand'
                  : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
              ].join(' ')}
              style={activo === s.id ? { background: 'rgb(var(--accent) / 0.08)' } : undefined}
            >
              {i + 1}. {s.titulo}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// documentos legales. el índice se genera a partir de las secciones, así que
// añadir un apartado al texto lo añade también al menú sin tocar nada más
export default function LegalView({ documento }: { documento: 'terminos' | 'privacidad' }) {
  const doc = documento === 'privacidad' ? PRIVACIDAD : TERMINOS
  const [activo, setActivo] = useState(doc.secciones[0].id)
  const [panel, setPanel] = useState(false)

  // al cambiar de documento el índice vuelve a su primera entrada, o quedaría
  // marcada una sección que ya no existe. de subir la página se encarga el marco
  useEffect(() => {
    setActivo(doc.secciones[0].id)
  }, [doc])

  // marca en el índice la sección que se está leyendo
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActivo(visible.target.id)
      },
      { rootMargin: '-88px 0px -65% 0px' },
    )
    doc.secciones.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observador.observe(el)
    })
    return () => observador.disconnect()
  }, [doc])

  function ir(id: string) {
    setPanel(false)
    // el salto lo lleva el desplazamiento suave, que además descuenta el alto de
    // la barra para que el título no quede escondido debajo
    irASeccion(id)
  }

  return (
    <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO} py-10`}>
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link to={RUTAS.portada} className="text-brand hover:underline">
          Inicio
        </Link>
        <ChevronRight size={14} className="text-[color:var(--muted)]" />
        <span className="text-[color:var(--muted)]">{doc.titulo}</span>
        {/* el disparador del índice cierra la propia miga de pan, así queda a
            mano y no perdido en un rincón de la pantalla */}
        <button
          onClick={() => setPanel(true)}
          aria-label="Abrir el índice"
          className="interactivo ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[color:var(--muted)] lg:hidden"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.14)',
            boxShadow: '0 1px 2px rgb(21 52 102 / 0.07), 0 2px 6px rgb(21 52 102 / 0.05)',
          }}
        >
          <Menu size={16} />
          Contenido
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block lg:border-r lg:border-[rgb(var(--border)/0.12)] lg:pr-6">
          <div className="sticky top-20">
            <Indice doc={doc} activo={activo} onIr={ir} />
            <Link
              to={doc.clave === 'terminos' ? RUTAS.privacidad : RUTAS.terminos}
              className="mt-6 block text-sm text-brand hover:underline"
            >
              {doc.clave === 'terminos' ? 'Ver la política de privacidad' : 'Ver los términos'}
            </Link>
          </div>
        </aside>

        <article className="min-w-0">
          <h1 className="font-display text-titulo-lg">{doc.titulo}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Última actualización: {doc.actualizado}.
          </p>

          {doc.secciones.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 pt-9">
              <h2 className="font-display text-titulo-md">
                {i + 1}. {s.titulo}
              </h2>
              {s.parrafos.map((p, k) => (
                <p key={k} className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
                  <Enriquecido texto={p} />
                </p>
              ))}
              {s.lista && (
                <ul className="mt-3 flex flex-col gap-2">
                  {s.lista.map((li, k) => (
                    <li
                      key={k}
                      className="flex gap-2.5 text-sm leading-relaxed text-[color:var(--muted)]"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span>
                        <Enriquecido texto={li} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>

      {/* panel del índice en móvil. va a `body` mediante portal porque el marco
          de la aplicación anima cada vista con framer y ese transform convertía
          al contenedor en referencia de posición: el panel dejaba de ser fijo
          respecto a la ventana y terminaba corriendo el texto de la página */}
      {createPortal(
        <AnimatePresence>
          {panel && (
            <div className="fixed inset-0 z-[60] lg:hidden">
              {/* detrás no hay velo negro sino desenfoque, el mismo recurso que
                  usa la barra de navegación */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="absolute inset-0"
                style={{
                  background: 'rgb(var(--surface) / 0.35)',
                  backdropFilter: 'blur(14px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
                }}
                onClick={() => setPanel(false)}
                aria-hidden
              />

              {/* la caja intermedia repite el ancho y el relleno del sitio, de
                  modo que el panel arranca justo donde arranca el texto y no
                  pegado al filo de la pantalla */}
              <div
                className={`pointer-events-none relative mx-auto flex h-full w-full ${ANCHO_CONTENIDO} ${RELLENO}`}
              >
                <motion.div
                  initial={{ x: '-115%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '-115%', opacity: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-auto mt-20 max-h-[calc(100%-6rem)] w-72 max-w-full overflow-y-auto rounded-2xl p-5 shadow-2xl"
                  style={CRISTAL}
                >
                  <button
                    onClick={() => setPanel(false)}
                    aria-label="Cerrar"
                    className="interactivo mb-4 ml-auto grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
                  >
                    <X size={16} />
                  </button>
                  <Indice doc={doc} activo={activo} onIr={ir} />
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
