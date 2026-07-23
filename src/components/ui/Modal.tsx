import { ReactNode, useRef } from 'react'
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
  // recuerda si el clic empezó en el fondo (fuera de la tarjeta). así, arrastrar
  // desde dentro del modal y soltar fuera no lo cierra: solo cierra un clic que
  // nace y termina en el fondo
  const abajoEnFondo = useRef(false)

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
              // el cierre al pulsar fuera lo controla el contenedor de abajo con su
              // guardia de arrastre, no radix, para que soltar el ratón fuera tras
              // arrastrar desde dentro no cierre la ventana sin querer
              onInteractOutside={(e) => e.preventDefault()}
            >
              {/* El centrado lo hace este contenedor y no la animación.
                  Antes la ventana se colocaba con posición absoluta al centro y
                  se corregía con un desplazamiento de media ventana metido dentro
                  de la propia animación. Como framer escribe esa transformación en
                  línea, había un instante en que todavía no estaba puesta y la
                  ventana asomaba abajo a la derecha antes de saltar a su sitio.
                  Con un contenedor que centra por sí mismo no hay nada que
                  corregir, y a la animación solo le queda aparecer y crecer. */}
              <div
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
                onMouseDown={(e) => {
                  abajoEnFondo.current = e.target === e.currentTarget
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget && abajoEnFondo.current) onCerrar()
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.985 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  // la tarjeta nunca pasa del 85% del alto de la ventana. como es
                  // una columna flexible, la cabecera se queda fija arriba y solo
                  // el cuerpo crece; cuando el contenido es alto (un video con su
                  // ficha, por ejemplo) el desbordamiento se resuelve dentro del
                  // cuerpo con su propio scroll, y el modal jamás se sale de vista
                  className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl shadow-2xl ${ancho}`}
                  style={{
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border) / 0.1)',
                  }}
                >
                  {/* la cabecera no se desplaza: se mantiene visible mientras el
                      cuerpo rueda por debajo. el shrink-0 evita que el flex la
                      comprima cuando el contenido pide más alto del disponible */}
                  <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
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
                  {/* el cuerpo se lleva el scroll propio con una barra fina y
                      redondeada. el padding derecho deja aire entre el contenido y
                      esa barra para que no queden pegados al desplazar */}
                  {/* break-words vale para todo el contenido: ningún texto largo
                      puede estirar el modal ni sacar barra horizontal, pase lo que
                      pase dentro. así ningún modal de la aplicación se descuadra */}
                  <div className="scroll-modal min-h-0 flex-1 overflow-y-auto overflow-x-hidden break-words px-5 pb-5">
                    {children}
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
