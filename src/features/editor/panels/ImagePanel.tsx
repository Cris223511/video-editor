import { useRef } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { useToast } from '../../../components/ui/ToastProvider'
import { CapaImagen } from '../../../types/layers'
import { Campo, Deslizador } from '../../../components/ui/Controls'
import { validarImagen } from '../../../lib/validation/validateImage'

// panel de la capa de imagen o logo: subir, ajustar tamaño y opacidad. la
// posición y el redimensionado fino se hacen en el visor, y la franja de tiempo
// en la línea de tiempo
export default function ImagePanel() {
  const capas = useEditorStore((s) => s.capas)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const agregarImagen = useEditorStore((s) => s.agregarImagen)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)
  const { mostrar } = useToast()
  const input = useRef<HTMLInputElement>(null)

  const capa = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'imagen') as
    | CapaImagen
    | undefined

  async function alElegir(files: FileList | null) {
    if (!files || !files[0]) return
    const file = files[0]
    const validacion = await validarImagen(file)
    if (!validacion.ok) {
      mostrar('error', validacion.motivo ?? 'Imagen no válida.')
      return
    }
    const lector = new FileReader()
    lector.onload = () => {
      const src = String(lector.result)
      const img = new Image()
      img.onload = () => {
        agregarImagen(src, img.naturalWidth, img.naturalHeight)
        mostrar('success', 'Imagen añadida.')
      }
      img.onerror = () => mostrar('error', 'No se pudo cargar la imagen.')
      img.src = src
    }
    lector.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => input.current?.click()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
      >
        <Icon name="mas" size={16} /> Agregar imagen
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => alElegir(e.target.files)} />

      {!capa ? (
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">
          Sube una imagen o un logo para colocarlo sobre el video. Podrás moverlo y redimensionarlo en
          el visor, y decidir en la línea de tiempo de qué segundo a qué segundo aparece.
        </p>
      ) : (
        <>
          <img src={capa.src} alt="" className="max-h-32 w-full rounded-lg bg-black/20 object-contain" />
          <Campo etiqueta={`Tamaño (${Math.round(capa.anchoRel * 100)}%)`}>
            <Deslizador
              valor={Math.round(capa.anchoRel * 100)}
              min={3}
              max={200}
              onChange={(v) => {
                // si la imagen se deformó a mano en el visor, el alto acompaña al
                // ancho en la misma medida y no se pierde la forma que se le dio
                const nuevo = v / 100
                const factor = capa.anchoRel > 0 ? nuevo / capa.anchoRel : 1
                actualizarCapa(capa.id, {
                  anchoRel: nuevo,
                  ...(capa.altoRel !== undefined ? { altoRel: capa.altoRel * factor } : {}),
                })
              }}
            />
          </Campo>
          {capa.altoRel !== undefined && (
            <button
              onClick={() => actualizarCapa(capa.id, { altoRel: undefined })}
              className="interactivo w-full rounded-lg px-3 py-2 text-xs font-medium text-[color:var(--muted)]"
            >
              Devolver la proporción original
            </button>
          )}
          <Campo etiqueta={`Opacidad (${capa.opacidad}%)`}>
            <Deslizador
              valor={capa.opacidad}
              min={0}
              max={100}
              onChange={(v) => actualizarCapa(capa.id, { opacidad: v })}
            />
          </Campo>

          <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
            <span className="text-sm font-medium">Recorte</span>
            {(['izq', 'der', 'arr', 'aba'] as const).map((lado) => {
              const etiquetas = { izq: 'Izquierda', der: 'Derecha', arr: 'Arriba', aba: 'Abajo' }
              return (
                <Campo key={lado} etiqueta={`${etiquetas[lado]} (${Math.round(capa.recorte[lado] * 100)}%)`}>
                  <Deslizador
                    valor={Math.round(capa.recorte[lado] * 100)}
                    min={0}
                    max={45}
                    onChange={(v) =>
                      actualizarCapa(capa.id, { recorte: { ...capa.recorte, [lado]: v / 100 } })
                    }
                  />
                </Campo>
              )
            })}
          </div>

          <button
            onClick={() => quitarCapa(capa.id)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Icon name="papelera" size={16} /> Eliminar imagen
          </button>
        </>
      )}
    </div>
  )
}
