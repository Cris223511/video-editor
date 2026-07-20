import { useEffect, useRef, useState } from 'react'
import Icon, { NombreIcono } from '../../../components/ui/Icon'
import { useEditorStore, Herramienta } from '../../../store/useEditorStore'

// colores de acento de cada carril, los mismos que pintan sus bloques en la
// pista: ámbar para texto y figuras, verde para audio y el color de marca para
// el video
const ACENTO_TEXTO = '#f59e0b'
const ACENTO_AUDIO = '#10b981'

// el botón «Agregar nivel» dejó de añadir siempre una pista de video y ahora
// abre este menú, donde se elige qué tipo de carril interesa. la pista de video
// se crea de verdad; las opciones de texto y audio, al existir un solo carril de
// cada uno, se limitan a llevar el foco allí seleccionando su herramienta para
// empezar a añadir contenido
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
    <div ref={contenedor} className="relative mt-1.5">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="interactivo flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-[color:var(--muted)]"
        style={{ border: '1px dashed rgb(var(--border) / 0.2)' }}
      >
        <Icon name="mas" size={14} />
        Agregar nivel
      </button>

      {/* el panel se abre hacia arriba: el botón está al pie de la columna y,
          dentro del contenedor con desplazamiento, un menú hacia abajo quedaría
          recortado */}
      <div
        className={[
          'absolute bottom-full left-0 z-50 mb-1 w-full min-w-[11rem] transition-all duration-150 ease-out',
          abierto
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-1 opacity-0',
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
