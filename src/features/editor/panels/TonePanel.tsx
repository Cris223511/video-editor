import { useState } from 'react'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { AjusteTono } from '../../../types/timeline'
import { CapaImagen } from '../../../types/layers'
import { tonoNeutro } from '../../../lib/color/tono'
import { Campo, Deslizador } from '../../../components/ui/Controls'
import RuedaColor from '../../../components/ui/RuedaColor'
import EditorCurva from '../../../components/ui/EditorCurva'
import PresetsColor from './PresetsColor'
import { useProjectStore } from '../../../store/useProjectStore'
import { useFrameEnTiempo } from '../../../lib/media/useFrameEnTiempo'
import { PuntoRueda, RUEDAS_NEUTRAS, Ruedas } from '../../../lib/color/ruedas'
import { Curvas, CURVAS_NEUTRAS, PuntoCurva } from '../../../lib/color/curvas'

const CANALES: { campo: keyof Curvas; etiqueta: string; color: string }[] = [
  { campo: 'maestra', etiqueta: 'Curva de luz', color: '#8ea4c4' },
  { campo: 'r', etiqueta: 'Curva de rojo', color: '#ff5a5a' },
  { campo: 'g', etiqueta: 'Curva de verde', color: '#3ddc84' },
  { campo: 'b', etiqueta: 'Curva de azul', color: '#4c8dff' },
]

const ZONAS: { campo: keyof Ruedas; etiqueta: string }[] = [
  { campo: 'sombras', etiqueta: 'Sombras' },
  { campo: 'medios', etiqueta: 'Medios' },
  { campo: 'altas', etiqueta: 'Luces' },
]

// solo los ajustes numéricos; ruedas, curvas y el tinte rápido tienen sus propios
// controles y no van en los deslizadores de rango
type CampoNumerico = Exclude<keyof AjusteTono, 'ruedas' | 'curvas' | 'tinteColor' | 'tinteFuerza'>

// colores del tinte rápido: un puñado bien elegido para dar un baño de color de un
// clic. son los tonos que más se piden (un rosado, un dorado, un verde de campo...)
// sin llenar el panel de opciones. cualquier otro se puede lograr a mano con las ruedas
const TINTES: { color: string; nombre: string }[] = [
  { color: '#ff5fa2', nombre: 'Rosa' },
  { color: '#ff5a5a', nombre: 'Rojo' },
  { color: '#ff9f43', nombre: 'Naranja' },
  { color: '#ffd54a', nombre: 'Amarillo' },
  { color: '#46c46a', nombre: 'Verde' },
  { color: '#2ec5c5', nombre: 'Turquesa' },
  { color: '#4c8dff', nombre: 'Azul' },
  { color: '#9b6bff', nombre: 'Violeta' },
  { color: '#d661d6', nombre: 'Magenta' },
]

// fuerza con la que arranca un tinte recién elegido: se nota el color sin tapar la
// imagen. desde ahí el deslizador lo sube o lo baja
const FUERZA_TINTE_INICIAL = 45

const CONTROLES: { campo: CampoNumerico; etiqueta: string }[] = [
  { campo: 'exposicion', etiqueta: 'Exposición' },
  { campo: 'contraste', etiqueta: 'Contraste' },
  { campo: 'saturacion', etiqueta: 'Saturación' },
  { campo: 'temperatura', etiqueta: 'Temperatura' },
  { campo: 'tinte', etiqueta: 'Tinte' },
  // la nitidez también se ajusta desde aquí: negativa ablanda, positiva afila
  { campo: 'nitidez', etiqueta: 'Nitidez' },
]

