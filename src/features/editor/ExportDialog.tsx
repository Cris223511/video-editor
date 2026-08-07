import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { duracionProyecto, resolverSolapes } from '../../lib/timeline/clips'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'
import { exportarProyecto, ControlExport, bitrateSegunMedios, DatosExport, OnProgreso } from '../../lib/export/exportar'
import { exportarRapido } from '../../lib/export/exportarRapido'
import { haiWebCodecs } from '../../lib/export/decode'
import { soportaH265, type Contenedor, type CodecVideo } from '../../lib/export/muxMedios'
import { FORMATOS_EXOTICOS, RECOMPRIME, esExotico, type FormatoExotico } from '../../lib/export/formatos'
import { sinExtensionMedia } from '../../lib/proyecto/nombre'
import AyudaExport from './AyudaExport'
import { Deslizador } from '../../components/ui/Controls'
import { ChevronDown } from 'lucide-react'

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

// una mejora regulable (nitidez, ruido, grano): etiqueta con su ayuda, el valor a la derecha y un
// deslizador de 0 a 100. en 0 muestra "Desactivada" para dejar claro que no aplica nada
function SliderMejora({
  label,
  ayuda,
  valor,
  onChange,
}: {
  label: string
  ayuda: string
  valor: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--muted)]">
          {label}
          <AyudaExport texto={ayuda} />
        </span>
        <span className="text-[13px] font-semibold tabular-nums">
          {valor === 0 ? 'Desactivada' : `${valor}%`}
        </span>
      </div>
      <Deslizador valor={valor} min={0} max={100} paso={5} onChange={onChange} />
    </div>
  )
}

// una mejora de encender o apagar (desentrelazar, mejorar webcam): etiqueta con su ayuda y un
// interruptor deslizante que se pinta de color de marca cuando está activo
function ToggleMejora({
  label,
  ayuda,
  activo,
  onToggle,
}: {
  label: string
  ayuda: string
  activo: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--muted)]">
        {label}
        <AyudaExport texto={ayuda} />
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={onToggle}
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
        style={{ background: activo ? '#1861ff' : 'rgb(var(--border) / 0.35)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: activo ? '1.125rem' : '0.125rem' }}
        />
      </button>
    </div>
  )
}

// escalera de resoluciones que se ofrecen, medidas por el lado menor. de estas solo se muestran
// las que el material de verdad da (nunca más de lo que trae la fuente) y con tope duro en 1080p
const ESCALERA_RES = [144, 240, 360, 480, 720, 1080]

// nombre legible del nivel de compresión, para que el número por sí solo no diga nada. 100 = tal cual
// el original (sin perder calidad); por debajo, cada tramo pesa menos a cambio de algo de calidad
function nombreCompresion(p: number): string {
  if (p >= 100) return 'Original'
  if (p >= 80) return 'Muy alta'
  if (p >= 60) return 'Alta'
  if (p >= 40) return 'Media'
  if (p >= 20) return 'Baja'
  return 'Mínima'
}

