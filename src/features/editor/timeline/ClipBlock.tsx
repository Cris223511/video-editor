import { MouseEvent as ReactMouseEvent, useState } from 'react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { useTira } from './useTira'
import FrameStrip from './FrameStrip'
import MedioNoDisponible from '../../../components/ui/MedioNoDisponible'
import TransicionBlock from './TransicionBlock'
import { TIPO_TRANSICION } from '../GaleriaTransiciones'
import { resolverDestinoVertical } from './destinoVertical'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'

interface Props {
  clip: Clip
  miniatura?: string
  nombre: string
  url?: string
  altoPista?: number
  pxPorSegundo: number
  puntos: number[] // instantes a los que imantar el clip al moverlo
}

// separación vertical entre niveles; debe coincidir con la que usa la línea de
// tiempo al apilar las filas, o el clip caería en la pista equivocada al soltarlo
export const HUECO_PISTA = 10

// bloque de un clip en la pista. se puede seleccionar, mover con imantado y
// recortar por sus bordes con los tiradores laterales
export default function ClipBlock({
  clip,
  miniatura,
  nombre,
  url,
  altoPista = 64,
  pxPorSegundo,
  puntos,
}: Props) {
  const seleccionado = useEditorStore((s) => s.clipSeleccionado === clip.id)
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const moverClip = useEditorStore((s) => s.moverClip)
  const duplicarClip = useEditorStore((s) => s.duplicarClip)
  const recortarClip = useEditorStore((s) => s.recortarClip)
  const estirarVelocidad = useEditorStore((s) => s.estirarVelocidad)
  const moverClipAPista = useEditorStore((s) => s.moverClipAPista)
  const insertarPistaEn = useEditorStore((s) => s.insertarPistaEn)
  const setInsercionPista = useEditorStore((s) => s.setInsercionPista)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)
  const finGesto = useEditorStore((s) => s.finGesto)
  // un clip de un nivel bloqueado no se puede arrastrar ni recortar; solo
  // seleccionar. la comprobación se hace por su pista
  const bloqueada = useEditorStore((s) => s.pistasMeta[clip.pista]?.bloqueada ?? false)
  const tira = useTira(clip.assetId, url, clip.duracionFuente)

  // mientras se arrastra un borde con alt no se recorta, se cambia la velocidad;
  // este estado enciende la pista visual con el valor resultante en vivo
  const [estirandoVelocidad, setEstirandoVelocidad] = useState(false)
  // mientras dura un gesto propio (mover o recortar) el bloque debe seguir al
  // cursor sin retraso, así que se apaga el suavizado de su posición. en reposo
  // se vuelve a encender para que, al cerrar un hueco, el clip se deslice hasta
  // su nuevo sitio en vez de saltar de golpe
  const [interactuando, setInteractuando] = useState(false)
  // se enciende mientras se arrastra una transición de la galería sobre el clip,
  // para señalar que al soltar se aplicará en su borde de entrada
  const [transicionEncima, setTransicionEncima] = useState(false)

  const ancho = Math.max(clip.duracion * pxPorSegundo, 8)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    // este gesto nace en el cuerpo del clip; los tiradores de borde tienen su
    // propio manejador con stopPropagation, así que alt aquí nunca es el de la
    // velocidad. con alt pulsado se crea una copia y es ella la que sigue al
    // cursor, dejando el original quieto en su sitio
    const duplicando = e.altKey && !bloqueada
    let idGesto = clip.id
    if (duplicando) {
      const nuevo = duplicarClip(clip.id)
      if (nuevo) idGesto = nuevo
    } else {
      seleccionar(clip.id)
    }
    // en un nivel bloqueado el gesto termina en la selección: no se mueve nada
    if (bloqueada) return
    setInteractuando(true)
    const startX = e.clientX
    const inicioOriginal = clip.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    // bordes de partida del propio clip: se excluyen del imantado para que no se
    // enganche a sí mismo ni pinte una guía sobre su sitio actual
    const propios = [inicioOriginal, inicioOriginal + clip.duracion]

    // contenedor real de los niveles de video en el dom. sus filas, medidas en
    // vivo, dicen dónde está cada pista y dónde caen las separaciones entre ellas.
    // trabajar con la geometría real evita descuadres cuando cambian los altos
    const stack = (e.currentTarget as HTMLElement).closest('[data-tracks]') as HTMLElement | null

    // qué nivel manda ahora mismo el arrastre y qué separación (si alguna) se
    // está señalando. se guardan aparte para no repetir llamadas idénticas al
    // store en cada fotograma del movimiento
    let pistaActual = clip.pista
    let insercionActual: number | null = null

    // el criterio de a qué nivel o separación apunta el gesto vive en un ayudante
    // compartido: el mismo que usa el arrastre de un medio desde el panel, para
    // que soltar un clip o traer un video se comporten igual. sin filas medibles
    // (por ejemplo si aún no montó el dom) no hay destino que decidir
    const decidirVertical = (clientY: number) => {
      if (!stack) return
      return resolverDestinoVertical(stack, clientY, useEditorStore.getState().numPistas)
    }

    const mover = (ev: globalThis.MouseEvent) => {
      const v = decidirVertical(ev.clientY)
      if (v) {
        if (v.insercion !== null) {
          // apuntando a una separación: se pinta la guía y el clip se queda donde
          // esté hasta que se suelte
          if (v.insercion !== insercionActual) {
            insercionActual = v.insercion
            setInsercionPista(v.insercion)
          }
        } else {
          if (insercionActual !== null) {
            insercionActual = null
            setInsercionPista(null)
          }
          if (v.destino !== null && v.destino !== pistaActual) {
            pistaActual = v.destino
            moverClipAPista(idGesto, v.destino)
          }
        }
      }

      const dx = (ev.clientX - startX) / pxPorSegundo
      const bruto = Math.max(0, inicioOriginal + dx)
      // imantado: si el inicio o el fin del clip caen cerca de un anclaje, se
      // pegan a él para que sea fácil unir clips sin huecos ni solapes. cuando
      // engancha, se enciende la línea guía en ese instante
      const { inicio, guia } = imantarMover(bruto, clip.duracion, puntos, umbral, propios)
      setGuiaImantado(guia)
      moverClip(idGesto, inicio)
    }
    const soltar = () => {
      // si el gesto acabó sobre una separación, se abre allí el nivel nuevo y el
      // clip aterriza dentro; comparte el mismo paso de historial que el arrastre
      if (insercionActual !== null) insertarPistaEn(insercionActual, idGesto)
      setInsercionPista(null)
      // al soltar, la guía desaparece: el clip ya quedó encajado en su sitio
      setGuiaImantado(null)
      setInteractuando(false)
      finGesto()
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  function iniciarRecorte(e: ReactMouseEvent, lado: 'inicio' | 'fin') {
    e.stopPropagation()
    e.preventDefault()
    seleccionar(clip.id)
    if (bloqueada) return
    // se recuerda dónde empezó el ratón y cómo estaba el clip en ese instante.
    // cada movimiento aplica el desplazamiento total (ev.clientX menos el inicio)
    // sobre esa base, en lugar de ir sumando el trocito de cada fotograma. así,
    // si el cursor se pasa del límite y regresa, el clip vuelve a seguirlo sin
    // arrastrar el error que acumulaba el método anterior
    const inicioX = e.clientX
    const base = {
      inicio: clip.inicio,
      duracion: clip.duracion,
      recorteInicio: clip.recorteInicio,
      velocidad: clip.velocidad,
      duracionFuente: clip.duracionFuente,
    }
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    // los dos bordes de partida del clip se apartan del imantado: el fijo no
    // debe atraer al que se arrastra, y el móvil no debe pegarse a su origen
    const propios = [base.inicio, base.inicio + base.duracion]
    setInteractuando(true)
    setEstirandoVelocidad(e.altKey)
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - inicioX) / pxPorSegundo
      // con alt el gesto deja de recortar y pasa a repartir el mismo trozo de
      // video en más o menos tiempo, que es tal cual cambiar la velocidad
      if (ev.altKey) {
        setEstirandoVelocidad(true)
        setGuiaImantado(null)
        estirarVelocidad(clip.id, lado, delta, base)
      } else {
        setEstirandoVelocidad(false)
        // posición actual del borde que se arrastra; si roza un anclaje se pega a
        // él ajustando el desplazamiento, y se pinta la guía en ese instante
        const bordeBruto =
          lado === 'inicio' ? base.inicio + delta : base.inicio + base.duracion + delta
        const enganche = imantarBorde(bordeBruto, puntos, umbral, propios)
        let d = delta
        if (enganche) {
          d =
            lado === 'inicio'
              ? enganche.punto - base.inicio
              : enganche.punto - base.inicio - base.duracion
        }
        setGuiaImantado(enganche ? enganche.guia : null)
        recortarClip(clip.id, lado, d, base)
      }
    }
    const soltar = () => {
      setEstirandoVelocidad(false)
      setGuiaImantado(null)
      setInteractuando(false)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // al soltar una transición arrastrada desde la galería, se aplica como
  // transición de entrada de este clip, que es su unión con el clip anterior
  function alSoltarTransicion(e: React.DragEvent) {
    const tipo = e.dataTransfer.getData(TIPO_TRANSICION)
    if (!tipo) return
    e.preventDefault()
    e.stopPropagation()
    setTransicionEncima(false)
    setTransicion(clip.id, { tipo })
    seleccionar(clip.id)
  }

  return (
    <div
      onMouseDown={iniciarMover}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(TIPO_TRANSICION)) {
          e.preventDefault()
          if (!transicionEncima) setTransicionEncima(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setTransicionEncima(false)
      }}
      onDrop={alSoltarTransicion}
      className={[
        'group absolute top-0 flex h-full items-end overflow-hidden rounded-lg border-2 transition-[border-color]',
        bloqueada ? 'cursor-default' : 'cursor-grab',
        seleccionado ? 'border-brand' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: clip.inicio * pxPorSegundo,
        width: ancho,
        // en reposo la posición se anima con una curva suave, de modo que al
        // cerrar un hueco los clips se deslizan hasta su nuevo sitio; durante un
        // arrastre propio el suavizado se apaga para no ir por detrás del cursor
        transition: interactuando ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        // mientras la tira se extrae, el clip se ve con su miniatura muy
        // atenuada y el azul de fondo, sin saltos bruscos al llegar
        backgroundImage: !tira && miniatura ? `url(${miniatura})` : undefined,
        backgroundSize: 'cover',
        backgroundColor: 'rgb(24 97 255 / 0.22)',
      }}
    >
      {/* sin dirección de medio, el archivo se perdió: se avisa en el propio
          clip en lugar de dejar un bloque vacío que no explica nada */}
      {!url && (
        <div className="absolute inset-0 z-10 p-1">
          <MedioNoDisponible nombre={nombre} compacto />
        </div>
      )}

      {tira && (
        <FrameStrip
          tira={tira}
          ancho={ancho}
          alto={altoPista}
          recorteInicio={clip.recorteInicio}
          velocidad={clip.velocidad}
          pxPorSegundo={pxPorSegundo}
        />
      )}

      <TransicionBlock clip={clip} pxPorSegundo={pxPorSegundo} />

      {/* señal de que se está soltando una transición encima: un aro azul y una
          franja en el borde de entrada, que es donde va a colocarse */}
      {transicionEncima && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-lg ring-2 ring-inset ring-brand">
          <div
            className="absolute left-0 top-0 h-full w-8"
            style={{
              background:
                'linear-gradient(105deg, rgb(24 97 255 / 0.75) 0%, rgb(24 97 255 / 0.25) 60%, transparent 100%)',
            }}
          />
        </div>
      )}

      <span className="pointer-events-none relative w-full truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-0.5 pt-2 text-[10px] font-medium text-white">
        {nombre}
      </span>

      {clip.velocidad !== 1 && (
        <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/70 px-1 text-[9px] font-medium text-white">
          {Number(clip.velocidad.toFixed(2))}x
        </span>
      )}

      {/* señal clara de que el arrastre con alt no recorta: se ve la velocidad
          resultante en grande y centrada mientras dura el gesto */}
      {estirandoVelocidad && (
        <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="rounded-md bg-brand/90 px-2 py-0.5 text-xs font-semibold text-white shadow">
            {Number(clip.velocidad.toFixed(2))}x
          </span>
        </span>
      )}

      {/* los tiradores de recorte solo tienen sentido si la pista deja tocar el
          clip; en un nivel bloqueado desaparecen para no invitar a arrastrar */}
      {!bloqueada && (
        <>
          <div
            onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
            title="Recortar por el inicio (con Alt cambia la velocidad)"
            className={[
              'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-brand/80 transition-opacity',
              seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            ].join(' ')}
          />
          <div
            onMouseDown={(e) => iniciarRecorte(e, 'fin')}
            title="Recortar por el final (con Alt cambia la velocidad)"
            className={[
              'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-brand/80 transition-opacity',
              seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            ].join(' ')}
          />
        </>
      )}
    </div>
  )
}
