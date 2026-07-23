import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react'
import { Info, Volume2, VolumeX } from 'lucide-react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { useTira } from './useTira'
import FrameStrip from './FrameStrip'
import Tooltip from '../../../components/ui/Tooltip'
import MedioNoDisponible from '../../../components/ui/MedioNoDisponible'
import PropiedadesClip from './PropiedadesClip'
import TransicionBlock from './TransicionBlock'
import { TIPO_TRANSICION } from '../GaleriaTransiciones'
import { resolverDestinoVertical } from './destinoVertical'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'

interface Props {
  clip: Clip
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
  nombre,
  url,
  altoPista = 64,
  pxPorSegundo,
  puntos,
}: Props) {
  const seleccionado = useEditorStore((s) => s.clipSeleccionado === clip.id)
  const alternarSilencioClip = useEditorStore((s) => s.alternarSilencioClip)
  const alternarBloque = useEditorStore((s) => s.alternarBloque)
  const abrirMenuContextual = useEditorStore((s) => s.abrirMenuContextual)
  const moverBloques = useEditorStore((s) => s.moverBloques)
  const enConjunto = useEditorStore((s) => s.bloquesSeleccionados.includes(clip.id))
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
  // controla la ventana de propiedades del clip, que enseña un resumen de solo
  // lectura de todo lo que se le aplicó (velocidad, color, efectos, transición)
  const [verPropiedades, setVerPropiedades] = useState(false)
  // enciende el fundido de la tira de fotogramas. la extracción tarda unos
  // segundos y antes se veía la miniatura estirada y borrosa como relleno; ahora
  // el clip espera con un fondo sólido tenue y, cuando la tira llega, se pasa a
  // opacidad plena en un solo cuadro de retraso para que el fundido arranque
  // desde cero en vez de aparecer de golpe con el estado roto intermedio
  const [tiraLista, setTiraLista] = useState(false)
  useEffect(() => {
    if (!tira) {
      setTiraLista(false)
      return
    }
    const id = requestAnimationFrame(() => setTiraLista(true))
    return () => cancelAnimationFrame(id)
  }, [tira])

  const ancho = Math.max(clip.duracion * pxPorSegundo, 8)

  function iniciarMover(e: ReactMouseEvent) {
    // solo el botón izquierdo arrastra. el derecho abre el menú, y si de paso
    // arrancaba un gesto de movimiento el bloque se iba con el cursor
    if (e.button !== 0) return
    e.stopPropagation()
    // este gesto nace en el cuerpo del clip; los tiradores de borde tienen su
    // propio manejador con stopPropagation, así que alt aquí nunca es el de la
    // velocidad. con alt pulsado se crea una copia y es ella la que sigue al
    // cursor, dejando el original quieto en su sitio
    // shift suma o quita el clip del conjunto marcado y ahí acaba el gesto: sirve
    // para ir juntando bloques y luego borrarlos o moverlos todos de una vez
    if (e.shiftKey) {
      alternarBloque(clip.id)
      return
    }
    const st = useEditorStore.getState()
    // si el clip forma parte de un conjunto de varios, el arrastre los lleva a todos
    const enGrupo = st.bloquesSeleccionados.includes(clip.id) && st.bloquesSeleccionados.length > 1
    const grupo = enGrupo ? [...st.bloquesSeleccionados] : []
    // con alt la copia ya no nace al pulsar sino al empezar a mover. así un alt y
    // clic seco, sin arrastrar, sirve para sumar el clip al conjunto sin duplicar nada
    const conAlt = e.altKey && !bloqueada
    let idGesto = clip.id
    let movido = false
    if (!conAlt) seleccionar(clip.id)
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
      // el primer desplazamiento de verdad es el que decide si el gesto era un
      // arrastre o un simple clic con alt
      if (!movido) {
        if (Math.abs(ev.clientX - startX) < 3) return
        movido = true
        if (conAlt) {
          const nuevo = duplicarClip(clip.id)
          if (nuevo) idGesto = nuevo
        }
      }
      // con varios bloques marcados el arrastre los lleva a todos a la vez, así que
      // no hay imantado ni cambio de pista: solo el desplazamiento compartido
      if (grupo.length) {
        const dxg = (ev.clientX - startX) / pxPorSegundo
        moverBloques(grupo, inicioOriginal + dxg - clip.inicio)
        return
      }
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
      // alt y clic seco, sin llegar a arrastrar: el clip entra o sale del conjunto
      if (!movido && conAlt) alternarBloque(clip.id)
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
      // el botón derecho abre el menú de este bloque en el punto donde se pulsó
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'clip', id: clip.id })
      }}
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
        'group absolute top-0 flex h-full items-end overflow-hidden rounded-lg border transition-[border-color]',
        bloqueada ? 'cursor-default' : 'cursor-grab',
        seleccionado
          ? 'border-brand'
          : enConjunto
            ? 'border-brand/70'
            : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: clip.inicio * pxPorSegundo,
        width: ancho,
        // en reposo la posición se anima con una curva suave, de modo que al
        // cerrar un hueco los clips se deslizan hasta su nuevo sitio; durante un
        // arrastre propio el suavizado se apaga para no ir por detrás del cursor
        transition: interactuando ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        // mientras la tira se extrae, el clip descansa sobre un azul sólido tenue,
        // sin la miniatura estirada que antes se veía borrosa y rota hasta que
        // llegaban los fotogramas de verdad
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
        <div
          className="absolute inset-0 transition-opacity duration-500 ease-out"
          style={{ opacity: tiraLista ? 1 : 0 }}
        >
          <FrameStrip
            tira={tira}
            ancho={ancho}
            alto={altoPista}
            recorteInicio={clip.recorteInicio}
            velocidad={clip.velocidad}
            pxPorSegundo={pxPorSegundo}
          />
        </div>
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

      {/* botón discreto para abrir las propiedades del clip. va al inicio del
          bloque, arriba a la izquierda, y solo asoma al pasar el cursor o cuando
          el clip está seleccionado, para no tapar la tira. lleva su propio
          stopPropagation en el mousedown y en el click, así que ni arranca el
          arrastre del cuerpo ni interfiere con los tiradores de recorte. el
          tooltip explica qué hace sin necesidad de abrirlo */}
      <Tooltip texto="Ver propiedades del clip">
        <button
          type="button"
          aria-label="Ver propiedades del clip"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            setVerPropiedades(true)
          }}
          className={[
            'absolute left-1 top-1 z-30 grid h-5 w-5 place-items-center rounded-md bg-black/60 text-white transition-opacity duration-200 hover:bg-black/80',
            verPropiedades || seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
        >
          <Info size={12} />
        </button>
      </Tooltip>

      {/* silencio del propio clip, pegado al botón de propiedades. si su audio ya
          se separó a la pista de sonido el clip queda mudo por otro motivo, así que
          el botón se muestra apagado y no deja liarla volviendo a darle sonido */}
      <Tooltip texto={clip.mudo ? 'Su audio está en la pista de sonido' : clip.silenciado ? 'Quitar el silencio' : 'Silenciar este video'}>
        <button
          type="button"
          aria-label={clip.silenciado ? 'Quitar el silencio del clip' : 'Silenciar el clip'}
          disabled={clip.mudo}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            alternarSilencioClip(clip.id)
          }}
          className={[
            'absolute left-7 top-1 z-30 grid h-5 w-5 place-items-center rounded-md transition-opacity duration-200',
            clip.mudo || clip.silenciado
              ? 'bg-black/75 text-white/90'
              : 'bg-black/60 text-white hover:bg-black/80',
            clip.mudo ? 'cursor-default' : '',
            verPropiedades || seleccionado || clip.silenciado || clip.mudo
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
        >
          {clip.mudo || clip.silenciado ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </Tooltip>

      {verPropiedades && (
        <PropiedadesClip clip={clip} onCerrar={() => setVerPropiedades(false)} />
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
