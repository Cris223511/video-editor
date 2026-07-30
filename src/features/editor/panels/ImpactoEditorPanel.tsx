import { useEditorStore } from '../../../store/useEditorStore'
import { FUERZA_IMPACTO_DEF, nombreImpacto, categoriaImpacto } from '../../../lib/impactos/catalogo'
import { Campo, Deslizador, ColorCampo, Segmentado } from '../../../components/ui/Controls'
import Icon from '../../../components/ui/Icon'
import { DireccionImpacto } from '../../../types/impacto'
import ImpactosPanel from './ImpactosPanel'

const FUERZA_DEF = FUERZA_IMPACTO_DEF

// las líneas 3D se pueden revelar en una dirección y ajustar su densidad; los de neón
// entran y salen con un ritmo (suavidad) que se puede afinar
const CON_DIRECCION = new Set(['lineas3d'])
const CON_DENSIDAD = new Set(['lineas3d'])
const CON_SUAVIDAD = new Set(['contorno', 'lineas3d', 'rayosObjeto'])

// editor de la bolita elegida: arriba una flecha para volver a la lista, luego las
// configuraciones (color, dirección/densidad de los de neón, fuerza) y debajo la lista
// de impactos con sus vistas previas, por si se quiere cambiar sin salir. La duración
// ya no vive aquí: se ajusta estirando el impacto en la línea de tiempo
export default function ImpactoEditorPanel() {
  const impactoSeleccionado = useEditorStore((s) => s.impactoSeleccionado)
  const impactos = useEditorStore((s) => s.impactos)
  const actualizarImpacto = useEditorStore((s) => s.actualizarImpacto)
  const quitarImpacto = useEditorStore((s) => s.quitarImpacto)
  const seleccionarImpacto = useEditorStore((s) => s.seleccionarImpacto)
  const setCategoriaClip = useEditorStore((s) => s.setCategoriaClip)

  const im = impactos.find((x) => x.id === impactoSeleccionado)
  if (!im) return null

  const volver = () => {
    // deselecciona el impacto y vuelve a la lista para agregar otro
    seleccionarImpacto(null)
    setCategoriaClip('impactos')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* flecha para volver a la lista de impactos, con el nombre del que se edita */}
      <button
        onClick={volver}
        className="-mt-1 flex items-center gap-1.5 self-start rounded-lg px-1.5 py-1 text-[12px] font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
      >
        <Icon name="desplegar" size={14} className="rotate-180" /> {nombreImpacto(im.tipo)}
      </button>

      <Campo etiqueta="Color del impacto">
        <ColorCampo valor={im.color} onChange={(v) => actualizarImpacto(im.id, { color: v })} />
      </Campo>

      {CON_DIRECCION.has(im.tipo) && (
        <Campo etiqueta="Dirección">
          <Segmentado
            valor={im.direccion ?? 'der'}
            opciones={[
              { valor: 'der', etiqueta: '→' },
              { valor: 'izq', etiqueta: '←' },
              { valor: 'aba', etiqueta: '↑' },
              { valor: 'arr', etiqueta: '↓' },
            ]}
            onChange={(v) => actualizarImpacto(im.id, { direccion: v as DireccionImpacto })}
          />
        </Campo>
      )}

      {CON_DENSIDAD.has(im.tipo) && (
        <Campo etiqueta="Densidad de líneas" valor={`${Math.round(im.densidad ?? 55)}%`}>
          <Deslizador
            valor={im.densidad ?? 55}
            min={0}
            max={100}
            paso={1}
            onChange={(v) => actualizarImpacto(im.id, { densidad: v })}
          />
        </Campo>
      )}

      {CON_SUAVIDAD.has(im.tipo) && (
        <Campo etiqueta="Suavidad al aparecer" valor={`${Math.round(im.suavidad ?? 50)}%`}>
          <Deslizador
            valor={im.suavidad ?? 50}
            min={0}
            max={100}
            paso={1}
            onChange={(v) => actualizarImpacto(im.id, { suavidad: v })}
          />
        </Campo>
      )}

      <Campo etiqueta="Fuerza" valor={`${Math.round(im.intensidad)}%`}>
        <div onDoubleClick={() => actualizarImpacto(im.id, { intensidad: FUERZA_DEF })}>
          <Deslizador
            valor={im.intensidad}
            min={0}
            max={100}
            paso={1}
            onChange={(v) => actualizarImpacto(im.id, { intensidad: v })}
          />
        </div>
      </Campo>

      <button
        onClick={() => quitarImpacto(im.id)}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-red-500 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/10"
      >
        <Icon name="papelera" size={14} /> Quitar este impacto
      </button>

      {/* la lista de impactos, debajo, con el tab de su categoría abierto y el actual
          resaltado. arrastrar otro sobre el mismo clip lo reemplaza, igual que en efectos */}
      <div className="mt-2 border-t pt-3" style={{ borderColor: 'rgb(var(--border) / 0.1)' }}>
        <ImpactosPanel
          tipoActivo={im.tipo}
          categoriaInicial={categoriaImpacto(im.tipo)}
          // un clic en otra tarjeta reemplaza este impacto por ese tipo, sin moverlo ni
          // cambiar su duración: sigue siendo la misma bolita, solo cambia su efecto
          onElegir={(tipo) => actualizarImpacto(im.id, { tipo })}
        />
      </div>
    </div>
  )
}
