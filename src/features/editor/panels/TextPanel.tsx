import { ReactNode } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaTexto } from '../../../types/layers'
import { Campo, Deslizador, ColorCampo, Interruptor, Segmentado, BOTON_AGREGAR } from '../../../components/ui/Controls'
import Selector from '../../../components/ui/Selector'
import MotionControls from './MotionControls'
import { cristal } from '../../../components/sitio/cristal'

// tipografías ofrecidas. las dos primeras van empaquetadas con la aplicación; el
// resto son fuentes corrientes del sistema (en windows están casi todas), así que
// se ven de verdad tanto en el visor como al exportar sin descargar nada
const FUENTES = [
  'Inter',
  'Plus Jakarta Sans',
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Candara',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Corbel',
  'Courier New',
  'Franklin Gothic Medium',
  'Georgia',
  'Impact',
  'Lucida Sans',
  'Palatino Linotype',
  'Segoe UI',
  'Sitka',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
]

// valores de interlineado con nombre, para el desplegable de más opciones que
// sale por encima del control. cubren de muy ajustado a muy amplio
const PRESETS_INTERLINEADO = [
  { nombre: 'Ajustado', valor: 0.9 },
  { nombre: 'Normal', valor: 1.2 },
  { nombre: 'Cómodo', valor: 1.5 },
  { nombre: 'Espacioso', valor: 2 },
  { nombre: 'Doble', valor: 2.5 },
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
export default function TextPanel({ ocultarAgregar = false }: { ocultarAgregar?: boolean } = {}) {
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
      {!ocultarAgregar && (
        <button onClick={agregarTexto} className={BOTON_AGREGAR}>
          <Icon name="mas" size={16} /> {capa ? 'Agregar otro texto' : 'Agregar texto'}
        </button>
      )}

      {capa && (
        <>
          {/* el contenido se escribe con doble clic sobre el propio texto en el
              visor, que es más directo que ir al panel. el campo que había aquí
              duplicaba esa misma edición y solo ocupaba sitio */}
          <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
            Haz doble clic sobre el texto en el visor para escribirlo.
          </p>

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

          {/* interlineado con su deslizador fino y, al lado, un botón que despliega
              por encima una lista de valores con nombre para elegir de un vistazo */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] text-[color:var(--muted)]">
                Interlineado: <b className="text-brand">{(capa.interlineado ?? 1.2).toFixed(2)}</b>
              </span>
              <div className="group/il relative">
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
                  style={{ border: '1px solid rgb(var(--border) / 0.16)' }}
                >
                  Más opciones
                </button>
                <div
                  className="invisible absolute bottom-full right-0 z-30 mb-2 w-44 translate-y-1 rounded-xl p-1.5 opacity-0 shadow-xl transition-all duration-200 group-hover/il:visible group-hover/il:translate-y-0 group-hover/il:opacity-100"
                  style={cristal(0.85, 0.14)}
                >
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                    Separación entre líneas
                  </p>
                  {PRESETS_INTERLINEADO.map((p) => (
                    <button
                      key={p.nombre}
                      type="button"
                      onClick={() => editar('interlineado', p.valor)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-brand/10 hover:text-brand"
                    >
                      <span>{p.nombre}</span>
                      <span className="text-[11px] text-[color:var(--muted)]">{p.valor.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Deslizador
              valor={Math.round((capa.interlineado ?? 1.2) * 100)}
              min={70}
              max={300}
              onChange={(v) => editar('interlineado', v / 100)}
            />
          </div>

          <Campo etiqueta={`Espaciado entre letras (${capa.tracking ?? 0} px)`}>
            <Deslizador
              valor={capa.tracking ?? 0}
              min={-10}
              max={60}
              onChange={(v) => editar('tracking', v)}
            />
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
