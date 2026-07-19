import { motion } from 'framer-motion'
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

// línea de tiempo con dos niveles y el cabezal recorriéndola. sin etiquetas de
// pista: en una pieza de portada solo estorban, y lo que se quiere enseñar es el
// movimiento y cómo se reparten los clips
export function MaquetaLineaTiempo() {
  return (
    <div
      className="overflow-hidden rounded-2xl p-3 shadow-lg sm:p-4"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      {/* regla */}
      <div className="mb-2.5 flex h-4 items-end gap-px overflow-hidden">
        {Array.from({ length: 44 }, (_, i) => (
          <span
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: i % 5 === 0 ? 8 : 3,
              background: 'rgb(var(--border) / 0.2)',
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col gap-2">
        {[1, 0].map((pista) => (
          <div
            key={pista}
            className="relative rounded-lg"
            style={{
              height: pista === 0 ? 46 : 34,
              background: 'rgb(var(--border) / 0.05)',
            }}
          >
            {CLIPS.filter((c) => c.pista === pista).map((c, i) => (
              <motion.div
                key={i}
                className="absolute top-0 h-full overflow-hidden rounded-lg"
                style={{ left: `${c.izq}%`, width: `${c.ancho}%`, background: c.tono }}
                initial={{ opacity: 0, scaleX: 0.7 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.12 + (pista === 1 ? 0.25 : 0),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* franjas que insinúan la tira de fotogramas */}
                <div className="flex h-full">
                  {Array.from({ length: 7 }, (_, k) => (
                    <span
                      key={k}
                      className="h-full flex-1"
                      style={{ background: k % 2 ? 'rgb(255 255 255 / 0.1)' : 'transparent' }}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ))}

        {/* el cabezal recorre la línea sin parar, que es lo que da vida a la
            pieza sin necesidad de etiquetas ni texto */}
        <motion.div
          className="pointer-events-none absolute bottom-0 top-0 z-10 w-px"
          animate={{ left: ['2%', '96%'] }}
          transition={{ duration: 7, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        >
          <span className="absolute inset-y-0 w-px bg-brand" />
          <span className="absolute -left-[5px] -top-1 h-2.5 w-2.5 rounded-sm bg-brand shadow" />
        </motion.div>
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
        border: '1px solid rgb(var(--border) / 0.1)',
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
