import Dropzone from './Dropzone'
import Icon from '../../components/ui/Icon'
import { useImportarMedios } from './useImportarMedios'
import { useProjectStore } from '../../store/useProjectStore'
import { useAppStore } from '../../store/useAppStore'
import { formatearBytes } from '../../lib/format/bytes'
import { formatearDuracion } from '../../lib/format/duracion'

// primera pantalla del editor: importar medios. valida cada archivo, extrae su
// información y lo suma al proyecto. todo ocurre en el navegador
export default function ImportView() {
  const { procesar, ocupado } = useImportarMedios()
  const { medios, quitar } = useProjectStore()
  const irAEditor = useAppStore((s) => s.irAEditor)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empieza tu proyecto</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Sube uno o varios videos para editarlos. El material se procesa en tu equipo y no viaja a
          ningún servidor.
        </p>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-6">
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

      {medios.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={irAEditor}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <Icon name="pelicula" size={18} />
            Ir al editor
          </button>
        </div>
      )}
    </div>
  )
}
