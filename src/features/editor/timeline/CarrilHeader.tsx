import { MouseEvent as ReactMouseEvent, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Icon, { NombreIcono } from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
import NombreEditable from './NombreEditable'

// cabecera de un carril que no es de video (el de texto y figuras, y el de
// audio). vive en la misma columna izquierda que las cabeceras de las pistas,
// alineada con sus filas. su papel es dejar claro qué tipo de contenido ocupa
// esa sección; el acento de color en la franja y en el icono es lo que la separa
// de un vistazo de las pistas de video. cuando el carril admite varias filas lleva
// además un botón para añadir una más, hasta el tope
export default function CarrilHeader({
  icono,
  titulo,
  acento,
  alto,
  onAgregar,
  puedeAgregar = false,
  onSubir,
  onBajar,
  onRenombrar,
  onEstirar,
  onReordenar,
}: {
  icono: NombreIcono
  titulo: string
  acento: string
  alto: number
  onAgregar?: () => void
  puedeAgregar?: boolean
  // cuando llega, el rótulo se puede editar en el sitio igual que el de una pista
  onRenombrar?: (nombre: string) => void
  // suben o bajan la sección entera dentro de la línea de tiempo. llegan sin
  // definir cuando el carril ya está arriba del todo o abajo del todo
  onSubir?: () => void
  onBajar?: () => void
  // arrastre para cambiar el alto de las filas del carril; el gesto lo maneja quien
  // lo pasa, aquí solo se pinta el tirador en el borde inferior
  onEstirar?: (e: React.MouseEvent) => void
  // reordenar el carril entero: recibe la dirección (-1 sube, 1 baja) y la resuelve
  // contra el orden vigente, así arrastrar varios pasos seguidos no usa un índice
  // viejo. sin definir, el carril no se reordena
  onReordenar?: (dir: -1 | 1) => void
}) {
  const [arrastrando, setArrastrando] = useState(false)
  // reordenar el grupo entero arrastrando la cabecera arriba o abajo. reutiliza
  // los mismos onSubir/onBajar que las flechas: al pasar de la mitad del alto del
  // carril se salta al hueco contiguo. no arranca sobre un botón, el rótulo
  // editable ni el tirador de alto, para no pisar esos gestos
  function iniciarReordenar(e: ReactMouseEvent) {
    const t = e.target as HTMLElement
    if (t.closest('button') || t.closest('input') || t.closest('[data-tirador-alto]')) return
    if (!onReordenar) return
    e.preventDefault()
    let baseY = e.clientY
    const paso = Math.max(28, alto + 12)
    setArrastrando(true)
    document.body.style.cursor = 'grabbing'
    const mover = (ev: globalThis.MouseEvent) => {
      const dy = ev.clientY - baseY
      if (dy < -paso / 2) {
        onReordenar(-1)
        baseY -= paso
      } else if (dy > paso / 2) {
        onReordenar(1)
        baseY += paso
      }
    }
    const soltar = () => {
      setArrastrando(false)
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div
      className={[
        'group relative flex items-center gap-2 overflow-hidden rounded-r-lg pl-3 pr-2',
        arrastrando ? 'z-30 shadow-lg ring-1 ring-brand/50' : '',
      ].join(' ')}
      style={{
        height: alto,
        background: arrastrando ? 'rgb(var(--border) / 0.12)' : 'rgb(var(--border) / 0.06)',
      }}
    >
      {/* franja fina del color del carril, de arriba abajo del todo. distingue el
          carril de las pistas de video sin cargar la cabecera */}
      <span
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ background: acento, opacity: 0.7 }}
      />
      {/* el icono es el único agarre para reordenar la sección: la manito de
          «arrastrar» sale solo aquí, en el inicio, y no por toda la cabecera. así no
          se confunde con la zona del nombre ni con los botones de la derecha */}
      <span
        onMouseDown={iniciarReordenar}
        title={onReordenar ? 'Arrastra para reordenar la sección' : undefined}
        className={[
          'grid h-6 w-6 shrink-0 place-items-center rounded-md',
          onReordenar ? 'cursor-grab active:cursor-grabbing' : '',
        ].join(' ')}
        style={{ background: `${acento}22`, color: acento }}
      >
        <Icon name={icono} size={14} />
      </span>
      {onRenombrar ? (
        <NombreEditable valor={titulo} onGuardar={onRenombrar} />
      ) : (
        <span className="truncate text-[12px] font-medium text-[color:var(--muted)]">{titulo}</span>
      )}
      {/* reordenar la sección completa. el video no lleva flechas propias, pero al
          mover estas dos por encima o por debajo de él se llega a cualquier orden */}
      <span data-no-reordenar className="ml-auto flex shrink-0 items-center">
        <button
          onClick={onSubir}
          disabled={!onSubir}
          aria-label={`Subir la sección de ${titulo}`}
          title={`Subir la sección de ${titulo}`}
          className="interactivo grid h-5 w-5 place-items-center rounded text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={onBajar}
          disabled={!onBajar}
          aria-label={`Bajar la sección de ${titulo}`}
          title={`Bajar la sección de ${titulo}`}
          className="interactivo grid h-5 w-5 place-items-center rounded text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronDown size={13} />
        </button>
      </span>
      {onEstirar && (
        <div
          onMouseDown={onEstirar}
          data-tirador-alto
          title="Arrastra para cambiar el alto"
          className="absolute inset-x-0 bottom-0 z-10 h-1.5 cursor-ns-resize opacity-0 transition-opacity duration-200 hover:opacity-100 group-hover:opacity-60"
          style={{ background: 'rgb(var(--brand) / 0.8)' }}
        />
      )}
      {onAgregar && (
        <Tooltip texto={puedeAgregar ? 'Añadir una fila' : 'Máximo de filas alcanzado'} lado="derecha">
          <button
            onClick={onAgregar}
            disabled={!puedeAgregar}
            data-no-reordenar
            aria-label="Añadir una fila a este carril"
            className="interactivo grid h-6 w-6 shrink-0 place-items-center rounded-md text-[color:var(--muted)] disabled:pointer-events-none disabled:opacity-40"
          >
            <Icon name="mas" size={15} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
