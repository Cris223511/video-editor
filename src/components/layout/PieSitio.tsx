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
    <footer className="relative z-10 mt-8 py-12" style={{
        // opaco de arriba abajo: con transparencia al final se mezclaba con el
        // fondo de la página y en tema claro quedaba un gris lavado
        background:
          'linear-gradient(180deg, rgb(var(--profundo-2)) 0%, rgb(var(--profundo)) 100%)',
      }}>
      <div className={`mx-auto grid w-full ${ANCHO_BARRA} ${RELLENO} gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <Link to={RUTAS.portada} className="inline-flex items-center gap-2.5">
            <img src="/logo-circle.png" alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-extrabold text-white">
              Video <span className="text-brand-soft">Editor</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
            Editor de video que funciona dentro del navegador. Los archivos se quedan en tu equipo
            de principio a fin.
          </p>
          <p className="mt-4 text-xs text-white/40">
            © {new Date().getFullYear()}. Publicado con licencia MIT.
          </p>
          <p className="mt-1 text-xs text-white/40">Versión {VERSION}</p>
        </div>

        {columnas.map((c) => (
          <div key={c.titulo}>
            <h3 className="text-sm font-semibold text-white">{c.titulo}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {c.enlaces.map((e) => (
                <li key={e.texto}>
                  <Link
                    to={e.a}
                    className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
                  >
                    {e.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-white">Código</h3>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
              >
                Repositorio
              </a>
            </li>
            <li>
              <a
                href={`${REPO}/releases`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
              >
                Novedades
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
