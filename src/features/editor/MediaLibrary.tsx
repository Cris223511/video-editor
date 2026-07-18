import { useState } from 'react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useProjectStore } from '../../store/useProjectStore'
import { useImportarMedios } from '../import/useImportarMedios'
import { formatearDuracion } from '../../lib/format/duracion'

// tipo de dato que viaja al arrastrar un medio hacia la línea de tiempo
export const TIPO_ARRASTRE = 'application/x-video-editor-asset'

// panel de medios, abajo a la izquierda y junto a la línea de tiempo. los
// medios se arrastran desde aquí hasta la pista, y se importan más soltando
// archivos del explorador sobre la zona punteada
export default function MediaLibrary() {
  const medios = useProjectStore((s) => s.medios)
  const quitar = useProjectStore((s) => s.quitar)
  const { procesar, ocupado } = useImportarMedios()
  const [encima, setEncima] = useState(false)

  const soltarArchivos = (e: React.DragEvent) => {
    e.preventDefault()
    setEncima(false)
    if (e.dataTransfer.files?.length) procesar(e.dataTransfer.files)
  }

  return (
    <aside className="panel flex w-56 shrink-0 flex-col rounded-xl md:w-64">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon name="pelicula" size={15} className="text-[color:var(--muted)]" />
        <span className="text-[13px] font-semibold">Medios</span>
        <span className="ml-auto text-[11px] text-[color:var(--muted)]">{medios.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5">
        {medios.length > 0 && (
          <ul className="mb-2.5 grid grid-cols-2 gap-2">
            {medios.map((m) => (
              <li key={m.id}>
                <Tooltip texto={`${m.nombre} · arrastra a la pista`}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(TIPO_ARRASTRE, m.id)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    className="group relative w-full cursor-grab overflow-hidden rounded-lg ring-1 ring-[rgb(var(--border)/0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:cursor-grabbing"
                  >
                    <img
                      src={m.miniatura}
                      alt=""
                      className="h-16 w-full bg-black/30 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 py-1">
                      <p className="truncate text-[10px] font-medium text-white">{m.nombre}</p>
                      <p className="text-[9px] text-white/70">{formatearDuracion(m.duracion)}</p>
                    </div>
                    <button
                      onClick={() => quitar(m.id)}
                      title="Quitar del proyecto"
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-red-500 group-hover:opacity-100"
                    >
                      <Icon name="papelera" size={12} />
                    </button>
                  </div>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}

        {/* zona para soltar archivos del explorador; se ilumina al pasar por
            encima con algo arrastrado */}
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setEncima(true)
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={soltarArchivos}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 text-center transition-all duration-200',
            medios.length ? 'py-4' : 'py-10',
            encima
              ? 'scale-[1.02] border-brand bg-brand/10'
              : 'border-[rgb(var(--border)/0.22)] hover:border-brand/60 hover:bg-brand/5',
            ocupado ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
        >
          <Icon
            name="subir"
            size={medios.length ? 16 : 22}
            className={encima ? 'text-brand' : 'text-[color:var(--muted)]'}
          />
          <span className="text-[11px] font-medium leading-tight text-[color:var(--muted)]">
            {encima ? 'Suelta para importar' : 'Arrastra tus videos aquí'}
          </span>
          {!medios.length && (
            <span className="text-[10px] text-[color:var(--muted)]">o haz clic para elegirlos</span>
          )}
          <input
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(e) => e.target.files && procesar(e.target.files)}
          />
        </label>
      </div>
    </aside>
  )
}
