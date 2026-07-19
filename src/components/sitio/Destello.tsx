import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// halo de luz azul detrás del contenido. es un degradado radial muy desenfocado
// que late despacio, así que aporta profundidad sin llamar la atención ni
// competir con lo que hay delante
export default function Destello({
  x = '50%',
  y = '40%',
  tamano = 460,
  intensidad = 0.42,
}: {
  x?: string
  y?: string
  tamano?: number
  intensidad?: number
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -z-10 animate-destello rounded-full"
      style={{
        left: x,
        top: y,
        width: tamano,
        height: tamano,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, rgb(var(--accent) / ${intensidad}) 0%, rgb(var(--accent) / ${intensidad * 0.35}) 42%, transparent 72%)`,
        filter: 'blur(56px)',
      }}
    />
  )
}

// trazo que se dibuja bajo una palabra cuando la sección entra en pantalla.
// crece de izquierda a derecha en lugar de aparecer ya hecho, que es lo que le
// da vida al titular
export function Subrayado({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visible = useInView(ref, { once: true, amount: 0.6 })

  return (
    <span ref={ref} className="relative inline-block">
      {children}
      <motion.span
        className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full"
        style={{
          transformOrigin: 'left',
          // el trazo termina en celeste y no desvaneciéndose: al acabar en
          // transparente parecía que la línea se quedaba a medias
          background:
            'linear-gradient(90deg, rgb(var(--accent)) 0%, rgb(var(--accent-soft)) 100%)',
        }}
        initial={{ scaleX: 0 }}
        animate={visible ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      />
    </span>
  )
}

// anillos concéntricos que giran despacio detrás de la zona superior, como en la
// referencia. van en svg para que las circunferencias queden nítidas a cualquier
// tamaño, y con trazo muy tenue para que se lean como textura y no como dibujo
export function Anillos({ tamano = 620 }: { tamano?: number }) {
  const radios = [0.2, 0.32, 0.44, 0.56, 0.68]

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -z-10"
      style={{ width: tamano, height: tamano }}
    >
      <motion.svg
        viewBox="0 0 200 200"
        className="h-full w-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        {radios.map((r, i) => (
          <circle
            key={r}
            cx={100}
            cy={100}
            r={r * 100}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeOpacity={0.16 - i * 0.022}
            strokeWidth={0.5}
            // el trazo discontinuo de los anillos exteriores insinúa órbita sin
            // recargar la zona
            strokeDasharray={i > 1 ? '3 6' : undefined}
          />
        ))}
        {/* puntos sobre las órbitas, que giran con ellas */}
        {radios.slice(1).map((r, i) => (
          <circle
            key={`p-${r}`}
            cx={100 + r * 100 * Math.cos((i * 72 * Math.PI) / 180)}
            cy={100 + r * 100 * Math.sin((i * 72 * Math.PI) / 180)}
            r={1.4}
            fill="rgb(var(--accent))"
            fillOpacity={0.34}
          />
        ))}
      </motion.svg>
    </span>
  )
}
