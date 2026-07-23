import { useEffect, useRef } from 'react'
import { useThemeStore } from '../../store/useThemeStore'

// halo que acompaña al puntero por el sitio, solo en modo oscuro: sobre el fondo
// claro no se vería y solo ensuciaría. usa el mismo celeste de los destellos de
// las secciones, con una opacidad baja para que acompañe sin llamar la atención.
//
// no se guarda la posición en el estado de react a propósito. moverlo con un
// setState repintaría el árbol entero en cada pixel de movimiento del ratón; se
// escribe directamente sobre el estilo del nodo y la posición se persigue en un
// requestAnimationFrame, de modo que el halo va un pelo por detrás del cursor y
// el gesto se siente suave en vez de pegado
export default function HaloCursor() {
  const tema = useThemeStore((s) => s.tema)
  const nodo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tema !== 'dark') return
    // quien prefiere menos movimiento en su sistema no debería recibir esto
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // en pantallas táctiles no hay puntero al que seguir
    if (!window.matchMedia('(pointer: fine)').matches) return

    const el = nodo.current
    if (!el) return

    // destino, que salta con el ratón, y posición actual, que lo persigue
    let destinoX = window.innerWidth / 2
    let destinoY = window.innerHeight / 2
    let x = destinoX
    let y = destinoY
    let visible = false
    let raf = 0

    const alMover = (e: MouseEvent) => {
      destinoX = e.clientX
      destinoY = e.clientY
      if (!visible) {
        visible = true
        el.style.opacity = '1'
      }
    }
    const alSalir = () => {
      visible = false
      el.style.opacity = '0'
    }

    const paso = () => {
      // acercamiento proporcional: cuanto más lejos, más rápido, lo que da esa
      // sensación de estela sin necesidad de guardar el recorrido
      x += (destinoX - x) * 0.14
      y += (destinoY - y) * 0.14
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)

    window.addEventListener('mousemove', alMover)
    document.addEventListener('mouseleave', alSalir)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', alMover)
      document.removeEventListener('mouseleave', alSalir)
    }
  }, [tema])

  if (tema !== 'dark') return null

  return (
    <div
      ref={nodo}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 h-72 w-72 rounded-full opacity-0 transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(circle, rgb(var(--accent-soft) / 0.16) 0%, rgb(var(--accent-soft) / 0.055) 42%, transparent 72%)',
        filter: 'blur(46px)',
      }}
    />
  )
}
