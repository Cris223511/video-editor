import { ReactNode, useState } from 'react'
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

// clave con la que se recuerda entre visitas si el riel quedó ancho o estrecho.
// no merece un store aparte, así que basta con localStorage
const CLAVE_EXPANDIDO = 've-riel-expandido'

// anchos del riel en cada estado. el estrecho deja hueco para el icono centrado;
// el ancho suma el espacio del nombre que se revela al lado
const ANCHO_COLAPSADO = 56
const ANCHO_EXPANDIDO = 176

// envuelve una fila en su tooltip solo cuando hace falta. plegado el riel el
// nombre no se ve y el tooltip lo aclara; desplegado el texto ya está a la vista
// y volver a nombrarlo sobra
function ConTooltip({ activo, texto, children }: { activo: boolean; texto: string; children: ReactNode }) {
  if (!activo) return <>{children}</>
  return (
    <Tooltip texto={texto} lado="derecha">
      {children}
    </Tooltip>
  )
}

// columna de iconos que elige qué se ve en el panel de opciones. vive fuera de
// ese panel a propósito: antes formaba parte de él y al plegarlo se iba también
// la navegación del editor, que es justo lo que no debe pasar. desde aquí sigue
// visible siempre, y pulsar un icono con el panel plegado lo despliega.
//
// el riel puede ensancharse para mostrar el nombre de cada herramienta junto a
// su icono; plegado se queda en la tira de iconos de siempre
export default function RielHerramientas({ onElegir }: { onElegir?: () => void }) {
  const herramienta = useEditorStore((s) => s.herramienta)
  const setHerramienta = useEditorStore((s) => s.setHerramienta)

  // el estado arranca de lo que se guardó la última vez; si no hay nada, plegado
  const [expandido, setExpandido] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_EXPANDIDO) === '1'
    } catch {
      return false
    }
  })

  function alternar() {
    setExpandido((prev) => {
      const siguiente = !prev
      try {
        localStorage.setItem(CLAVE_EXPANDIDO, siguiente ? '1' : '0')
      } catch {
        // en modo privado o con el almacenamiento bloqueado no pasa nada:
        // el estado sigue vivo en memoria durante la sesión
      }
      return siguiente
    })
  }

  return (
    <div
      className="panel flex shrink-0 flex-col gap-1 overflow-hidden rounded-xl py-2 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ width: expandido ? ANCHO_EXPANDIDO : ANCHO_COLAPSADO }}
    >
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-1.5">
        {herramientas.map((h) => (
          <ConTooltip key={h.id} activo={!expandido} texto={h.etiqueta}>
            <button
              onClick={() => {
                setHerramienta(h.id)
                onElegir?.()
              }}
              title={expandido ? undefined : h.etiqueta}
              className={[
                // shrink-0 evita que las filas se aplasten unas contra otras cuando
                // el alto escasea; en su lugar aparece la barra de desplazamiento.
                // overflow-hidden recorta el nombre mientras el riel se anima, de
                // modo que el texto no se reacomoda ni se ve comprimido
                'flex h-11 w-full shrink-0 items-center overflow-hidden rounded-lg transition-colors duration-200',
                herramienta === h.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
              ].join(' ')}
            >
              {/* el icono ocupa un cuadro fijo del ancho del riel plegado, así se
                  queda centrado igual que antes y no se desplaza al ensanchar */}
              <span className="grid w-11 shrink-0 place-items-center">
                <Icon name={h.icono} size={19} />
              </span>
              {/* nombre en una sola línea: al no poder envolver, el recorte lo va
                  descubriendo sin reflow al abrir ni al cerrar */}
              <span className="whitespace-nowrap pr-3 text-sm font-medium">{h.etiqueta}</span>
            </button>
          </ConTooltip>
        ))}
      </div>

      {/* control para alternar el ancho, apoyado abajo del todo. la flecha apunta
          hacia donde va a moverse el riel y gira al cambiar de estado */}
      <div className="px-1.5">
        <button
          type="button"
          onClick={alternar}
          aria-label={expandido ? 'Contraer el riel' : 'Expandir el riel'}
          aria-expanded={expandido}
          className="interactivo flex h-9 w-full shrink-0 items-center overflow-hidden rounded-lg text-[color:var(--muted)]"
        >
          <span className="grid w-11 shrink-0 place-items-center">
            <Icon
              name="desplegar"
              size={18}
              className="transition-transform duration-300"
              style={{ transform: expandido ? 'rotate(180deg)' : 'none' }}
            />
          </span>
          <span className="whitespace-nowrap pr-3 text-sm font-medium">Contraer</span>
        </button>
      </div>
    </div>
  )
}
