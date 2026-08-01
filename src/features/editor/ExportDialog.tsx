import { useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { duracionProyecto } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'
import { exportarProyecto, ControlExport, elegirMime, bitrateVideo, DatosExport, OnProgreso } from '../../lib/export/exportar'
import { exportarRapido } from '../../lib/export/exportarRapido'
import { haiWebCodecs } from '../../lib/export/decode'

type Fase = 'inicio' | 'exportando' | 'listo' | 'error'

// canal de audio que se estima en la mezcla, en bits por segundo. no lo fija la
// grabadora, así que se toma un valor corriente de 128 kbps para que el peso
// mostrado no ignore la pista de sonido
const BITRATE_AUDIO = 128_000

// pasos que recorre la exportación por dentro, en orden. el diálogo los muestra como una lista y va
// marcando cuál está en curso, para que el usuario entienda qué hace (leer, codificar, audio, cerrar)
const PASOS_EXPORT = [
  { id: 'leer', etiqueta: 'Leyendo el video' },
  { id: 'codificar', etiqueta: 'Decodificando y codificando' },
  { id: 'audio', etiqueta: 'Añadiendo el audio' },
  { id: 'empaquetar', etiqueta: 'Empaquetando el archivo' },
] as const

// deduce en qué paso va la exportación a partir de la nota de avance en curso
function pasoDeExport(detalle: string, progreso: number): number {
  if (progreso >= 1) return PASOS_EXPORT.length
  if (/empaquet/i.test(detalle)) return 3
  if (/audio/i.test(detalle)) return 2
  if (/codificando|grabando/i.test(detalle)) return 1
  return 0 // leyendo / preparando
}

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

// fila compacta etiqueta-valor para la ficha de datos del panel de proceso
function FilaInfo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[color:var(--muted)]">{etiqueta}</span>
      <span className="truncate text-right font-medium tabular-nums text-[color:var(--text)]">{valor}</span>
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
  // nota de qué está haciendo la exportación ahora mismo (leyendo, codificando tal segundo,
  // añadiendo el audio…), para que el avance se vea vivo y con contexto, no solo un porcentaje
  const [detalle, setDetalle] = useState('')
  const [error, setError] = useState('')
  const pedirConfirmacion = useEditorStore((s) => s.pedirConfirmacion)
  const [urlSalida, setUrlSalida] = useState('')
  const [extension, setExtension] = useState('mp4')
  // 30 es el valor corriente para material de pantalla; 60 se nota en el
  // movimiento rápido a cambio de un archivo bastante más pesado
  const [fps, setFps] = useState(30)
  // calidad = a cuántos píxeles se limita el lado menor del video. 1080 es el tope; se
  // puede bajar a 720 para un archivo más liviano y una exportación algo más rápida
  const [calidad, setCalidad] = useState(1080)
  const controlRef = useRef<ControlExport | null>(null)
  // contenedor donde se cuelga el lienzo de la exportación mientras dura
  const cajaVista = useRef<HTMLDivElement>(null)

  const estado = useEditorStore.getState()
  const medios = useProjectStore.getState().medios
  const total = duracionProyecto(estado.pista.clips, estado.capas, estado.audios, estado.audioRegiones)
  // resolución de salida: la del proyecto, pero con el lado menor limitado a la calidad
  // elegida (1080 como tope). así un proyecto en 4K sale en 1080p y a 1080p es idéntico
  // a la vista previa. se redondea a par, que es lo que piden los códecs de video
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2)
  const menorProy = Math.min(estado.resolucion.ancho, estado.resolucion.alto)
  const escalaSalida = Math.min(1, calidad / menorProy)
  const ancho = par(estado.resolucion.ancho * escalaSalida)
  const alto = par(estado.resolucion.alto * escalaSalida)

  // formato probable de salida, deducido del mismo mime que elegirá la grabadora
  const formatoSalida = elegirMime().includes('mp4') ? 'MP4' : 'WebM'

  // peso aproximado del archivo: el bitrate de video (que ahora depende del fps
  // elegido) por la duración, más el margen del audio. es una estimación, no un
  // tamaño exacto, porque la grabadora ajusta la calidad según el movimiento. al
  // depender del fps, el peso cambia al elegir 24, 30 o 60
  const bytesEstimados =
    total > 0 ? ((bitrateVideo(ancho, alto, fps) + BITRATE_AUDIO) * total) / 8 : 0

  function cerrarTodo() {
    controlRef.current?.cancelar()
    if (urlSalida) URL.revokeObjectURL(urlSalida)
    setFase('inicio')
    setProgreso(0)
    setDetalle('')
    setError('')
    setUrlSalida('')
    cerrarExport()
  }

  // cerrar o cancelar mientras se exporta tira todo el avance, así que primero se confirma con
  // el modal de siempre; en las otras fases (configurar, listo, error) cierra directo
  function pedirCierre() {
    if (fase === 'exportando') {
      pedirConfirmacion({
        titulo: 'Cancelar exportación',
        mensaje: '¿Seguro que quieres cancelar? Se perderá todo el avance de la exportación.',
        aceptar: 'Sí, cancelar',
        onAceptar: cerrarTodo,
      })
      return
    }
    cerrarTodo()
  }

  // cuelga el lienzo de una exportación en el diálogo para ver por dónde va
  function colgarLienzo(control: ControlExport) {
    requestAnimationFrame(() => {
      const caja = cajaVista.current
      if (!caja || !control.lienzo) return
      control.lienzo.className = 'h-full w-full object-contain'
      caja.replaceChildren(control.lienzo)
    })
  }

  async function iniciar() {
    // se pausa la reproducción del visor para no competir por los videos
    useEditorStore.getState().pausar()
    setFase('exportando')
    setProgreso(0)
    setDetalle('Preparando…')
    setError('')

    const datos: DatosExport = {
      ancho,
      alto,
      fps,
      colorFondo: estado.colorFondo,
      fondo: estado.fondo,
      desenfoqueFondo: estado.desenfoqueFondo,
      fondoGiro: estado.fondoGiro,
      clips: estado.pista.clips,
      capas: estado.capas,
      impactos: estado.impactos,
      marco: estado.marco,
      audioRegiones: estado.audioRegiones,
      audios: estado.audios,
      volumenGlobal: estado.volumenGlobal,
      pistasMeta: estado.pistasMeta,
      urlDeAsset: (id) => medios.find((m) => m.id === id)?.url,
      fileDeAsset: (id) => medios.find((m) => m.id === id)?.file,
    }

    // lanza una exportación con el motor que se le pase y espera su resultado
    const correr = async (motor: (d: DatosExport, p: OnProgreso) => ControlExport) => {
      const control = motor(datos, (v, det) => {
        setProgreso(v)
        if (det !== undefined) setDetalle(det)
      })
      controlRef.current = control
      colgarLienzo(control)
      return control.promesa
    }

    // como correr, pero vigilando que el progreso AVANCE. la ruta rápida (WebCodecs) puede
    // quedarse clavada esperando un cuadro que su decodificador no logra arrancar con ciertos
    // archivos: ni resuelve ni lanza error, así que la exportación se quedaba en 0% para siempre
    // sin llegar nunca a probar la ruta clásica. si no avanza nada en un buen rato, se cancela y
    // se rechaza para poder caer al motor clásico
    const correrVigilado = (
      motor: (d: DatosExport, p: OnProgreso) => ControlExport,
      topeSinAvance = 25000,
    ) =>
      new Promise<Blob>((resolve, reject) => {
        let ultimo = -1
        let marca = performance.now()
        const control = motor(datos, (v, det) => {
          if (v > ultimo + 0.0005) {
            ultimo = v
            marca = performance.now()
          }
          setProgreso(v)
          if (det !== undefined) setDetalle(det)
        })
        controlRef.current = control
        colgarLienzo(control)
        const iv = window.setInterval(() => {
          if (performance.now() - marca > topeSinAvance) {
            window.clearInterval(iv)
            control.cancelar()
            reject(new Error('sin-avance'))
          }
        }, 2000)
        control.promesa.then(
          (b) => {
            window.clearInterval(iv)
            resolve(b)
          },
          (err) => {
            window.clearInterval(iv)
            reject(err)
          },
        )
      })

    try {
      // ruta rápida con WebCodecs cuando el navegador la trae: decodifica y codifica sin
      // pasar por <video> a tiempo real, así que exporta varias veces más rápido. si algo
      // no encaja (un códec que no soporta) o se cuelga sin avanzar, se cae a la ruta clásica
      // sin molestar al usuario
      let blob: Blob | null = null
      if (haiWebCodecs()) {
        try {
          blob = await correrVigilado(exportarRapido)
        } catch (e) {
          // la ruta rápida no pudo (error o cuelgue); se sigue con la clásica más abajo. si el
          // usuario canceló a mano, sí se corta de verdad
          if (e instanceof Error && e.message.includes('cancelada')) throw e
          setProgreso(0)
        }
      }
      if (!blob) blob = await correr(exportarProyecto)

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

  const idxPaso = pasoDeExport(detalle, progreso)
  // cuadros totales del archivo, para mostrar por cuál va (dato real, no solo el porcentaje)
  const cuadrosTotales = Math.max(1, Math.round(total * fps))

  return (
    <Modal
      titulo="Exportar video"
      descripcion="Ajusta la calidad y descarga tu video ya montado en un archivo."
      abierto={abierto}
      onCerrar={pedirCierre}
      // solo la fase de progreso necesita las dos columnas (vista previa + proceso); la de
      // configurar y las de listo/error se quedan angostas, que es lo que pega para su contenido.
      // el ancho de progreso es un punto medio: ni apretado ni tan ancho que la vista previa
      // salga enorme (el dueño lo quería un pelín más chica)
      ancho={fase === 'exportando' ? 'max-w-[47rem]' : 'max-w-lg'}
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
          {/* calidad de salida: el lado menor se limita a 1080 (tope) o 720 */}
          <div className="mb-4">
            <span className="mb-2 block text-[13px] font-medium text-[color:var(--muted)]">
              Calidad
            </span>
            <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--border) / 0.12)' }}>
              {[
                { v: 1080, txt: '1080p', nota: 'Máxima' },
                { v: 720, txt: '720p', nota: 'Más liviano' },
              ].map(({ v, txt, nota }) => {
                const activo = calidad === v
                return (
                  <button
                    key={v}
                    onClick={() => setCalidad(v)}
                    className={[
                      'flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200',
                      activo ? 'bg-brand text-white shadow-sm' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
                    ].join(' ')}
                  >
                    {txt}
                    <span className="ml-1 text-[11px] font-normal opacity-70">{nota}</span>
                  </button>
                )
              })}
            </div>
          </div>

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
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            {/* izquierda: la vista previa (el lienzo donde se dibuja cada cuadro) y la barra */}
            <div className="sm:flex-1">
              <div
                ref={cajaVista}
                className="grid w-full place-items-center overflow-hidden rounded-xl bg-black"
                style={{ aspectRatio: `${ancho} / ${alto}`, maxHeight: '34vh' }}
              />
              <p className="mb-2 mt-3 text-sm font-medium">Exportando… {Math.round(progreso * 100)}%</p>
              <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="relative h-full min-w-[0.75rem] rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(1, progreso)) * 100}%`,
                    backgroundImage: 'linear-gradient(90deg, #1861ff, #4b83ff)',
                  }}
                >
                  <span
                    className="absolute inset-0 rounded-full opacity-60"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                      backgroundSize: '40% 100%',
                      backgroundRepeat: 'no-repeat',
                      animation: 'export-shine 1.4s linear infinite',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* derecha: los pasos del proceso, marcando check el hecho, un girito el que va y
                apagado lo que falta. así se entiende qué hace por dentro (leer, decodificar y
                codificar, mezclar audio, empaquetar), no solo un porcentaje suelto */}
            <div
              className="flex shrink-0 flex-col rounded-xl p-3.5 sm:w-64"
              style={{ background: 'rgb(var(--border) / 0.06)' }}
            >
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Proceso
              </h3>
              <ol className="flex flex-col gap-2.5">
                {PASOS_EXPORT.map((paso, i) => {
                  const hecho = progreso >= 1 || i < idxPaso
                  const activo = progreso < 1 && i === idxPaso
                  return (
                    <li key={paso.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
                        {hecho ? (
                          <Icon name="check" size={15} className="text-emerald-500" />
                        ) : activo ? (
                          <span
                            className="block h-3.5 w-3.5 rounded-full border-2 border-brand border-t-transparent"
                            style={{ animation: 'export-spin 0.7s linear infinite' }}
                          />
                        ) : (
                          <span className="block h-1.5 w-1.5 rounded-full bg-[color:var(--muted)] opacity-40" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={[
                            'block text-[12.5px] leading-tight',
                            hecho || activo ? 'font-medium text-[color:var(--text)]' : 'text-[color:var(--muted)]',
                          ].join(' ')}
                        >
                          {paso.etiqueta}
                        </span>
                        {/* bajo el paso en curso se muestra el dato en vivo: el segundo y el cuadro */}
                        {activo && detalle && (
                          <span className="mt-0.5 block truncate text-[11px] text-[color:var(--muted)]">
                            {detalle}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ol>

              {/* ficha de datos reales del archivo que se está armando, para que la columna diga
                  algo más que los pasos: resolución, calidad, ritmo, formato y por qué cuadro va */}
              <div
                className="mt-4 flex flex-col gap-1.5 border-t pt-3 text-[11.5px]"
                style={{ borderColor: 'rgb(var(--border) / 0.12)' }}
              >
                <FilaInfo etiqueta="Resolución" valor={`${ancho} × ${alto}`} />
                <FilaInfo etiqueta="Calidad" valor={`${calidad}p`} />
                <FilaInfo etiqueta="Ritmo" valor={`${fps} fps`} />
                <FilaInfo etiqueta="Formato" valor={formatoSalida} />
                <FilaInfo
                  etiqueta="Fotograma"
                  valor={`${Math.min(cuadrosTotales, Math.round(progreso * cuadrosTotales))} / ${cuadrosTotales}`}
                />
              </div>
            </div>
          </div>

          <style>{`
            @keyframes export-shine { 0% { background-position: -40% 0; } 100% { background-position: 140% 0; } }
            @keyframes export-spin { to { transform: rotate(360deg); } }
          `}</style>
          {/* el "Cancelar" va en rojo sólido, igual que el botón de peligro de los modales de
              confirmación (mismo fondo de alerta, texto blanco, mismo tamaño), alineado a la derecha */}
          <div className="flex justify-end">
            <button
              onClick={pedirCierre}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
              style={{ background: 'rgb(var(--alerta))' }}
            >
              Cancelar
            </button>
          </div>
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
