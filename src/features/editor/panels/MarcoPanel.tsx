import { useEditorStore } from '../../../store/useEditorStore'
import { TipoMarco } from '../../../types/marco'
import { Campo, Deslizador, ColorCampo } from '../../../components/ui/controls'

const TIPOS: { tipo: TipoMarco; etiqueta: string }[] = [
  { tipo: 'ninguno', etiqueta: 'Ninguno' },
  { tipo: 'solido', etiqueta: 'Sólido' },
  { tipo: 'doble', etiqueta: 'Doble' },
  { tipo: 'discontinuo', etiqueta: 'Discontinuo' },
  { tipo: 'punteado', etiqueta: 'Punteado' },
  { tipo: 'redondeado', etiqueta: 'Redondeado' },
  { tipo: 'sombra', etiqueta: 'Sombra' },
  { tipo: 'neon', etiqueta: 'Neón' },
  { tipo: 'degradado', etiqueta: 'Degradado' },
  { tipo: 'vineta', etiqueta: 'Viñeta' },
  { tipo: 'polaroid', etiqueta: 'Polaroid' },
]

// el color no influye en estos tipos, así que se ocultan sus controles de color
const SIN_COLOR: TipoMarco[] = ['ninguno', 'sombra', 'vineta', 'degradado']

// panel del marco decorativo del lienzo: tipo, color y grosor
export default function MarcoPanel() {
  const marco = useEditorStore((s) => s.marco)
  const setMarco = useEditorStore((s) => s.setMarco)

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Tipo de marco">
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.tipo}
              onClick={() => setMarco({ tipo: t.tipo })}
              className={[
                'rounded-lg border py-2 text-sm font-medium transition-colors',
                marco.tipo === t.tipo
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
              ].join(' ')}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      </Campo>

      {marco.tipo !== 'ninguno' && (
        <>
          {!SIN_COLOR.includes(marco.tipo) && (
            <Campo etiqueta="Color">
              <ColorCampo valor={marco.color} onChange={(v) => setMarco({ color: v })} />
            </Campo>
          )}

          {marco.tipo !== 'vineta' && (
            <Campo etiqueta={`Grosor (${marco.grosor})`}>
              <Deslizador
                valor={marco.grosor}
                min={2}
                max={150}
                onChange={(v) => setMarco({ grosor: v })}
              />
            </Campo>
          )}

          {marco.tipo === 'redondeado' && (
            <Campo etiqueta={`Radio de esquinas (${marco.radio})`}>
              <Deslizador
                valor={marco.radio}
                min={0}
                max={200}
                onChange={(v) => setMarco({ radio: v })}
              />
            </Campo>
          )}
        </>
      )}
    </div>
  )
}
