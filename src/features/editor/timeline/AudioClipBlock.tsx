import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react'
import { ClipAudio } from '../../../types/audio'
import { MediaAsset } from '../../../types/media'
import { useEditorStore } from '../../../store/useEditorStore'
import { amplitudEn, picosDeMedio } from '../../../lib/audio/picos'
import { alturasOnda } from './AudioBlock'
import { imantarMover, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'

interface Props {
  audio: ClipAudio
  asset: MediaAsset | undefined
  pxPorSegundo: number
  puntos: number[]
}

// líneas verticales finas de la onda, centradas, del mismo trazo que el resto de
// la línea de tiempo. cada línea mide un píxel y crece de forma simétrica
function Lineas({ alturas, color }: { alturas: number[]; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-between overflow-hidden px-1">
      {alturas.map((h, i) => (
        <span key={i} style={{ width: 1, flex: '0 0 1px', height: `${Math.round(h * 100)}%`, background: color }} />
      ))}
    </div>
  )
}

// bloque de un audio importado sobre la pista de sonido. lleva su propio material,
// así que dibuja la onda real del archivo; se mueve con imantado y se recorta por
// los bordes, y su borde de inicio también desplaza el punto de entrada en la
// fuente. al no tener imagen, el nombre basta para reconocerlo
export default function AudioClipBlock({ audio, asset, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.regionSeleccionada === audio.id)
  const seleccionarRegion = useEditorStore((s) => s.seleccionarRegion)
  const moverAudio = useEditorStore((s) => s.moverAudio)
  const recortarAudio = useEditorStore((s) => s.recortarAudio)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)

  const ancho = Math.max(audio.duracion * pxPorSegundo, 8)
  const barras = Math.max(12, Math.min(600, Math.floor(ancho / 2)))
  const [alturas, setAlturas] = useState<number[] | null>(null)

  // onda real leída del propio archivo. mientras se decodifica, o si no se puede,
  // queda null y se cae a una onda sintética estable a partir del id
  useEffect(() => {
    if (!asset) return
    let vivo = true
    picosDeMedio(asset.id, asset.file).then((perfil) => {
      if (!vivo) return
      if (!perfil) {
        setAlturas(null)
        return
      }
      const crudas: number[] = []
      for (let i = 0; i < barras; i++) {
        const seg = audio.recorteInicio + ((i + 0.5) / barras) * audio.duracion
        crudas.push(amplitudEn(perfil, seg))
      }
      const max = crudas.reduce((m, v) => (v > m ? v : m), 0)
      if (max < 0.005) {
        setAlturas(null)
        return
      }
      setAlturas(crudas.map((v) => Math.max(0.06, Math.min(1, v / max))))
    })
    return () => {
      vivo = false
    }
  }, [asset, audio.recorteInicio, audio.duracion, barras])

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    seleccionarRegion(audio.id)
    const startX = e.clientX
    const inicioOriginal = audio.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioOriginal, inicioOriginal + audio.duracion]
    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      const bruto = Math.max(0, inicioOriginal + dx)
      const { inicio, guia } = imantarMover(bruto, audio.duracion, puntos, umbral, propios)
      setGuiaImantado(guia)
      moverAudio(audio.id, inicio)
    }
    const soltar = () => {
      setGuiaImantado(null)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  function iniciarRecorte(e: ReactMouseEvent, lado: 'inicio' | 'fin') {
    e.stopPropagation()
    e.preventDefault()
    seleccionarRegion(audio.id)
    let lastX = e.clientX
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      recortarAudio(audio.id, lado, delta)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const onda = alturas ?? alturasOnda(audio.id, barras)

  return (
    <div
      onMouseDown={iniciarMover}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border-2 px-2 transition-[border-color]',
        seleccionado ? 'border-sky-400' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: audio.inicio * pxPorSegundo,
        width: ancho,
        backgroundColor: 'rgba(56, 189, 248, 0.22)',
      }}
    >
      <Lineas alturas={onda} color="rgba(56, 189, 248, 0.7)" />
      <span className="pointer-events-none relative truncate rounded bg-black/35 px-1 text-[10px] font-medium text-white">
        {asset?.nombre ?? 'audio'}
      </span>
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-sky-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-sky-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}