// panel de tono, al estilo Lumetri. corrige el color tanto de un clip de video
// como de una capa de imagen; los ajustes se ven en vivo en el visor sin perder
// fluidez. el texto y los trazos no llevan color, así que no entran aquí
export default function TonePanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const playhead = useEditorStore((s) => s.playhead)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const setTono = useEditorStore((s) => s.setTono)
  const resetTono = useEditorStore((s) => s.resetTono)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const medios = useProjectStore((s) => s.medios)
  // canal de curva que se está editando. las cuatro curvas ya no se apilan: se elige
  // una con las pestañas y se muestra solo esa. vive aquí arriba, con el resto de los
  // hooks, porque más abajo hay un return temprano cuando no hay nada seleccionado y
  // un hook después de ese return rompería las reglas de los hooks al deseleccionar
  const [curvaActiva, setCurvaActiva] = useState<keyof Curvas>('maestra')

  const clip = clips.find((c) => c.id === clipSeleccionado)
  const capaImagen = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'imagen') as
    | CapaImagen
    | undefined

  // el tono con el que se trabaja sale del clip o de la imagen, lo que esté
  // elegido. una imagen sin tocar aún no guarda tono, así que se parte del neutro
  const tono: AjusteTono | null = clip ? clip.tono : capaImagen ? capaImagen.tono ?? tonoNeutro : null

  // el medio del clip, su video y el segundo del archivo que se ve ahora en el visor
  // (contando su punto de entrada y su velocidad). se calculan aquí arriba, antes del
  // return de abajo, porque el hook que captura el fotograma no puede ir tras un
  // return condicional. ese fotograma es el fondo de las muestras, para que la
  // reproducción del hover continúe desde el mismo frame que se está viendo
  const medioClip = clip ? medios.find((m) => m.id === clip.assetId) : undefined
  const videoUrl = medioClip?.clase === 'video' ? medioClip.url : undefined
  const tiempoFrame = clip ? Math.max(0, clip.recorteInicio + (playhead - clip.inicio) * clip.velocidad) : 0
  const frameActual = useFrameEnTiempo(videoUrl, tiempoFrame)

  if (!tono) {
    return (
      <SinSeleccion icono="tono" titulo="Nada que corregir">
        Pulsa un clip en la línea de tiempo o una imagen en el visor para corregir su color con las
        ruedas y las curvas.
      </SinSeleccion>
    )
  }

  // aplica los cambios de tono a lo que esté seleccionado. la imagen guarda su
  // tono como un campo más de la capa; el clip usa su propia acción del store
  function aplicar(cambios: Partial<AjusteTono>) {
    if (clip) setTono(clip.id, cambios)
    else if (capaImagen) actualizarCapa(capaImagen.id, { tono: { ...(capaImagen.tono ?? tonoNeutro), ...cambios } })
  }

  function restablecerTono() {
    if (clip) resetTono(clip.id)
    else if (capaImagen) actualizarCapa(capaImagen.id, { tono: { ...tonoNeutro } })
  }

  const ruedas = tono.ruedas ?? RUEDAS_NEUTRAS
  const curvas = tono.curvas ?? CURVAS_NEUTRAS
  const canalActivo = CANALES.find((c) => c.campo === curvaActiva) ?? CANALES[0]
  // "hay tinte puesto" se mide por si HAY un color elegido, no por su fuerza: así, al bajar la
  // fuerza a 0, el tinte sigue seleccionado y su control se queda a la vista (solo apaga el
  // efecto). únicamente el botón "Quitar" o volver a pulsar el color lo saca del todo. antes se
  // usaba usaTinte (fuerza > 0) y por eso al llegar a 0 el control desaparecía y se perdía el color
  const tintePuesto = !!tono.tinteColor

  function cambiarRueda(zona: keyof Ruedas, p: PuntoRueda) {
    aplicar({ ruedas: { ...ruedas, [zona]: p } })
  }

  // devuelve las tres ruedas al centro sin tocar el resto de la corrección, con
  // copias frescas de cada punto para no compartir referencia con la constante
  function restablecerRuedas() {
    aplicar({
      ruedas: {
        sombras: { ...RUEDAS_NEUTRAS.sombras },
        medios: { ...RUEDAS_NEUTRAS.medios },
        altas: { ...RUEDAS_NEUTRAS.altas },
      },
    })
  }

  function cambiarCurva(c: keyof Curvas, p: PuntoCurva[]) {
    aplicar({ curvas: { ...curvas, [c]: p } })
  }

  // devuelve solo las cuatro curvas a la diagonal, con copias frescas de cada
  // punto para no compartir referencia con la constante neutra. el resto de la
  // corrección de color (exposición, contraste, ruedas...) queda intacto
  function restablecerCurvas() {
    aplicar({
      curvas: {
        maestra: CURVAS_NEUTRAS.maestra.map((p) => ({ ...p })),
        r: CURVAS_NEUTRAS.r.map((p) => ({ ...p })),
        g: CURVAS_NEUTRAS.g.map((p) => ({ ...p })),
        b: CURVAS_NEUTRAS.b.map((p) => ({ ...p })),
      },
    })
  }

  // fondo de las muestras: para un video, el fotograma que se ve ahora en el visor, de
  // modo que al pasar el cursor la reproducción continúe desde ese mismo frame sin dar
  // un salto. mientras se captura no se enseña ninguna miniatura vieja (marcado con
  // cargando, que pinta un fondo neutro). para una imagen, la propia imagen
  const miniatura = videoUrl ? frameActual : clip ? medioClip?.miniatura : capaImagen?.src
  const cargandoFrame = !!videoUrl && !frameActual

  return (
    <div className="flex flex-col gap-4">
      {/* 1) Tinte rápido: el baño de color de un clic va primero, que es lo más usado */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Tinte rápido</span>
          {tintePuesto && (
            <button
              onClick={() => aplicar({ tinteColor: undefined, tinteFuerza: 0 })}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
            >
              <Icon name="restablecer" size={14} /> Quitar
            </button>
          )}
        </div>
        {/* un baño de color de un clic: al elegir un tono se vira toda la imagen hacia
            él sin oscurecerla, y volver a pulsarlo lo saca. la fuerza se afina abajo */}
        <div className="flex flex-wrap gap-2">
          {TINTES.map((sw) => {
            const activo = tintePuesto && tono.tinteColor?.toLowerCase() === sw.color.toLowerCase()
            return (
              <button
                key={sw.color}
                title={sw.nombre}
                onClick={() =>
                  aplicar(
                    activo
                      ? { tinteColor: undefined, tinteFuerza: 0 }
                      : { tinteColor: sw.color, tinteFuerza: (tono.tinteFuerza ?? 0) > 0 ? tono.tinteFuerza : FUERZA_TINTE_INICIAL },
                  )
                }
                className={[
                  'h-7 w-7 rounded-full border transition-all',
                  activo
                    ? 'border-white ring-2 ring-brand ring-offset-1 ring-offset-[color:var(--panel)]'
                    : 'border-black/15 hover:scale-110 dark:border-white/15',
                ].join(' ')}
                style={{ background: sw.color }}
              />
            )
          })}
        </div>
        {/* el deslizador aparece con solo tener un color elegido, aunque la fuerza esté en 0:
            así bajarla a cero no lo hace desaparecer ni pierde el color, solo apaga el efecto */}
        {tintePuesto && (
          <div className="mt-3">
            <Campo etiqueta={`Fuerza (${tono.tinteFuerza ?? 0})`}>
              <Deslizador
                valor={tono.tinteFuerza ?? 0}
                min={0}
                max={100}
                onChange={(v) => aplicar({ tinteFuerza: v })}
              />
            </Campo>
          </div>
        )}
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      {/* 2) Estilos de color (presets) */}
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Estilos de color</span>
        </div>
        {/* un preset solo rellena los ajustes de abajo, así que después se puede
            seguir afinando a mano sin perder nada */}
        <PresetsColor tono={tono} miniatura={miniatura} videoUrl={videoUrl} tiempo={tiempoFrame} cargando={cargandoFrame} onAplicar={(t) => aplicar(t)} />
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      {/* 3) Ruedas de color */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Ruedas de color</span>
          <button
            onClick={restablecerRuedas}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
          >
            <Icon name="restablecer" size={14} /> Restablecer ruedas
          </button>
        </div>
        {/* las tres ruedas se reparten a lo ancho; si el panel se estrecha y ya no
            caben, saltan de línea y quedan centradas en vez de aplastarse unas
            contra otras */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-3">
          {ZONAS.map((z) => (
            <RuedaColor
              key={z.campo}
              etiqueta={z.etiqueta}
              valor={ruedas[z.campo]}
              onChange={(p) => cambiarRueda(z.campo, p)}
              diametro={78}
            />
          ))}
        </div>
        <p className="mt-2 text-[13px] italic leading-relaxed text-[color:var(--muted)]">
          Arrastra hacia el color que quieras dar a cada zona. Con <b>Shift</b> el movimiento se
          afina, y con <b>doble clic</b> la rueda vuelve al centro.
        </p>
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      {/* 4) los ajustes numéricos (exposición, contraste, saturación, temperatura, nitidez) */}
      {CONTROLES.map((c) => {
        // la nitidez es opcional en los proyectos viejos, así que se cae a 0 si no está
        const valor = tono[c.campo] ?? 0
        return (
          <Campo key={c.campo} etiqueta={`${c.etiqueta} (${valor})`}>
            <Deslizador
              valor={valor}
              min={-100}
              max={100}
              onChange={(v) => aplicar({ [c.campo]: v } as Partial<AjusteTono>)}
            />
          </Campo>
        )
      })}

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      {/* 5) las curvas, al final */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Curvas</span>
          <button
            onClick={restablecerCurvas}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
          >
            <Icon name="restablecer" size={14} /> Restablecer curvas
          </button>
        </div>
        {/* una pestaña por canal; se edita solo la curva elegida. cada pestaña lleva
            su punto de color y la activa se resalta, así se sabe de un vistazo cuál
            se está tocando sin apilar los cuatro editores */}
        <div className="mb-2 flex gap-1.5">
          {CANALES.map((c) => {
            const sel = c.campo === curvaActiva
            return (
              <button
                key={c.campo}
                onClick={() => setCurvaActiva(c.campo)}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors',
                  sel ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:text-brand',
                ].join(' ')}
                style={sel ? undefined : { background: 'rgb(var(--border) / 0.1)' }}
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {c.etiqueta.replace('Curva de ', '')}
              </button>
            )
          })}
        </div>
        <EditorCurva
          puntos={curvas[curvaActiva]}
          color={canalActivo.color}
          onChange={(p) => cambiarCurva(curvaActiva, p)}
        />
        <p className="mt-2 text-[13px] italic leading-relaxed text-[color:var(--muted)]">
          Haz clic para añadir un punto, arrástralo para doblar la curva y dale{' '}
          <b>doble clic</b> para quitarlo.
        </p>
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />

      <button
        onClick={restablecerTono}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
      >
        <Icon name="ajustes" size={16} /> Restablecer tono
      </button>
    </div>
  )
}
