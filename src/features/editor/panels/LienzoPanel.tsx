import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, ColorCampo, Deslizador, Segmentado } from '../../../components/ui/Controls'

const PROPORCIONES = [
  { etiqueta: '16:9', ancho: 1920, alto: 1080 },
  { etiqueta: '9:16', ancho: 1080, alto: 1920 },
  { etiqueta: '1:1', ancho: 1080, alto: 1080 },
  { etiqueta: '4:5', ancho: 1080, alto: 1350 },
  { etiqueta: '4:3', ancho: 1440, alto: 1080 },
  { etiqueta: '3:4', ancho: 1080, alto: 1440 },
]

// un fotograma de mentira que representa el video dentro del lienzo. es apaisado
// a propósito: puesto en un lienzo cuadrado o vertical deja las bandas arriba y
// abajo, que es justo lo que la maqueta quiere enseñar
const DEGRADADO_VIDEO = 'linear-gradient(135deg, #12a5f0 0%, #1861ff 52%, #7c3aed 100%)'

// panel del lienzo: proporción del proyecto y color de fondo. el fondo se ve en
// las bandas cuando el video no cubre todo el lienzo. el contenido se reparte en
// dos zonas, la maqueta y los ajustes, para que no queden apelmazados
export default function LienzoPanel() {
  const resolucion = useEditorStore((s) => s.resolucion)
  const lienzoManual = useEditorStore((s) => s.lienzoManual)
  const colorFondo = useEditorStore((s) => s.colorFondo)
  const fondo = useEditorStore((s) => s.fondo)
  const setFondo = useEditorStore((s) => s.setFondo)
  const desenfoqueFondo = useEditorStore((s) => s.desenfoqueFondo)
  const setDesenfoqueFondo = useEditorStore((s) => s.setDesenfoqueFondo)
  const setLienzo = useEditorStore((s) => s.setLienzo)
  const setLienzoAuto = useEditorStore((s) => s.setLienzoAuto)
  const setColorFondo = useEditorStore((s) => s.setColorFondo)

  const activa = (a: number, b: number) =>
    lienzoManual && resolucion.ancho === a && resolucion.alto === b

  // el ajuste de 1 a 100 se traduce a un desenfoque suave para la maqueta, solo
  // para que se note la diferencia respecto al color plano sin volverla ilegible
  const desenfoquePreview = Math.max(2.5, desenfoqueFondo / 7)

  // la maqueta se dibuja con tamaños en píxeles calculados a mano: es la forma
  // fiable de que el rectángulo conserve su proporción y quepa siempre dentro
  // del área de trabajo, tanto en un lienzo apaisado como en uno vertical
  const AREA_ANCHO = 216
  const AREA_ALTO = 128
  const proporcionLienzo = resolucion.ancho / resolucion.alto
  const lienzoAncho = Math.min(AREA_ANCHO, AREA_ALTO * proporcionLienzo)
  const lienzoAlto = lienzoAncho / proporcionLienzo
  // el fotograma de muestra es apaisado (16:9); se ajusta dentro del lienzo
  // conservando su forma, y lo que sobra son las bandas
  const videoAncho = Math.min(lienzoAncho, lienzoAlto * (16 / 9))
  const videoAlto = videoAncho / (16 / 9)

  return (
    <div className="lienzo-caja">
      <div className="lienzo-reparto">
        {/* zona de la izquierda: la maqueta del proyecto con la proporción viva y
            las bandas rellenas como quedarían al exportar */}
        <section className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Proporción del proyecto</span>
          <div
            className="grid place-items-center rounded-xl p-4"
            style={{
              // cuadrícula tenue de fondo para que el hueco alrededor del lienzo
              // se lea como mesa de trabajo, no como un borde plano
              background:
                'repeating-conic-gradient(rgb(var(--border) / 0.06) 0% 25%, transparent 0% 50%) 50% / 16px 16px',
              minHeight: `${AREA_ALTO + 32}px`,
            }}
          >
            <div
              className="relative grid place-items-center overflow-hidden rounded-md shadow-lg ring-1 ring-black/10 transition-all duration-300 dark:ring-white/10"
              style={{
                width: `${lienzoAncho}px`,
                height: `${lienzoAlto}px`,
                // las bandas: color elegido, o negro de base bajo el desenfoque
                background: fondo === 'color' ? colorFondo : '#000',
              }}
            >
              {/* con "video borroso" las bandas se rellenan con el propio clip
                  ampliado y desenfocado; lo simula esta capa que cubre el lienzo */}
              {fondo === 'desenfoque' && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: DEGRADADO_VIDEO,
                    filter: `blur(${desenfoquePreview}px) brightness(0.72)`,
                    transform: 'scale(1.3)',
                  }}
                />
              )}

              {/* el fotograma nítido, centrado y conservando su proporción. según
                  el lienzo elegido deja o no bandas a su alrededor */}
              <div
                className="relative rounded-[3px] shadow-md"
                style={{
                  width: `${videoAncho}px`,
                  height: `${videoAlto}px`,
                  background: DEGRADADO_VIDEO,
                }}
              />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
            {resolucion.ancho} × {resolucion.alto}
          </p>
        </section>

        {/* zona de la derecha: los ajustes, con la proporción y el relleno de las
            bandas que ya funcionaban */}
        <section className="flex flex-col gap-4">
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
            <Campo etiqueta={`Desenfoque (${desenfoqueFondo})`}>
              <Deslizador valor={desenfoqueFondo} min={1} max={100} onChange={setDesenfoqueFondo} />
            </Campo>
          )}

          {fondo === 'desenfoque' && (
            <p className="-mt-2 text-xs leading-relaxed text-[color:var(--muted)]">
              Las bandas se rellenan con el propio video ampliado y desenfocado. Es lo habitual para
              colocar una toma vertical en un lienzo cuadrado o apaisado sin dejar dos franjas planas
              a los lados.
            </p>
          )}

          {fondo === 'color' && (
            <Campo etiqueta="Color de fondo">
              <ColorCampo valor={colorFondo} onChange={setColorFondo} />
            </Campo>
          )}

          <p className="text-xs leading-relaxed text-[color:var(--muted)]">
            El fondo rellena las zonas que el video no cubre cuando cambias la proporción del lienzo.
          </p>
        </section>
      </div>
    </div>
  )
}
