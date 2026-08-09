import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useClickFuera } from '../../../lib/ui/useClickFuera'
import { ChevronUp, ChevronDown } from 'lucide-react'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
import MuestraVideo from '../../../components/ui/MuestraVideo'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import { useProjectStore } from '../../../store/useProjectStore'
import { useFrameEnTiempo } from '../../../lib/media/useFrameEnTiempo'
import { EfectoClip } from '../../../types/timeline'
import { imagenArrastreReducida } from '../../../lib/ui/arrastre'
import { useToast } from '../../../components/ui/ToastProvider'
import {
  CATEGORIAS_EFECTO,
  buscarEfecto,
  esFiltro,
  claveEfecto,
  claveCatalogo,
  crearEfecto,
  TIPO_EFECTO,
} from '../../../lib/efectos/catalogo'

// dato que viaja al arrastrar una fila para reordenarla. es distinto del que usa el
// catálogo (TIPO_EFECTO), así que soltar una fila sobre otra reordena, y soltar una
// muestra del catálogo reemplaza, sin que se confundan
const TIPO_ORDEN_EFECTO = 'application/x-ve-orden-efecto'

// nombre visible de un efecto ya puesto, para la etiqueta de su fila
function nombreEfecto(e: EfectoClip): string {
  if (e.tipo === 'nitidez-brillo') return e.variante === 'resplandor' ? 'Resplandor' : 'Nítido y brilloso'
  if (e.tipo === 'gopro') return 'Cámara de acción'
  if (e.tipo === 'cromatico') return 'Cromático'
  if (e.tipo === 'animado') return buscarEfecto(e.animado)?.nombre ?? 'Efecto animado'
  if (esFiltro(e)) return buscarEfecto(e.filtro)?.nombre ?? 'Efecto'
  return 'Desenfoque de movimiento'
}

