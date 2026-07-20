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
export const HUECO_PISTA = 6

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
  const recortarClip = useEditorStore((s) => s.recortarClip)
  const estirarVelocidad = useEditorStore((s) => s.estirarVelocidad)
  const moverClipAPista = useEditorStore((s) => s.moverClipAPista)
  const altosPista = useEditorStore((s) => s.altosPista)
  const tira = useTira(clip.assetId, url, clip.duracionFuente)

  // mientras se arrastra un borde con alt no se recorta, se cambia la velocidad;
  // este estado enciende la pista visual con el valor resultante en vivo
  const [estirandoVelocidad, setEstirandoVelocidad] = useState(false)

  const ancho = Math.max(clip.duracion * pxPorSegundo, 8)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    seleccionar(clip.id)
    const startX = e.clientX
    const startY = e.clientY
    const inicioOriginal = clip.inicio
    const umbral = UMBRAL_PX / pxPorSegundo

    // centro vertical de cada nivel, medido desde arriba. las filas se dibujan
    // con la pista más alta primero, así que se recorren al revés
    const centros: number[] = new Array(altosPista.length)
    let acumulado = 0
    for (let p = altosPista.length - 1; p >= 0; p--) {
      centros[p] = acumulado + altosPista[p] / 2
      acumulado += altosPista[p] + HUECO_PISTA
    }

    const mover = (ev: globalThis.MouseEvent) => {
      // el clip cambia de nivel cuando el cursor se acerca más al centro de otra
      // fila que a la suya, igual que arrastrando entre carriles en Premiere
      const objetivo = centros[clip.pista] + (ev.clientY - startY)
      let destino = clip.pista
      for (let p = 0; p < centros.length; p++) {
        if (Math.abs(centros[p] - objetivo) < Math.abs(centros[destino] - objetivo)) destino = p
      }
      if (destino !== clip.pista) moverClipAPista(clip.id, destino)

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
      moverClip(clip.id, candidato)
    }
    const soltar = () => {
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
    let lastX = e.clientX
    setEstirandoVelocidad(e.altKey)
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      // con alt el gesto deja de recortar y pasa a repartir el mismo trozo de
      // video en más o menos tiempo, que es tal cual cambiar la velocidad
      if (ev.altKey) {
        setEstirandoVelocidad(true)
        estirarVelocidad(clip.id, lado, delta)
      } else {
        setEstirandoVelocidad(false)
        recortarClip(clip.id, lado, delta)
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
        'group absolute top-0 flex h-full cursor-grab items-end overflow-hidden rounded-lg border-2 transition-[border-color]',
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
    </div>
  )
}
