import { ReactNode } from 'react'
import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

// bloque que entra cuando asoma por la pantalla. el desplazamiento es corto y
// siempre desde abajo: elementos que llegan desde los cuatro lados cansan y
// distraen del contenido. `retraso` sirve para encadenar varios y que aparezcan
// uno tras otro en lugar de todos a la vez
export default function Aparece({
  children,
  retraso = 0,
  className = '',
}: {
  children: ReactNode
  retraso?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      // una sola vez: repetir la animación al subir y bajar resulta molesto
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: retraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// bloque que se desplaza a distinta velocidad que la página al hacer scroll. la
// diferencia es pequeña a propósito: el parallax se nota como profundidad, no
// como que las cosas se despegan de su sitio
export function Parallax({
  children,
  fuerza = 40,
  className = '',
}: {
  children: ReactNode
  fuerza?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    // se mide desde que el bloque asoma por abajo hasta que sale por arriba
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [fuerza, -fuerza])
  const suave = useSpring(y, { stiffness: 90, damping: 22, mass: 0.4 })

  // quien prefiere menos movimiento no debería recibir desplazamientos extra
  const reducido =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: reducido ? 0 : suave }}>{children}</motion.div>
    </div>
  )
}
