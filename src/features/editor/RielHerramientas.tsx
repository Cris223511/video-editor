import Icon, { NombreIcono } from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'

export const herramientas: { id: Herramienta; icono: NombreIcono; etiqueta: string }[] = [
  { id: 'proyecto', icono: 'logo', etiqueta: 'Proyecto' },
  { id: 'propiedades', icono: 'ajustes', etiqueta: 'Propiedades' },
  { id: 'lienzo', icono: 'lienzo', etiqueta: 'Lienzo' },
  { id: 'marco', icono: 'marco', etiqueta: 'Marco' },
  { id: 'texto', icono: 'texto', etiqueta: 'Texto' },
  { id: 'imagen', icono: 'imagen', etiqueta: 'Imagen' },
  { id: 'figura', icono: 'figura', etiqueta: 'Figura' },
  { id: 'audio', icono: 'audio', etiqueta: 'Audio' },
  { id: 'censura', icono: 'censura', etiqueta: 'Censura' },
  { id: 'velocidad', icono: 'velocidad', etiqueta: 'Velocidad' },
  { id: 'tono', icono: 'tono', etiqueta: 'Tono' },
  { id: 'efectos', icono: 'efectos', etiqueta: 'Efectos' },
]

// columna de iconos que elige qué se ve en el panel de opciones. vive fuera de
// ese panel a propósito: antes formaba parte de él y al plegarlo se iba también
// la navegación del editor, que es justo lo que no debe pasar. desde aquí sigue
// visible siempre, y pulsar un icono con el panel plegado lo despliega
export default function RielHerramientas({ onElegir }: { onElegir?: () => void }) {
  const herramienta = useEditorStore((s) => s.herramienta)
  const setHerramienta = useEditorStore((s) => s.setHerramienta)

  return (
    <div
      className="panel flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden rounded-xl py-2"
    >
      {herramientas.map((h) => (
        <Tooltip key={h.id} texto={h.etiqueta} lado="derecha">
          <button
            onClick={() => {
              setHerramienta(h.id)
              onElegir?.()
            }}
            className={[
              // shrink-0 es lo que impide que los botones se aplasten unos contra
              // otros cuando la fila superior se queda con poco alto. sin él, flex
              // los comprimía hasta solaparse en lugar de dejar que apareciera la
              // barra de desplazamiento
              'grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-all duration-200',
              herramienta === h.id
                ? 'bg-brand text-white shadow-sm'
                : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand active:scale-95',
            ].join(' ')}
          >
            <Icon name={h.icono} size={19} />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
