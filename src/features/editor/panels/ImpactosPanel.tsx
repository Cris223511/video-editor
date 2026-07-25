import { useEffect, useState } from 'react'
import { IMPACTOS, TIPO_IMPACTO, COLOR_IMPACTO_DEF, estadoImpacto } from '../../../lib/impactos/catalogo'
import { TipoImpacto } from '../../../types/impacto'

// escena mínima que se deforma para previsualizar un efecto: un cielo con su sol y
// una barra, lo justo para que se lea el zoom, la sacudida o el flash. recibe el
// avance p (0 al empezar, 1 al terminar; negativo mientras descansa entre pases)
function MuestraImpacto({ tipo, p }: { tipo: TipoImpacto; p: number }) {
  const e = estadoImpacto(tipo, p < 0 ? 2 : p, 75, COLOR_IMPACTO_DEF)
  return (
    <span className="relative block h-10 w-16 shrink-0 overflow-hidden rounded-md" style={{ background: '#0b1424' }}>
      <span
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1d3557, #4a8fd6)',
          transform: `scale(${e.escala}) translate(${e.x * 100}%, ${e.y * 100}%)`,
          filter: e.desenfoque > 0 ? `blur(${(e.desenfoque * 40).toFixed(1)}px)` : undefined,
        }}
      >
        {/* sol */}
        <span className="absolute right-1.5 top-1.5 h-3.5 w-3.5 rounded-full" style={{ background: '#fde68a', boxShadow: '0 0 6px #fde68a' }} />
        {/* silueta de una loma abajo, para que el movimiento tenga referencia */}
        <span
          className="absolute -bottom-2 left-0 h-5 w-full"
          style={{ background: 'radial-gradient(120% 100% at 30% 100%, #0b1f38 40%, transparent 70%)' }}
        />
        <span className="absolute bottom-1.5 left-1.5 h-1 w-7 rounded-full" style={{ background: '#e2f0ff', opacity: 0.7 }} />
      </span>
      {/* velo del flash por encima */}
      {e.veloOpacidad > 0 && (
        <span className="absolute inset-0" style={{ background: e.veloColor, opacity: e.veloOpacidad }} />
      )}
    </span>
  )
}

// paleta de impactos: cada uno es una bolita con su vista previa que se arrastra
// hasta un clip. no se agrega con un clic a propósito, porque hace falta apuntar a
// un punto del clip; el arrastre es lo que decide dónde cae
export default function ImpactosPanel() {
  // reloj compartido para todas las previsualizaciones: un solo bucle de dibujo
  // mueve las nueve a la vez, en lugar de nueve relojes por su cuenta. el efecto se
  // reproduce durante una fracción del ciclo y el resto es un descanso, para que se
  // lea con calma y no parezca un temblor continuo
  const [p, setP] = useState(-1)
  useEffect(() => {
    let raf = 0
    let inicio = 0
    const CICLO = 2200
    const PASE = 700
    const paso = (ts: number) => {
      if (!inicio) inicio = ts
      const e = (ts - inicio) % CICLO
      setP(e < PASE ? e / PASE : -1)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-[color:var(--muted)]">
        Arrastra un efecto hasta un clip para ponerlo en ese punto. Solo funciona sobre clips de
        video. Luego haz clic en la bolita para ajustar su color, su duración y qué tan brusco es.
      </p>

      <div className="grid grid-cols-1 gap-1.5">
        {IMPACTOS.map((im) => (
          <div
            key={im.tipo}
            draggable
            onDragStart={(ev) => {
              ev.dataTransfer.setData(TIPO_IMPACTO, im.tipo)
              ev.dataTransfer.effectAllowed = 'copy'
            }}
            title={`${im.nombre} · arrástralo a un clip`}
            className="group flex cursor-grab items-center gap-3 rounded-xl p-1.5 pr-3 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:translate-y-0 active:cursor-grabbing dark:ring-white/10"
            style={{ background: 'rgb(var(--border) / 0.05)' }}
          >
            <MuestraImpacto tipo={im.tipo} p={p} />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold leading-tight text-[color:var(--text)]">
                {im.nombre}
              </span>
              <span className="block text-[10.5px] leading-tight text-[color:var(--muted)]">
                {im.descripcion}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
