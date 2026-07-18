import { useRef } from 'react'
import Icon from '../../components/ui/Icon'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useImportarMedios } from '../import/useImportarMedios'
import { formatearDuracion } from '../../lib/format/bytes'

// panel izquierdo con los medios del proyecto. desde aquí se importan más
// videos y se añaden clips a la línea de tiempo
export default function MediaLibrary() {
  const medios = useProjectStore((s) => s.medios)
  const agregarDesdeAsset = useEditorStore((s) => s.agregarDesdeAsset)
  const { procesar } = useImportarMedios()
  const input = useRef<HTMLInputElement>(null)

  return (
    <aside className="hidden w-48 shrink-0 flex-col border-l border-black/10 sm:flex md:w-60 dark:border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">Medios</span>
        <button
          onClick={() => input.current?.click()}
          title="Importar más"
          className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-brand"
        >
          <Icon name="mas" size={18} />
        </button>
        <input
          ref={input}
          type="file"
          accept="video/*"
          multiple
          hidden
          onChange={(e) => e.target.files && procesar(e.target.files)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {medios.length === 0 ? (
          <p className="px-1 pt-2 text-xs leading-relaxed text-[color:var(--muted)]">
            Aún no hay medios. Usa el botón de arriba para importar tus videos.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {medios.map((m) => (
              <li key={m.id} className="group relative overflow-hidden rounded-lg">
                <img src={m.miniatura} alt="" className="h-20 w-full bg-black/30 object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                  <p className="truncate text-[11px] font-medium text-white">{m.nombre}</p>
                  <p className="text-[10px] text-white/70">{formatearDuracion(m.duracion)}</p>
                </div>
                <button
                  onClick={() => agregarDesdeAsset(m)}
                  title="Añadir a la línea de tiempo"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-brand text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Icon name="mas" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
