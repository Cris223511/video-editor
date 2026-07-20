import { useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { HUECO_PISTA } from './ClipBlock'

// tope de niveles de video: coincide con MAX_PISTAS del store. pasado ese número
// no se ofrece insertar, igual que la guía celeste del arrastre deja de aparecer
const MAX_PISTAS = 6

// insertar un nivel dejó de vivir en un «+» fijo al pie de la columna. ahora se
// hace posando el cursor sobre la separación entre dos cabeceras: ahí brota una
// línea celeste y un «+» con su tooltip, y al pulsarlo nace la pista justo en ese
// hueco. es el mismo lenguaje visual que la guía que promete crear un nivel al
// soltar un clip entre dos filas, para que ambas cosas se sientan iguales.
// se monta absoluto dentro del bloque de cabeceras de video, sin ocupar sitio en
// el flujo, así que no descuadra los carriles de texto y audio de abajo
export default function AgregarNivelGuia() {
  const numPistas = useEditorStore((s) => s.numPistas)
  const altosPista = useEditorStore((s) => s.altosPista)
  const insertarPistaEn = useEditorStore((s) => s.insertarPistaEn)
  // separación sobre la que está el cursor; solo esa muestra su línea y su botón
  const [activa, setActiva] = useState<number | null>(null)

  // con el máximo de niveles ocupado no hay dónde insertar
  if (numPistas >= MAX_PISTAS) return null

  // distancia desde la cima del bloque (la pista de índice mayor) hasta el borde
  // inferior de la pista p, sumando los huecos que quedan entre medias. con ella
  // se sitúa cada separación en el punto exacto que le toca
  const bordeInferior = (p: number) => {
    let y = 0
    for (let v = numPistas - 1; v > p; v--) y += altosPista[v] + HUECO_PISTA
    return y + altosPista[p]
  }
  const alturaBloque = bordeInferior(0)

  // un sitio de inserción por cada separación posible: encima del nivel más
  // alto, entre cada par de niveles y debajo del más bajo. el índice k es el que
  // espera insertarPistaEn, los mismos valores que marca la guía del arrastre
  const separaciones: { k: number; y: number }[] = [{ k: numPistas, y: -HUECO_PISTA / 2 }]
  for (let p = numPistas - 1; p >= 1; p--) {
    separaciones.push({ k: p, y: bordeInferior(p) + HUECO_PISTA / 2 })
  }
  separaciones.push({ k: 0, y: alturaBloque + HUECO_PISTA / 2 })

  return (
    <>
      {separaciones.map(({ k, y }) => {
        const visible = activa === k
        return (
          <div
            key={k}
            onMouseEnter={() => setActiva(k)}
            onMouseLeave={() => setActiva((a) => (a === k ? null : a))}
            className="absolute inset-x-0 z-40 flex items-center justify-center"
            // la franja sensible se apoya un poco por debajo del borde de la
            // pista de arriba para no pisar su tirador de alto, que vive justo en
            // ese canto. queda holgada de sobra para acertarla con el cursor
            style={{ top: y - 4, height: 12 }}
          >
            {/* la línea celeste cruza la columna de lado a lado, con un halo
                tenue que la hace notar sin pesar. redondeada en las puntas */}
            <span
              className="pointer-events-none absolute inset-x-1 h-0.5 rounded-full transition-opacity duration-150"
              style={{
                background: '#38bdf8',
                boxShadow: '0 0 6px rgba(56,189,248,0.85)',
                opacity: visible ? 1 : 0,
              }}
            />
            {/* la ayuda va gobernada por el mismo estado de hover en vez de un
                tooltip al uso: así aparece con seguridad en cuanto brota la guía,
                sin depender de que el cursor vuelva a entrar en un botón que hasta
                ese instante no recibía el ratón */}
            <span
              className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg transition-opacity duration-150"
              style={{
                background: 'rgb(var(--surface))',
                color: 'var(--text)',
                border: '1px solid rgb(var(--border) / 0.16)',
                boxShadow: '0 8px 24px rgb(6 12 24 / 0.18)',
                opacity: visible ? 1 : 0,
              }}
            >
              Insertar un nivel aquí
            </span>
            <button
              onClick={() => insertarPistaEn(k)}
              aria-label="Insertar un nivel aquí"
              className={[
                'interactivo relative grid h-6 w-6 place-items-center rounded-full shadow-md ring-2 transition-all duration-150',
                visible ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0',
              ].join(' ')}
              style={{
                background: '#38bdf8',
                color: 'white',
                // el aro del color del fondo recorta el botón limpio sobre la línea
                '--tw-ring-color': 'rgb(var(--surface))',
              } as React.CSSProperties}
            >
              <Icon name="mas" size={14} />
            </button>
          </div>
        )
      })}
    </>
  )
}
