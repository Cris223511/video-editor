import { useState } from 'react'
import Icon from '../../../components/ui/Icon'

// guía que aparece en el hueco de encima de un grupo (audio, imágenes, texto) y
// añade un nivel al carril que queda por encima. es el mismo lenguaje de la guía
// que ya tiene el video entre sus niveles: una línea celeste con un «+» y su
// ayuda, para insertar sin ir a buscar el botón del carril
export default function GuiaEntreCarriles({
  etiqueta,
  onInsertar,
}: {
  // nombre del grupo de encima, para la ayuda («insertar un nivel de Audio aquí»)
  etiqueta: string
  onInsertar: () => void
}) {
  const [activa, setActiva] = useState(false)
  return (
    <div
      onMouseEnter={() => setActiva(true)}
      onMouseLeave={() => setActiva(false)}
      // se apoya en el hueco que separa este carril del de arriba, sin ocupar sitio
      // en el flujo, así no descuadra las secciones
      className="absolute inset-x-0 -top-3 z-40 flex h-4 items-center justify-center"
    >
      <span
        className="pointer-events-none absolute inset-x-1 h-0.5 rounded-full transition-opacity duration-150"
        style={{ background: '#38bdf8', boxShadow: '0 0 6px rgba(56,189,248,0.85)', opacity: activa ? 1 : 0 }}
      />
      <span
        className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg transition-opacity duration-150"
        style={{
          background: 'rgb(var(--surface))',
          color: 'var(--text)',
          border: '1px solid rgb(var(--border) / 0.16)',
          boxShadow: '0 8px 24px rgb(6 12 24 / 0.18)',
          opacity: activa ? 1 : 0,
        }}
      >
        Insertar un nivel de {etiqueta}
      </span>
      <button
        onClick={onInsertar}
        aria-label={`Insertar un nivel de ${etiqueta}`}
        className={[
          'interactivo relative grid h-6 w-6 place-items-center rounded-full text-white shadow-md ring-2 transition-all duration-150',
          activa ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
        ].join(' ')}
        style={{ background: '#38bdf8', ['--tw-ring-color' as string]: 'rgb(var(--surface))' }}
      >
        <Icon name="mas" size={14} />
      </button>
    </div>
  )
}
