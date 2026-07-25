import { useEffect, useState } from 'react'
import { IMPACTOS, TIPO_IMPACTO, COLOR_IMPACTO_DEF, estadoImpacto } from '../../../lib/impactos/catalogo'
import { TipoImpacto } from '../../../types/impacto'

// duración de un pase de la vista previa y del descanso entre pases, en ms. cada
// efecto arranca su pase con un desfase según su posición, para que la paleta se
// vea viva y en cascada en vez de latir todas a la vez
const PASE = 750
const CICLO = 2400
const DESFASE = 300

// escena mínima que se deforma para previsualizar un efecto: un cielo con su sol,
// una loma y una barra, lo justo para que se lea el zoom, la sacudida o el flash.
// recibe el reloj global en ms y su propio índice para calcular su avance
function MuestraImpacto({ tipo, ms, indice }: { tipo: TipoImpacto; ms: number; indice: number }) {
  const local = (ms + indice * DESFASE) % CICLO
  const p = local < PASE ? local / PASE : 2 // fuera de rango => en reposo
  const e = estadoImpacto(tipo, p, 80, COLOR_IMPACTO_DEF)
  return (
    <span className="relative block h-11 w-[72px] shrink-0 overflow-hidden rounded-md" style={{ background: '#0b1424' }}>
      <span
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1d3557, #4a8fd6)',
          transform: `scale(${e.escala}) translate(${e.x * 100}%, ${e.y * 100}%)`,
          filter: e.desenfoque > 0 ? `blur(${(e.desenfoque * 44).toFixed(1)}px)` : undefined,
        }}
      >
        {/* sol */}
        <span className="absolute right-2 top-2 h-4 w-4 rounded-full" style={{ background: '#fde68a', boxShadow: '0 0 7px #fde68a' }} />
        {/* silueta de una loma abajo, para que el movimiento tenga referencia */}
        <span
          className="absolute -bottom-2 left-0 h-6 w-full"
          style={{ background: 'radial-gradient(120% 100% at 30% 100%, #0b1f38 40%, transparent 70%)' }}
        />
        <span className="absolute bottom-2 left-2 h-1 w-8 rounded-full" style={{ background: '#e2f0ff', opacity: 0.7 }} />
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
  // un solo bucle de dibujo lleva el reloj en milisegundos; cada vista previa saca
  // de ahí su propio avance con un desfase, así corren en cascada y no todas en
  // sincronía. es continuo, no depende del cursor
  const [ms, setMs] = useState(0)
  useEffect(() => {
    let raf = 0
    let inicio = 0
    const paso = (ts: number) => {
      if (!inicio) inicio = ts
      setMs(ts - inicio)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-[color:var(--muted)]">
        Arrastra un efecto hasta un clip para ponerlo en ese punto. Solo funciona sobre clips de
        video. Luego haz clic en el impacto para ajustar su color, su duración y qué tan brusco es.
      </p>

      <div className="grid grid-cols-1 gap-2.5">
        {IMPACTOS.map((im, i) => (
          <div
            key={im.tipo}
            draggable
            onDragStart={(ev) => {
              ev.dataTransfer.setData(TIPO_IMPACTO, im.tipo)
              ev.dataTransfer.effectAllowed = 'copy'
            }}
            title={`${im.nombre} · arrástralo a un clip`}
            className="group flex cursor-grab items-center gap-3 rounded-xl p-2 pr-3 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:translate-y-0 active:cursor-grabbing dark:ring-white/10"
            style={{ background: 'rgb(var(--border) / 0.05)' }}
          >
            <MuestraImpacto tipo={im.tipo} ms={ms} indice={i} />
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
