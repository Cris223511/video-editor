import { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from './Icon'

// ventana emergente sobre Radix, que se encarga del foco, del scroll de fondo
// y de cerrar con esc. la animación de entrada y de salida la lleva Framer
// Motion, por eso el montaje es forzado: sin eso, al cerrar desaparecería de
// golpe. la tarjeta es opaca a propósito, el desenfoque va solo en el fondo
export default function Modal({
  titulo,
  descripcion,
  abierto,
  onCerrar,
  ancho = 'max-w-md',
  children,
}: {
  titulo: string
  descripcion?: string
  abierto: boolean
  onCerrar: () => void
  ancho?: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="fixed inset-0 z-50"
                style={{ background: 'rgb(6 12 24 / 0.55)' }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${ancho} -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl`}
                style={{
                  background: 'rgb(var(--surface))',
                  border: '1px solid rgb(var(--border) / 0.12)',
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Dialog.Title className="text-[15px] font-semibold">{titulo}</Dialog.Title>
                    {descripcion && (
                      <Dialog.Description className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {descripcion}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Cerrar"
                      className="interactivo -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[color:var(--muted)]"
                    >
                      <Icon name="cerrar" size={16} />
                    </button>
                  </Dialog.Close>
                </div>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
