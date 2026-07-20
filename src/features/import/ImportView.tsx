import Dropzone from './Dropzone'
import { useImportarMedios } from './useImportarMedios'
import { useProjectStore } from '../../store/useProjectStore'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FolderOpen } from 'lucide-react'
import Loader from '../../components/ui/Loader'
import { VIDEO_EXTENSIONS } from '../../config/constants'
import { Aviso, Chip } from '../../components/sitio/Piezas'
import { RUTAS } from '../../rutasDef'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'

// primera pantalla del editor: importar medios. valida cada archivo, extrae su
// información y lo suma al proyecto. todo ocurre en el navegador
export default function ImportView() {
  const { procesar, ocupado } = useImportarMedios()
  const navegar = useNavigate()
  const [preparando, setPreparando] = useState(false)

  // en cuanto se importa algo, el editor se abre solo: no hace falta una lista
  // intermedia ni un botón de confirmar. mientras se prepara aparece el cargador,
  // que da un respiro y evita que el editor entre de golpe
  async function alImportar(files: FileList) {
    const antes = useProjectStore.getState().medios.length
    await procesar(files)
    const despues = useProjectStore.getState().medios.length
    if (despues > antes) {
      setPreparando(true)
      window.setTimeout(() => navegar(RUTAS.editor), 1800)
    }
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
        <Dropzone onArchivos={alImportar} ocupado={ocupado} />
      </div>

      {/* un solo acceso, a lo ya guardado. importar lleva directo al editor, así
          que aquí no hace falta un botón para entrar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          to={RUTAS.proyectos}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:text-brand hover:shadow-md"
          style={{ border: '1px dashed rgb(var(--border) / 0.3)' }}
        >
          <FolderOpen size={16} /> Ver mis proyectos
        </Link>
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
