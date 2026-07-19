import Dropzone from './Dropzone'
import Icon from '../../components/ui/Icon'
import { useImportarMedios } from './useImportarMedios'
import { useProjectStore } from '../../store/useProjectStore'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import Loader from '../../components/ui/Loader'
import { VIDEO_EXTENSIONS } from '../../config/constants'
import { Aviso, Chip } from '../../components/sitio/Piezas'
import { RUTAS } from '../../rutasDef'
import { formatearBytes } from '../../lib/format/bytes'
import { formatearDuracion } from '../../lib/format/duracion'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'

// primera pantalla del editor: importar medios. valida cada archivo, extrae su
// información y lo suma al proyecto. todo ocurre en el navegador
export default function ImportView() {
  const { procesar, ocupado } = useImportarMedios()
  const { medios, quitar } = useProjectStore()
  const navegar = useNavigate()
  const [preparando, setPreparando] = useState(false)
  // el cargador da un momento de respiro entre elegir los medios y entrar al
  // editor, que si no aparece de golpe y desorienta
  const irAEditor = () => {
    setPreparando(true)
    window.setTimeout(() => navegar(RUTAS.editor), 2000)
  }

  return (
    <>
    {preparando && <Loader texto="Preparando tu proyecto..." />}
    <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO} py-10 sm:py-14`}>
      <div className="mb-8">
        <h1 className="font-display text-titulo-lg">Empieza tu proyecto</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
          Sube uno o varios videos para editarlos. El material se procesa en tu equipo y no viaja a
          ningún servidor.
        </p>
      </div>

      <div
        className="rounded-3xl p-3"
        style={{
          background: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border) / 0.1)',
        }}
      >
        <Dropzone onArchivos={procesar} ocupado={ocupado} />

        {medios.length > 0 && (
          <ul className="mt-5 flex flex-col gap-3">
            {medios.map((m) => (
              <li key={m.id} className="glass flex items-center gap-3 rounded-xl p-3">
                <img
                  src={m.miniatura}
                  alt=""
                  className="h-14 w-24 shrink-0 rounded-lg bg-black/20 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nombre}</p>
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                    {m.ancho}×{m.alto} · {formatearDuracion(m.duracion)} · {formatearBytes(m.tamano)}
                  </p>
                </div>
                <button
                  onClick={() => quitar(m.id)}
                  title="Quitar"
                  className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-rose-500"
                >
                  <Icon name="papelera" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* acciones: seguir al editor o retomar algo ya guardado. el enlace a los
          proyectos va siempre visible, también cuando no hay nada subido, que es
          justo cuando más falta hace */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={RUTAS.proyectos}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:text-brand hover:shadow-md"
          style={{ border: '1px dashed rgb(var(--border) / 0.3)' }}
        >
          <FolderOpen size={16} /> Ver mis proyectos
        </Link>
        {medios.length > 0 && (
          <button
            onClick={irAEditor}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
          >
            <Icon name="pelicula" size={17} />
            Ir al editor
          </button>
        )}
      </div>

      {/* formatos y aviso, como en la referencia */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Formatos admitidos:</span>
          {/* salen de la lista real que valida la aplicación, no escritos a
              mano: así no pueden quedar desfasados */}
          {VIDEO_EXTENSIONS.map((f) => (
            <Chip key={f}>{f.toUpperCase()}</Chip>
          ))}
        </div>

        <Aviso titulo="Privacidad">
          Todo el procesamiento ocurre dentro de tu navegador. Los videos no se suben ni se envían a
          ningún servidor externo, ni mientras editas ni al exportar. La información permanece en tu
          equipo en todo momento, y el rendimiento puede variar según el tamaño de los archivos.
        </Aviso>
      </div>
    </div>
    </>
  )
}
