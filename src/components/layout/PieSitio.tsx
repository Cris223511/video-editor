import { Link } from 'react-router-dom'
import { RUTAS } from '../../rutasDef'
import { ANCHO_BARRA, RELLENO } from '../sitio/Contenedor'
import { VERSION } from '../../config/constants'

const REPO = 'https://github.com/Cris223511/video-editor'

// pie del sitio. las columnas recogen solo lo que existe de verdad en la
// aplicación: no hay cuenta ni registro, así que tampoco hay columna para eso
export default function PieSitio() {
  const columnas = [
    {
      titulo: 'Editor',
      enlaces: [
        { texto: 'Abrir el editor', a: RUTAS.medios },
        { texto: 'Mis proyectos', a: RUTAS.proyectos },
        { texto: 'Portada', a: RUTAS.portada },
      ],
    },
    {
      titulo: 'Información',
      enlaces: [
        { texto: 'Cómo funciona', a: RUTAS.instrucciones },
        { texto: 'Términos y condiciones', a: RUTAS.terminos },
        { texto: 'Política de privacidad', a: RUTAS.privacidad },
      ],
    },
  ]

  return (
    <footer className="pie-sitio relative z-10 mt-8 overflow-hidden py-12">
      {/* un solo halo, con el mismo color e intensidad que los de las secciones del
          sitio, para que el pie no quede plano. va detrás del contenido pero por
          delante del fondo del pie, y al salir de --accent se adapta a los dos temas */}
      <span
        aria-hidden
        className="pointer-events-none absolute animate-destello rounded-full"
        style={{
          left: '80%',
          top: '30%',
          width: 460,
          height: 460,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgb(var(--accent) / 0.16) 0%, rgb(var(--accent) / 0.056) 42%, transparent 72%)',
          filter: 'blur(56px)',
        }}
      />

      <div className={`relative mx-auto grid w-full ${ANCHO_BARRA} ${RELLENO} gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <Link to={RUTAS.portada} className="inline-flex items-center gap-2.5">
            <img src="/logo-circle.png" alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-extrabold text-[rgb(var(--pie-texto))]">
              Video <span className="text-brand-soft">Editor</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[rgb(var(--pie-suave))]">
            Un editor de video completo que corre dentro del navegador. Abres la página y ya
            puedes montar.
          </p>
        </div>

        {columnas.map((c) => (
          <div key={c.titulo}>
            <h3 className="text-sm font-semibold text-[rgb(var(--pie-texto))]">{c.titulo}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {c.enlaces.map((e) => (
                <li key={e.texto}>
                  <Link
                    to={e.a}
                    className="enlace-pie inline-block text-sm text-[rgb(var(--pie-suave))]"
                  >
                    {e.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-[rgb(var(--pie-texto))]">Código</h3>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer"
                className="enlace-pie inline-block text-sm text-[rgb(var(--pie-suave))]"
              >
                Repositorio
              </a>
            </li>
            <li>
              <a
                href={`${REPO}/releases`}
                target="_blank"
                rel="noreferrer"
                className="enlace-pie inline-block text-sm text-[rgb(var(--pie-suave))]"
              >
                Novedades
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* franja de cierre: una línea que cruza todo el pie y, debajo, los créditos
          a un lado y la versión al otro. separarla de la columna del logo deja
          claro que es el remate del pie entero y no un dato más de esa columna */}
      <div className={`mx-auto mt-10 w-full ${ANCHO_BARRA} ${RELLENO}`}>
        <div className="border-t border-[rgb(var(--pie-borde)/0.12)] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[rgb(var(--pie-suave))]">
              © {new Date().getFullYear()} Video Editor. Publicado con licencia MIT.
            </p>
            {/* la versión va en monoespaciada porque es un dato técnico y así no
                se confunde con el texto corriente que tiene al lado */}
            <p className="font-mono text-xs text-[rgb(var(--pie-suave))]">v{VERSION}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
