import * as Tip from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'

// signo de interrogación de ayuda propio del diálogo de exportar. a diferencia del tooltip general
// de la app (que recorta a dos líneas con "..."), este muestra el texto COMPLETO en una burbuja de
// ancho fijo, para que las explicaciones de cada opción se lean enteras. el dueño lo pidió así solo
// para estos controles del export, no para el resto de tooltips
export default function AyudaExport({ texto, lado = 'top' }: { texto: string; lado?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tip.Root delayDuration={120} disableHoverableContent>
      <Tip.Trigger asChild>
        <button
          type="button"
          aria-label="Ayuda"
          className="interactivo grid h-4 w-4 shrink-0 cursor-help place-items-center rounded-full text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
        >
          <HelpCircle size={13} />
        </button>
      </Tip.Trigger>
      <Tip.Portal>
        <Tip.Content
          side={lado}
          sideOffset={8}
          collisionPadding={12}
          // por encima del overlay del modal (z-50); ancho fijo y texto que fluye en varias líneas
          // sin recortarse nunca, que es justo lo que se pidió para estas ayudas
          className="z-[100000] w-64 rounded-xl px-3 py-2.5 text-xs leading-relaxed shadow-xl data-[state=delayed-open]:animate-tip-in"
          style={{
            background: 'rgb(var(--surface))',
            color: 'var(--text)',
            border: '1px solid rgb(var(--border) / 0.16)',
            boxShadow: '0 10px 30px rgb(6 12 24 / 0.22)',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {texto}
          <Tip.Arrow style={{ fill: 'rgb(var(--surface))' }} width={11} height={6} />
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}