// panel de efectos del clip. arriba el catálogo para elegir; abajo los efectos ya
// puestos, en filas apiladas como capas. clicar una muestra reemplaza el efecto que
// esté seleccionado en vez de sumar otro; para agregar uno nuevo se usa el botón «+»
// o se arrastra la muestra al clip en la línea de tiempo
export default function EffectsPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const bloquesSeleccionados = useEditorStore((s) => s.bloquesSeleccionados)
  const playhead = useEditorStore((s) => s.playhead)
  const agregarEfecto = useEditorStore((s) => s.agregarEfecto)
  const actualizarEfecto = useEditorStore((s) => s.actualizarEfecto)
  const quitarEfecto = useEditorStore((s) => s.quitarEfecto)
  const reordenarEfecto = useEditorStore((s) => s.reordenarEfecto)
  const moverEfectoA = useEditorStore((s) => s.moverEfectoA)
  const reemplazarEfecto = useEditorStore((s) => s.reemplazarEfecto)
  const setTransicionEfecto = useEditorStore((s) => s.setTransicionEfecto)

  const medios = useProjectStore((s) => s.medios)
  // clip "líder" que muestra el panel: el seleccionado, o si solo hay un recuadro de varios (sin
  // uno activo), el primero del conjunto. así al marcar varios clips el panel sigue enseñando
  // opciones. cualquier efecto que se toque aquí lo aplica el store a TODO el conjunto
  const clipsConjunto = bloquesSeleccionados.filter((id) => clips.some((c) => c.id === id))
  const liderId =
    clipSeleccionado && clips.some((c) => c.id === clipSeleccionado) ? clipSeleccionado : clipsConjunto[0]
  const clip = clips.find((c) => c.id === liderId)
  const aplicaAVarios = clipsConjunto.length > 1 && !!liderId && clipsConjunto.includes(liderId)
  const medioClip = clip ? medios.find((m) => m.id === clip.assetId) : undefined
  // el video del clip, para reproducir la muestra al pasar el cursor. solo si el
  // medio es de video; una imagen no tiene qué reproducir
  const videoUrl = medioClip?.clase === 'video' ? medioClip.url : undefined
  // segundo del archivo que se está viendo en el visor, para que las muestras arranquen en ese
  // mismo frame. NO se recaptura mientras se REPRODUCE: si el instante siguiera al cabezal en
  // marcha, la muestra estática parecería animarse sola. se congela en reproducción y solo se pone
  // al día en pausa (o al arrastrar el cabezal, que también es pausa)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const tiempoVivo = clip ? Math.max(0, clip.recorteInicio + (playhead - clip.inicio) * clip.velocidad) : 0
  const tiempoRef = useRef(tiempoVivo)
  if (!reproduciendo) tiempoRef.current = tiempoVivo
  const tiempoFrame = tiempoRef.current
  // fotograma actual del visor, para que la muestra estática enseñe ese mismo frame y
  // el hover continúe desde ahí sin dar un salto. mientras se captura, la miniatura
  // del medio sirve de respaldo
  const frameActual = useFrameEnTiempo(videoUrl, tiempoFrame)
  // para un video, el fotograma del visor; mientras se captura no se enseña miniatura
  // vieja (cargandoFrame pinta un fondo neutro). para lo que no es video, su miniatura
  const miniatura = videoUrl ? frameActual : medioClip?.miniatura
  const cargandoFrame = !!videoUrl && !frameActual

  // qué fila tiene abierto su panel de ajustes. solo una a la vez, para no llenar
  // todo de mandos flotantes
  const [ajustesDe, setAjustesDe] = useState<string | null>(null)
  // efecto «seleccionado»: es el que reemplaza un clic en el catálogo. por defecto se
  // toma el último de la lista
  const [activoId, setActivoId] = useState<string | null>(null)
  // cuando está encendido, la próxima muestra que se elija entra como efecto nuevo en
  // vez de reemplazar al seleccionado. lo prende el botón «+»
  const [modoAgregar, setModoAgregar] = useState(false)
  // arrastre de reordenar filas: la que se está moviendo, sobre cuál está el cursor y
  // de qué lado (antes o después), para pintar la línea celeste de inserción
  const [arrastreOrden, setArrastreOrden] = useState<{
    id: string
    sobre: string
    lado: 'antes' | 'despues'
  } | null>(null)

  if (!clip) {
    return (
      <SinSeleccion icono="efectos" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para aplicarle efectos como el desenfoque de movimiento.
      </SinSeleccion>
    )
  }

  const efectos = clip.efectos ?? []
  const puestos = new Set(efectos.map(claveEfecto))
  // el efecto que un clic en el catálogo va a reemplazar: el seleccionado, o el
  // último si el seleccionado ya no existe
  const objetivo = efectos.find((e) => e.id === activoId) ?? efectos[efectos.length - 1]
  const objetivoClave = objetivo ? claveEfecto(objetivo) : null

  // qué hace un clic en una muestra del catálogo, según el estado:
  // - en modo agregar (o con la lista vacía) crea un efecto nuevo
  // - si se pulsa el efecto que ya es el seleccionado, lo quita (desmarca)
  // - si se pulsa uno que ya está en otra fila, se pasa a seleccionar esa
  // - en el caso normal, reemplaza el efecto seleccionado por el elegido, en su sitio
  function elegir(id: string) {
    if (!clip) return
    const clave = claveCatalogo(id)

    if (modoAgregar || efectos.length === 0) {
      setModoAgregar(false)
      if (puestos.has(clave)) {
        const ya = efectos.find((e) => claveEfecto(e) === clave)
        if (ya) setActivoId(ya.id)
        return
      }
      const nuevo = crearEfecto(id)
      agregarEfecto(clip.id, nuevo)
      setActivoId(nuevo.id)
      return
    }

    if (!objetivo) return

    if (claveEfecto(objetivo) === clave) {
      quitarEfecto(clip.id, objetivo.id)
      if (ajustesDe === objetivo.id) setAjustesDe(null)
      setActivoId(null)
      return
    }

    if (puestos.has(clave)) {
      const ya = efectos.find((e) => claveEfecto(e) === clave)
      if (ya) setActivoId(ya.id)
      return
    }

    reemplazarEfecto(clip.id, objetivo.id, { ...crearEfecto(id), id: objetivo.id })
    setActivoId(objetivo.id)
  }

  // suelta el reorden por arrastre: se calcula la posición destino entre las demás
  // filas (todas menos la que se arrastra) según sobre cuál se soltó y de qué lado
  function soltarOrden() {
    if (!clip || !arrastreOrden) return
    const ids = efectos.map((e) => e.id).filter((id) => id !== arrastreOrden.id)
    let pos = ids.indexOf(arrastreOrden.sobre)
    if (pos < 0) {
      setArrastreOrden(null)
      return
    }
    if (arrastreOrden.lado === 'despues') pos += 1
    moverEfectoA(clip.id, arrastreOrden.id, pos)
    setArrastreOrden(null)
  }

  // reemplazo por arrastre: al soltar una muestra sobre una fila, esa fila cambia su
  // efecto por el arrastrado, sin moverse de sitio y sin crear duplicados
  function reemplazarPorArrastre(rowId: string, id: string) {
    if (!clip) return
    const fila = efectos.find((e) => e.id === rowId)
    if (!fila) return
    const clave = claveCatalogo(id)
    if (claveEfecto(fila) === clave || puestos.has(clave)) return
    reemplazarEfecto(clip.id, rowId, { ...crearEfecto(id), id: rowId })
    setActivoId(rowId)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* aviso de que hay varios clips marcados: lo que se toque aquí cae sobre todos ellos */}
      {aplicaAVarios && (
        <div className="rounded-lg bg-brand/10 px-2.5 py-1.5 text-[11px] font-medium text-brand">
          Se aplica a los {clipsConjunto.length} clips seleccionados.
        </div>
      )}
      {/* catálogo arriba: de aquí se eligen los efectos */}
      <Catalogo
        miniatura={miniatura}
        videoUrl={videoUrl}
        tiempo={tiempoFrame}
        cargando={cargandoFrame}
        puestos={puestos}
        objetivoClave={objetivoClave}
        modoAgregar={modoAgregar}
        onCancelarAgregar={() => setModoAgregar(false)}
        onElegir={elegir}
      />

      {/* efectos aplicados, en filas apiladas como capas. el de más arriba es el
          nivel 1 */}
      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[color:var(--muted)]">Efectos aplicados</span>
          {efectos.length > 0 && (
            <Tooltip texto="Añadir otro efecto" lado="arriba">
              <button
                onClick={() => {
                  setModoAgregar(true)
                  setAjustesDe(null)
                }}
                aria-label="Añadir otro efecto"
                aria-pressed={modoAgregar}
                className={[
                  'interactivo grid h-6 w-6 place-items-center rounded-md transition-colors',
                  modoAgregar ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
                ].join(' ')}
              >
                <Icon name="mas" size={15} />
              </button>
            </Tooltip>
          )}
        </div>
        {efectos.length === 0 ? (
          <p className="text-[13px] italic leading-relaxed text-[color:var(--muted)]">
            Todavía no hay efectos. Elige uno del catálogo de arriba y aparecerá aquí como una capa
            que puedes regular, mover o quitar.
          </p>
        ) : (
          <div className="relative flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {efectos.map((e, i) => (
                <FilaEfecto
                  key={e.id}
                  efecto={e}
                  primero={i === 0}
                  ultimo={i === efectos.length - 1}
                  abierto={ajustesDe === e.id}
                  activo={objetivo?.id === e.id}
                  atenuado={arrastreOrden?.id === e.id}
                  lineaAntes={arrastreOrden?.sobre === e.id && arrastreOrden.lado === 'antes'}
                  lineaDespues={arrastreOrden?.sobre === e.id && arrastreOrden.lado === 'despues'}
                  onSeleccionar={() => {
                    setActivoId(e.id)
                    setModoAgregar(false)
                  }}
                  onAbrir={() => setAjustesDe((prev) => (prev === e.id ? null : e.id))}
                  onCambiar={(cambios) => actualizarEfecto(clip.id, e.id, cambios)}
                  onQuitar={() => {
                    quitarEfecto(clip.id, e.id)
                    if (ajustesDe === e.id) setAjustesDe(null)
                    if (activoId === e.id) setActivoId(null)
                  }}
                  onSubir={() => reordenarEfecto(clip.id, e.id, -1)}
                  onBajar={() => reordenarEfecto(clip.id, e.id, 1)}
                  onSoltarEfecto={(id) => reemplazarPorArrastre(e.id, id)}
                  onArrancarOrden={() => setArrastreOrden({ id: e.id, sobre: e.id, lado: 'antes' })}
                  onOrdenSobre={(lado) =>
                    setArrastreOrden((prev) => (prev ? { ...prev, sobre: e.id, lado } : prev))
                  }
                  onSoltarOrden={soltarOrden}
                  onFinOrden={() => setArrastreOrden(null)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* aparición gradual del color y los efectos del clip */}
      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <label className="flex cursor-pointer items-center justify-between gap-2">
          <span className="text-sm font-medium">El color y los efectos aparecen</span>
          <input
            type="checkbox"
            checked={!!clip.transicionEfecto}
            onChange={(e) => setTransicionEfecto(clip.id, e.target.checked ? 0.6 : 0)}
            className="h-4 w-4 accent-brand"
          />
        </label>
        <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
          Con esto la corrección de color y los efectos no están a pleno desde el primer fotograma,
          sino que se asientan durante los primeros segundos.
        </p>
        {!!clip.transicionEfecto && (
          <Campo etiqueta={`Duración (${clip.transicionEfecto.toFixed(1)} s)`}>
            <Deslizador
              valor={Math.round(clip.transicionEfecto * 10)}
              min={2}
              max={30}
              onChange={(v) => setTransicionEfecto(clip.id, v / 10)}
            />
          </Campo>
        )}
      </div>
    </div>
  )
}

