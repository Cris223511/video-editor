import { CSSProperties } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { Marco } from '../../../types/marco'

// traduce el marco a estilos css. el grosor y el radio se escalan a la altura
// del lienzo mostrado para que se vean iguales en cualquier tamaño
export function estiloMarco(m: Marco, g: number, r: number): CSSProperties {
  switch (m.tipo) {
    case 'solido':
      return { border: `${g}px solid ${m.color}` }
    case 'doble':
      return { border: `${g}px double ${m.color}` }
    case 'discontinuo':
      return { border: `${g}px dashed ${m.color}` }
    case 'punteado':
      return { border: `${g}px dotted ${m.color}` }
    case 'redondeado':
      return { border: `${g}px solid ${m.color}`, borderRadius: r }
    case 'sombra':
      return { boxShadow: `inset 0 0 ${g * 2}px ${g}px rgba(0,0,0,.55)` }
    case 'neon':
      return {
        border: `${Math.max(1, g / 3)}px solid ${m.color}`,
        boxShadow: `0 0 ${g}px ${m.color}, inset 0 0 ${g}px ${m.color}`,
      }
    case 'degradado':
      // el marco de color se pinta como un fondo degradado recortado con dos
      // máscaras que se restan, dejando solo el reborde. es más de fiar que
      // border-image, que a ciertos grosores dejaba de dibujarse
      return {
        padding: g,
        background: 'linear-gradient(45deg, #ff6b6b, #f9d423, #4ecdc4, #556270)',
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      } as CSSProperties
    case 'vineta':
      return { background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.75) 100%)' }
    case 'polaroid':
      return {
        borderStyle: 'solid',
        borderColor: m.color,
        borderWidth: `${g}px ${g}px ${g * 3}px ${g}px`,
      }
    default:
      return {}
  }
}

// dibuja el marco decorativo encima del lienzo, sin capturar el ratón
export default function MarcoOverlay({ alturaLienzo }: { alturaLienzo: number }) {
  const marco = useEditorStore((s) => s.marco)
  if (marco.tipo === 'ninguno') return null

  const escala = alturaLienzo / 1080
  const g = marco.grosor * escala
  const r = marco.radio * escala

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ ...estiloMarco(marco, g, r), boxSizing: 'border-box' }}
    />
  )
}
