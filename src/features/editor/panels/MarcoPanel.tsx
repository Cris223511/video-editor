import { useEditorStore } from '../../../store/useEditorStore'
import { TipoMarco } from '../../../types/marco'
import { Campo, Deslizador, ColorCampo } from '../../../components/ui/Controls'
import { estiloMarco } from '../overlays/MarcoOverlay'

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
        {/* cada tipo se enseña con su propia muestra en lugar de solo su nombre.
            la muestra usa la misma función que pinta el marco de verdad sobre el
            visor, con el grosor y el radio a escala de la miniatura, así que lo que
            se ve acá es exactamente lo que va a caer sobre el video */}
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => {
            const elegido = marco.tipo === t.tipo
            return (
              <button
                key={t.tipo}
                onClick={() => setMarco({ tipo: t.tipo })}
                title={t.etiqueta}
                className="group flex flex-col gap-1 text-left"
              >
                <span
                  className={[
                    'relative block h-16 w-full overflow-hidden rounded-lg border bg-cover bg-center transition-all duration-150',
                    elegido
                      ? 'border-brand ring-2 ring-brand/40'
                      : 'border-black/10 group-hover:border-brand dark:border-white/10',
                  ].join(' ')}
                  // la muestra va sobre una foto real, que deja ver de verdad cómo
                  // se comporta cada marco encima de una imagen y no sobre un color plano
                  style={{ backgroundImage: 'url(/poster-equipo.jpg)' }}
                >
                  {t.tipo !== 'ninguno' && (
                    <span
                      className="absolute inset-0"
                      style={{ ...estiloMarco({ ...marco, tipo: t.tipo }, 4, 6), boxSizing: 'border-box' }}
                    />
                  )}
                  {t.tipo === 'ninguno' && (
                    <span className="absolute inset-0 grid place-items-center text-[10px] font-medium text-white/90">
                      Sin marco
                    </span>
                  )}
                </span>
                <span
                  className={[
                    'truncate text-[10px] leading-tight transition-colors',
                    elegido ? 'font-medium text-brand' : 'text-[color:var(--muted)]',
                  ].join(' ')}
                >
                  {t.etiqueta}
                </span>
              </button>
            )
          })}
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