// una fila de la lista de efectos: su nombre, el botón de ajustes que abre sus
// mandos por encima, el de quitar y las flechas para moverlo de posición. clicar el
// nombre la selecciona (será la que reemplace el catálogo), y soltar una muestra
// encima cambia su efecto. el movimiento entre filas se anima con la disposición de
// framer, con la misma curva que usan los bloques de la línea de tiempo
function FilaEfecto({
  efecto,
  primero,
  ultimo,
  abierto,
  activo,
  atenuado,
  lineaAntes,
  lineaDespues,
  onSeleccionar,
  onAbrir,
  onCambiar,
  onQuitar,
  onSubir,
  onBajar,
  onSoltarEfecto,
  onArrancarOrden,
  onOrdenSobre,
  onSoltarOrden,
  onFinOrden,
}: {
  efecto: EfectoClip
  primero: boolean
  ultimo: boolean
  abierto: boolean
  activo: boolean
  atenuado: boolean
  lineaAntes: boolean
  lineaDespues: boolean
  onSeleccionar: () => void
  onAbrir: () => void
  onCambiar: (cambios: Partial<EfectoClip>) => void
  onQuitar: () => void
  onSubir: () => void
  onBajar: () => void
  onSoltarEfecto: (id: string) => void
  onArrancarOrden: () => void
  onOrdenSobre: (lado: 'antes' | 'despues') => void
  onSoltarOrden: () => void
  onFinOrden: () => void
}) {
  // se enciende mientras se arrastra una muestra del catálogo sobre esta fila, para
  // avisar de que al soltar se reemplaza su efecto
  const [arrastreEncima, setArrastreEncima] = useState(false)

  // la burbuja de ajustes se recoge al pulsar fuera de la fila. el ref envuelve tanto la
  // burbuja como la fila, así que un clic en el propio botón de ajustes no cuenta como
  // "fuera" y sigue funcionando como alternador
  const contenedorRef = useRef<HTMLDivElement>(null)
  useClickFuera(contenedorRef, onAbrir, abierto)

  // la línea celeste de inserción, igual que la de la línea de tiempo, arriba o abajo
  // de la fila según de qué lado caiga el reorden
  const lineaOrden = (arriba: boolean) => (
    <span
      className="pointer-events-none absolute inset-x-1 z-20 h-0.5 rounded-full"
      style={{
        top: arriba ? -4 : undefined,
        bottom: arriba ? undefined : -4,
        background: '#38bdf8',
        boxShadow: '0 0 6px rgba(56,189,248,0.85)',
      }}
    />
  )

  return (
    <motion.div
      ref={contenedorRef}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: atenuado ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ layout: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }, duration: 0.2 }}
      className="relative"
    >
      {lineaAntes && lineaOrden(true)}
      {lineaDespues && lineaOrden(false)}
      {/* mandos del efecto, flotando por encima de la fila como una burbuja. se abre
          hacia arriba, que es donde hay sitio, y no empuja al resto de las filas */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="panel absolute bottom-full left-0 right-0 z-30 mb-2 flex flex-col gap-3 rounded-xl p-3 shadow-xl"
            style={{ border: '1px solid rgb(var(--border) / 0.16)' }}
          >
            <MandosEfecto efecto={efecto} onCambiar={onCambiar} />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(TIPO_ORDEN_EFECTO, efecto.id)
          e.dataTransfer.effectAllowed = 'move'
          onArrancarOrden()
        }}
        onDragEnd={onFinOrden}
        onDragOver={(e) => {
          // reorden de filas: se mira si el cursor cae en la mitad de arriba o de
          // abajo de la fila para insertar antes o después
          if (e.dataTransfer.types.includes(TIPO_ORDEN_EFECTO)) {
            e.preventDefault()
            const r = e.currentTarget.getBoundingClientRect()
            onOrdenSobre(e.clientY < r.top + r.height / 2 ? 'antes' : 'despues')
          } else if (e.dataTransfer.types.includes(TIPO_EFECTO)) {
            e.preventDefault()
            if (!arrastreEncima) setArrastreEncima(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastreEncima(false)
        }}
        onDrop={(e) => {
          if (e.dataTransfer.getData(TIPO_ORDEN_EFECTO)) {
            e.preventDefault()
            e.stopPropagation()
            onSoltarOrden()
            return
          }
          const id = e.dataTransfer.getData(TIPO_EFECTO)
          if (!id) return
          e.preventDefault()
          e.stopPropagation()
          setArrastreEncima(false)
          onSoltarEfecto(id)
        }}
        className={[
          'flex items-center gap-2 rounded-xl border p-2.5 transition-colors',
          arrastreEncima || activo
            ? 'border-brand ring-2 ring-brand/40'
            : abierto
              ? 'border-brand'
              : 'border-black/10 dark:border-white/10',
        ].join(' ')}
      >
        {/* flechas de reordenar, apiladas como en la cabecera de un carril */}
        <div className="flex shrink-0 flex-col">
          <button
            onClick={onSubir}
            disabled={primero}
            aria-label="Subir el efecto"
            className="interactivo grid h-4 w-5 place-items-center rounded text-[color:var(--muted)] hover:text-brand disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={onBajar}
            disabled={ultimo}
            aria-label="Bajar el efecto"
            className="interactivo grid h-4 w-5 place-items-center rounded text-[color:var(--muted)] hover:text-brand disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        <Icon name="efectos" size={15} className="shrink-0 text-brand" />
        {/* el nombre es el que selecciona la fila: al pulsarlo, un clic en el catálogo
            reemplazará este efecto */}
        <button
          onClick={onSeleccionar}
          className={[
            'flex-1 truncate text-left text-sm font-medium transition-colors',
            activo ? 'text-brand' : 'hover:text-brand',
          ].join(' ')}
        >
          {nombreEfecto(efecto)}
        </button>

        <Tooltip texto="Ajustes del efecto" lado="arriba">
          <button
            onClick={onAbrir}
            aria-label="Ajustes del efecto"
            aria-expanded={abierto}
            className={[
              'interactivo grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors',
              abierto ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
            ].join(' ')}
          >
            <Icon name="ajustes" size={15} />
          </button>
        </Tooltip>
        <Tooltip texto="Quitar el efecto" lado="arriba">
          <button
            onClick={onQuitar}
            aria-label="Quitar el efecto"
            className="interactivo -mr-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] hover:text-rose-500"
          >
            <Icon name="papelera" size={15} />
          </button>
        </Tooltip>
      </div>
    </motion.div>
  )
}

