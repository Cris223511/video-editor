import { ReactNode } from 'react'

// medidas del sitio, definidas una sola vez. antes cada vista repetía sus clases
// a mano y bastaba con olvidarse de una para que la barra dejara de cuadrar con
// el contenido. tocando estos dos valores cambia todo el sitio a la vez
//
// la barra es deliberadamente más ancha que el contenido: así respira por los
// lados y el contenido queda visualmente contenido dentro de ella
export const ANCHO_BARRA = 'max-w-[76rem]'
export const ANCHO_CONTENIDO = 'max-w-6xl'
export const RELLENO = 'px-6'

// caja de una vista del sitio. todo lo que va dentro comparte ancho y márgenes
export function Contenedor({
  children,
  className = '',
  ancho = 'contenido',
}: {
  children: ReactNode
  className?: string
  ancho?: 'contenido' | 'barra'
}) {
  return (
    <div
      className={[
        'mx-auto w-full',
        ancho === 'barra' ? ANCHO_BARRA : ANCHO_CONTENIDO,
        RELLENO,
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

// sección con su espaciado vertical estándar. el relleno lateral lo pone el
// contenedor de dentro, no la sección, para que el fondo y los adornos puedan
// llegar hasta el borde de la pantalla
export function Seccion({
  children,
  className = '',
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={['relative py-20', className].join(' ')}>
      {children}
    </section>
  )
}
