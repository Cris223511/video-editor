import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, ColorCampo, Segmentado } from '../../../components/ui/Controls'

const PROPORCIONES = [
  { etiqueta: '16:9', ancho: 1920, alto: 1080 },
  { etiqueta: '9:16', ancho: 1080, alto: 1920 },
  { etiqueta: '1:1', ancho: 1080, alto: 1080 },
  { etiqueta: '4:5', ancho: 1080, alto: 1350 },
  { etiqueta: '4:3', ancho: 1440, alto: 1080 },
  { etiqueta: '3:4', ancho: 1080, alto: 1440 },
]

// panel del lienzo: proporción del proyecto y color de fondo. el fondo se ve en
// las bandas cuando el video no cubre todo el lienzo
export default function LienzoPanel() {
  const resolucion = useEditorStore((s) => s.resolucion)
  const lienzoManual = useEditorStore((s) => s.lienzoManual)
  const colorFondo = useEditorStore((s) => s.colorFondo)
  const fondo = useEditorStore((s) => s.fondo)
  const setFondo = useEditorStore((s) => s.setFondo)
  const setLienzo = useEditorStore((s) => s.setLienzo)
  const setLienzoAuto = useEditorStore((s) => s.setLienzoAuto)
  const setColorFondo = useEditorStore((s) => s.setColorFondo)

  const activa = (a: number, b: number) =>
    lienzoManual && resolucion.ancho === a && resolucion.alto === b

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Proporción">
        <div className="grid grid-cols-3 gap-2">
          {PROPORCIONES.map((p) => (
            <button
              key={p.etiqueta}
              onClick={() => setLienzo(p.ancho, p.alto)}
              className={[
                'rounded-lg border py-2 text-sm font-medium transition-colors',
                activa(p.ancho, p.alto)
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
              ].join(' ')}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </Campo>

      <button
        onClick={setLienzoAuto}
        className={[
          'rounded-lg border py-2 text-sm font-medium transition-colors',
          !lienzoManual
            ? 'border-brand bg-brand/10 text-brand'
            : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
        ].join(' ')}
      >
        Ajustar al primer video
      </button>

      <Campo etiqueta="Relleno de las bandas">
        <Segmentado
          valor={fondo}
          opciones={[
            { valor: 'color', etiqueta: 'Color' },
            { valor: 'desenfoque', etiqueta: 'Video borroso' },
          ]}
          onChange={(v) => setFondo(v as 'color' | 'desenfoque')}
        />
      </Campo>

      {fondo === 'desenfoque' && (
        <p className="-mt-2 text-xs leading-relaxed text-[color:var(--muted)]">
          Las bandas se rellenan con el propio video ampliado y desenfocado. Es lo habitual para
          colocar una toma vertical en un lienzo cuadrado o apaisado sin dejar dos franjas planas a
          los lados.
        </p>
      )}

      <Campo etiqueta="Color de fondo">
        <ColorCampo valor={colorFondo} onChange={setColorFondo} />
      </Campo>

      <p className="text-xs leading-relaxed text-[color:var(--muted)]">
        El fondo rellena las zonas que el video no cubre cuando cambias la proporción del lienzo.
      </p>
    </div>
  )
}
