import { useEffect, useRef, useState } from 'react'

// conserva fijo el ancho del contenido de un panel mientras este se pliega o se
// despliega. si no, al animar el ancho del panel el texto de dentro se reflowea
// y da la impresión de aplastarse; con el ancho congelado el contenido queda
// quieto y solo se revela o se recorta. la caja externa recorta con overflow
// hidden y este ancho gobierna el bloque interno, posicionado en absoluto.
//
// devuelve la ref que va en la caja externa y el ancho que hay que aplicar al
// bloque interno: un valor en píxeles durante la animación, o 100% en reposo
// para que el contenido vuelva a seguir al panel cuando el usuario lo redimensiona
export function useCongelarAncho(plegando: boolean) {
  const ref = useRef<HTMLElement>(null)
  // último ancho que llegamos a ver desplegado; sirve de destino al reabrir,
  // cuando el panel arranca desde cero y no hay ancho actual del que partir
  const ultimo = useRef(0)
  const [fijo, setFijo] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.getBoundingClientRect().width
    if (plegando) {
      // al comenzar la animación tomamos el ancho de partida. si el panel venía
      // plegado (ancho casi nulo) recurrimos al último que registramos, que es
      // justo el ancho al que va a volver
      const objetivo = w > 4 ? w : ultimo.current
      if (objetivo > 4) {
        ultimo.current = objetivo
        setFijo(objetivo)
      }
    } else {
      // acabada la animación, si el panel quedó visible guardamos su ancho y
      // soltamos el contenido para que vuelva a acompañar al panel
      if (w > 4) ultimo.current = w
      setFijo(null)
    }
  }, [plegando])

  // fuera de la animación conviene ir anotando los cambios de ancho por si el
  // usuario arrastra el separador y luego pliega: así el destino al reabrir es
  // el ancho real y no uno viejo
  useEffect(() => {
    const el = ref.current
    if (!el || plegando) return
    const obs = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width
      if (w > 4) ultimo.current = w
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [plegando])

  const estiloAncho = fijo != null ? `${fijo}px` : '100%'
  return { ref, estiloAncho }
}
