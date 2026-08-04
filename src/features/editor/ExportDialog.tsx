import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { duracionProyecto } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'
import { exportarProyecto, ControlExport, elegirMime, bitrateSegunMedios, DatosExport, OnProgreso } from '../../lib/export/exportar'
import { exportarRapido } from '../../lib/export/exportarRapido'
import { haiWebCodecs } from '../../lib/export/decode'
import { sinExtensionMedia } from '../../lib/proyecto/nombre'

type Fase = 'inicio' | 'exportando' | 'listo' | 'error'

// canal de audio que se estima en la mezcla, en bits por segundo. no lo fija la
// grabadora, así que se toma un valor corriente de 128 kbps para que el peso
// mostrado no ignore la pista de sonido
const BITRATE_AUDIO = 128_000

// pasos que recorre la exportación por dentro, en orden. el diálogo los muestra como una lista y va
// marcando cuál está en curso, para que el usuario entienda qué hace (leer, codificar, audio, cerrar)
const PASOS_EXPORT = [
  { id: 'leer', etiqueta: 'Leyendo el video' },
  { id: 'codificar', etiqueta: 'Procesando el video' },
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

// nombre de archivo válido en cualquier sistema a partir del título del proyecto: se quitan
// las tildes y todo lo que no sea letra, número, espacio o guion, y los espacios pasan a guiones.
// si queda vacío se cae a un nombre por defecto para no descargar un archivo sin nombre
function limpiarNombre(titulo: string): string {
  const base = sinExtensionMedia(titulo)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return base || 'video-editor'
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
  // barra SUAVIZADA: la que se muestra. el progreso real de la lectura/desarmado del video no da
  // avances (es una espera), así que la barra se quedaba en 0 y luego pegaba un salto. con esto la
  // barra trepa despacio hacia un tope mientras se lee y, en cuanto el progreso real avanza, lo
  // sigue; nunca retrocede. así el usuario ve movimiento continuo, sin brusquedad
  const [barra, setBarra] = useState(0)
  const progresoRef = useRef(0)
  progresoRef.current = progreso
  // instante en que arrancó la exportación, para estimar cuánto falta (ETA)
  const inicioRef = useRef(0)
  // bucle que copia el lienzo de trabajo a la vista, a ritmo pausado (para que no salte)
  const vistaRafRef = useRef<number | null>(null)
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
  // peso REAL del archivo terminado, para mostrarlo al final (no el estimado)
  const [tamanoFinal, setTamanoFinal] = useState(0)
  const controlRef = useRef<ControlExport | null>(null)
  // contenedor donde se cuelga el lienzo de la exportación mientras dura
  const cajaVista = useRef<HTMLDivElement>(null)

  const estado = useEditorStore.getState()
  const medios = useProjectStore.getState().medios
  // el título del proyecto, en vivo: es el nombre con el que se descargará el archivo y también
  // el nombre del proyecto. se edita desde el propio diálogo mientras se exporta, así que se lee
  // reactivo (no un snapshot) para reflejar cada tecla, y al descargar se toma el último valor
  const titulo = useProjectStore((s) => s.titulo)
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
  // bitrate objetivo: igualado al del material original para que el video salga tal cual. sirve para
  // el peso estimado y se le pasa a los motores de exportación
  const bitrateObjetivo = bitrateSegunMedios(medios, ancho, alto, fps)
  const bytesEstimados = total > 0 ? ((bitrateObjetivo + BITRATE_AUDIO) * total) / 8 : 0

  function cerrarTodo() {
    controlRef.current?.cancelar()
    if (vistaRafRef.current) cancelAnimationFrame(vistaRafRef.current)
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

  // cuelga en el diálogo una vista del avance de la exportación. NO se muestra el lienzo de trabajo
  // directo: la ruta rápida lo redibuja cientos de veces por segundo y la vista saltaba y "retrocedía"
  // de golpe. en su lugar se pinta un lienzo PROPIO al que se copia el de trabajo a un ritmo pausado
  // (~14/seg), así el avance se ve fluido y sin tirones
  function colgarLienzo(control: ControlExport) {
    if (vistaRafRef.current) cancelAnimationFrame(vistaRafRef.current)
    requestAnimationFrame(() => {
      const caja = cajaVista.current
      const fuente = control.lienzo
      if (!caja || !fuente) return
      const vista = document.createElement('canvas')
      vista.width = fuente.width || 16
      vista.height = fuente.height || 9
      vista.className = 'h-full w-full object-contain'
      caja.replaceChildren(vista)
      const vctx = vista.getContext('2d')
      let ultimo = 0
      const copiar = (ts: number) => {
        if (vctx && fuente.width > 0 && ts - ultimo > 70) {
          ultimo = ts
          if (vista.width !== fuente.width) vista.width = fuente.width
          if (vista.height !== fuente.height) vista.height = fuente.height
          try {
            vctx.drawImage(fuente, 0, 0)
          } catch {
            // el lienzo de trabajo puede estar entre redibujos; se ignora y se reintenta
          }
        }
        vistaRafRef.current = requestAnimationFrame(copiar)
      }
      vistaRafRef.current = requestAnimationFrame(copiar)
    })
  }

  async function iniciar() {
    // se pausa la reproducción del visor para no competir por los videos
    useEditorStore.getState().pausar()
    setFase('exportando')
    setProgreso(0)
    setBarra(0)
    setDetalle('Preparando…')
    setError('')
    inicioRef.current = performance.now()

    const datos: DatosExport = {
      ancho,
      alto,
      fps,
      bitrateObjetivo,
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
          // se va DIRECTO por software. la decodificación por hardware se cuelga en algunos equipos
          // (solo dejan un decodificador y una transición necesita dos, así que el segundo se traba):
          // antes se intentaba hardware, se procesaba casi todo, se clavaba cerca del final y volvía a
          // empezar de cero por software, y el usuario veía "Procesando el video" dos veces. yendo por
          // software desde el arranque la exportación es de corrido, sin ese doble procesado. sigue
          // siendo WebCodecs (mucho más rápido que la ruta clásica a tiempo real)
          blob = await correrVigilado((d, p) => exportarRapido(d, p, { preferirSoftware: true }))
        } catch (e) {
          if (e instanceof Error && e.message.includes('cancelada')) throw e
          // si aun así falla (un códec que WebCodecs no soporta), cae a la ruta clásica
          setProgreso(0)
        }
      }
      if (!blob) blob = await correr(exportarProyecto)

      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      setExtension(ext)
      setTamanoFinal(blob.size)
      const url = URL.createObjectURL(blob)
      setUrlSalida(url)
      setFase('listo')
      // descarga automática
      const a = document.createElement('a')
      a.href = url
      // el nombre sale del título del proyecto tal como quedó al terminar (el usuario pudo
      // seguir escribiéndolo mientras exportaba); se lee ahora, no al abrir el diálogo
      a.download = `${limpiarNombre(useProjectStore.getState().titulo)}.${ext}`
      a.click()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar.')
      setFase('error')
    } finally {
      // se corta el bucle que copiaba el lienzo de trabajo a la vista: ya no hace falta
      if (vistaRafRef.current) cancelAnimationFrame(vistaRafRef.current)
    }
  }

  const idxPaso = pasoDeExport(detalle, progreso)
  // cuadros totales del archivo, para mostrar por cuál va (dato real, no solo el porcentaje)
  const cuadrosTotales = Math.max(1, Math.round(total * fps))
  // estimación de lo que falta: a partir de lo que se lleva hecho y el tiempo transcurrido. es una
  // aproximación (el ritmo no es constante), así que se marca con "~". se usa la barra suavizada
  const transcurrido = fase === 'exportando' ? (performance.now() - inicioRef.current) / 1000 : 0
  const eta = barra > 0.03 && barra < 1 ? Math.max(0, Math.round((transcurrido * (1 - barra)) / barra)) : null
  const restante = eta === null ? '—' : eta >= 60 ? `~${Math.round(eta / 60)} min` : `~${eta} s`
  // tamaño aproximado que se lleva escrito, sobre la estimación total del archivo
  const pesoParcial = bytesEstimados > 0 ? formatearBytes(bytesEstimados * Math.min(1, barra)) : '—'

  // anima la barra suavizada mientras dura la exportación: se acerca al progreso real un poquito
  // por fotograma (movimiento continuo, sin saltos), y si el real está casi parado —la lectura del
  // video— trepa asintóticamente hasta un tope discreto para que no se vea colgada en 0
  useEffect(() => {
    if (fase !== 'exportando') {
      setBarra(0)
      return
    }
    let raf = 0
    const tick = () => {
      setBarra((b) => {
        const real = progresoRef.current
        // la cola de la exportación (terminar de codificar, escribir el audio y empaquetar) deja el
        // progreso real clavado un rato en ~0.97, y la barra se veía congelada. cuando ya está muy
        // avanzada pero sin terminar, la barra sigue trepando SOLA hacia el tope, despacio, para que
        // nunca se vea parada; el progreso real, cuando pega un salto, igual la empuja por encima
        const enCola = real >= 0.9 && real < 1
        const objetivo = real < 0.03 ? 0.12 : enCola ? 0.995 : real
        const nb = b + (objetivo - b) * (enCola ? 0.012 : 0.06)
        // nunca retrocede; el progreso real manda en cuanto lo supera; tope 0.995 hasta el final
        return Math.min(0.995, Math.max(b, real, nb))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fase])
  // al terminar de verdad, la barra llega al 100 sin quedarse en el tope
  const barraMostrada = progreso >= 1 ? 1 : barra

  return (
    <Modal
      titulo="Exportar video"
      // el subtítulo solo tiene sentido al configurar; mientras se exporta estorba y el dueño lo
      // quería fuera, así que a partir de esa fase no se muestra
      descripcion={fase === 'inicio' ? 'Ajusta la calidad y descarga tu video ya montado en un archivo.' : undefined}
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
          {/* nombre del archivo, editable mientras se exporta. es el mismo título del proyecto:
              lo que se escriba aquí lo renombra en vivo, y al terminar la descarga usa el último
              valor. se ve como texto normal y al pasar el cursor o enfocarlo se marca como campo,
              con el ".mp4" (o ".webm") FUERA del campo para dejar claro qué se le concatena */}
          <div className="mb-4">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              Nombre del archivo
            </span>
            <div className="flex items-center gap-2">
              <input
                value={titulo}
                onChange={(e) => useProjectStore.setState({ titulo: e.target.value })}
                placeholder="Nombre del video"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 hover:border-[rgb(var(--border)/0.45)] hover:bg-[rgb(var(--border)/0.06)] focus:border-brand focus:bg-[rgb(var(--border)/0.09)]"
              />
              <span className="shrink-0 text-sm font-semibold text-[color:var(--muted)]">
                .{formatoSalida === 'MP4' ? 'mp4' : 'webm'}
              </span>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            {/* izquierda: la vista previa (el lienzo donde se dibuja cada cuadro) y la barra */}
            <div className="sm:flex-1">
              <div
                ref={cajaVista}
                className="grid w-full place-items-center overflow-hidden rounded-xl bg-black"
                style={{ aspectRatio: `${ancho} / ${alto}`, maxHeight: '30vh' }}
              />
              {/* el título de abajo dice el PASO en curso (Leyendo el video, Decodificando…), no un
                  genérico "Exportando", y la barra avanza con el total; así se ve en todo momento
                  qué se está haciendo y cuánto falta */}
              <p className="mb-2 mt-3 text-sm font-medium">
                {progreso >= 1 ? 'Listo' : `${PASOS_EXPORT[idxPaso]?.etiqueta ?? 'Exportando'}…`}{' '}
                {progreso < 1 && (
                  <span className="text-[color:var(--muted)]">{Math.round(barraMostrada * 100)}%</span>
                )}
              </p>
              <div className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="relative h-full min-w-[0.75rem] rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(1, barraMostrada)) * 100}%`,
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
              className="flex shrink-0 flex-col rounded-xl p-3.5 sm:w-80"
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
                <FilaInfo etiqueta="Tamaño" valor={pesoParcial} />
                <FilaInfo etiqueta="Falta" valor={restante} />
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
          {/* check de éxito animado: el aro aparece con un rebote corto, el visto se DIBUJA solo
              (la línea se traza) y a su alrededor salta un estallido de rayitas suaves que se abren
              y se desvanecen, para que terminar de exportar se sienta como un logro y no un aviso seco */}
          <div className="relative grid h-[76px] w-[76px] place-items-center">
            <span className="exito-chispas" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <i key={i} style={{ ['--r' as string]: `${i * 45}deg` }} />
              ))}
            </span>
            <svg viewBox="0 0 76 76" className="h-[76px] w-[76px]">
              <circle className="exito-aro" cx="38" cy="38" r="34" />
              <path className="exito-tic" d="M24 39.5 l9.5 9.5 L53 28.5" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h3 className="font-display text-[16px] font-bold">¡Tu video está listo!</h3>
            <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
              Ya se armó el archivo y la descarga empezó sola. Si tu navegador no la mostró, guárdalo
              con el botón de abajo.
            </p>
            {/* peso REAL del archivo terminado, para que se vea cuánto ocupó de verdad */}
            {tamanoFinal > 0 && (
              <span
                className="mt-1 rounded-full px-3 py-1 text-[12.5px] font-semibold tabular-nums"
                style={{ background: 'rgb(16 185 129 / 0.14)', color: 'rgb(16 185 129)' }}
              >
                Peso: {formatearBytes(tamanoFinal)}
              </span>
            )}
          </div>
          <a
            href={urlSalida}
            download={`${limpiarNombre(titulo)}.${extension}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
          >
            <Icon name="exportar" size={18} /> Descargar de nuevo
          </a>
          {/* sin botón "Cerrar" aparte: para cerrar está la X roja de arriba a la derecha */}
          <style>{`
            .exito-aro {
              fill: rgb(16 185 129 / 0.14);
              stroke: rgb(16 185 129);
              stroke-width: 2.5;
              transform-origin: center;
              animation: exito-pop 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            .exito-tic {
              fill: none;
              stroke: rgb(16 185 129);
              stroke-width: 4.2;
              stroke-linecap: round;
              stroke-linejoin: round;
              stroke-dasharray: 44;
              stroke-dashoffset: 44;
              animation: exito-trazo 0.5s 0.24s cubic-bezier(0.65, 0, 0.35, 1) forwards;
            }
            .exito-chispas { position: absolute; inset: 0; }
            .exito-chispas i {
              position: absolute;
              left: 50%; top: 50%;
              width: 2.5px; height: 10px;
              margin: -5px 0 0 -1.25px;
              border-radius: 3px;
              background: rgb(16 185 129 / 0.85);
              transform: rotate(var(--r)) translateY(-8px) scaleY(0.4);
              opacity: 0;
              animation: exito-chispa 0.62s 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
            @keyframes exito-pop {
              0% { transform: scale(0.5); opacity: 0; }
              60% { transform: scale(1.08); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes exito-trazo { to { stroke-dashoffset: 0; } }
            @keyframes exito-chispa {
              0% { transform: rotate(var(--r)) translateY(-8px) scaleY(0.4); opacity: 0; }
              35% { opacity: 1; }
              100% { transform: rotate(var(--r)) translateY(-34px) scaleY(1); opacity: 0; }
            }
          `}</style>
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
