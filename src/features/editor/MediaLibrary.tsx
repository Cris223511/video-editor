import { useState } from 'react'
import { Info } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useProjectStore } from '../../store/useProjectStore'
import { useImportarMedios } from '../import/useImportarMedios'
import { formatearDuracion } from '../../lib/format/duracion'
import FichaMedio from './FichaMedio'
import { MediaAsset } from '../../types/media'

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
  // qué medio tiene la ficha de detalles abierta
  const [detalle, setDetalle] = useState<MediaAsset | null>(null)

  const soltarArchivos = (e: React.DragEvent) => {
    e.preventDefault()
    setEncima(false)
    if (e.dataTransfer.files?.length) procesar(e.dataTransfer.files)
  }

  return (
    <aside className="panel flex min-w-0 flex-1 flex-col rounded-xl">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon name="pelicula" size={15} className="text-[color:var(--muted)]" />
        <span className="text-[13px] font-semibold">Medios</span>
        <span className="ml-auto text-[13px] text-[color:var(--muted)]">{medios.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5">
        {medios.length > 0 && (
          <ul className="mb-2.5 flex flex-col gap-2">
            {medios.map((m) => (
              <li key={m.id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TIPO_ARRASTRE, m.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  // la miniatura ocupa toda la proporción del video, así se ve el
                  // encuadre de verdad en lugar de una franja recortada
                  className="group relative w-full cursor-grab overflow-hidden rounded-lg bg-black/40 ring-1 ring-[rgb(var(--border)/0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:cursor-grabbing"
                >
                  <img
                    src={m.miniatura}
                    alt=""
                    className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5">
                    <p className="truncate text-[12px] font-medium text-white">{m.nombre}</p>
                    <p className="text-[10px] text-white/70">
                      {formatearDuracion(m.duracion)} · {m.ancho}×{m.alto}
                    </p>
                  </div>
                  {/* los dos botones salen al pasar el cursor: ver la ficha del
                      medio o quitarlo del proyecto */}
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Tooltip texto="Ver detalles">
                      <button
                        onClick={() => setDetalle(m)}
                        aria-label="Ver detalles"
                        className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-brand"
                      >
                        <Info size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip texto="Quitar del proyecto">
                      <button
                        onClick={() => quitar(m.id)}
                        aria-label="Quitar del proyecto"
                        className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500"
                      >
                        <Icon name="papelera" size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
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
          <span className="text-[13px] font-medium leading-tight text-[color:var(--muted)]">
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

      <FichaMedio medio={detalle} onCerrar={() => setDetalle(null)} />
    </aside>
  )
}
