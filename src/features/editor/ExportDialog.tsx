import { useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { duracionTotal } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'
import { exportarProyecto, ControlExport, elegirMime, bitrateVideo } from '../../lib/export/exportar'

type Fase = 'inicio' | 'exportando' | 'listo' | 'error'

// canal de audio que se estima en la mezcla, en bits por segundo. no lo fija la
// grabadora, así que se toma un valor corriente de 128 kbps para que el peso
// mostrado no ignore la pista de sonido
const BITRATE_AUDIO = 128_000

// fila de dato con etiqueta a la izquierda y valor a la derecha, la misma
// disposición ordenada que usa la ficha de un medio
function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 py-2"
      style={{ borderBottom: '1px solid rgb(var(--border) / 0.08)' }}
    >
      <dt className="shrink-0 text-[13px] text-[color:var(--muted)]">{nombre}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium">{valor}</dd>
    </div>
  )
}

// diálogo de exportación. se apoya en el Modal compartido para heredar el
// desenfoque de fondo que cubre toda la pantalla (barra superior incluida), la
// aparición y el cierre suaves y el centrado. muestra los datos de la salida,
// deja elegir las imágenes por segundo y, al terminar, descarga el archivo
export default function ExportDialog() {
  const abierto = useAppStore((s) => s.exportAbierto)
  const cerrarExport = useAppStore((s) => s.cerrarExport)

  const [fase, setFase] = useState<Fase>('inicio')
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [urlSalida, setUrlSalida] = useState('')
  const [extension, setExtension] = useState('mp4')
  // 30 es el valor corriente para material de pantalla; 60 se nota en el
  // movimiento rápido a cambio de un archivo bastante más pesado
  const [fps, setFps] = useState(30)
  const controlRef = useRef<ControlExport | null>(null)

  const estado = useEditorStore.getState()
  const medios = useProjectStore.getState().medios
  const total = duracionTotal(estado.pista.clips)
  const { ancho, alto } = estado.resolucion

  // formato probable de salida, deducido del mismo mime que elegirá la grabadora
  const formatoSalida = elegirMime().includes('mp4') ? 'MP4' : 'WebM'

  // peso aproximado del archivo: el bitrate de video por la duración, más el
  // margen del audio. es una estimación, no un tamaño exacto, porque la
  // grabadora ajusta la calidad según el movimiento de cada fotograma
  const bytesEstimados =
    total > 0 ? ((bitrateVideo(ancho, alto) + BITRATE_AUDIO) * total) / 8 : 0

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
        fps,
        colorFondo: estado.colorFondo,
        fondo: estado.fondo,
        desenfoqueFondo: estado.desenfoqueFondo,
        clips: estado.pista.clips,
        capas: estado.capas,
        marco: estado.marco,
        audioRegiones: estado.audioRegiones,
        volumenGlobal: estado.volumenGlobal,
        pistasMeta: estado.pistasMeta,
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
    <Modal
      titulo="Exportar video"
      descripcion="Se genera en tu equipo, en tiempo real y con alta calidad."
      abierto={abierto}
      onCerrar={cerrarTodo}
      ancho="max-w-lg"
    >
      {fase === 'inicio' && (
        <>
          <dl className="mb-5 flex flex-col">
            <Dato nombre="Resolución" valor={`${ancho} × ${alto} px`} />
            <Dato nombre="Duración" valor={formatearDuracion(total)} />
            <Dato nombre="Formato de salida" valor={formatoSalida} />
            <Dato
              nombre="Peso estimado"
              valor={bytesEstimados > 0 ? `≈ ${formatearBytes(bytesEstimados)}` : 'No disponible'}
            />
          </dl>

          {/* control segmentado de imágenes por segundo: los tres valores viven
              dentro de una misma cápsula y el activo se resalta con un chip de
              color que se desliza con una transición suave */}
          <div className="mb-4">
            <span className="mb-2 block text-[13px] font-medium text-[color:var(--muted)]">
              Imágenes por segundo
            </span>
            <div
              className="flex gap-1 rounded-xl p-1"
              style={{ background: 'rgb(var(--border) / 0.12)' }}
            >
              {[24, 30, 60].map((v) => {
                const activo = fps === v
                return (
                  <button
                    key={v}
                    onClick={() => setFps(v)}
                    className={[
                      'flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200',
                      activo
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
                    ].join(' ')}
                  >
                    {v}
                    <span className="ml-1 text-[11px] font-normal opacity-70">fps</span>
                  </button>
                )
              })}
            </div>
          </div>

          {fps === 60 && (
            <p className="mb-4 text-xs italic leading-relaxed text-[color:var(--muted)]">
              A 60 imágenes por segundo el movimiento se ve más suave, pero el archivo pesa
              bastante más y la exportación tarda lo mismo que dura el video.
            </p>
          )}
          <p className="mb-5 text-xs leading-relaxed text-[color:var(--muted)]">
            El peso es una estimación a partir de la resolución y la duración; el tamaño real
            varía según el movimiento del video. Mantén esta pestaña activa mientras dura.
          </p>
          <button
            onClick={iniciar}
            disabled={total <= 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95 disabled:opacity-50"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm font-medium transition-colors duration-200 hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
          >
            <Icon name="exportar" size={18} /> Descargar de nuevo
          </a>
          <button onClick={cerrarTodo} className="text-sm text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--text)]">
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
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
          >
            Reintentar
          </button>
        </div>
      )}
    </Modal>
  )
}
