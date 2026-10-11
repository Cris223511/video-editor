import { useEffect, useRef, useState } from 'react'
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
  Link,
  Link2Off,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  RotateCw,
} from 'lucide-react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { encuadreParaRecorte } from '../../../lib/timeline/encuadre'
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

// topes del tamaño del lienzo, en píxeles por lado. ni tan chico que no se vea nada ni tan
// grande que el navegador se ahogue componiendo; 4K de lado como techo va sobrado
const LIENZO_MIN = 240
const LIENZO_MAX = 3840

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
  const fondoGiro = useEditorStore((s) => s.fondoGiro)
  const setFondoGiro = useEditorStore((s) => s.setFondoGiro)
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

  const bloquesSeleccionados = useEditorStore((s) => s.bloquesSeleccionados)
  const clip = clips.find((c) => c.id === clipSeleccionado) ?? null
  // los videos sobre los que actúan los botones de acomodo: el elegido, o todos los marcados a la
  // vez. sin ninguno, la sección entera no se muestra para no confundir
  const idsVideoSel = new Set<string>([
    ...(clipSeleccionado ? [clipSeleccionado] : []),
    ...bloquesSeleccionados.filter((id) => clips.some((c) => c.id === id)),
  ])
  const objetivosVideo = clips.filter((c) => idsVideoSel.has(c.id))
  const hayVideo = objetivosVideo.length > 0

  // alinear y distribuir operan sobre las capas marcadas (imágenes, textos,
  // figuras). los botones se apagan sin selección, y distribuir pide tres o más
  const capasSeleccionadas = useEditorStore((s) => s.capasSeleccionadas)
  const alinearCapas = useEditorStore((s) => s.alinearCapas)
  const distribuirCapas = useEditorStore((s) => s.distribuirCapas)
  const nSel = capasSeleccionadas.length

  // acomoda cada video elegido dentro del lienzo actual. el tamaño que cuenta es el de su zona ya
  // recortada, que para mí es el video real
  function encuadrar(modo: 'ancho' | 'alto' | 'llenar') {
    for (const c of objetivosVideo) {
      const med = medios.find((m) => m.id === c.assetId)
      if (!med) continue
      const rec = c.recorte
      const visW = Math.max(0.02, 1 - (rec?.izq ?? 0) - (rec?.der ?? 0))
      const visH = Math.max(0.02, 1 - (rec?.arr ?? 0) - (rec?.aba ?? 0))
      const base = Math.min(resolucion.ancho / med.ancho, resolucion.alto / med.alto)
      const w1 = visW * med.ancho * base
      const h1 = visH * med.alto * base
      let escala = 1
      if (modo === 'ancho') escala = resolucion.ancho / w1
      else if (modo === 'alto') escala = resolucion.alto / h1
      else escala = Math.max(resolucion.ancho / w1, resolucion.alto / h1)
      // el centro del recorte va al centro del lienzo con la escala pedida
      const ox = ((rec?.izq ?? 0) - (rec?.der ?? 0)) / 2
      const oy = ((rec?.arr ?? 0) - (rec?.aba ?? 0)) / 2
      actualizarEncuadre(c.id, {
        x: 0.5 - (ox * med.ancho * base * escala) / resolucion.ancho,
        y: 0.5 - (oy * med.alto * base * escala) / resolucion.alto,
        escala,
      })
    }
  }

  // el candado del tamaño manual: cerrado, ancho y alto se mueven juntos conservando la
  // proporción; abierto, cada uno va por su lado. arranca cerrado, que es lo habitual
  const [proporcionBloqueada, setProporcionBloqueada] = useState(true)

  // los campos de ancho y alto llevan su propio texto para poder escribir con libertad (incluso
  // valores a medio teclear que aún no son válidos) sin que el lienzo salte a cada tecla. lo que
  // se aplica en vivo es el número cuando ya cae dentro de los topes. si el lienzo cambia por otro
  // lado (un preset, un botón), estos efectos ponen los campos al día
  const [anchoStr, setAnchoStr] = useState(String(resolucion.ancho))
  const [altoStr, setAltoStr] = useState(String(resolucion.alto))
  useEffect(() => setAnchoStr(String(resolucion.ancho)), [resolucion.ancho])
  useEffect(() => setAltoStr(String(resolucion.alto)), [resolucion.alto])

  // cambia el lienzo y vuelve a acoplar el PRIMER video: toma su zona recortada como si fuera el
  // video entero y la agranda lo más posible dentro de la nueva forma, centrada y sin cortar nada.
  // solo el primer video, el resto de clips se queda como estaba. si está girado, se deja el
  // acomodo que ya hace el store, porque el giro cambia qué lado es cuál
  function ponerLienzo(ancho: number, alto: number) {
    setLienzo(ancho, alto)
    const primero = [...useEditorStore.getState().pista.clips].sort((a, b) => a.inicio - b.inicio)[0]
    if (!primero) return
    const rot = primero.encuadre?.rotacion ?? 0
    if (rot % 360 !== 0) return
    const med = medios.find((m) => m.id === primero.assetId)
    if (!med) return
    actualizarEncuadre(primero.id, encuadreParaRecorte(med, primero.recorte, ancho, alto, 'contener'))
  }

  // fija el lienzo acotando cada lado a los topes, para que nunca quede infinito ni invisible
  function fijarTamano(ancho: number, alto: number) {
    const a = Math.round(Math.max(LIENZO_MIN, Math.min(LIENZO_MAX, ancho)))
    const b = Math.round(Math.max(LIENZO_MIN, Math.min(LIENZO_MAX, alto)))
    ponerLienzo(a, b)
  }

  // la rueda del ratón sobre un campo de medida lo sube o lo baja de 10 en 10 (de 1 en 1 con
  // Shift) aunque el campo no tenga el foco. se engancha de forma nativa y no pasiva porque hay
  // que impedir que la rueda desplace el panel mientras se ajusta
  const refAncho = useRef<HTMLInputElement>(null)
  const refAlto = useRef<HTMLInputElement>(null)
  const vivo = useRef({ cambiarAncho: (_v: number) => {}, cambiarAlto: (_v: number) => {}, ancho: 0, alto: 0 })
  useEffect(() => {
    const enganchar = (el: HTMLInputElement | null, cual: 'ancho' | 'alto') => {
      if (!el) return () => {}
      const alRodar = (ev: WheelEvent) => {
        ev.preventDefault()
        const paso = ev.shiftKey ? 1 : 10
        const dir = ev.deltaY < 0 ? 1 : -1
        const base = cual === 'ancho' ? vivo.current.ancho : vivo.current.alto
        const nuevo = Math.max(LIENZO_MIN, Math.min(LIENZO_MAX, base + dir * paso))
        if (cual === 'ancho') vivo.current.cambiarAncho(nuevo)
        else vivo.current.cambiarAlto(nuevo)
      }
      el.addEventListener('wheel', alRodar, { passive: false })
      return () => el.removeEventListener('wheel', alRodar)
    }
    const a = enganchar(refAncho.current, 'ancho')
    const b = enganchar(refAlto.current, 'alto')
    return () => {
      a()
      b()
    }
  }, [])
  function cambiarAncho(v: number) {
    if (!Number.isFinite(v) || v <= 0) return
    if (proporcionBloqueada) fijarTamano(v, v / (resolucion.ancho / resolucion.alto))
    else fijarTamano(v, resolucion.alto)
  }
  function cambiarAlto(v: number) {
    if (!Number.isFinite(v) || v <= 0) return
    if (proporcionBloqueada) fijarTamano(v * (resolucion.ancho / resolucion.alto), v)
    else fijarTamano(resolucion.ancho, v)
  }

  // se deja a la mano de la rueda lo último que hace falta, ya con el estado de este render
  vivo.current = { cambiarAncho, cambiarAlto, ancho: resolucion.ancho, alto: resolucion.alto }

  // primer clip de la pista, con su medio. es el que mandan los dos botones de ajuste al video
  const primerClip = [...clips].sort((a, b) => a.inicio - b.inicio)[0] ?? null
  const primerMedio = primerClip ? medios.find((m) => m.id === primerClip.assetId) ?? null : null

  // lleva el LIENZO a la forma del primer video RESPETANDO su recorte: si el clip está recortado a
  // un cuadrado, el lienzo queda cuadrado y solo se ve esa zona, llenándolo. sin recorte se usa el
  // ajuste automático de siempre, que además contempla el giro de un cuarto
  function ajustarLienzoAlVideo() {
    if (!primerClip || !primerMedio) return
    const rec = primerClip.recorte
    if (!rec || (rec.izq === 0 && rec.der === 0 && rec.arr === 0 && rec.aba === 0)) {
      setLienzoAuto()
      return
    }
    const visW = Math.max(0.02, 1 - rec.izq - rec.der)
    const visH = Math.max(0.02, 1 - rec.arr - rec.aba)
    const rot = primerClip.encuadre?.rotacion ?? 0
    const cuarto = Math.abs(Math.round(rot / 90)) % 2 === 1
    let W = Math.round(primerMedio.ancho * visW)
    let H = Math.round(primerMedio.alto * visH)
    if (cuarto) { const t = W; W = H; H = t }
    setLienzo(W, H)
    actualizarEncuadre(primerClip.id, encuadreParaRecorte(primerMedio, rec, W, H, 'llenar'))
  }

  // agranda el video (el elegido, o el primero) hasta cubrir el lienzo actual sin cambiar su
  // proporción, respetando su recorte: llena todo el cuadro sin dejar bandas ni huecos negros
  function llenarConVideo() {
    const objetivo = clip ?? primerClip
    const med = objetivo ? medios.find((m) => m.id === objetivo.assetId) : null
    if (!objetivo || !med) return
    actualizarEncuadre(objetivo.id, encuadreParaRecorte(med, objetivo.recorte, resolucion.ancho, resolucion.alto, 'llenar'))
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
            {/* cada opción lleva su forma dibujada a escala, para reconocer de un vistazo si es
                apaisada, vertical o cuadrada sin tener que saberse los números de memoria */}
            <div className="grid grid-cols-3 gap-2">
              {PROPORCIONES.map((p) => {
                const sel = activa(p.ancho, p.alto)
                const pr = p.ancho / p.alto
                // el rectángulo de muestra cabe en una caja de 30×30 conservando su proporción
                const w = pr >= 1 ? 30 : 30 * pr
                const h = pr >= 1 ? 30 / pr : 30
                return (
                  <button
                    key={p.etiqueta}
                    onClick={() => ponerLienzo(p.ancho, p.alto)}
                    className={[
                      'flex flex-col items-center gap-1.5 rounded-lg border py-2 transition-colors',
                      sel
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
                    ].join(' ')}
                  >
                    <span className="grid h-8 place-items-center">
                      <span
                        className={sel ? 'rounded-[2px] bg-brand' : 'rounded-[2px] bg-current opacity-60'}
                        style={{ width: `${w}px`, height: `${h}px` }}
                      />
                    </span>
                    <span className="text-[12px] font-medium leading-none">{p.etiqueta}</span>
                  </button>
                )
              })}
            </div>
          </Campo>

          {/* tamaño exacto a mano: ancho y alto en píxeles, que se aplican en vivo (también con la
              rueda del ratón sobre el campo). el candado del medio decide si al mover uno el otro lo
              sigue conservando la forma, o si van por separado */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[color:var(--muted)]">Tamaño exacto (px)</span>
              <Tooltip
                texto="El tamaño del lienzo en píxeles. Se aplica al instante, incluso girando la rueda del ratón sobre el campo. Con el candado cerrado, el ancho y el alto se mueven juntos para conservar la forma; abierto, cada uno por su lado."
                lado="arriba"
              >
                <span className="grid h-4 w-4 cursor-help place-items-center rounded-full border border-current text-[10px] font-bold leading-none text-[color:var(--muted)]">?</span>
              </Tooltip>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] text-[color:var(--muted)]">Ancho</span>
                <input
                  ref={refAncho}
                  type="number"
                  min={LIENZO_MIN}
                  max={LIENZO_MAX}
                  step={10}
                  value={anchoStr}
                  onChange={(e) => {
                    setAnchoStr(e.target.value)
                    const v = parseInt(e.target.value, 10)
                    if (Number.isFinite(v) && v >= LIENZO_MIN && v <= LIENZO_MAX) cambiarAncho(v)
                  }}
                  className="w-full rounded-lg border border-black/10 bg-transparent px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-brand dark:border-white/10"
                />
              </label>
              <Tooltip texto={proporcionBloqueada ? 'Proporción fija: ancho y alto se mueven juntos' : 'Proporción libre: cada uno por su lado'} lado="arriba">
                <button
                  type="button"
                  onClick={() => setProporcionBloqueada((v) => !v)}
                  aria-label="Bloquear o soltar la proporción"
                  aria-pressed={proporcionBloqueada}
                  className={[
                    'mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors',
                    proporcionBloqueada
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-black/10 text-[color:var(--muted)] hover:text-brand dark:border-white/10',
                  ].join(' ')}
                >
                  {proporcionBloqueada ? <Link size={15} /> : <Link2Off size={15} />}
                </button>
              </Tooltip>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-[11px] text-[color:var(--muted)]">Alto</span>
                <input
                  ref={refAlto}
                  type="number"
                  min={LIENZO_MIN}
                  max={LIENZO_MAX}
                  step={10}
                  value={altoStr}
                  onChange={(e) => {
                    setAltoStr(e.target.value)
                    const v = parseInt(e.target.value, 10)
                    if (Number.isFinite(v) && v >= LIENZO_MIN && v <= LIENZO_MAX) cambiarAlto(v)
                  }}
                  className="w-full rounded-lg border border-black/10 bg-transparent px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-brand dark:border-white/10"
                />
              </label>
            </div>
            <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
              Entre {LIENZO_MIN} y {LIENZO_MAX} px por lado.
            </p>
          </div>

          {/* ajuste al primer video, en dos opciones lado a lado: una lleva el LIENZO a la forma
              del video (sin bandas), la otra deja el lienzo como está y agranda el VIDEO hasta
              cubrirlo. se reparten a la mitad y saltan de línea si el panel se estrecha */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={ajustarLienzoAlVideo}
              disabled={!primerClip}
              className={[
                'rounded-lg border px-2 py-2 text-[13px] font-medium leading-tight transition-colors disabled:pointer-events-none disabled:opacity-40',
                !lienzoManual
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
              ].join(' ')}
            >
              Lienzo al primer video
            </button>
            <button
              onClick={llenarConVideo}
              disabled={clips.length === 0}
              className="rounded-lg border border-black/10 px-2 py-2 text-[13px] font-medium leading-tight text-[color:var(--muted)] transition-colors hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40 dark:border-white/10"
            >
              El video llena el lienzo
            </button>
          </div>

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
              <Deslizador valor={desenfoqueFondo} min={0} max={100} onChange={setDesenfoqueFondo} />
            </Campo>
          )}

          {fondo === 'desenfoque' && (
            <Campo etiqueta="Girar el fondo">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFondoGiro(fondoGiro - 90)}
                  className="grid h-9 flex-1 place-items-center rounded-lg border border-black/10 text-[color:var(--muted)] transition-colors hover:border-brand hover:text-brand dark:border-white/10"
                  title="Girar el fondo un cuarto a la izquierda"
                >
                  <RotateCcw size={16} />
                </button>
                <span className="w-12 text-center text-[13px] font-semibold tabular-nums">{fondoGiro}°</span>
                <button
                  type="button"
                  onClick={() => setFondoGiro(fondoGiro + 90)}
                  className="grid h-9 flex-1 place-items-center rounded-lg border border-black/10 text-[color:var(--muted)] transition-colors hover:border-brand hover:text-brand dark:border-white/10"
                  title="Girar el fondo un cuarto a la derecha"
                >
                  <RotateCw size={16} />
                </button>
              </div>
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
          {hayVideo && (
          <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <span className="text-xs font-medium text-[color:var(--muted)]">Acomodar el video</span>
            <div className="grid grid-cols-4 gap-2">
              <BotonEncuadre
                etiqueta="Centrar"
                descripcion="Vuelve el video al centro, a su tamaño natural"
                disabled={!hayVideo}
                onClick={() => objetivosVideo.forEach((c) => resetEncuadre(c.id))}
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
          </div>
          )}

          {/* alinear y distribuir las capas del lienzo (imágenes, textos,
              figuras), al estilo de un editor vectorial. con shift y clic en el
              visor se marcan varias; sin ninguna marcada los botones van apagados */}
          {nSel > 0 && (
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
          </div>
          )}
        </section>
      </div>
    </div>
  )
}
