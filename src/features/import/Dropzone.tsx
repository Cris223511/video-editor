import { DragEvent, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import { VIDEO_EXTENSIONS } from '../../config/constants'

interface Props {
  onArchivos: (files: FileList) => void
  ocupado: boolean
}

// zona para soltar o elegir archivos. resalta el borde cuando se arrastra algo
// encima y se bloquea mientras se procesa un lote
export default function Dropzone({ onArchivos, ocupado }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [encima, setEncima] = useState(false)

  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setEncima(false)
    if (e.dataTransfer.files.length) onArchivos(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setEncima(true)
      }}
      onDragLeave={() => setEncima(false)}
      onDrop={soltar}
      onClick={() => !ocupado && input.current?.click()}
      className={[
        // borde discontinuo: es la señal universal de zona por rellenar, y
        // distingue esta caja de una tarjeta cualquiera
        'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all duration-200',
        encima
          ? 'scale-[1.01] border-brand bg-brand/5'
          : 'border-black/15 hover:border-brand/70 hover:bg-brand/[0.03] dark:border-white/15',
        ocupado ? 'pointer-events-none opacity-60' : '',
      ].join(' ')}
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand transition-transform duration-200">
        <Icon name="subir" size={30} />
      </span>
      <div>
        <p className="font-display text-base font-bold">Arrastra tus videos aquí o haz clic para elegir</p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {VIDEO_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')} · hasta 1.5 GB por archivo
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={(e) => e.target.files && onArchivos(e.target.files)}
      />
    </div>
  )
}
