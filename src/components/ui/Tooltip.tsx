import { ReactNode } from 'react'
import * as Tip from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'

type Lado = 'arriba' | 'abajo' | 'derecha' | 'izquierda'

const lados: Record<Lado, 'top' | 'bottom' | 'right' | 'left'> = {
  arriba: 'top',
  abajo: 'bottom',
  derecha: 'right',
  izquierda: 'left',
}

// proveedor único de tooltips. va en la raíz de la aplicación y define cuánto
// tarda en aparecer el primero; los siguientes salen al instante mientras el
// cursor se mueve entre elementos cercanos
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <Tip.Provider delayDuration={280} skipDelayDuration={300}>
      {children}
    </Tip.Provider>
  )
}

// burbuja de ayuda sobre Radix: se coloca sola para no salirse de la pantalla,
// se aparta si no cabe y entra con una animación corta. envuelve a cualquier
// elemento sin cambiar su disposición
export default function Tooltip({
  texto,
  atajo,
  lado = 'arriba',
  children,
}: {
  texto: string
  atajo?: string
  lado?: Lado
  children: ReactNode
}) {
  return (
    <Tip.Root>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content
          side={lados[lado]}
          sideOffset={8}
          collisionPadding={10}
          className="z-[60] flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg data-[state=delayed-open]:animate-tip-in"
          style={{ background: 'var(--text)', color: 'rgb(var(--surface))' }}
        >
          {texto}
          {atajo && (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] tracking-wide">
              {atajo}
            </span>
          )}
          <Tip.Arrow style={{ fill: 'var(--text)' }} width={10} height={5} />
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}

// signo de interrogación que explica para qué sirve un control. va junto a la
// etiqueta y solo muestra su texto al pasar por encima
export function Ayuda({ texto }: { texto: string }) {
  return (
    <Tooltip texto={texto}>
      <button
        type="button"
        aria-label="Ayuda"
        className="interactivo grid h-4 w-4 shrink-0 cursor-help place-items-center rounded-full text-[color:var(--muted)]"
      >
        <HelpCircle size={13} />
      </button>
    </Tooltip>
  )
}
