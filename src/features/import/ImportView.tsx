import Dropzone from './Dropzone'
import { useImportarMedios } from './useImportarMedios'
import { useProjectStore } from '../../store/useProjectStore'
import { Link, useNavigate } from 'react-router-dom'
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
  const preparando = useProjectStore((s) => s.preparando)

  // en cuanto se importa algo, el editor se abre solo, sin lista intermedia ni
  // botón de confirmar. el cargador se enciende ANTES de procesar y se mantiene
  // encendido durante todo el análisis del archivo y la entrada al editor; se
  // apaga recién cuando el visor ya tiene el video cargado. así, con un archivo
  // pesado, no se ve el editor montándose a medias ni el aviso antes de tiempo
  async function alImportar(files: FileList) {
    const antes = useProjectStore.getState().medios.length
    useProjectStore.setState({ preparando: true })
    await procesar(files)
    const despues = useProjectStore.getState().medios.length
    if (despues > antes) {
      // el editor recoge el testigo del cargador y lo apaga al tener el video listo
      navegar(RUTAS.editor)
    } else {
      // no entró nada (todo falló la validación): se apaga y se queda en esta vista
      useProjectStore.setState({ preparando: false })
    }
  }

  return (
    <>
    {preparando && <Loader texto="Preparando tu proyecto..." />}
    <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO} py-10 sm:py-14`}>
      <div className="mb-8">
        <h1 className="font-display text-titulo-lg">Empieza tu proyecto</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
          Trae los videos, las imágenes y los audios con los que vas a trabajar. Puedes soltar
          varios de una vez y añadir más cuando quieras, ya con el montaje empezado.
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

        <Aviso titulo="Antes de empezar">
          Cada archivo se comprueba al entrar, no solo por su extensión, así que si algo no encaja te
          lo dirá en el momento en lugar de fallar más adelante. El rendimiento depende del tamaño de
          lo que traigas y de la potencia de tu equipo.
        </Aviso>
      </div>
    </div>
    </>
  )
}
