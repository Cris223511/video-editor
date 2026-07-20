interface Props {
  total: number
  pxPorSegundo: number
  ancho: number
  alto: number
}

// pasos posibles entre marcas altas, en segundos. se elige el que deja las
// etiquetas separadas de forma cómoda según el zoom
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

// regla de tiempo sobre la pista. además de servir de referencia y de zona para
// arrastrar el cabezal, lleva marcas: una alta con su número cada cierto número
// de segundos y varias cortas intermedias que reparten ese tramo, como en un
// editor de video. la cantidad de marcas cortas se adapta al zoom para que no se
// amontonen
export default function TimeRuler({ total, pxPorSegundo, ancho, alto }: Props) {
  const paso = pasoAdecuado(pxPorSegundo)
  // cuántas marcas cortas caben entre dos altas sin apelotonarse: se prueba de
  // más a menos y se elige la primera partición cuyas marcas queden separadas al
  // menos unos píxeles
  const divisiones = [10, 5, 4, 2, 1]
  const sub = divisiones.find((n) => (paso / n) * pxPorSegundo >= 9) ?? 1
  const pasoMenor = paso / sub

  const hasta = Math.max(total, ancho / pxPorSegundo)
  const menores: number[] = []
  for (let t = pasoMenor, i = 1; t <= hasta + 0.0001; t += pasoMenor, i++) {
    // las que coinciden con una marca alta se dejan para el otro bucle
    if (i % sub !== 0) menores.push(t)
  }
  const mayores: number[] = []
  for (let t = 0; t <= hasta + 0.0001; t += paso) mayores.push(t)

  return (
    <div className="relative cursor-pointer select-none" style={{ height: alto }}>
      {menores.map((t) => (
        <span
          key={`m${t}`}
          className="absolute bottom-0 w-px"
          style={{ left: t * pxPorSegundo, height: 6, background: 'rgb(var(--border) / 0.3)' }}
        />
      ))}
      {mayores.map((t) => (
        <div key={t} className="absolute bottom-0 top-0" style={{ left: t * pxPorSegundo }}>
          <span
            className="absolute bottom-0 w-px"
            style={{ height: 11, background: 'rgb(var(--border) / 0.45)' }}
          />
          <span className="absolute left-1 top-0.5 whitespace-nowrap text-[10px] text-[color:var(--muted)]">
            {etiqueta(t)}
          </span>
        </div>
      ))}
    </div>
  )
}
