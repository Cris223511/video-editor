import { useEffect, useRef, useState } from 'react'
import Icon, { NombreIcono } from '../../../components/ui/Icon'
import { useEditorStore, Herramienta } from '../../../store/useEditorStore'

// colores de acento de cada carril, los mismos que pintan sus bloques en la
// pista: ámbar para texto y figuras, verde para audio y el color de marca para
// el video
const ACENTO_TEXTO = '#f59e0b'
const ACENTO_AUDIO = '#10b981'

// agregar un nivel dejó de ser un botón fijo al pie de la columna, que se veía
// pesado. ahora es un «+» discreto colgado del borde inferior del bloque de
// video: asoma al pasar el cursor por la columna de cabeceras y, al pulsarlo,
// abre el mismo menú con los tres tipos de carril. la pista de video se crea de
// verdad; texto y audio, al existir un único carril de cada uno, solo llevan el
// foco allí seleccionando su herramienta para empezar a añadir contenido
export default function AgregarNivelMenu() {
  const agregarPista = useEditorStore((s) => s.agregarPista)
  const numPistas = useEditorStore((s) => s.numPistas)
  const setHerramienta = useEditorStore((s) => s.setHerramienta)

  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  // cerrar al pulsar fuera del menú es lo que se espera de un desplegable; sin
  // esto quedaría abierto tapando la pista hasta volver a pulsar el botón
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: globalThis.MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    window.addEventListener('mousedown', fuera)
    return () => window.removeEventListener('mousedown', fuera)
  }, [abierto])

  const topeVideo = numPistas >= 6

  const opciones: {
    icono: NombreIcono
    texto: string
    ayuda: string
    acento?: string
    desactivado?: boolean
    al: () => void
  }[] = [
    {
      icono: 'video',
      texto: 'Pista de video',
      ayuda: topeVideo ? 'Alcanzaste el máximo de niveles' : 'Un nuevo nivel encima de los clips',
      desactivado: topeVideo,
      al: () => agregarPista(),
    },
    {
      icono: 'texto',
      texto: 'Texto y figuras',
      ayuda: 'Ir al carril de texto para empezar a añadir',
      acento: ACENTO_TEXTO,
      al: () => setHerramienta('texto' as Herramienta),
    },
    {
      icono: 'audio',
      texto: 'Audio',
      ayuda: 'Ir al carril de audio para ajustar el volumen',
      acento: ACENTO_AUDIO,
      al: () => setHerramienta('audio' as Herramienta),
    },
  ]

  return (
    // colgado del borde inferior del bloque de video y centrado; translate-y lo
    // deja montado sobre esa línea. no ocupa alto en el flujo, así que los
    // carriles de abajo no se descuadran con la columna del lado derecho
    <div
      ref={contenedor}
      className="absolute inset-x-0 bottom-0 z-40 flex translate-y-1/2 justify-center"
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Agregar nivel"
        title="Agregar nivel"
        className={[
          'interactivo grid h-6 w-6 place-items-center rounded-full shadow-md ring-2 transition-all duration-150',
          abierto
            ? 'scale-100 opacity-100'
            : 'scale-90 opacity-0 group-hover/cols:scale-100 group-hover/cols:opacity-100 focus-visible:scale-100 focus-visible:opacity-100',
        ].join(' ')}
        style={{
          background: 'rgb(var(--brand))',
          color: 'white',
          // el aro del color del fondo recorta el botón sobre la línea divisoria
          '--tw-ring-color': 'rgb(var(--surface))',
        } as React.CSSProperties}
      >
        <Icon name="mas" size={14} />
      </button>

      {/* el panel se despliega hacia abajo: el «+» queda cerca del borde
          superior de la línea de tiempo, así que abrirlo hacia arriba lo
          recortaría contra los controles del visor. hacia abajo hay sitio de
          sobra sobre los carriles */}
      <div
        className={[
          'absolute top-full left-1/2 z-50 mt-2 w-44 -translate-x-1/2 transition-all duration-150 ease-out',
          abierto
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-1 opacity-0',
        ].join(' ')}
      >
        <div
          className="flex flex-col gap-0.5 rounded-xl p-1.5 shadow-xl"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.12)',
          }}
        >
          {opciones.map((o) => (
            <button
              key={o.texto}
              disabled={o.desactivado}
              onClick={() => {
                o.al()
                setAbierto(false)
              }}
              className="interactivo flex items-start gap-2 rounded-lg px-2 py-1.5 text-left disabled:pointer-events-none disabled:opacity-40"
            >
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                style={{
                  background: o.acento ? `${o.acento}22` : 'rgb(var(--brand) / 0.14)',
                  color: o.acento ?? 'rgb(var(--brand))',
                }}
              >
                <Icon name={o.icono} size={14} />
              </span>
              <span className="flex flex-col">
                <span className="text-[12px] font-medium text-[color:var(--text)]">{o.texto}</span>
                <span className="text-[10.5px] leading-tight text-[color:var(--muted)]">
                  {o.ayuda}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
