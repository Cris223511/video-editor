import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { Marco, TipoMarco } from '../../../types/marco'
import { Campo, Deslizador, ColorCampo } from '../../../components/ui/Controls'
import { CATEGORIAS_MARCO, CONTROLES_MARCO, marcoAnimado, pintarMarco } from '../../../lib/marcos/pintar'

// una muestra del marco sobre una foto real. se pinta con la MISMA función que usa el visor y la
// exportación, así lo que se ve acá es exactamente lo que cae sobre el video. los marcos con
// movimiento se animan mientras el cursor está encima, y quietos el resto del tiempo
function Muestra({ marco, animar }: { marco: Marco; animar: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const ancho = canvas.clientWidth
    const alto = canvas.clientHeight
    if (ancho <= 0 || alto <= 0) return
    canvas.width = Math.round(ancho * dpr)
    canvas.height = Math.round(alto * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const inicio = performance.now()
    const dibujar = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, ancho, alto)
      pintarMarco(ctx, marco, ancho, alto, alto / 1080, t)
    }
    if (animar && marcoAnimado(marco.tipo)) {
      const bucle = () => {
        dibujar((performance.now() - inicio) / 1000)
        raf = requestAnimationFrame(bucle)
      }
      raf = requestAnimationFrame(bucle)
    } else {
      dibujar(0.35)
    }
    return () => cancelAnimationFrame(raf)
  }, [marco, animar])
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}

// panel del marco decorativo del lienzo. los marcos se reparten en categorías con pestañas, igual
// que los efectos, y debajo de la elección salen solo los mandos que sirven para ese marco
export default function MarcoPanel() {
  const marco = useEditorStore((s) => s.marco)
  const setMarco = useEditorStore((s) => s.setMarco)
  const [categoria, setCategoria] = useState(() => {
    // arranca en la categoría del marco que ya esté puesto, para verlo elegido
    return CATEGORIAS_MARCO.find((c) => c.tipos.some((t) => t.tipo === marco.tipo))?.id ?? 'clasicos'
  })
  const [encima, setEncima] = useState<TipoMarco | null>(null)
  const actual = CATEGORIAS_MARCO.find((c) => c.id === categoria) ?? CATEGORIAS_MARCO[0]
  const controles = CONTROLES_MARCO[marco.tipo]

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CATEGORIAS_MARCO.map((c) => (
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

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]">
        {actual.tipos.map((t) => {
          const elegido = marco.tipo === t.tipo
          return (
            <button
              key={t.tipo}
              onClick={() => setMarco({ tipo: t.tipo })}
              onMouseEnter={() => setEncima(t.tipo)}
              onMouseLeave={() => setEncima(null)}
              className="group flex flex-col gap-1 text-left"
            >
              <span
                className={[
                  'relative block h-16 w-full overflow-hidden rounded-lg border bg-cover bg-center transition-all duration-150',
                  elegido
                    ? 'border-brand ring-2 ring-brand/40'
                    : 'border-black/10 group-hover:border-brand dark:border-white/10',
                ].join(' ')}
                style={{ backgroundImage: 'url(/poster-equipo.jpg)' }}
              >
                {t.tipo !== 'ninguno' ? (
                  <Muestra marco={{ ...marco, tipo: t.tipo, grosor: Math.min(marco.grosor, 60) }} animar={encima === t.tipo} />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-[10px] font-medium text-white/90">
                    Sin marco
                  </span>
                )}
              </span>
              <span
                className={[
                  'truncate text-[10px] leading-tight transition-colors',
                  elegido ? 'font-medium text-brand' : 'text-[color:var(--muted)]',
                ].join(' ')}
              >
                {t.nombre}
              </span>
            </button>
          )
        })}
      </div>

      {marco.tipo !== 'ninguno' && (
        <>
          {controles.includes('color') && (
            <Campo etiqueta={controles.includes('color2') ? 'Color principal' : 'Color'}>
              <ColorCampo valor={marco.color} onChange={(v) => setMarco({ color: v })} />
            </Campo>
          )}
          {controles.includes('color2') && (
            <Campo etiqueta="Segundo color">
              <ColorCampo valor={marco.color2 ?? '#ff3ba7'} onChange={(v) => setMarco({ color2: v })} />
            </Campo>
          )}
          {controles.includes('grosor') && (
            <Campo etiqueta={`Grosor (${marco.grosor})`}>
              <Deslizador valor={marco.grosor} min={1} max={150} onChange={(v) => setMarco({ grosor: v })} />
            </Campo>
          )}
          {controles.includes('separacion') && (
            <Campo etiqueta={`Separación del borde (${marco.separacion ?? 0})`}>
              <Deslizador valor={marco.separacion ?? 0} min={0} max={200} onChange={(v) => setMarco({ separacion: v })} />
            </Campo>
          )}
          {controles.includes('radio') && (
            <Campo etiqueta={`Esquinas redondeadas (${marco.radio})`}>
              <Deslizador valor={marco.radio} min={0} max={200} onChange={(v) => setMarco({ radio: v })} />
            </Campo>
          )}
          {controles.includes('velocidad') && (
            <Campo etiqueta={`Velocidad (${marco.velocidad ?? 50})`}>
              <Deslizador valor={marco.velocidad ?? 50} min={1} max={100} onChange={(v) => setMarco({ velocidad: v })} />
            </Campo>
          )}
          {controles.includes('opacidad') && (
            <Campo etiqueta={`Opacidad (${marco.opacidad ?? 100}%)`}>
              <Deslizador valor={marco.opacidad ?? 100} min={0} max={100} onChange={(v) => setMarco({ opacidad: v })} />
            </Campo>
          )}
        </>
      )}
    </div>
  )
}