// mandos de un efecto según su tipo. la nitidez y el brillo llevan dos deslizadores;
// el desenfoque su nivel más dirección y ángulo; el resto de filtros, solo el nivel
function MandosEfecto({
  efecto,
  onCambiar,
}: {
  efecto: EfectoClip
  onCambiar: (cambios: Partial<EfectoClip>) => void
}) {
  if (efecto.tipo === 'nitidez-brillo') {
    return (
      <>
        <Campo etiqueta={`Nitidez (${Math.round(efecto.nitidez)})`}>
          <Deslizador valor={efecto.nitidez} min={0} max={100} onChange={(v) => onCambiar({ nitidez: v })} />
        </Campo>
        <Campo etiqueta={`Brillo (${Math.round(efecto.brillo)})`}>
          <Deslizador valor={efecto.brillo} min={0} max={100} onChange={(v) => onCambiar({ brillo: v })} />
        </Campo>
      </>
    )
  }

  if (efecto.tipo === 'gopro') {
    // una sola cosa que ajustar: cuánto se abomba la imagen hacia adelante
    return (
      <Campo etiqueta={`Curvatura (${Math.round(efecto.curvatura)})`}>
        <Deslizador valor={efecto.curvatura} min={0} max={100} onChange={(v) => onCambiar({ curvatura: v })} />
      </Campo>
    )
  }

  return (
    <>
      <Campo etiqueta="Nivel" valor={efecto.intensidad}>
        <Deslizador valor={efecto.intensidad} min={0} max={100} onChange={(v) => onCambiar({ intensidad: v })} />
      </Campo>

      {/* la Cámara 2000 lleva un mando de ruido aparte del nivel, para regular el grano por su
          cuenta sin tocar cuánto se ve el resto del filtro */}
      {efecto.tipo === 'animado' && efecto.animado === 'cam2000' && (
        <Campo etiqueta="Ruido" valor={efecto.ruido ?? 40}>
          <Deslizador valor={efecto.ruido ?? 40} min={0} max={100} onChange={(v) => onCambiar({ ruido: v })} />
        </Campo>
      )}

      {/* la dirección y el ángulo solo tienen sentido en el desenfoque */}
      {efecto.tipo === 'desenfoque-movimiento' && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[color:var(--muted)]">Dirección</span>
            <Segmentado
              valor={efecto.angulo >= 45 && efecto.angulo <= 135 ? 'vertical' : 'horizontal'}
              opciones={[
                { valor: 'horizontal', etiqueta: 'Horizontal' },
                { valor: 'vertical', etiqueta: 'Vertical' },
              ]}
              onChange={(v) => onCambiar({ angulo: v === 'vertical' ? 90 : 0 })}
            />
          </div>
          <Campo etiqueta={`Ángulo (${Math.round(efecto.angulo)}°)`}>
            <Deslizador
              valor={Math.round(efecto.angulo)}
              min={0}
              max={180}
              onChange={(v) => onCambiar({ angulo: v })}
            />
          </Campo>
        </>
      )}
    </>
  )
}

