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
                animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="fixed inset-0 z-50"
                style={{ background: 'rgb(6 12 24 / 0.45)' }}
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // al abrir, Radix lleva el foco al primer elemento enfocable de la
              // ventana. como el contenedor está fijo arriba a la izquierda, el
              // navegador desplazaba la página hasta el tope para dejarlo a la
              // vista, y el fondo daba un salto brusco hacia arriba. cancelando
              // ese enfoque automático el fondo se queda donde estaba; el trampeo
              // de foco de Radix sigue vivo, así que tab y esc funcionan igual.
              onOpenAutoFocus={(e) => e.preventDefault()}
              // lo mismo al cerrar: Radix devuelve el foco al botón que la abrió,
              // que puede haber quedado fuera de la pantalla y provocar otro
              // salto. cancelándolo, el fondo tampoco se mueve al cerrar
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {/* El centrado lo hace este contenedor y no la animación.
                  Antes la ventana se colocaba con posición absoluta al centro y
                  se corregía con un desplazamiento de media ventana metido dentro
                  de la propia animación. Como framer escribe esa transformación en
                  línea, había un instante en que todavía no estaba puesta y la
                  ventana asomaba abajo a la derecha antes de saltar a su sitio.
                  Con un contenedor que centra por sí mismo no hay nada que
                  corregir, y a la animación solo le queda aparecer y crecer. */}
              <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.985 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full ${ancho} rounded-2xl p-5 shadow-2xl`}
                  style={{
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border) / 0.1)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* el título no pasa de dos líneas y se corta con puntos
                          suspensivos: un nombre de proyecto largo estiraba la
                          cabecera y empujaba el contenido hacia abajo */}
                      <Dialog.Title className="line-clamp-2 font-display text-[17px] font-bold leading-snug">
                        {titulo}
                      </Dialog.Title>
                      {descripcion && (
                        <Dialog.Description className="mt-1 text-[13px] text-[color:var(--muted)]">
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
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
