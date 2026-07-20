import { ReactNode } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaTexto } from '../../../types/layers'
import { Campo, Deslizador, ColorCampo, Interruptor, Segmentado } from '../../../components/ui/Controls'
import Selector from '../../../components/ui/Selector'
import MotionControls from './MotionControls'

const FUENTES = [
  'Inter',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Roboto',
  'Montserrat',
  'Poppins',
]

// botón de estilo tipo negrita/cursiva/subrayado
function BotonEstilo({
  activo,
  onClick,
  titulo,
  children,
}: {
  activo: boolean
  onClick: () => void
  titulo: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={[
        'flex h-8 flex-1 items-center justify-center rounded-lg border text-sm transition-colors',
        activo
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-black/10 text-[color:var(--muted)] hover:text-[color:var(--text)] dark:border-white/10',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// editor de la capa de texto seleccionada: contenido, tipografía, color, estilo,
// fondo, contorno, sombra y brillo. la posición y la franja de tiempo se ajustan
// en el visor y en la línea de tiempo
export default function TextPanel() {
  const capas = useEditorStore((s) => s.capas)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const agregarTexto = useEditorStore((s) => s.agregarTexto)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)

  const capa = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'texto') as
    | CapaTexto
    | undefined

  function editar<K extends keyof CapaTexto>(campo: K, valor: CapaTexto[K]) {
    if (capa) actualizarCapa(capa.id, { [campo]: valor } as Partial<CapaTexto>)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={agregarTexto}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
      >
        <Icon name="mas" size={16} /> Agregar texto
      </button>

      {!capa ? (
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">
          Añade un texto y colócalo sobre el video. Podrás arrastrarlo en el visor y decidir en la
          línea de tiempo de qué segundo a qué segundo aparece.
        </p>
      ) : (
        <>
          <Campo etiqueta="Contenido">
            <textarea
              value={capa.texto}
              onChange={(e) => editar('texto', e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand dark:border-white/10"
            />
          </Campo>

          <Campo etiqueta="Fuente">
            {/* cada tipografía se ve escrita con su propia letra, algo que el
                desplegable nativo del sistema no permite */}
            <Selector
              valor={capa.fuente}
              opciones={FUENTES.map((f) => ({ valor: f, etiqueta: f, estilo: { fontFamily: f } }))}
              onChange={(v) => editar('fuente', v)}
            />
          </Campo>

          <Campo etiqueta={`Tamaño (${capa.tamano} px)`}>
            <Deslizador valor={capa.tamano} min={8} max={400} onChange={(v) => editar('tamano', v)} />
          </Campo>

          <div className="flex gap-1">
            <BotonEstilo activo={capa.negrita} onClick={() => editar('negrita', !capa.negrita)} titulo="Negrita">
              <b>B</b>
            </BotonEstilo>
            <BotonEstilo activo={capa.cursiva} onClick={() => editar('cursiva', !capa.cursiva)} titulo="Cursiva">
              <i>I</i>
            </BotonEstilo>
            <BotonEstilo
              activo={capa.subrayado}
              onClick={() => editar('subrayado', !capa.subrayado)}
              titulo="Subrayado"
            >
              <u>U</u>
            </BotonEstilo>
          </div>

          <Campo etiqueta="Alineación">
            <Segmentado
              valor={capa.alineacion}
              opciones={[
                { valor: 'left', etiqueta: 'Izq.' },
                { valor: 'center', etiqueta: 'Centro' },
                { valor: 'right', etiqueta: 'Der.' },
              ]}
              onChange={(v) => editar('alineacion', v)}
            />
          </Campo>

          <Campo etiqueta="Color">
            <ColorCampo valor={capa.color} onChange={(v) => editar('color', v)} />
          </Campo>

          <Campo etiqueta={`Opacidad (${capa.opacidad}%)`}>
            <Deslizador valor={capa.opacidad} min={0} max={100} onChange={(v) => editar('opacidad', v)} />
          </Campo>

          <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
            <Interruptor etiqueta="Fondo" activo={capa.fondo} onChange={(v) => editar('fondo', v)} />
            {capa.fondo && (
              <>
                <ColorCampo valor={capa.colorFondo} onChange={(v) => editar('colorFondo', v)} />
                <Campo etiqueta={`Opacidad del fondo (${capa.opacidadFondo}%)`}>
                  <Deslizador
                    valor={capa.opacidadFondo}
                    min={0}
                    max={100}
                    onChange={(v) => editar('opacidadFondo', v)}
                  />
                </Campo>
                <Campo etiqueta={`Redondeo del fondo (${capa.radioFondo} px)`}>
                  <Deslizador
                    valor={capa.radioFondo}
                    min={0}
                    max={80}
                    onChange={(v) => editar('radioFondo', v)}
                  />
                </Campo>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
            <Interruptor etiqueta="Contorno" activo={capa.contorno} onChange={(v) => editar('contorno', v)} />
            {capa.contorno && (
              <>
                <ColorCampo valor={capa.colorContorno} onChange={(v) => editar('colorContorno', v)} />
                <Campo etiqueta={`Grosor (${capa.grosorContorno} px)`}>
                  <Deslizador
                    valor={capa.grosorContorno}
                    min={1}
                    max={20}
                    onChange={(v) => editar('grosorContorno', v)}
                  />
                </Campo>
              </>
            )}
          </div>

          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            <Interruptor etiqueta="Sombra" activo={capa.sombra} onChange={(v) => editar('sombra', v)} />
          </div>

          <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
            <Interruptor etiqueta="Brillo" activo={capa.brillo} onChange={(v) => editar('brillo', v)} />
            {capa.brillo && (
              <>
                <ColorCampo valor={capa.colorBrillo} onChange={(v) => editar('colorBrillo', v)} />
                <Campo etiqueta={`Intensidad (${capa.intensidadBrillo}%)`}>
                  <Deslizador
                    valor={capa.intensidadBrillo}
                    min={0}
                    max={100}
                    onChange={(v) => editar('intensidadBrillo', v)}
                  />
                </Campo>
              </>
            )}
          </div>

          <MotionControls capa={capa} />

          <button
            onClick={() => quitarCapa(capa.id)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Icon name="papelera" size={16} /> Eliminar texto
          </button>
        </>
      )}
    </div>
  )
}
