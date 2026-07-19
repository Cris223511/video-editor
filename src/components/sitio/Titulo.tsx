import { ReactNode } from 'react'

type Nivel = 'xl' | 'lg' | 'md'

const clases: Record<Nivel, string> = {
  xl: 'text-titulo-xl',
  lg: 'text-titulo-lg',
  md: 'text-titulo-md',
}

// titular del sitio. `acento` es la parte que se pinta en azul dentro de la
// frase, el recurso que se repite en toda la referencia: "Acerca del creador",
// "Áreas de experiencia". se pasa por separado en lugar de dentro del texto
// para no tener que escribir marcas en cada llamada
export default function Titulo({
  children,
  acento,
  despues,
  nivel = 'lg',
  centrado = false,
  como: Etiqueta = 'h2',
  className = '',
}: {
  children: ReactNode
  acento?: string
  despues?: string
  nivel?: Nivel
  centrado?: boolean
  como?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <Etiqueta
      className={[
        'font-display text-balance',
        clases[nivel],
        centrado ? 'text-center' : '',
        className,
      ].join(' ')}
      style={{ color: 'var(--text)' }}
    >
      {children}
      {acento && <span className="text-brand"> {acento}</span>}
      {despues && <span> {despues}</span>}
    </Etiqueta>
  )
}
