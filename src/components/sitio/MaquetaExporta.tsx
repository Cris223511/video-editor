import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

// duración de una vuelta completa, en segundos. la barra llena, se queda un
// momento en el archivo terminado y vuelve a empezar
const CICLO = 9

// los tres formatos que se ofrecen al exportar. el que está activo va rotando,
// que es lo que da movimiento a la pieza sin necesidad de que nadie la toque
const FORMATOS = ['1920 × 1080', '1080 × 1080', '1080 × 1920']

function suave(v: number) {
  return v * v * (3 - 2 * v)
}

// pieza pequeña que acompaña a la línea de tiempo en la portada, debajo de ella.
// enseña el último paso, el de exportar, que es justo el que no se veía por
// ninguna parte: la barra avanza, el porcentaje sube y al final aparece el
// archivo listo con su peso y su duración
export default function MaquetaExporta() {
  const caja = useRef<HTMLDivElement>(null)
  const visible = useInView(caja, { amount: 0.3 })
  const [t, setT] = useState(0)

  useEffect(() => {
    if (!visible) return
    let raf = 0
    const inicio = performance.now()
    const paso = () => {
      setT(((performance.now() - inicio) / 1000) % CICLO)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [visible])

  // la exportación ocupa los primeros seis segundos, el archivo terminado se
  // queda un rato en pantalla para que dé tiempo a leerlo, y en el último tramo
  // la barra se vacía con la misma suavidad con la que se llenó. así la vuelta
  // enlaza sin que nada tenga que desaparecer
  const VACIADO = 1.2
  const avance =
    t < CICLO - VACIADO
      ? Math.min(1, t / 6)
      : 1 - (t - (CICLO - VACIADO)) / VACIADO
  const porcentaje = Math.round(suave(avance) * 100)
  const listo = avance >= 1 && t < CICLO - 1.2

  // el regreso al principio no se desvanece. antes la pieza entera bajaba de
  // opacidad al final de la vuelta, y desaparecer para volver a aparecer llamaba
  // más la atención que el propio salto. lo que enlaza la vuelta es que la barra
  // y el porcentaje vuelvan a cero con la misma curva con la que crecieron

  const formatoActivo = Math.floor(t / 3) % FORMATOS.length

  return (
    <div
      ref={caja}
      className="overflow-hidden rounded-2xl p-3 shadow-lg sm:p-4"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {listo ? 'Archivo terminado' : 'Exportando'}
          </p>
          <p className="font-mono text-[11px] font-medium text-brand">{porcentaje}%</p>
        </div>

        {/* barra de avance, con el relleno creciendo de izquierda a derecha */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'rgb(var(--border) / 0.12)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${porcentaje}%`,
              background: 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-soft)))',
            }}
          />
        </div>

        {/* los formatos de salida, con el activo encendido */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FORMATOS.map((f, i) => (
            <span
              key={f}
              className="rounded-full px-2.5 py-1 font-mono text-[10px] transition-colors duration-500"
              style={
                i === formatoActivo
                  ? { background: 'rgb(var(--accent) / 0.14)', color: 'rgb(var(--accent))' }
                  : {
                      background: 'rgb(var(--border) / 0.06)',
                      color: 'var(--muted)',
                    }
              }
            >
              {f}
            </span>
          ))}
        </div>

        {/* al terminar aparece la ficha del archivo, con lo que de verdad importa
            saber cuando uno acaba de exportar */}
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-all duration-500"
          style={{
            background: 'rgb(var(--border) / 0.05)',
            opacity: listo ? 1 : 0.35,
            transform: listo ? 'translateY(0)' : 'translateY(4px)',
          }}
        >
          <span className="truncate font-mono text-[11px]">montaje_final.mp4</span>
          <span className="shrink-0 font-mono text-[10px] text-[color:var(--muted)]">
            48 MB · 0:32
          </span>
        </div>
      </div>
    </div>
  )
}
