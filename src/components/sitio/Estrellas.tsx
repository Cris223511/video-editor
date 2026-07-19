import { useMemo } from 'react'
import { useThemeStore } from '../../store/useThemeStore'

// cuántas estrellas se dibujan. son elementos con animación propia, así que un
// número alto encarecería el pintado sin que la diferencia se aprecie
const CANTIDAD = 64

interface Estrella {
  x: number
  y: number
  tamano: number
  retraso: number
  duracion: number
  brillo: number
  deriva: number
}

// posiciones repartidas al azar pero estables durante la sesión. si se
// recalcularan en cada pintado, el cielo entero saltaría cada vez que cambia
// cualquier cosa de la página
function sembrar(): Estrella[] {
  return Array.from({ length: CANTIDAD }, () => {
    const duracion = 7 + Math.random() * 9
    return {
      x: Math.random() * 100,
      y: Math.random() * 100,
      // ninguna llega a ser grande: pasado cierto tamaño dejan de leerse como
      // fondo y se convierten en puntos que distraen
      tamano: Math.random() < 0.7 ? 1 + Math.random() : 2 + Math.random() * 1.2,
      // el retraso es negativo y nunca pasa de lo que dura un ciclo, así que cada
      // estrella empieza por un punto distinto de su propia animación en lugar de
      // esperar a que le llegue el turno. antes el retraso era positivo y de hasta
      // doce segundos: al volver del tema claro el componente se construía de cero
      // y el cielo se quedaba vacío un buen rato, que es lo que parecía que las
      // estrellas hubieran desaparecido
      retraso: Math.random() * duracion,
      duracion,
      brillo: 0.35 + Math.random() * 0.5,
      deriva: (Math.random() - 0.5) * 26,
    }
  })
}

// cielo de partículas para el fondo oscuro. aparecen, se apagan y derivan muy
// despacio, cada una a su ritmo. en tema claro no se dibuja nada: sobre blanco
// no se vería y solo añadiría trabajo al navegador
export default function Estrellas() {
  const tema = useThemeStore((s) => s.tema)
  const estrellas = useMemo(sembrar, [])

  if (tema !== 'dark') return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      // se difumina hacia abajo para que el cielo no compita con el pie
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
      }}
    >
      {estrellas.map((e, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${e.x}%`,
            top: `${e.y}%`,
            width: e.tamano,
            height: e.tamano,
            background: '#dbe8ff',
            boxShadow: `0 0 ${e.tamano * 2.5}px rgb(var(--accent) / 0.55)`,
            opacity: 0,
            animation: `estrella ${e.duracion}s ease-in-out -${e.retraso}s infinite`,
            // cada una deriva en su propia dirección, leída desde una variable
            ['--deriva' as string]: `${e.deriva}px`,
            ['--brillo' as string]: e.brillo,
          }}
        />
      ))}
    </div>
  )
}
