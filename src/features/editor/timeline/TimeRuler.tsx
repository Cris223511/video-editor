interface Props {
  total: number
  pxPorSegundo: number
  ancho: number
}

// pasos posibles entre marcas, en segundos. se elige el que deja las etiquetas
// separadas de forma cómoda según el zoom
const PASOS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

function pasoAdecuado(pxPorSegundo: number): number {
  const objetivo = 80 / pxPorSegundo
  return PASOS.find((p) => p >= objetivo) ?? PASOS[PASOS.length - 1]
}

function etiqueta(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

// regla de tiempo sobre la pista. sirve de referencia y de zona para mover el
// cabezal arrastrando
export default function TimeRuler({ total, pxPorSegundo, ancho }: Props) {
  const paso = pasoAdecuado(pxPorSegundo)
  const hasta = Math.max(total, ancho / pxPorSegundo)
  const marcas: number[] = []
  for (let t = 0; t <= hasta; t += paso) marcas.push(t)

  return (
    <div className="relative h-7 cursor-ew-resize select-none border-b border-black/10 dark:border-white/10">
      {marcas.map((t) => (
        <div key={t} className="absolute top-0 h-full" style={{ left: t * pxPorSegundo }}>
          <div className="h-2 w-px bg-black/25 dark:bg-white/25" />
          <span className="absolute left-1 top-1.5 whitespace-nowrap text-[10px] text-[color:var(--muted)]">
            {etiqueta(t)}
          </span>
        </div>
      ))}
    </div>
  )
}
