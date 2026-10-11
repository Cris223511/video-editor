import { useEffect, useRef } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { marcoAnimado, pintarMarco } from '../../../lib/marcos/pintar'

// dibuja el marco decorativo encima del lienzo, sin capturar el ratón. usa la misma función que la
// exportación (lib/marcos/pintar), así lo que se ve aquí es lo que sale en el archivo. un marco con
// movimiento depende del instante del proyecto, por eso se repinta con cada cambio del cabezal
export default function MarcoOverlay({ alturaLienzo }: { alturaLienzo: number }) {
  const marco = useEditorStore((s) => s.marco)
  // el cabezal solo importa cuando el marco se mueve; si no, se evita repintar en cada cuadro
  const t = useEditorStore((s) => (marcoAnimado(s.marco.tipo) ? s.playhead : 0))
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const padre = canvas?.parentElement
    if (!canvas || !padre) return
    const ancho = padre.clientWidth
    const alto = padre.clientHeight
    if (ancho <= 0 || alto <= 0) return
    const dpr = window.devicePixelRatio || 1
    const pw = Math.round(ancho * dpr)
    const ph = Math.round(alto * dpr)
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, ancho, alto)
    pintarMarco(ctx, marco, ancho, alto, alto / 1080, t)
  }, [marco, t, alturaLienzo])

  if (marco.tipo === 'ninguno') return null
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />
}
