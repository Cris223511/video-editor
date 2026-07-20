import { MouseEvent as ReactMouseEvent, useState } from 'react'
import { Clip } from '../../../types/timeline'
import { useEditorStore } from '../../../store/useEditorStore'
import { useTira } from './useTira'
import FrameStrip from './FrameStrip'
import MedioNoDisponible from '../../../components/ui/MedioNoDisponible'
import TransicionBlock from './TransicionBlock'

interface Props {
  clip: Clip
  miniatura?: string
  nombre: string
  url?: string
  altoPista?: number
  pxPorSegundo: number
  puntos: number[] // instantes a los que imantar el clip al moverlo
}

const UMBRAL_PX = 8
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
  const moverClip = useEditorStore((s) => s.moverClip)
  const duplicarClip = useEditorStore((s) => s.duplicarClip)
  const recortarClip = useEditorStore((s) => s.recortarClip)
  const estirarVelocidad = useEditorStore((s) => s.estirarVelocidad)
  const moverClipAPista = useEditorStore((s) => s.moverClipAPista)
  const insertarPistaEn = useEditorStore((s) => s.insertarPistaEn)
  const setInsercionPista = useEditorStore((s) => s.setInsercionPista)
  const finGesto = useEditorStore((s) => s.finGesto)
  // un clip de un nivel bloqueado no se puede arrastrar ni recortar; solo
  // seleccionar. la comprobación se hace por su pista
  const bloqueada = useEditorStore((s) => s.pistasMeta[clip.pista]?.bloqueada ?? false)
  const tira = useTira(clip.assetId, url, clip.duracionFuente)

  // mientras se arrastra un borde con alt no se recorta, se cambia la velocidad;
  // este estado enciende la pista visual con el valor resultante en vivo
  const [estirandoVelocidad, setEstirandoVelocidad] = useState(false)

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
    const startX = e.clientX
    const inicioOriginal = clip.inicio
    const umbral = UMBRAL_PX / pxPorSegundo

    // contenedor real de los niveles de video en el dom. sus filas, medidas en
    // vivo, dicen dónde está cada pista y dónde caen las separaciones entre ellas.
    // trabajar con la geometría real evita descuadres cuando cambian los altos
    const stack = (e.currentTarget as HTMLElement).closest('[data-tracks]') as HTMLElement | null

    // qué nivel manda ahora mismo el arrastre y qué separación (si alguna) se
    // está señalando. se guardan aparte para no repetir llamadas idénticas al
    // store en cada fotograma del movimiento
    let pistaActual = clip.pista
    let insercionActual: number | null = null

    // franja superior e inferior de cada fila que ya no cuenta como «soltar
    // encima» sino como «abrir un nivel en esta separación». deja el centro de la
    // fila para el cambio de pista de siempre y los bordes para insertar
    const BORDE = 0.3

    // decide, a partir de la posición del cursor, si el gesto apunta al centro de
    // una fila (mover el clip a ese nivel) o a una separación (crear uno nuevo).
    // devuelve un destino de pista o un índice de inserción, nunca ambos
    const decidirVertical = (clientY: number) => {
      if (!stack) return
      const numPistas = useEditorStore.getState().numPistas
      const filas = [...stack.children]
        .map((el) => ({ p: Number((el as HTMLElement).dataset.filaPista), r: el.getBoundingClientRect() }))
        .filter((f) => Number.isFinite(f.p))
      if (filas.length === 0) return
      // las filas vienen dibujadas de arriba (pista mayor) hacia abajo (pista 0)
      const arriba = filas[0]
      const abajo = filas[filas.length - 1]
      const topeAlcanzado = numPistas >= 6

      let destino: number | null = null
      let insercion: number | null = null

      if (clientY < arriba.r.top) {
        // por encima de todo: nace una pista en la cima
        insercion = numPistas
      } else if (clientY > abajo.r.bottom) {
        // por debajo de todo: nace una pista en el suelo
        insercion = 0
      } else {
        const dentro = filas.find((f) => clientY >= f.r.top && clientY <= f.r.bottom)
        if (dentro) {
          const frac = (clientY - dentro.r.top) / dentro.r.height
          if (frac < BORDE) insercion = dentro.p + 1 // pegado al borde de arriba
          else if (frac > 1 - BORDE) insercion = dentro.p // pegado al borde de abajo
          else destino = dentro.p // en el cuerpo de la fila: mover aquí
        } else {
          // el cursor cayó en el hueco entre dos filas: la de arriba marca dónde
          // se inserta, porque el nuevo nivel se acomoda justo debajo de ella
          for (let i = 0; i < filas.length - 1; i++) {
            if (clientY > filas[i].r.bottom && clientY < filas[i + 1].r.top) {
              insercion = filas[i].p
              break
            }
          }
        }
      }

      // con el máximo de niveles ocupado no se ofrece insertar: la separación
      // señalada se reinterpreta como mover a la fila más cercana, y así el
      // arrastre vertical sigue respondiendo
      if (insercion !== null && topeAlcanzado) {
        insercion = null
        let mejor = filas[0]
        for (const f of filas) {
          const c = f.r.top + f.r.height / 2
          if (Math.abs(clientY - c) < Math.abs(clientY - (mejor.r.top + mejor.r.height / 2))) mejor = f
        }
        destino = mejor.p
      }

      return { destino, insercion }
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
      let candidato = Math.max(0, inicioOriginal + dx)
      // imantado: si el inicio o el fin del clip caen cerca de un punto de
      // anclaje, se pegan a él para que sea fácil unir clips sin huecos
      for (const p of puntos) {
        if (Math.abs(candidato - p) < umbral) {
          candidato = p
          break
        }
        if (Math.abs(candidato + clip.duracion - p) < umbral) {
          candidato = Math.max(0, p - clip.duracion)
          break
        }
      }
      moverClip(idGesto, candidato)
    }
    const soltar = () => {
      // si el gesto acabó sobre una separación, se abre allí el nivel nuevo y el
      // clip aterriza dentro; comparte el mismo paso de historial que el arrastre
      if (insercionActual !== null) insertarPistaEn(insercionActual, idGesto)
      setInsercionPista(null)
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
    setEstirandoVelocidad(e.altKey)
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - inicioX) / pxPorSegundo
      // con alt el gesto deja de recortar y pasa a repartir el mismo trozo de
      // video en más o menos tiempo, que es tal cual cambiar la velocidad
      if (ev.altKey) {
        setEstirandoVelocidad(true)
        estirarVelocidad(clip.id, lado, delta, base)
      } else {
        setEstirandoVelocidad(false)
        recortarClip(clip.id, lado, delta, base)
      }
    }
    const soltar = () => {
      setEstirandoVelocidad(false)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div
      onMouseDown={iniciarMover}
      className={[
        'group absolute top-0 flex h-full items-end overflow-hidden rounded-lg border-2 transition-[border-color]',
        bloqueada ? 'cursor-default' : 'cursor-grab',
        seleccionado ? 'border-brand' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: clip.inicio * pxPorSegundo,
        width: ancho,
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
