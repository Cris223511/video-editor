import { RefObject, useEffect } from 'react'

// cierra un panel flotante cuando se pulsa fuera de él. se usa en los popovers que
// abren opciones (los ajustes de un efecto, un menú, un deslizador de volumen), para
// que un clic en cualquier otro sitio los recoja, como en cualquier app de escritorio.
// escucha pointerdown, que salta antes que el click y funciona igual con ratón o táctil.
// mientras el panel no esté abierto no engancha nada, para no gastar en balde
export function useClickFuera(
  ref: RefObject<HTMLElement | null>,
  alCerrar: () => void,
  activo = true,
): void {
  useEffect(() => {
    if (!activo) return
    const fuera = (e: PointerEvent) => {
      const nodo = ref.current
      if (nodo && !nodo.contains(e.target as Node)) alCerrar()
    }
    // en la fase de captura para que el cierre ocurra aunque el objetivo detenga la
    // propagación del evento más adentro
    document.addEventListener('pointerdown', fuera, true)
    return () => document.removeEventListener('pointerdown', fuera, true)
  }, [ref, alCerrar, activo])
}
