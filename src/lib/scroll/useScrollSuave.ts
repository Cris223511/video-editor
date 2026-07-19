import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

// desplazamiento suave del sitio. el editor queda fuera a propósito: ahí la
// rueda del ratón sirve para acercar la línea de tiempo y para recorrer los
// paneles, y un desplazamiento con inercia lo volvería impreciso
// la instancia vive fuera del hook. antes cada componente creaba la suya, así
// que la vista legal llamaba a una que nunca llegó a montarse y sus saltos
// caían al comportamiento nativo del navegador
let instancia: Lenis | null = null

export function useScrollSuave(activo: boolean) {
  const ref = useRef<Lenis | null>(null)

  useEffect(() => {
    if (!activo) return

    // quien prefiere menos movimiento en su sistema no debería recibir inercia
    const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (menosMovimiento) return

    const lenis = new Lenis({
      duration: 1.05,
      // arranca rápido y frena despacio, que es lo que da la sensación de peso
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // en pantallas táctiles el desplazamiento nativo ya se siente bien y
      // añadir inercia encima lo vuelve resbaladizo
      smoothWheel: true,
      touchMultiplier: 1.6,
    })
    ref.current = lenis
    instancia = lenis

    let raf = 0
    const paso = (t: number) => {
      lenis.raf(t)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      ref.current = null
      instancia = null
    }
  }, [activo])

  // lleva la página hasta un elemento respetando el alto de la barra superior.
  // si no hay desplazamiento suave activo, cae al del navegador
  return { irA }
}

// lleva la página hasta un elemento respetando el alto de la barra. cualquier
// componente puede llamarla, monte o no el desplazamiento suave
export function irA(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (instancia) instancia.scrollTo(el, { offset: -96, duration: 1.1 })
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
