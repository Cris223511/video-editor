import { Code2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RUTAS } from '../../rutas'
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
        { texto: 'Términos y condiciones', a: RUTAS.terminos },
        { texto: 'Política de privacidad', a: RUTAS.privacidad },
      ],
    },
  ]

  return (
    <footer className="mt-8 px-5 py-12" style={{ background: '#0d1a33' }}>
      <div className="mx-auto grid w-full max-w-5xl gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link to={RUTAS.portada} className="font-display text-lg font-extrabold text-white">
            Video <span style={{ color: '#6ea8ff' }}>Editor</span>
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
                className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors duration-200 hover:text-white"
              >
                <Code2 size={15} /> Repositorio
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
