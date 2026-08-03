import { useEffect, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical, Trash2, Plus, Music, Image as ImageIcon, Film } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { useProjectStore } from '../../store/useProjectStore'
import { MediaAsset } from '../../types/media'
import { useImportarMedios } from './useImportarMedios'

// quita la extensión del nombre del archivo para armar el nombre del proyecto: "clip.mp4" -> "clip"
function sinExtension(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, '').trim() || nombre
}

// el nombre que se propone: el del PRIMER medio (respeta el orden de la lista) con " - Video Editor"
// pegado detrás. si no hay medios, queda vacío
function nombrePropuesto(medios: MediaAsset[]): string {
  const primero = medios[0]
  return primero ? `${sinExtension(primero.nombre)} - Video Editor` : ''
}

// una fila arrastrable de la lista de medios: miniatura, nombre y un botón para quitarlo. el arrastre
// lo maneja framer (Reorder.Item) con animación suave; el tirador de la izquierda es el asa
function FilaMedio({ medio, onQuitar }: { medio: MediaAsset; onQuitar: () => void }) {
  const controles = useDragControls()
  const icono =
    medio.clase === 'audio' ? <Music size={16} /> : medio.clase === 'imagen' ? <ImageIcon size={16} /> : <Film size={16} />
  return (
    <Reorder.Item
      value={medio.id}
      dragListener={false}
      dragControls={controles}
      // aparición y salida suaves, sin saltos, como pidió el dueño
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2 rounded-xl border border-black/10 bg-[rgb(var(--surface))] p-2 dark:border-white/10"
    >
      <button
        type="button"
        onPointerDown={(e) => controles.start(e)}
        title="Arrastra para reordenar"
        className="grid h-7 w-6 shrink-0 cursor-grab place-items-center text-[color:var(--muted)] active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <span className="grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-black/40 text-white/80">
        {medio.miniatura ? (
          <img src={medio.miniatura} alt="" className="h-full w-full object-cover" />
        ) : (
          icono
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{medio.nombre}</span>
      <button
        type="button"
        onClick={onQuitar}
        aria-label="Quitar este medio"
        className="interactivo grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-rose-500"
      >
        <Trash2 size={15} />
      </button>
    </Reorder.Item>
  )
}

// modal que sale al importar los primeros medios de un proyecto nuevo: confirma el nombre (propuesto
// a partir del primer video, con " - Video Editor"), una descripción, y la lista de medios, que se
// puede reordenar, ampliar o recortar. al aceptar, el nombre y la nota quedan en el proyecto y se
// entra al editor
export default function ModalNuevoProyecto({
  abierto,
  onCancelar,
  onContinuar,
}: {
  abierto: boolean
  onCancelar: () => void
  onContinuar: () => void
}) {
  const medios = useProjectStore((s) => s.medios)
  const reordenarMedios = useProjectStore((s) => s.reordenarMedios)
  const quitar = useProjectStore((s) => s.quitar)
  const { procesar } = useImportarMedios()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // mientras el usuario no toque el nombre a mano, sigue al primer medio: si borra el primero, el
  // nombre pasa a ser el del que quede primero. en cuanto lo edita, se respeta lo que escribió
  const [editado, setEditado] = useState(false)
  const inputArchivos = useRef<HTMLInputElement>(null)
  const campoNombre = useRef<HTMLInputElement>(null)

  // al abrir se propone el nombre y se marca todo el texto para reemplazarlo de un tirón
  useEffect(() => {
    if (!abierto) return
    setEditado(false)
    setNombre(nombrePropuesto(useProjectStore.getState().medios))
    setDescripcion(useProjectStore.getState().descripcion)
    const t = window.setTimeout(() => {
      campoNombre.current?.focus()
      campoNombre.current?.select()
    }, 80)
    return () => window.clearTimeout(t)
  }, [abierto])

  // si cambia el primer medio (por reordenar o borrar) y el nombre no se tocó a mano, se re-propone
  const primerId = medios[0]?.id
  useEffect(() => {
    if (abierto && !editado) setNombre(nombrePropuesto(medios))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primerId])

  const continuar = () => {
    const limpio = nombre.trim() || 'Proyecto sin título'
    useProjectStore.getState().renombrar(limpio)
    useProjectStore.getState().setDescripcion(descripcion.trim())
    onContinuar()
  }

  return (
    <Modal titulo="Tu nuevo proyecto" abierto={abierto} onCerrar={onCancelar} ancho="max-w-lg">
      <label className="mb-2 block text-[13px] font-medium text-[color:var(--muted)]">
        Nombre del proyecto:
        <span className="ml-0.5 font-semibold" style={{ color: 'rgb(var(--alerta))' }} title="Obligatorio">
          *
        </span>
      </label>
      <input
        ref={campoNombre}
        value={nombre}
        maxLength={120}
        onChange={(e) => {
          setEditado(true)
          setNombre(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            continuar()
          }
        }}
        spellCheck={false}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand"
        style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border) / 0.16)' }}
      />

      <label className="mb-2 mt-5 block text-[13px] font-medium text-[color:var(--muted)]">Descripción:</label>
      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={3}
        maxLength={300}
        placeholder="De qué va este proyecto, en qué punto lo dejaste, lo que te sirva para reconocerlo."
        className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand"
        style={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border) / 0.16)' }}
      />

      <div className="mb-2 mt-5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-[color:var(--muted)]">
          Medios ({medios.length})
        </span>
        <span className="text-[11px] text-[color:var(--muted)]">El primero le da el nombre al proyecto.</span>
      </div>
      {/* lista reordenable: arrastrando el asa se cambia el orden con animación suave. quitar uno lo
          saca del proyecto; agregar abre el selector para sumar más */}
      <Reorder.Group axis="y" values={medios.map((m) => m.id)} onReorder={reordenarMedios} className="flex flex-col gap-1.5">
        {medios.map((m) => (
          <FilaMedio key={m.id} medio={m} onQuitar={() => quitar(m.id)} />
        ))}
      </Reorder.Group>

      <input
        ref={inputArchivos}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) procesar(e.target.files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputArchivos.current?.click()}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
        style={{ border: '1px dashed rgb(var(--border) / 0.35)' }}
      >
        <Plus size={16} /> Agregar más medios
      </button>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
        >
          Cancelar
        </button>
        <button
          onClick={continuar}
          disabled={medios.length === 0}
          className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </Modal>
  )
}
