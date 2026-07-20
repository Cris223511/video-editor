import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Crosshair,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import Tooltip from '../../../components/ui/Tooltip'
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

// un botón de acomodo con su tooltip. apagado cuando no hay video que tocar, se
// enciende al elegir uno; el icono va centrado y la explicación sale al pasar el
// cursor por encima
function BotonEncuadre({
  etiqueta,
  descripcion,
  disabled,
  onClick,
  children,
}: {
  etiqueta: string
  descripcion: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip texto={descripcion} lado="abajo">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={etiqueta}
        className="grid h-10 w-full place-items-center rounded-lg border border-black/10 text-[color:var(--muted)] transition-colors duration-200 hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-35 dark:border-white/10"
      >
        {children}
      </button>
    </Tooltip>
  )
}

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
  // el encuadre del clip elegido se acomoda desde aquí, al estilo de las opciones
  // de alinear de un editor vectorial: sin video seleccionado los botones van
  // apagados, y con uno elegido colocan el video centrado y ajustado al lienzo
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const clips = useEditorStore((s) => s.pista.clips)
  const actualizarEncuadre = useEditorStore((s) => s.actualizarEncuadre)
  const resetEncuadre = useEditorStore((s) => s.resetEncuadre)
  const medios = useProjectStore((s) => s.medios)

  const clip = clips.find((c) => c.id === clipSeleccionado) ?? null
  const asset = clip ? medios.find((m) => m.id === clip.assetId) ?? null : null
  const hayVideo = !!clip && !!asset

  // alinear y distribuir operan sobre las capas marcadas (imágenes, textos,
  // figuras). los botones se apagan sin selección, y distribuir pide tres o más
  const capasSeleccionadas = useEditorStore((s) => s.capasSeleccionadas)
  const alinearCapas = useEditorStore((s) => s.alinearCapas)
  const distribuirCapas = useEditorStore((s) => s.distribuirCapas)
  const nSel = capasSeleccionadas.length

  // el factor con el que el video cabe "contenido" en el lienzo actual. de ahí
  // salen las escalas de cada ajuste: al ancho, al alto o llenando del todo
  function encuadrar(modo: 'ancho' | 'alto' | 'llenar') {
    if (!clip || !asset) return
    const base = Math.min(resolucion.ancho / asset.ancho, resolucion.alto / asset.alto)
    const dw = asset.ancho * base
    const dh = asset.alto * base
    let escala = 1
    if (modo === 'ancho') escala = resolucion.ancho / dw
    else if (modo === 'alto') escala = resolucion.alto / dh
    else escala = Math.max(resolucion.ancho / dw, resolucion.alto / dh)
    actualizarEncuadre(clip.id, { x: 0.5, y: 0.5, escala })
  }

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

          {/* acomodo del video dentro del lienzo. como en un editor vectorial, los
              botones se apagan si no hay ningún video elegido y se encienden al
              seleccionar uno en el visor o en la línea de tiempo */}
          <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <span className="text-xs font-medium text-[color:var(--muted)]">Acomodar el video</span>
            <div className="grid grid-cols-4 gap-2">
              <BotonEncuadre
                etiqueta="Centrar"
                descripcion="Vuelve el video al centro, a su tamaño natural"
                disabled={!hayVideo}
                onClick={() => clip && resetEncuadre(clip.id)}
              >
                <Crosshair size={17} />
              </BotonEncuadre>
              <BotonEncuadre
                etiqueta="Ajustar al ancho"
                descripcion="Estira el video hasta tocar los bordes izquierdo y derecho"
                disabled={!hayVideo}
                onClick={() => encuadrar('ancho')}
              >
                <MoveHorizontal size={17} />
              </BotonEncuadre>
              <BotonEncuadre
                etiqueta="Ajustar al alto"
                descripcion="Estira el video hasta tocar los bordes de arriba y abajo"
                disabled={!hayVideo}
                onClick={() => encuadrar('alto')}
              >
                <MoveVertical size={17} />
              </BotonEncuadre>
              <BotonEncuadre
                etiqueta="Llenar el lienzo"
                descripcion="Agranda el video hasta cubrir todo el lienzo, recortando lo que sobre"
                disabled={!hayVideo}
                onClick={() => encuadrar('llenar')}
              >
                <Maximize2 size={17} />
              </BotonEncuadre>
            </div>
            {!hayVideo && (
              <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
                Selecciona un video en el visor o en la línea de tiempo para acomodarlo.
              </p>
            )}
          </div>

          {/* alinear y distribuir las capas del lienzo (imágenes, textos,
              figuras), al estilo de un editor vectorial. con shift y clic en el
              visor se marcan varias; sin ninguna marcada los botones van apagados */}
          <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <span className="text-xs font-medium text-[color:var(--muted)]">Alinear objetos</span>
            <div className="grid grid-cols-6 gap-2">
              <BotonEncuadre etiqueta="Alinear a la izquierda" descripcion="Pega los objetos al borde izquierdo del lienzo" disabled={nSel === 0} onClick={() => alinearCapas('izquierda')}>
                <AlignStartVertical size={16} />
              </BotonEncuadre>
              <BotonEncuadre etiqueta="Centrar en horizontal" descripcion="Lleva los objetos al centro, de lado a lado" disabled={nSel === 0} onClick={() => alinearCapas('centro-h')}>
                <AlignCenterVertical size={16} />
              </BotonEncuadre>
              <BotonEncuadre etiqueta="Alinear a la derecha" descripcion="Pega los objetos al borde derecho del lienzo" disabled={nSel === 0} onClick={() => alinearCapas('derecha')}>
                <AlignEndVertical size={16} />
              </BotonEncuadre>
              <BotonEncuadre etiqueta="Alinear arriba" descripcion="Pega los objetos al borde de arriba del lienzo" disabled={nSel === 0} onClick={() => alinearCapas('arriba')}>
                <AlignStartHorizontal size={16} />
              </BotonEncuadre>
              <BotonEncuadre etiqueta="Centrar en vertical" descripcion="Lleva los objetos al centro, de arriba a abajo" disabled={nSel === 0} onClick={() => alinearCapas('centro-v')}>
                <AlignCenterHorizontal size={16} />
              </BotonEncuadre>
              <BotonEncuadre etiqueta="Alinear abajo" descripcion="Pega los objetos al borde de abajo del lienzo" disabled={nSel === 0} onClick={() => alinearCapas('abajo')}>
                <AlignEndHorizontal size={16} />
              </BotonEncuadre>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <BotonEncuadre etiqueta="Distribuir en horizontal" descripcion="Reparte el espacio entre los objetos, de lado a lado (hacen falta tres o más)" disabled={nSel < 3} onClick={() => distribuirCapas('horizontal')}>
                <AlignHorizontalDistributeCenter size={16} />
              </BotonEncuadre>
              <BotonEncuadre etiqueta="Distribuir en vertical" descripcion="Reparte el espacio entre los objetos, de arriba a abajo (hacen falta tres o más)" disabled={nSel < 3} onClick={() => distribuirCapas('vertical')}>
                <AlignVerticalDistributeCenter size={16} />
              </BotonEncuadre>
            </div>
            {nSel === 0 && (
              <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
                Marca una o varias capas en el visor (con Shift y clic para varias) para alinearlas.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
