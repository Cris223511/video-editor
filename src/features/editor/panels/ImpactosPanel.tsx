import { useEffect, useRef, useState } from 'react'
import { IMPACTOS, TIPO_IMPACTO, COLOR_IMPACTO_DEF, estadoImpacto } from '../../../lib/impactos/catalogo'
import { TipoImpacto } from '../../../types/impacto'

// duración de un pase de la vista previa y del ciclo completo (pase más el descanso
// antes de repetir), en ms. la animación solo corre mientras el cursor está sobre la
// tarjeta; en cuanto se va, la escena vuelve a su reposo
const PASE = 750
const CICLO = 2400

// avance que deja la escena quieta. estadoImpacto trata cualquier valor fuera de 0..1
// como reposo, así que con esto la muestra se ve tal cual sin deformarse
const REPOSO = 2

// escena mínima que se deforma para previsualizar un efecto: un cielo con su sol, una
// loma y una barra, lo justo para que se lea el zoom, la sacudida o el flash. `p` es el
// avance del pase, de 0 a 1, o REPOSO cuando no hay nada que animar
function MuestraImpacto({ tipo, p }: { tipo: TipoImpacto; p: number }) {
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

// una fila de la paleta: la muestra del efecto y su descripción. la vista previa se
// mueve únicamente al pasar el cursor por encima; su propio bucle arranca con el hover
// y se detiene al salir, dejando la escena en reposo, para que solo baile la que se
// está mirando y no todas de fondo
function TarjetaImpacto({ im }: { im: (typeof IMPACTOS)[number] }) {
  const [p, setP] = useState(REPOSO)
  const raf = useRef(0)

  const activar = () => {
    cancelAnimationFrame(raf.current)
    let inicio = 0
    const paso = (ts: number) => {
      if (!inicio) inicio = ts
      const local = (ts - inicio) % CICLO
      setP(local < PASE ? local / PASE : REPOSO)
      raf.current = requestAnimationFrame(paso)
    }
    raf.current = requestAnimationFrame(paso)
  }

  const desactivar = () => {
    cancelAnimationFrame(raf.current)
    setP(REPOSO)
  }

  // si la tarjeta se desmonta a mitad de un pase, el bucle no debe seguir vivo
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <div
      draggable
      onDragStart={(ev) => {
        ev.dataTransfer.setData(TIPO_IMPACTO, im.tipo)
        ev.dataTransfer.effectAllowed = 'copy'
      }}
      onMouseEnter={activar}
      onMouseLeave={desactivar}
      className="group flex cursor-grab items-center gap-3 rounded-xl p-2 pr-3 ring-1 ring-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:translate-y-0 active:cursor-grabbing dark:ring-white/10"
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
  )
}

// paleta de impactos: cada uno es una tarjeta con su vista previa que se arrastra hasta
// un clip. no se agrega con un clic a propósito, porque hace falta apuntar a un punto
// del clip; el arrastre es lo que decide dónde cae
export default function ImpactosPanel() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-[color:var(--muted)]">
        Arrastra un efecto hasta un clip para ponerlo en ese punto. Solo funciona sobre clips de
        video. Luego haz clic en el impacto para ajustar su color, su duración y qué tan brusco es.
      </p>

      <div className="grid grid-cols-1 gap-2.5">
        {IMPACTOS.map((im) => (
          <TarjetaImpacto key={im.tipo} im={im} />
        ))}
      </div>
    </div>
  )
}
