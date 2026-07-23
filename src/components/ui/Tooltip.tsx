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
    // sin espera: el tooltip sale en cuanto el cursor entra. tener que dejar el
    // ratón quieto un momento para saber qué hace un botón entorpece más de lo
    // que ayuda, sobre todo en una barra llena de iconos
    <Tip.Provider delayDuration={0} skipDelayDuration={0}>
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
  // por defecto el tooltip sale al instante, que es lo que se quiere en una barra
  // de iconos. algunos sitios piden lo contrario: en un clip de la línea de tiempo
  // el nombre solo debe asomar si de verdad te paras a mirarlo un par de segundos
  retardo = 0,
  children,
}: {
  texto: string
  atajo?: string
  lado?: Lado
  retardo?: number
  children: ReactNode
}) {
  return (
    <Tip.Root delayDuration={retardo}>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content
          side={lados[lado]}
          sideOffset={8}
          collisionPadding={10}
          className="z-[60] flex max-w-[18rem] items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg data-[state=delayed-open]:animate-tip-in"
          style={{
            // sigue el tema: antes usaba el color del texto como fondo, que en
            // oscuro daba una etiqueta clara sobre una interfaz oscura
            background: 'rgb(var(--surface))',
            color: 'var(--text)',
            border: '1px solid rgb(var(--border) / 0.16)',
            boxShadow: '0 8px 24px rgb(6 12 24 / 0.18)',
          }}
        >
          {/* hasta dos líneas antes de recortar: un texto largo en una sola línea
              se cortaba con "..." y no se llegaba a leer entero */}
          <span className="line-clamp-2">{texto}</span>
          {atajo && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] tracking-wide"
              style={{ background: 'rgb(var(--border) / 0.12)' }}
            >
              {atajo}
            </span>
          )}
          <Tip.Arrow style={{ fill: 'rgb(var(--surface))' }} width={10} height={5} />
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
