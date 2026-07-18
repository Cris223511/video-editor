// recreaciones de la interfaz del editor para la portada. no son capturas sino
// la interfaz dibujada con marcado real, así que se ven nítidas a cualquier
// tamaño, siguen el tema claro u oscuro y no se quedan viejas cuando el editor
// cambia

const CLIPS = [
  { pista: 0, izq: 0, ancho: 34, tono: 'linear-gradient(120deg,#2f6bd6,#5aa9ff)' },
  { pista: 0, izq: 35, ancho: 26, tono: 'linear-gradient(120deg,#8a5ad6,#c07af0)' },
  { pista: 0, izq: 62, ancho: 30, tono: 'linear-gradient(120deg,#1f8a7a,#4fd0b5)' },
  { pista: 1, izq: 12, ancho: 22, tono: 'linear-gradient(120deg,#d6743a,#f0a45a)' },
  { pista: 1, izq: 48, ancho: 18, tono: 'linear-gradient(120deg,#c2456e,#f07a9c)' },
]

// línea de tiempo con dos niveles, clips de distinta duración y el cabezal
export function MaquetaLineaTiempo() {
  return (
    <div
      className="overflow-hidden rounded-2xl p-3 shadow-lg"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.12)',
      }}
    >
      {/* regla */}
      <div className="relative mb-2 flex h-5 items-end gap-px overflow-hidden">
        {Array.from({ length: 40 }, (_, i) => (
          <span
            key={i}
            className="flex-1"
            style={{
              height: i % 5 === 0 ? 9 : 4,
              background: 'rgb(var(--border) / 0.22)',
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-1.5">
        {[1, 0].map((pista) => (
          <div key={pista} className="flex items-stretch gap-2">
            <span
              className="grid w-14 shrink-0 place-items-center rounded-md text-[10px] font-medium"
              style={{
                background: 'rgb(var(--border) / 0.07)',
                color: 'var(--muted)',
                height: pista === 0 ? 44 : 34,
              }}
            >
              Video {pista + 1}
            </span>
            <div className="relative flex-1" style={{ height: pista === 0 ? 44 : 34 }}>
              {CLIPS.filter((c) => c.pista === pista).map((c, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full overflow-hidden rounded-md"
                  style={{ left: `${c.izq}%`, width: `${c.ancho}%`, background: c.tono }}
                >
                  {/* franjas que insinúan la tira de fotogramas del clip */}
                  <div className="flex h-full">
                    {Array.from({ length: 6 }, (_, k) => (
                      <span
                        key={k}
                        className="h-full flex-1"
                        style={{ background: k % 2 ? 'rgb(255 255 255 / 0.09)' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* cabezal */}
        <div className="pointer-events-none absolute bottom-0 top-0 w-px" style={{ left: '46%' }}>
          <span className="absolute inset-y-0 w-px bg-brand" />
          <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-sm bg-brand" />
        </div>
      </div>
    </div>
  )
}

const ZONAS = [
  { nombre: 'Sombras', x: -22, y: 14 },
  { nombre: 'Medios', x: 6, y: -8 },
  { nombre: 'Luces', x: 18, y: 20 },
]

// las tres ruedas de corrección de color, con su tirador desplazado
export function MaquetaColor() {
  return (
    <div
      className="rounded-2xl p-4 shadow-lg"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.12)',
      }}
    >
      <p className="mb-3 text-xs font-semibold text-[color:var(--muted)]">Ruedas de color</p>
      <div className="flex justify-between gap-3">
        {ZONAS.map((z) => (
          <div key={z.nombre} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="relative aspect-square w-full rounded-full"
              style={{
                background:
                  'radial-gradient(circle at center, rgb(255 255 255 / 0.92) 0%, rgb(255 255 255 / 0) 62%), conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              }}
            >
              <span
                className="absolute h-2.5 w-2.5 rounded-full border-2 border-white shadow"
                style={{
                  left: `${50 + z.x}%`,
                  top: `${50 + z.y}%`,
                  transform: 'translate(-50%,-50%)',
                  background: 'rgb(0 0 0 / 0.25)',
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-[color:var(--muted)]">{z.nombre}</span>
          </div>
        ))}
      </div>

      {/* curva maestra, con su punto de control */}
      <p className="mb-2 mt-4 text-xs font-semibold text-[color:var(--muted)]">Curva</p>
      <svg viewBox="0 0 100 100" className="w-full rounded-lg" style={{ background: 'rgb(var(--border) / 0.07)' }}>
        {[33, 66].map((v) => (
          <g key={v} stroke="rgb(var(--border) / 0.18)" strokeWidth={0.6}>
            <line x1={v} y1={0} x2={v} y2={100} />
            <line x1={0} y1={v} x2={100} y2={v} />
          </g>
        ))}
        <line x1={0} y1={100} x2={100} y2={0} stroke="rgb(var(--border) / 0.28)" strokeWidth={0.6} strokeDasharray="3 3" />
        <path d="M0,100 C22,86 34,54 50,42 C68,29 82,16 100,0" fill="none" stroke="rgb(var(--accent))" strokeWidth={2} />
        <circle cx={50} cy={42} r={3.4} fill="rgb(var(--accent))" stroke="#fff" strokeWidth={1.6} />
      </svg>
    </div>
  )
}
