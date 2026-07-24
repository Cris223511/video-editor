import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import Icon from '../../../components/ui/Icon'
import Tooltip from '../../../components/ui/Tooltip'
import MuestraVideo from '../../../components/ui/MuestraVideo'
import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import { useProjectStore } from '../../../store/useProjectStore'
import { EfectoClip } from '../../../types/timeline'
import { CATEGORIAS_EFECTO, buscarEfecto, esFiltro } from '../../../lib/efectos/catalogo'

// valores de partida al añadir el desenfoque: intensidad media y barrido
// horizontal, que es la dirección más habitual en un travelling
const DESENFOQUE_INICIAL = {
  tipo: 'desenfoque-movimiento' as const,
  intensidad: 40,
  angulo: 0,
}

// nombre visible de un efecto ya puesto, para la etiqueta de su fila
function nombreEfecto(e: EfectoClip): string {
  if (e.tipo === 'nitidez-brillo') return 'Nítido y brilloso'
  if (esFiltro(e)) return buscarEfecto(e.filtro)?.nombre ?? 'Efecto'
  return 'Desenfoque de movimiento'
}

// identidad de un efecto, para no ponerlo dos veces. el desenfoque y la nitidez son
// únicos; los filtros se distinguen por cuál es
function claveEfecto(e: EfectoClip): string {
  if (e.tipo === 'filtro') return `filtro:${e.filtro}`
  if (e.tipo === 'desenfoque-movimiento') return 'desenfoque'
  return 'nitidez-brillo'
}

// misma identidad pero calculada desde el id de una muestra del catálogo
function claveCatalogo(id: string): string {
  if (id === 'nitidez-brillo') return 'nitidez-brillo'
  if (id === 'desenfoque-movimiento') return 'desenfoque'
  return `filtro:${id}`
}

// crea el efecto que corresponde a una muestra del catálogo, con sus valores de
// arranque. cada tipo guarda sus propios mandos
function crearEfecto(id: string): EfectoClip {
  if (id === 'nitidez-brillo') return { id: crypto.randomUUID(), tipo: 'nitidez-brillo', nitidez: 55, brillo: 35 }
  if (id === 'desenfoque-movimiento') return { id: crypto.randomUUID(), ...DESENFOQUE_INICIAL }
  return { id: crypto.randomUUID(), tipo: 'filtro', filtro: id, intensidad: 50 }
}

