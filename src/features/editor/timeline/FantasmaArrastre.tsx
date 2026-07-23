import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useEditorStore } from '../../../store/useEditorStore'

// etiqueta que acompaña al cursor mientras se arrastra algo por la línea de
// tiempo. da una pista constante de qué se lleva en la mano, que en un montaje
// con muchos bloques parecidos se agradece. va en un portal sobre el documento
// para que ningún recorte de la línea de tiempo la deje a medias
export default function FantasmaArrastre() {
  const arrastre = useEditorStore((s) => s.arrastreVivo)

  return createPortal(
    <AnimatePresence>
      {arrastre && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed z-[999] max-w-[220px] truncate rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
          style={{
            // un poco por debajo y a la derecha del puntero, donde no tapa el sitio
            // exacto al que se apunta
            left: arrastre.x + 14,
            top: arrastre.y + 16,
            background: 'rgb(24 97 255 / 0.94)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {arrastre.etiqueta}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
