import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Pestana {
  id: string
  nombre: string
  icono: ReactNode
  descripcion: string
  contenido: ReactNode
}

// pestañas con el indicador deslizándose de una a otra. el subrayado es un solo
// elemento compartido, no uno por pestaña, así framer puede animarlo entre
// posiciones en lugar de encenderlo y apagarlo
export default function Pestanas({ pestanas }: { pestanas: Pestana[] }) {
  const [activa, setActiva] = useState(pestanas[0].id)
  const actual = pestanas.find((p) => p.id === activa) ?? pestanas[0]

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {pestanas.map((p) => {
          const es = p.id === activa
          return (
            <button
              key={p.id}
              onClick={() => setActiva(p.id)}
              className={[
                'relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200',
                es ? 'text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
              ].join(' ')}
            >
              {es && (
                <motion.span
                  layoutId="pestana-activa"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'rgb(var(--accent-boton))' }}
                  transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {p.icono}
                {p.nombre}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-[color:var(--muted)]">
        {actual.descripcion}
      </p>

      {/* el contenido se cruza al cambiar: el que sale se va y el que entra
          llega, en lugar de aparecer de golpe en su sitio */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={actual.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {actual.contenido}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
