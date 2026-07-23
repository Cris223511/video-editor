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

// anchos del riel en cada estado. el estrecho se ajustó para que la tira de
// iconos no ocupe más de lo necesario, que era lo que la hacía verse amontonada;
// el ancho suma el espacio del nombre que se revela al lado
const ANCHO_COLAPSADO = 62
const ANCHO_EXPANDIDO = 196

// aire a cada costado de las filas y hueco que se reserva para el carril de la
// barra de desplazamiento. las cuentas del ancho plegado salen así: 62 de riel
// menos 2 de borde, menos 12 de aire y menos 8 de los dos carriles dejan 40
// limpios, que es justo el cuadro del icono. de ese modo el dibujo llena la fila
// y su centro cae en el eje del riel, haya barra o no
const AIRE_LATERAL = 6
const CARRIL_BARRA = 4

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
      <div
        // la barra de desplazamiento sí se ve, pero fina. para que no descentre los
        // iconos al aparecer, se reserva su carril en los dos costados con
        // scrollbar-gutter: así el hueco es simétrico y el icono queda siempre en el
        // eje, con barra o sin ella. el riel se ensanchó lo justo para que ese
        // reservado no apriete el dibujo
        className="scroll-riel flex flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden"
        style={{ paddingLeft: AIRE_LATERAL, paddingRight: AIRE_LATERAL, scrollbarGutter: 'stable both-edges' }}
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
                'flex h-11 w-full shrink-0 items-center overflow-hidden rounded-xl transition-colors duration-200',
                herramienta === h.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
              ].join(' ')}
            >
              {/* el icono vive en un cuadro de 44px que, plegado el riel, coincide
                  con el ancho de la fila: el dibujo llena la casilla y su centro
                  cae en el eje. desplegado ese cuadro sigue igual a la izquierda,
                  de modo que el icono no se mueve ni un pixel al abrir */}
              <span className="grid w-10 shrink-0 place-items-center">
                <Icon name={h.icono} size={19} />
              </span>
              {/* el nombre solo se pinta con el riel desplegado. plegado no se
                  dibuja en absoluto, así ni la primera letra asoma por el borde */}
              {expandido && (
                <span className="whitespace-nowrap pr-3 text-sm font-medium">{h.etiqueta}</span>
              )}
            </button>
          </ConTooltip>
        ))}
      </div>

      {/* control para alternar el ancho, apoyado abajo del todo. la flecha apunta
          hacia donde va a moverse el riel y gira al cambiar de estado */}
      {/* este bloque vive fuera de la zona que se desplaza, así que no recibe el
          carril de la barra; se le suma a mano para que su icono caiga en el mismo
          eje que los de arriba y no quede descuadrado respecto de ellos */}
      <div style={{ paddingLeft: AIRE_LATERAL + CARRIL_BARRA, paddingRight: AIRE_LATERAL + CARRIL_BARRA }}>
        <button
          type="button"
          onClick={alternar}
          aria-label={expandido ? 'Contraer el riel' : 'Expandir el riel'}
          aria-expanded={expandido}
          className="interactivo flex h-9 w-full shrink-0 items-center overflow-hidden rounded-xl text-[color:var(--muted)]"
        >
          <span className="grid w-10 shrink-0 place-items-center">
            <Icon
              name="desplegar"
              size={18}
              className="transition-transform duration-300"
              style={{ transform: expandido ? 'rotate(180deg)' : 'none' }}
            />
          </span>
          {expandido && (
            <span className="whitespace-nowrap pr-3 text-sm font-medium">Contraer</span>
          )}
        </button>
      </div>
    </div>
  )
}
