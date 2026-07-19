import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { Campo } from '../../../components/ui/Controls'
import { duracionTotal } from '../../../lib/timeline/clips'
import { formatearDuracion } from '../../../lib/format/duracion'
import { formatearBytes } from '../../../lib/format/bytes'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[color:var(--muted)]">{etiqueta}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  )
}

function fecha(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString()} a las ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ficha del proyecto abierto: cómo se llama, qué contiene y cuánto ocupa. sirve
// para saber de un vistazo con qué se está trabajando sin tener que ir contando
// clips en la línea de tiempo
export default function ProyectoPanel() {
  const titulo = useProjectStore((s) => s.titulo)
  const renombrar = useProjectStore((s) => s.renombrar)
  const medios = useProjectStore((s) => s.medios)
  const creado = useProjectStore((s) => s.creado)
  const guardadoEn = useProjectStore((s) => s.guardadoEn)

  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const numPistas = useEditorStore((s) => s.numPistas)
  const resolucion = useEditorStore((s) => s.resolucion)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)

  const peso = medios.reduce((t, m) => t + m.tamano, 0)
  const porTipo = capas.reduce<Record<string, number>>((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] ?? 0) + 1
    return acc
  }, {})
  const nombresCapa: Record<string, string> = {
    texto: 'texto',
    imagen: 'imagen',
    censura: 'censura',
    figura: 'figura',
  }
  const resumenCapas = Object.entries(porTipo)
    .map(([t, n]) => `${n} de ${nombresCapa[t] ?? t}`)
    .join(', ')

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre del proyecto">
        <input
          value={titulo}
          onChange={(e) => renombrar(e.target.value)}
          spellCheck={false}
          className="w-full rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand"
          style={{
            background: 'rgb(var(--border) / 0.07)',
            border: '1px solid rgb(var(--border) / 0.1)',
          }}
        />
      </Campo>

      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="text-sm font-medium">Contenido</span>
        <Dato etiqueta="Duración" valor={formatearDuracion(duracionTotal(clips))} />
        <Dato etiqueta="Clips" valor={`${clips.length} en ${numPistas} ${numPistas === 1 ? 'nivel' : 'niveles'}`} />
        <Dato etiqueta="Capas" valor={capas.length === 0 ? 'ninguna' : resumenCapas} />
        {audioRegiones.length > 0 && (
          <Dato etiqueta="Franjas de audio" valor={String(audioRegiones.length)} />
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
        <span className="text-sm font-medium">Archivo</span>
        <Dato etiqueta="Lienzo" valor={`${resolucion.ancho}×${resolucion.alto}`} />
        <Dato etiqueta="Medios" valor={`${medios.length} · ${formatearBytes(peso)}`} />
        <Dato etiqueta="Creado" valor={fecha(creado)} />
        <Dato
          etiqueta="Guardado"
          valor={guardadoEn ? fecha(guardadoEn) : 'todavía no'}
        />
      </div>

      <p className="text-xs leading-relaxed text-[color:var(--muted)]">
        Todo esto vive en tu equipo. Los videos no salen del navegador ni al editar ni al guardar.
      </p>
    </div>
  )
}
