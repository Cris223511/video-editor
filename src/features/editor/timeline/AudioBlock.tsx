import { MouseEvent as ReactMouseEvent } from 'react'
import { RegionAudio } from '../../../types/audio'
import { useEditorStore } from '../../../store/useEditorStore'

interface Props {
  region: RegionAudio
  pxPorSegundo: number
  puntos: number[]
}

const UMBRAL_PX = 8

// alturas de las barras de una onda, entre 0 y 1, a partir de una semilla de
// texto. sin acceso garantizado a las muestras reales del audio, se sintetiza un
// perfil estable y repetible: la misma región dibuja siempre la misma onda, y no
// una fila plana. la mezcla de dos senoides desfasadas más un pellizco por barra
// da un contorno irregular parecido al de un sonido real
export function alturasOnda(semilla: string, n: number): number[] {
  let base = 0
  for (let i = 0; i < semilla.length; i++) base = (base * 31 + semilla.charCodeAt(i)) % 100000
  const alturas: number[] = []
  for (let i = 0; i < n; i++) {
    const onda = Math.sin(i * 0.5 + base) * 0.5 + Math.sin(i * 0.17 + base * 0.3) * 0.3
    const pellizco = ((base + i * 2654435761) % 1000) / 1000 - 0.5
    const v = 0.5 + onda * 0.5 + pellizco * 0.35
    alturas.push(Math.max(0.12, Math.min(1, Math.abs(v))))
  }
  return alturas
}

// barras verticales que representan la onda. se usan tanto dentro de una región
// de audio como, muy tenues, en el fondo del carril vacío
export function OndaAudio({
  semilla,
  color,
  opacidad = 1,
  barras = 64,
}: {
  semilla: string
  color: string
  opacidad?: number
  barras?: number
}) {
  const alturas = alturasOnda(semilla, barras)
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center gap-px overflow-hidden px-1"
      style={{ opacity: opacidad }}
    >
      {alturas.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{ height: `${Math.round(h * 100)}%`, background: color, minWidth: 1 }}
        />
      ))}
    </div>
  )
}

// bloque de una franja de volumen en su pista de tiempo. define el tramo donde
// se aplica la ganancia; se mueve con imantado y se recorta por los bordes
export default function AudioBlock({ region, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.regionSeleccionada === region.id)
  const seleccionarRegion = useEditorStore((s) => s.seleccionarRegion)
  const moverRegionAudio = useEditorStore((s) => s.moverRegionAudio)
  const recortarRegionAudio = useEditorStore((s) => s.recortarRegionAudio)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    seleccionarRegion(region.id)
    const startX = e.clientX
    const inicioOriginal = region.inicio
    const umbral = UMBRAL_PX / pxPorSegundo

    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      let candidato = Math.max(0, inicioOriginal + dx)
      for (const p of puntos) {
        if (Math.abs(candidato - p) < umbral) {
          candidato = p
          break
        }
        if (Math.abs(candidato + region.duracion - p) < umbral) {
          candidato = Math.max(0, p - region.duracion)
          break
        }
      }
      moverRegionAudio(region.id, candidato)
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
    seleccionarRegion(region.id)
    let lastX = e.clientX
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      recortarRegionAudio(region.id, lado, delta)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const ancho = Math.max(region.duracion * pxPorSegundo, 8)
  // una barra cada pocos píxeles; se acota para no generar cientos en clips muy
  // anchos ni quedarse en dos o tres cuando es estrecho
  const barras = Math.max(8, Math.min(300, Math.floor(ancho / 3)))

  return (
    <div
      onMouseDown={iniciarMover}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border-2 px-2 transition-[border-color]',
        seleccionado ? 'border-emerald-400' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: region.inicio * pxPorSegundo,
        width: ancho,
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
      }}
    >
      {/* la onda ocupa el fondo del bloque; encima va el porcentaje de ganancia */}
      <OndaAudio semilla={region.id} color="rgba(16, 185, 129, 0.55)" barras={barras} />

      <span className="pointer-events-none relative truncate rounded bg-black/35 px-1 text-[10px] font-medium text-white">
        {Math.round(region.ganancia * 100)}%
      </span>

      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}