// rejilla del catálogo, repartida en subcategorías. cada muestra se puede clicar
// (reemplaza o agrega, según el modo) o arrastrar hacia una fila o hacia el clip. la
// que coincide con el efecto seleccionado se resalta más fuerte
function Catalogo({
  miniatura,
  videoUrl,
  tiempo,
  cargando = false,
  puestos,
  objetivoClave,
  modoAgregar,
  onCancelarAgregar,
  onElegir,
}: {
  miniatura?: string
  videoUrl?: string
  tiempo: number
  // mientras se captura el fotograma del visor, para pintar un fondo neutro en vez de
  // una miniatura vieja o el degradado de muestra
  cargando?: boolean
  puestos: Set<string>
  objetivoClave: string | null
  modoAgregar: boolean
  onCancelarAgregar: () => void
  onElegir: (id: string) => void
}) {
  // el panel de efectos es solo para lo que mueve o texturiza el cuadro (desenfoques,
  // realce, texturas animadas). el color y el tono viven en "Ajustar colores", así que
  // los filtros de color ya no salen aquí para no duplicar lo mismo en dos sitios
  const cats = CATEGORIAS_EFECTO.filter((c) => c.grupo === 'efecto')
  const [categoria, setCategoria] = useState(cats[0].id)
  const [encima, setEncima] = useState<string | null>(null)
  const { mostrar } = useToast()
  const actual = cats.find((c) => c.id === categoria) ?? cats[0]
  const fondo = miniatura
    ? { backgroundImage: `url(${miniatura})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : cargando
      ? { backgroundColor: 'rgb(var(--border) / 0.18)' }
      : {
          backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 35%, #a3e635 65%, #fbbf24 100%)',
        }

  return (
    <div className="flex flex-col gap-3">
      {/* en modo agregar, el título cambia por un aviso claro con su botón de cancelar,
          para que se note que la próxima muestra entra como efecto nuevo */}
      {modoAgregar ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-brand/10 px-2.5 py-1.5">
          <span className="text-[11px] font-medium text-brand">Elige el efecto a agregar</span>
          <button
            onClick={onCancelarAgregar}
            className="interactivo text-[11px] font-medium text-[color:var(--muted)] hover:text-brand"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <span className="text-xs font-medium text-[color:var(--muted)]">Catálogo de efectos</span>
      )}

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.id)}
            className={[
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              c.id === categoria ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:text-brand',
            ].join(' ')}
            style={c.id === categoria ? undefined : { background: 'rgb(var(--border) / 0.1)' }}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(104px,1fr))]">
        {actual.efectos.map((e) => {
          const clave = claveCatalogo(e.id)
          const puesto = puestos.has(clave)
          const esObjetivo = objetivoClave === clave
          return (
            <button
              key={e.id}
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData(TIPO_EFECTO, e.id)
                ev.dataTransfer.effectAllowed = 'copy'
                imagenArrastreReducida(ev)
              }}
              // los efectos solo se aplican a clips de video; si se suelta en el vacío, en un texto o
              // una figura, el navegador no acepta el drop (dropEffect 'none') y se avisa en rojo
              onDragEnd={(ev) => {
                if (ev.dataTransfer.dropEffect === 'none') {
                  mostrar('error', 'Los efectos solo se aplican a clips de video.')
                }
              }}
              onClick={() => onElegir(e.id)}
              onMouseEnter={() => setEncima(e.id)}
              onMouseLeave={() => setEncima(null)}
              className="group flex flex-col gap-1 text-left"
            >
              <span
                className={[
                  'relative block h-16 w-full overflow-hidden rounded-lg border transition-all duration-200',
                  esObjetivo
                    ? 'border-brand ring-2 ring-brand'
                    : puesto
                      ? 'border-brand/60 ring-2 ring-brand/25'
                      : 'border-black/10 group-hover:border-brand dark:border-white/10',
                ].join(' ')}
              >
                {/* el fondo y el video con el filtro van en una capa interna. el
                    desenfoque de un elemento se desborda por fuera de su propio recorte,
                    así que el filtro se pone aquí dentro y el recuadro de arriba, sin
                    filtro, es el que recorta lo que sobresale para que no se salga feo */}
                <span
                  className="absolute inset-0"
                  style={{ ...fondo, filter: e.css(encima === e.id ? 100 : 50) }}
                >
                  {/* al pasar el cursor la muestra reproduce el propio video con el
                      efecto ya aplicado, desde el frame que se ve en el visor */}
                  {encima === e.id && videoUrl && (
                    <MuestraVideo src={videoUrl} tiempo={tiempo} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </span>
                {/* señal de que ese efecto ya está en la lista */}
                {puesto && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand text-white shadow">
                    <Icon name="check" size={12} />
                  </span>
                )}
              </span>
              <span
                className={[
                  'truncate text-[10px] leading-tight',
                  puesto ? 'font-medium text-brand' : 'text-[color:var(--muted)]',
                ].join(' ')}
              >
                {e.nombre}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
