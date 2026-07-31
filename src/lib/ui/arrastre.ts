// imagen de arrastre reducida para las tarjetas de las galerías (transiciones, efectos,
// impactos). por defecto el navegador usa la tarjeta entera como fantasma, y cuando el panel
// está en una sola columna esa tarjeta es grande y tapa media pantalla al arrastrar. aquí se
// clona la tarjeta, se encoge y se usa esa versión pequeña como imagen de arrastre.
//
// el clon se mete dentro de un contenedor del tamaño ya reducido y con overflow oculto: así el
// navegador rasteriza el contenedor (que sí pinta al hijo escalado) y el transform se respeta,
// cosa que setDragImage no hace si se le pasa el elemento escalado directamente. el clon se quita
// en el siguiente tick, cuando el navegador ya tomó su foto
export function imagenArrastreReducida(
  e: React.DragEvent<HTMLElement>,
  escala = 0.6,
) {
  const nodo = e.currentTarget
  const rect = nodo.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  const w = rect.width * escala
  const h = rect.height * escala

  const contenedor = document.createElement('div')
  contenedor.style.cssText = `position:fixed;top:-2000px;left:0;width:${w}px;height:${h}px;overflow:hidden;pointer-events:none;z-index:-1`

  const clon = nodo.cloneNode(true) as HTMLElement
  clon.style.width = `${rect.width}px`
  clon.style.height = `${rect.height}px`
  clon.style.margin = '0'
  clon.style.transform = `scale(${escala})`
  clon.style.transformOrigin = 'top left'
  contenedor.appendChild(clon)
  document.body.appendChild(contenedor)

  // el punto de agarre se pone en el centro de la miniatura reducida, para que el fantasma
  // no salte respecto al cursor al empezar a arrastrar
  e.dataTransfer.setDragImage(contenedor, w / 2, h / 2)
  setTimeout(() => contenedor.remove(), 0)
}
