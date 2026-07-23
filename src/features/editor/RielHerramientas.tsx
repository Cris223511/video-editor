import { ReactNode, useState } from 'react'
import Icon, { NombreIcono } from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'

export const herramientas: { id: Herramienta; icono: NombreIcono; etiqueta: string }[] = [
  { id: 'proyecto', icono: 'logo', etiqueta: 'Proyecto' },
  { id: 'transiciones', icono: 'transiciones', etiqueta: 'Transiciones' },
  { id: 'lienzo', icono: 'lienzo', etiqueta: 'Lienzo' },
  { id: 'marco', icono: 'marco', etiqueta: 'Marco' },
  { id: 'texto', icono: 'texto', etiqueta: 'Texto' },
  { id: 'figura', icono: 'figura', etiqueta: 'Figura' },
  { id: 'dibujar', icono: 'dibujar', etiqueta: 'Dibujar' },
  { id: 'borrador', icono: 'papelera', etiqueta: 'Borrador' },
  { id: 'transformar', icono: 'transformar', etiqueta: 'Transformar' },
  // recortar salió del riel: es una acción sobre lo que ya está elegido, así que
  // vive en la barra de opciones de la selección y en la tecla C. el panel sigue
  // existiendo y se abre desde ahí
  { id: 'audio', icono: 'audio', etiqueta: 'Audio' },
  { id: 'censura', icono: 'censura', etiqueta: 'Censura' },
  { id: 'velocidad', icono: 'velocidad', etiqueta: 'Velocidad' },
  { id: 'tono', icono: 'tono', etiqueta: 'Tono' },
  { id: 'efectos', icono: 'efectos', etiqueta: 'Efectos' },
]

// clave con la que se recuerda entre visitas si el riel quedó ancho o estrecho.
// no merece un store aparte, así que basta con localStorage
const CLAVE_EXPANDIDO = 've-riel-expandido'

// anchos del riel en cada estado. plegado se queda en una tira estrecha de solo
// iconos, como si no hubiera nada más; desplegado suma el sitio del nombre
const ANCHO_COLAPSADO = 52
const ANCHO_EXPANDIDO = 180

// aire a cada costado de las filas. ya no se reserva carril para la barra de
// desplazamiento: reservarlo a los dos lados restaba ancho y, sobre todo,
// descentraba el icono, que era lo que se veía torcido. ahora la fila ocupa todo
// el ancho libre y el icono se centra dentro de ella, con barra o sin ella
const AIRE_LATERAL = 6

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
      className="panel flex shrink-0 flex-col gap-1 overflow-hidden rounded-xl py-1.5 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ width: expandido ? ANCHO_EXPANDIDO : ANCHO_COLAPSADO }}
    >
      <div
        // la barra de desplazamiento sí se ve, pero fina. para que no descentre los
        // iconos al aparecer, se reserva su carril en los dos costados con
        // scrollbar-gutter: así el hueco es simétrico y el icono queda siempre en el
        // eje, con barra o sin ella. el riel se ensanchó lo justo para que ese
        // reservado no apriete el dibujo
        className="scroll-riel flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden"
        style={{ paddingLeft: AIRE_LATERAL, paddingRight: AIRE_LATERAL }}
      >
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
                // plegado el contenido se centra, así el icono cae en el eje sin
                // depender de cuentas de ancho; desplegado se alinea a la izquierda
                // para que el nombre siga al dibujo
                'flex h-9 w-full shrink-0 items-center overflow-hidden rounded-lg transition-colors duration-200',
                expandido ? 'justify-start' : 'justify-center',
                herramienta === h.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
              ].join(' ')}
            >
              {/* plegado el icono no lleva caja propia y lo centra la fila; al
                  desplegarse pasa a un cuadro fijo a la izquierda para que el
                  nombre arranque siempre a la misma altura */}
              <span
                className={
                  expandido ? 'grid w-9 shrink-0 place-items-center' : 'grid shrink-0 place-items-center'
                }
              >
                <Icon name={h.icono} size={18} />
              </span>
              {/* el nombre solo se pinta con el riel desplegado. plegado no se
                  dibuja en absoluto, así ni la primera letra asoma por el borde */}
              {expandido && (
                <span className="whitespace-nowrap pr-3 text-[13px] font-medium">{h.etiqueta}</span>
              )}
            </button>
          </ConTooltip>
        ))}
      </div>

      {/* control para alternar el ancho, apoyado abajo del todo. la flecha apunta
          hacia donde va a moverse el riel y gira al cambiar de estado */}
      <div style={{ paddingLeft: AIRE_LATERAL, paddingRight: AIRE_LATERAL }}>
        <button
          type="button"
          onClick={alternar}
          aria-label={expandido ? 'Contraer el riel' : 'Expandir el riel'}
          aria-expanded={expandido}
          className={[
            'interactivo flex h-8 w-full shrink-0 items-center overflow-hidden rounded-lg text-[color:var(--muted)]',
            expandido ? 'justify-start' : 'justify-center',
          ].join(' ')}
        >
          <span
            className={
              expandido ? 'grid w-9 shrink-0 place-items-center' : 'grid shrink-0 place-items-center'
            }
          >
            <Icon
              name="desplegar"
              size={18}
              className="transition-transform duration-300"
              style={{ transform: expandido ? 'rotate(180deg)' : 'none' }}
            />
          </span>
          {expandido && (
            <span className="whitespace-nowrap pr-3 text-[13px] font-medium">Contraer</span>
          )}
        </button>
      </div>
    </div>
  )
}
