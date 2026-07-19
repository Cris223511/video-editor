import { useEffect, useState } from 'react'
import { ChevronRight, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RUTAS } from '../../../rutasDef'
import { irA as irASeccion } from '../../../lib/scroll/useScrollSuave'
import { Documento, PRIVACIDAD, TERMINOS } from './contenido'
import { ANCHO_CONTENIDO, RELLENO } from '../../../components/sitio/Contenedor'

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
        <button
          onClick={() => setPanel(true)}
          aria-label="Abrir el índice"
          className="interactivo ml-auto grid h-9 w-9 place-items-center rounded-lg lg:hidden"
        >
          <Menu size={17} />
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
                  {p}
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
                      {li}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>

      {/* panel del índice en móvil */}
      {panel && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setPanel(false)}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 w-72 overflow-y-auto p-5 shadow-2xl"
            style={{ background: 'rgb(var(--surface))' }}
          >
            <button
              onClick={() => setPanel(false)}
              aria-label="Cerrar"
              className="interactivo mb-4 ml-auto grid h-8 w-8 place-items-center rounded-lg"
            >
              <X size={16} />
            </button>
            <Indice doc={doc} activo={activo} onIr={ir} />
          </div>
        </div>
      )}
    </div>
  )
}
