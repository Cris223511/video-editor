import { ReactNode } from 'react'
import { motion } from 'framer-motion'

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