// tasa de bits en un texto corto, en megabits por segundo, como la muestran los compresores conocidos
function formatearTasa(bps: number): string {
  return `${(bps / 1_000_000).toFixed(2)} Mbit/s`
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
  // calidad = a cuántos píxeles se limita el lado menor del video. arranca en el tope real del
  // material (se ajusta al abrir el diálogo). nunca sube por encima de lo que da la fuente
  const [calidad, setCalidad] = useState(1080)
  // nivel de compresión, de 10 a 100. en 100 el archivo sale igual que el original (bitrate
  // igualado a la fuente); por debajo, se aprieta más y pesa menos a cambio de algo de calidad
  const [compresion, setCompresion] = useState(100)
  // el bloque de ajustes avanzados arranca plegado: quien no lo abra exporta igual que siempre
  const [avanzado, setAvanzado] = useState(false)
  // contenedor y códec de salida. por defecto mp4 + h264, que es el camino de siempre. webm y mkv, y
  // el códec h265, son opcionales dentro de lo avanzado
  const [formato, setFormato] = useState<Contenedor | FormatoExotico>('mp4')
  const [codecVideo, setCodecVideo] = useState<CodecVideo>('h264')
  // si el equipo puede codificar h265 (no todos traen el codificador); se consulta al abrir
  const [hevcOk, setHevcOk] = useState(false)
  // mejoras opcionales sobre el cuadro, todas apagadas por defecto. los sliders van de 0 a 100 y en 0 no
  // aplican nada; los interruptores arrancan en falso
  const [nitidez, setNitidez] = useState(0)
  const [ruido, setRuido] = useState(0)
  const [grano, setGrano] = useState(0)
  const [desentrelazar, setDesentrelazar] = useState(false)
  const [webcam, setWebcam] = useState(false)
  const [audioRuido, setAudioRuido] = useState(false)
  const [suavizar, setSuavizar] = useState(0)
  // aplicar las mejoras de imagen solo a un tramo del video, en segundos. apagado por defecto (a todo)
  const [tramoActivo, setTramoActivo] = useState(false)
  const [tramoInicio, setTramoInicio] = useState(0)
  const [tramoFin, setTramoFin] = useState(0)
  // peso REAL del archivo terminado, para mostrarlo al final (no el estimado)
  const [tamanoFinal, setTamanoFinal] = useState(0)
  const controlRef = useRef<ControlExport | null>(null)
  // contenedor donde se cuelga el lienzo de la exportación mientras dura
  const cajaVista = useRef<HTMLDivElement>(null)

  const estado = useEditorStore.getState()
  const medios = useProjectStore.getState().medios
  // ritmo del material: el mayor de los videos, redondeado a entero (59.94 sale 60, 143.9 sale 144). es
  // el TOPE que se puede elegir, porque exportar a más fotogramas de los que grabó la fuente solo
  // repetiría cuadros, no añade fluidez. si no se pudo medir ninguno se permite hasta 60, un valor sano
  const fpsFuente = (() => {
    const ritmos = medios
      .filter((m) => m.clase === 'video' && m.fps && m.fps > 0)
      .map((m) => Math.round(m.fps as number))
    return ritmos.length ? Math.max(...ritmos) : 60
  })()
  // opciones ofrecidas: los pasos corrientes que no pasen del tope, más el propio ritmo de la fuente,
  // para que se pueda bajar (menos peso) pero nunca subir por encima de lo grabado
  const opcionesFps = [...new Set([...[24, 30, 48, 60].filter((v) => v <= fpsFuente), fpsFuente])].sort(
    (a, b) => a - b,
  )
  // el título del proyecto, en vivo: es el nombre con el que se descargará el archivo y también
  // el nombre del proyecto. se edita desde el propio diálogo mientras se exporta, así que se lee
  // reactivo (no un snapshot) para reflejar cada tecla, y al descargar se toma el último valor
  const titulo = useProjectStore((s) => s.titulo)
  const total = duracionProyecto(resolverSolapes(estado.pista.clips), estado.capas, estado.audios, estado.audioRegiones)
  // resolución de salida: la del proyecto, pero con el lado menor limitado a la calidad
  // elegida (1080 como tope). así un proyecto en 4K sale en 1080p y a 1080p es idéntico
  // a la vista previa. se redondea a par, que es lo que piden los códecs de video
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2)
  const menorProy = Math.min(estado.resolucion.ancho, estado.resolucion.alto)
  // tope real de calidad: lo que da el material, sin pasar de 1080p (nada de 1440p ni 4K a propósito).
  // de la escalera solo se ofrecen los peldaños por debajo del tope, más el propio tope como "Máxima".
  // así un proyecto de 480p ofrece hasta 480p y uno de 4K se corta en 1080p
  const topeCalidad = Math.min(1080, menorProy)
  const opcionesCalidad = [...ESCALERA_RES.filter((v) => v < topeCalidad), topeCalidad]
  // la calidad elegida nunca pasa del tope (por si venía de un proyecto anterior más grande)
  const calidadReal = Math.min(calidad, topeCalidad)
  const escalaSalida = Math.min(1, calidadReal / menorProy)
  const ancho = par(estado.resolucion.ancho * escalaSalida)
  const alto = par(estado.resolucion.alto * escalaSalida)

  // los formatos exóticos (mov, avi, wmv, flv, 3gp) no los arma el navegador: se exporta primero un mp4
  // con h264 por el camino de siempre y después ffmpeg.wasm lo reempaqueta al envase pedido. por eso, con
  // uno de ellos elegido, el motor produce mp4/h264 y no hay elección de códec
  const exotico = esExotico(formato)
  const formatoMotor: Contenedor = exotico ? 'mp4' : formato
  // códecs que ofrece el contenedor elegido: webm va con vp9 sí o sí; mp4 y mkv con h264, y h265 solo si
  // el equipo lo puede codificar. el códec efectivo se corrige solo si el elegido no cabe en el formato
  const codecsDisponibles: CodecVideo[] =
    formatoMotor === 'webm' ? ['vp9'] : hevcOk ? ['h264', 'h265'] : ['h264']
  const codecReal: CodecVideo = exotico
    ? 'h264'
    : codecsDisponibles.includes(codecVideo)
      ? codecVideo
      : codecsDisponibles[0]
  // texto del formato para la ficha y la extensión del archivo descargado
  const formatoTexto = formato.toUpperCase()

  // peso aproximado del archivo: el bitrate de video (que ahora depende del fps
  // elegido) por la duración, más el margen del audio. es una estimación, no un
  // tamaño exacto, porque la grabadora ajusta la calidad según el movimiento. al
  // depender del fps, el peso cambia al elegir 24, 30 o 60
  // bitrate base: igualado al del material original para que, en 100, el video salga tal cual. el nivel
  // de compresión lo escala hacia abajo (nunca por encima, ampliar no añade detalle). sirve para el peso
  // estimado y la tasa de bits que se muestran en vivo, y se le pasa a los motores de exportación
  const bitrateBase = bitrateSegunMedios(medios, ancho, alto, fps, fpsFuente)
  const bitrateObjetivo = Math.max(100_000, Math.round((bitrateBase * compresion) / 100))
  const bytesEstimados = total > 0 ? ((bitrateObjetivo + BITRATE_AUDIO) * total) / 8 : 0

  // al abrir el diálogo se parte del tope real del material (la mejor calidad que da), con la compresión
  // en original y lo avanzado plegado. así, sin tocar nada, se exporta con la misma calidad de siempre
  useEffect(() => {
    if (!abierto) return
    setCalidad(topeCalidad)
    // se parte del ritmo de la fuente, para exportar tal cual sin tocar nada
    setFps(fpsFuente)
    setCompresion(100)
    setAvanzado(false)
    setFormato('mp4')
    setCodecVideo('h264')
    setNitidez(0)
    setRuido(0)
    setGrano(0)
    setDesentrelazar(false)
    setWebcam(false)
    setAudioRuido(false)
    setSuavizar(0)
    setTramoActivo(false)
    setTramoInicio(0)
    setTramoFin(total)
  }, [abierto, topeCalidad])

  // al abrir se consulta si el equipo puede codificar h265, para ofrecerlo solo cuando de verdad se puede
  useEffect(() => {
    if (!abierto) return
    let vivo = true
    soportaH265(ancho, alto).then((ok) => {
      if (vivo) setHevcOk(ok)
    })
    return () => {
      vivo = false
    }
  }, [abierto, ancho, alto])

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
      // el motor siempre recibe un contenedor que sabe hacer (mp4/webm/mkv); si el usuario pidió un
      // formato exótico, se produce mp4 y se convierte después
      formato: formatoMotor,
      codecVideo: codecReal,
      // se pasan siempre; el motor no monta nada si están todas en cero o apagadas
      filtros: {
        nitidez,
        ruido,
        grano,
        desentrelazar,
        webcam,
        audioRuido,
        suavizar,
        tramo: tramoActivo ? { inicio: tramoInicio, fin: tramoFin } : undefined,
      },
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

      // si el usuario pidió un formato exótico, el mp4 recién hecho se reempaqueta con ffmpeg.wasm, que
      // se carga solo en este momento (import dinámico). el remux de mov/avi/flv/3gp no recomprime; wmv sí
      if (exotico) {
        setDetalle(RECOMPRIME[formato as FormatoExotico] ? 'Recomprimiendo a ' + formatoTexto + '…' : 'Convirtiendo a ' + formatoTexto + '…')
        setProgreso(0.99)
        const { transcodificar } = await import('../../lib/export/ffmpegExport')
        blob = await transcodificar(blob, formato as FormatoExotico)
      }

      // la extensión: si es exótico, la del propio formato; si no, sale del tipo real del archivo (así
      // vale igual para el camino de siempre y para webm/mkv; si el rápido cayó al clásico, mp4 o webm)
      const ext = exotico
        ? (formato as FormatoExotico)
        : blob.type.includes('matroska')
          ? 'mkv'
          : blob.type.includes('webm')
            ? 'webm'
            : 'mp4'
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
          {/* ficha de resumen: lo que va a salir, de un vistazo. el peso se recalcula solo al mover la
              calidad, el ritmo o la compresión, así que siempre refleja lo elegido */}
          <dl className="mb-5 flex flex-col">
            <Dato nombre="Resolución" valor={`${ancho} × ${alto} px`} />
            <Dato nombre="Duración" valor={formatearDuracion(total)} />
            <Dato nombre="Formato de salida" valor={formatoTexto} />
            <Dato
              nombre="Peso estimado"
              valor={bytesEstimados > 0 ? `≈ ${formatearBytes(bytesEstimados)}` : 'No disponible'}
            />
          </dl>

          {/* calidad de salida: la escalera de resoluciones se arma según lo que da el material, con tope
              en 1080p. no se ofrece más de lo que trae la fuente, porque ampliar no mejora, solo emborrona */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-[color:var(--muted)]">Calidad</span>
              <AyudaExport texto="La resolución del video final. A mayor resolución, más nitidez en la imagen y más peso en el archivo. Solo se ofrece hasta la que ya tiene tu video." />
            </div>
            <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--border) / 0.12)' }}>
              {opcionesCalidad.map((v) => {
                const activo = calidadReal === v
                const esMax = v === topeCalidad
                return (
                  <button
                    key={v}
                    onClick={() => setCalidad(v)}
                    className={[
                      'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all duration-200',
                      activo ? 'bg-brand text-white shadow-sm' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
                    ].join(' ')}
                  >
                    {v}p
                    {esMax && <span className="ml-1 text-[10px] font-normal opacity-70">Máx</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ritmo de fotografías por segundo. el dueño prefiere "fotografías" antes que "imágenes" */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-[color:var(--muted)]">Fotografías por segundo</span>
              <AyudaExport texto="Cuántas imágenes se muestran por segundo. Un valor más alto da un movimiento más fluido y un archivo más pesado." />
            </div>
            <div
              className="flex gap-1 rounded-xl p-1"
              style={{ background: 'rgb(var(--border) / 0.12)' }}
            >
              {opcionesFps.map((v) => {
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

          {fps >= 60 && (
            <p className="mb-4 text-xs italic leading-relaxed text-[color:var(--muted)]">
              A muchas fotografías por segundo el movimiento se percibe más fluido, aunque el archivo
              resulta bastante más pesado. Bajar el ritmo aligera el archivo.
            </p>
          )}

          {/* ajustes avanzados: plegados por defecto. quien no los abra exporta con lo de arriba, igual
              que siempre. dentro va el nivel de compresión, con la tasa de bits y el peso en vivo */}
          <div className="mb-5 overflow-hidden rounded-xl" style={{ border: '1px solid rgb(var(--border) / 0.14)' }}>
            <button
              type="button"
              onClick={() => setAvanzado((a) => !a)}
              aria-expanded={avanzado}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left text-[13px] font-semibold transition-colors hover:bg-[rgb(var(--border)/0.06)]"
            >
              <span>Ajustes avanzados</span>
              <ChevronDown
                size={18}
                className="shrink-0 text-[color:var(--muted)] transition-transform duration-200"
                style={{ transform: avanzado ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {avanzado && (
              <div className="border-t px-3.5 pb-4 pt-3.5" style={{ borderColor: 'rgb(var(--border) / 0.12)' }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--muted)]">
                    Nivel de compresión
                    <AyudaExport texto="El equilibrio entre la calidad de la imagen y el peso del archivo. A mayor compresión, menor tamaño. El nivel Original mantiene la calidad de tu video." />
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums">
                    {nombreCompresion(compresion)}{' '}
                    <span className="text-[color:var(--muted)]">({compresion}%)</span>
                  </span>
                </div>
                <Deslizador valor={compresion} min={10} max={100} paso={5} onChange={setCompresion} />
                {/* lectura en vivo: la tasa de bits y el peso cambian conforme se mueve el control, igual
                    que en los compresores conocidos, para que se vea el efecto al instante */}
                <div
                  className="mt-3 flex flex-col gap-1.5 rounded-lg p-2.5 text-[12px]"
                  style={{ background: 'rgb(var(--border) / 0.08)' }}
                >
                  <FilaInfo etiqueta="Tasa de bits" valor={formatearTasa(bitrateObjetivo)} />
                  <FilaInfo
                    etiqueta="Peso estimado"
                    valor={bytesEstimados > 0 ? `≈ ${formatearBytes(bytesEstimados)}` : '—'}
                  />
                </div>
                {compresion < 100 && (
                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-[color:var(--muted)]">
                    Estás aplicando una compresión mayor que la original. El archivo pesará menos, aunque
                    puede perder algo de calidad. Vuelve al nivel Original para conservarla por completo.
                  </p>
                )}

                {/* formato de salida (contenedor) y códec del video. mp4/webm/mkv los arma el navegador;
                    mov/avi/wmv/flv/3gp se convierten desde el mp4 con ffmpeg, así que no llevan elección
                    de códec (el remux conserva el h264, salvo wmv que recomprime) */}
                <div className="mt-4 border-t pt-3.5" style={{ borderColor: 'rgb(var(--border) / 0.1)' }}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-[color:var(--muted)]">Formato</span>
                    <AyudaExport texto="El tipo de archivo en el que se guarda el video. MP4 es el más compatible y los demás sirven para usos o programas concretos." />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['mp4', 'webm', 'mkv', ...FORMATOS_EXOTICOS] as (Contenedor | FormatoExotico)[]).map((f) => {
                      const activo = formato === f
                      return (
                        <button
                          key={f}
                          onClick={() => setFormato(f)}
                          className={[
                            'rounded-lg border py-2 text-[12.5px] font-semibold transition-all duration-200',
                            activo
                              ? 'border-brand bg-brand text-white shadow-sm'
                              : 'border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]',
                          ].join(' ')}
                          style={activo ? undefined : { background: 'rgb(var(--border) / 0.12)' }}
                        >
                          {f.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>

                  {/* el códec solo se elige en los formatos nativos; los exóticos van con h264 heredado */}
                  {!exotico && (
                    <>
                      <div className="mb-2 mt-4 flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-[color:var(--muted)]">Códec</span>
                        <AyudaExport texto="El método con el que se comprime el video. H.264 es el más compatible y H.265 pesa menos con la misma calidad." />
                      </div>
                      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--border) / 0.12)' }}>
                        {codecsDisponibles.map((c) => {
                          const activo = codecReal === c
                          const txt = c === 'h264' ? 'H.264' : c === 'h265' ? 'H.265' : 'VP9'
                          return (
                            <button
                              key={c}
                              onClick={() => setCodecVideo(c)}
                              className={[
                                'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all duration-200',
                                activo ? 'bg-brand text-white shadow-sm' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
                              ].join(' ')}
                            >
                              {txt}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                  {!exotico && formato === 'webm' && (
                    <p className="mt-2 text-[11.5px] leading-relaxed text-[color:var(--muted)]">
                      WebM usa el códec VP9. Para elegir H.264 o H.265, cambia a MP4 o MKV.
                    </p>
                  )}
                  {!exotico && !hevcOk && formato !== 'webm' && (
                    <p className="mt-2 text-[11.5px] leading-relaxed text-[color:var(--muted)]">
                      Este equipo no puede codificar H.265, así que por ahora solo está disponible H.264.
                    </p>
                  )}
                  {exotico && (
                    <p className="mt-3 text-[11.5px] leading-relaxed text-[color:var(--muted)]">
                      {RECOMPRIME[formato as FormatoExotico]
                        ? `${formatoTexto} recomprime el video a su propio códec, así que puede perder algo de calidad y tarda más.`
                        : `${formatoTexto} se genera desde un MP4 sin recomprimir, así que conserva la misma calidad.`}{' '}
                      La primera vez descarga una herramienta de conversión, por eso puede tardar un poco más.
                    </p>
                  )}
                </div>

                {/* mejoras que se aplican al cuadro antes de codificar. son opcionales: en 0 o apagadas
                    no tocan nada */}
                <div className="mt-4 border-t pt-3.5" style={{ borderColor: 'rgb(var(--border) / 0.1)' }}>
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    Mejoras
                  </h4>
                  <SliderMejora
                    label="Nitidez"
                    ayuda="Realza los bordes y los detalles para que la imagen se vea más definida."
                    valor={nitidez}
                    onChange={setNitidez}
                  />
                  <SliderMejora
                    label="Reducir ruido"
                    ayuda="Atenúa el grano que aparece en los videos grabados con poca luz o con la cámara de un teléfono."
                    valor={ruido}
                    onChange={setRuido}
                  />
                  <SliderMejora
                    label="Grano de película"
                    ayuda="Añade una textura fina, parecida a la del cine, para darle a la imagen un aspecto más natural."
                    valor={grano}
                    onChange={setGrano}
                  />
                  <SliderMejora
                    label="Suavizar movimiento"
                    ayuda="Suaviza el movimiento combinando cada imagen con la anterior para reducir la sensación de saltos."
                    valor={suavizar}
                    onChange={setSuavizar}
                  />
                  <div className="mt-1 flex flex-col gap-2.5">
                    <ToggleMejora
                      label="Desentrelazar"
                      ayuda="Corrige el material antiguo, como el de cintas VHS o cámaras de años atrás, que muestra líneas horizontales al haber movimiento."
                      activo={desentrelazar}
                      onToggle={() => setDesentrelazar((v) => !v)}
                    />
                    <ToggleMejora
                      label="Mejorar webcam"
                      ayuda="Mejora integral para las grabaciones de cámara web. Reduce el ruido, aporta nitidez y aviva el color."
                      activo={webcam}
                      onToggle={() => setWebcam((v) => !v)}
                    />
                    <ToggleMejora
                      label="Reducir ruido de audio"
                      ayuda="Limpia el sonido, no la imagen. Elimina el zumbido y los ruidos de fondo para que la voz se escuche más clara."
                      activo={audioRuido}
                      onToggle={() => setAudioRuido((v) => !v)}
                    />
                    <ToggleMejora
                      label="Aplicar solo a un tramo"
                      ayuda="Aplica las mejoras de imagen solo a la parte del video que elijas, en lugar de a todo."
                      activo={tramoActivo}
                      onToggle={() => setTramoActivo((v) => !v)}
                    />
                  </div>

                  {/* deslizadores del tramo: desde y hasta, en segundos. solo salen si el tramo está activo */}
                  {tramoActivo && total > 0 && (
                    <div className="mt-3 flex flex-col gap-3 rounded-lg p-2.5" style={{ background: 'rgb(var(--border) / 0.08)' }}>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[12px]">
                          <span className="text-[color:var(--muted)]">Desde</span>
                          <span className="font-semibold tabular-nums">{formatearDuracion(tramoInicio)}</span>
                        </div>
                        <Deslizador
                          valor={tramoInicio}
                          min={0}
                          max={total}
                          paso={0.1}
                          onChange={(v) => setTramoInicio(Math.min(v, tramoFin - 0.2))}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[12px]">
                          <span className="text-[color:var(--muted)]">Hasta</span>
                          <span className="font-semibold tabular-nums">{formatearDuracion(tramoFin)}</span>
                        </div>
                        <Deslizador
                          valor={tramoFin}
                          min={0}
                          max={total}
                          paso={0.1}
                          onChange={(v) => setTramoFin(Math.max(v, tramoInicio + 0.2))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
              valor. lleva SIEMPRE un borde y un fondo tenues para que se lea de una que es un campo
              editable (sin ellos, en reposo parecía solo texto suelto), y se marca más al pasar el
              cursor o enfocarlo. el ".mp4" (o ".webm") va FUERA del campo, para dejar claro qué se le
              concatena */}
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
                className="min-w-0 flex-1 rounded-lg border border-[rgb(var(--border)/0.28)] bg-[rgb(var(--border)/0.04)] px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 hover:border-[rgb(var(--border)/0.5)] hover:bg-[rgb(var(--border)/0.07)] focus:border-brand focus:bg-[rgb(var(--border)/0.09)]"
              />
              <span className="shrink-0 text-sm font-semibold text-[color:var(--muted)]">
                .{formato}
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
                <FilaInfo etiqueta="Formato" valor={formatoTexto} />
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
