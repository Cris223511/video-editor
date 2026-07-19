import type { CSSProperties } from 'react'

// el cristal esmerilado de la casa, definido una sola vez. lo comparten la barra
// de navegación, su menú desplegable y los paneles del sitio, de modo que todos
// se reconozcan como piezas de la misma aplicación
//
// el desenfoque en sí vive en `--cristal-desenfoque` (index.css), así que la
// clase .glass y estos estilos en línea beben de la misma fuente: retocar ese
// valor una vez basta para que cambie todo
export const DESENFOQUE_CRISTAL = 'var(--cristal-desenfoque)'

// la opacidad varía según lo que haya detrás: la barra deja ver más porque el
// contenido pasa por debajo, mientras que un panel con texto necesita apoyarse
// en algo más sólido para que se lea sin esfuerzo
export function cristal(opacidad = 0.94, bordeAlfa = 0.1): CSSProperties {
  return {
    background: `rgb(var(--surface) / ${opacidad})`,
    backdropFilter: DESENFOQUE_CRISTAL,
    WebkitBackdropFilter: DESENFOQUE_CRISTAL,
    border: `1px solid rgb(var(--border) / ${bordeAlfa})`,
  }
}