// panel de efectos del clip. arriba el catálogo para elegir; abajo los efectos ya
// puestos, en filas apiladas como capas. el orden se puede cambiar y cada efecto se
// regula, se reemplaza o se quita por su cuenta
export default function EffectsPanel() {
  const clips = useEditorStore((s) => s.pista.clips)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const playhead = useEditorStore((s) => s.playhead)
  const agregarEfecto = useEditorStore((s) => s.agregarEfecto)
  const actualizarEfecto = useEditorStore((s) => s.actualizarEfecto)
  const quitarEfecto = useEditorStore((s) => s.quitarEfecto)
  const reordenarEfecto = useEditorStore((s) => s.reordenarEfecto)
  const reemplazarEfecto = useEditorStore((s) => s.reemplazarEfecto)
  const setTransicionEfecto = useEditorStore((s) => s.setTransicionEfecto)

  const medios = useProjectStore((s) => s.medios)
  const clip = clips.find((c) => c.id === clipSeleccionado)
  const medioClip = clip ? medios.find((m) => m.id === clip.assetId) : undefined
  const miniatura = medioClip?.miniatura
  // el video del clip, para reproducir la muestra al pasar el cursor. solo si el
  // medio es de video; una imagen no tiene qué reproducir
  const videoUrl = medioClip?.clase === 'video' ? medioClip.url : undefined
  // segundo del archivo que se está viendo en el visor, para que las muestras
  // arranquen en ese mismo frame y no desde el principio
  const tiempoFrame = clip ? Math.max(0, clip.recorteInicio + (playhead - clip.inicio) * clip.velocidad) : 0

  // qué fila tiene abierto su panel de ajustes. solo una a la vez, para no llenar
  // todo de mandos flotantes
  const [ajustesDe, setAjustesDe] = useState<string | null>(null)
  // fila que está esperando su reemplazo: mientras hay una, el catálogo cambia ese
  // efecto en lugar de sumar uno nuevo. null cuando no se está reemplazando nada
  const [reemplazandoId, setReemplazandoId] = useState<string | null>(null)

  if (!clip) {
    return (
      <SinSeleccion icono="efectos" titulo="Ningún clip seleccionado">
        Pulsa un clip en la línea de tiempo para aplicarle efectos como el desenfoque de movimiento.
      </SinSeleccion>
    )
  }

  const efectos = clip.efectos ?? []
  const puestos = new Set(efectos.map(claveEfecto))

  // al elegir una muestra del catálogo se suma ese efecto como una capa nueva. si ya
  // estaba puesto no se agrega otra vez: para tener otro se elige una muestra
  // distinta, y así clicar varias veces la misma no llena la lista de repetidos.
  // si hay una fila esperando reemplazo, la muestra elegida cambia ese efecto en su
  // sitio en vez de agregar uno al final
  function elegir(id: string) {
    if (!clip) return
    if (reemplazandoId) {
      const actual = efectos.find((e) => e.id === reemplazandoId)
      // reemplazar por el mismo o por otro que ya esté en la lista no tiene sentido
      if (!actual || claveEfecto(actual) === claveCatalogo(id) || puestos.has(claveCatalogo(id))) {
        setReemplazandoId(null)
        return
      }
      reemplazarEfecto(clip.id, reemplazandoId, { ...crearEfecto(id), id: reemplazandoId })
      setReemplazandoId(null)
      return
    }
    if (puestos.has(claveCatalogo(id))) return
    agregarEfecto(clip.id, crearEfecto(id))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* catálogo arriba: de aquí se eligen los efectos */}
      <Catalogo
        miniatura={miniatura}
        videoUrl={videoUrl}
        tiempo={tiempoFrame}
        puestos={puestos}
        reemplazando={!!reemplazandoId}
        onCancelarReemplazo={() => setReemplazandoId(null)}
        onElegir={elegir}
      />

      {/* efectos aplicados, en filas apiladas como capas. el de más abajo es el
          último que se aplica, sobre el resultado de los de arriba */}
      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="text-xs font-medium text-[color:var(--muted)]">Efectos aplicados</span>
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
                  reemplazando={reemplazandoId === e.id}
                  onAbrir={() => setAjustesDe((prev) => (prev === e.id ? null : e.id))}
                  onReemplazar={() => {
                    setReemplazandoId((prev) => (prev === e.id ? null : e.id))
                    setAjustesDe(null)
                  }}
                  onCambiar={(cambios) => actualizarEfecto(clip.id, e.id, cambios)}
                  onQuitar={() => {
                    quitarEfecto(clip.id, e.id)
                    if (ajustesDe === e.id) setAjustesDe(null)
                    if (reemplazandoId === e.id) setReemplazandoId(null)
                  }}
                  onSubir={() => reordenarEfecto(clip.id, e.id, -1)}
                  onBajar={() => reordenarEfecto(clip.id, e.id, 1)}
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
// mandos por encima, el de quitar y las flechas para moverlo de posición. el
// movimiento entre filas se anima solo con la disposición de framer, con la misma
// curva que usan los bloques de la línea de tiempo
function FilaEfecto({
  efecto,
  primero,
  ultimo,
  abierto,
  reemplazando,
  onAbrir,
  onReemplazar,
  onCambiar,
  onQuitar,
  onSubir,
  onBajar,
}: {
  efecto: EfectoClip
  primero: boolean
  ultimo: boolean
  abierto: boolean
  reemplazando: boolean
  onAbrir: () => void
  onReemplazar: () => void
  onCambiar: (cambios: Partial<EfectoClip>) => void
  onQuitar: () => void
  onSubir: () => void
  onBajar: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ layout: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }, duration: 0.2 }}
      className="relative"
    >
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
        className={[
          'flex items-center gap-2 rounded-xl border p-2.5 transition-colors',
          reemplazando
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
        <span className="flex-1 truncate text-sm font-medium">{nombreEfecto(efecto)}</span>

        <Tooltip texto="Ajustes del efecto" lado="izquierda">
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
        <Tooltip texto={reemplazando ? 'Cancelar el reemplazo' : 'Reemplazar por otro efecto'} lado="izquierda">
          <button
            onClick={onReemplazar}
            aria-label="Reemplazar el efecto"
            aria-pressed={reemplazando}
            className={[
              'interactivo grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors',
              reemplazando ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
            ].join(' ')}
          >
            <Icon name="reemplazar" size={15} />
          </button>
        </Tooltip>
        <Tooltip texto="Quitar el efecto" lado="izquierda">
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

  return (
    <>
      <Campo etiqueta="Nivel" valor={efecto.intensidad}>
        <Deslizador valor={efecto.intensidad} min={0} max={100} onChange={(v) => onCambiar({ intensidad: v })} />
      </Campo>

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

// rejilla del catálogo, repartida en subcategorías. las muestras ya puestas se
// marcan y no se vuelven a agregar al pulsarlas
function Catalogo({
  miniatura,
  videoUrl,
  tiempo,
  puestos,
  reemplazando,
  onCancelarReemplazo,
  onElegir,
}: {
  miniatura?: string
  videoUrl?: string
  tiempo: number
  puestos: Set<string>
  reemplazando: boolean
  onCancelarReemplazo: () => void
  onElegir: (id: string) => void
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_EFECTO[0].id)
  const [encima, setEncima] = useState<string | null>(null)
  const actual = CATEGORIAS_EFECTO.find((c) => c.id === categoria) ?? CATEGORIAS_EFECTO[0]
  const fondo = miniatura
    ? { backgroundImage: `url(${miniatura})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {
        backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #22d3ee 35%, #a3e635 65%, #fbbf24 100%)',
      }

  return (
    <div className="flex flex-col gap-3">
      {/* mientras se reemplaza, el título del catálogo cambia por un aviso claro con
          su botón de cancelar, para que se note que la próxima muestra sustituye en
          vez de agregar */}
      {reemplazando ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-brand/10 px-2.5 py-1.5">
          <span className="text-[11px] font-medium text-brand">Elige el efecto de reemplazo</span>
          <button
            onClick={onCancelarReemplazo}
            className="interactivo text-[11px] font-medium text-[color:var(--muted)] hover:text-brand"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <span className="text-xs font-medium text-[color:var(--muted)]">Catálogo de efectos</span>
      )}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CATEGORIAS_EFECTO.map((c) => (
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
          const puesto = puestos.has(claveCatalogo(e.id))
          return (
            <button
              key={e.id}
              onClick={() => onElegir(e.id)}
              onMouseEnter={() => setEncima(e.id)}
              onMouseLeave={() => setEncima(null)}
              title={puesto ? `${e.nombre} (ya aplicado)` : e.nombre}
              className="group flex flex-col gap-1 text-left"
            >
              <span
                className={[
                  'relative block h-16 w-full overflow-hidden rounded-lg border transition-all duration-200',
                  puesto ? 'border-brand ring-2 ring-brand/40' : 'border-black/10 group-hover:border-brand dark:border-white/10',
                ].join(' ')}
                style={{ ...fondo, filter: e.css(encima === e.id ? 100 : 50) }}
              >
                {/* al pasar el cursor la muestra reproduce el propio video con el
                    efecto ya aplicado, desde el frame que se ve en el visor */}
                {encima === e.id && videoUrl && (
                  <MuestraVideo src={videoUrl} tiempo={tiempo} className="absolute inset-0 h-full w-full object-cover" />
                )}
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
