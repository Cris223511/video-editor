import { useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { duracionTotal } from '../../lib/timeline/timeline'
import { formatearDuracion } from '../../lib/format/bytes'
import { exportarProyecto, ControlExport } from '../../lib/export/exportar'

type Fase = 'inicio' | 'exportando' | 'listo' | 'error'

// diálogo de exportación con fondo desenfocado (glassmorphism). muestra el
// progreso y, al terminar, descarga el archivo
export default function ExportDialog() {
  const abierto = useAppStore((s) => s.exportAbierto)
  const cerrarExport = useAppStore((s) => s.cerrarExport)

  const [fase, setFase] = useState<Fase>('inicio')
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [urlSalida, setUrlSalida] = useState('')
  const [extension, setExtension] = useState('mp4')
  const controlRef = useRef<ControlExport | null>(null)

  if (!abierto) return null

  const estado = useEditorStore.getState()
  const medios = useProjectStore.getState().medios
  const total = duracionTotal(estado.pista.clips)

  function cerrarTodo() {
    controlRef.current?.cancelar()
    if (urlSalida) URL.revokeObjectURL(urlSalida)
    setFase('inicio')
    setProgreso(0)
    setError('')
    setUrlSalida('')
    cerrarExport()
  }

  async function iniciar() {
    // se pausa la reproducción del visor para no competir por los videos
    useEditorStore.getState().pausar()
    setFase('exportando')
    setProgreso(0)
    setError('')

    const control = exportarProyecto(
      {
        ancho: estado.resolucion.ancho,
        alto: estado.resolucion.alto,
        colorFondo: estado.colorFondo,
        clips: estado.pista.clips,
        capas: estado.capas,
        marco: estado.marco,
        audioRegiones: estado.audioRegiones,
        volumenGlobal: estado.volumenGlobal,
        urlDeAsset: (id) => medios.find((m) => m.id === id)?.url,
      },
      (v) => setProgreso(v),
    )
    controlRef.current = control

    try {
      const blob = await control.promesa
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      setExtension(ext)
      const url = URL.createObjectURL(blob)
      setUrlSalida(url)
      setFase('listo')
      // descarga automática
      const a = document.createElement('a')
      a.href = url
      a.download = `video-editor.${ext}`
      a.click()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar.')
      setFase('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Exportar video</h2>
          <button
            onClick={cerrarTodo}
            className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] hover:text-[color:var(--text)]"
          >
            <Icon name="cerrar" size={18} />
          </button>
        </div>

        {fase === 'inicio' && (
          <>
            <div className="mb-5 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Resolución</span>
                <span>
                  {estado.resolucion.ancho}×{estado.resolucion.alto}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Duración</span>
                <span>{formatearDuracion(total)}</span>
              </div>
            </div>
            <p className="mb-5 text-xs leading-relaxed text-[color:var(--muted)]">
              La exportación se hace en tu equipo, en tiempo real, con alta calidad. Mantén esta
              pestaña activa mientras dura.
            </p>
            <button
              onClick={iniciar}
              disabled={total <= 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              <Icon name="exportar" size={18} /> Exportar
            </button>
          </>
        )}

        {fase === 'exportando' && (
          <>
            <p className="mb-3 text-sm">Exportando… {Math.round(progreso * 100)}%</p>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-150"
                style={{ width: `${progreso * 100}%` }}
              />
            </div>
            <button
              onClick={cerrarTodo}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm font-medium transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
            >
              Cancelar
            </button>
          </>
        )}

        {fase === 'listo' && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Icon name="check" size={26} />
            </span>
            <p className="text-sm">La descarga empezó. Si no, usa el botón.</p>
            <a
              href={urlSalida}
              download={`video-editor.${extension}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              <Icon name="exportar" size={18} /> Descargar de nuevo
            </a>
            <button onClick={cerrarTodo} className="text-sm text-[color:var(--muted)] hover:text-[color:var(--text)]">
              Cerrar
            </button>
          </div>
        )}

        {fase === 'error' && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-500">
              <Icon name="alerta" size={26} />
            </span>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setFase('inicio')}
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
