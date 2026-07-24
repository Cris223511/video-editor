import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore, CLAVE_SESION } from '../../store/useProjectStore'
import { guardarProyecto, leerProyecto } from './almacen'
import { clipEnTiempo, duracionTotal } from '../timeline/clips'
import { frameDeVideo } from '../media/probeVideo'
import { MediaAsset } from '../../types/media'
import {
  guardadoAMedio,
  medioAGuardado,
  ProyectoGuardado,
  VERSION_FORMATO,
} from './formato'

// arma la portada del proyecto para la lista. con línea de tiempo montada, se
// toma el fotograma que se ve justo en la mitad del montaje: se busca qué clip
// cae en ese instante y se captura el frame de su medio en el segundo que le
// corresponde, teniendo en cuenta el recorte y la velocidad, igual que haría el
// visor. sin nada montado, se cae al fotograma de la mitad del primer medio, que
// ya viene calculado. si no hay medios, queda vacía y la lista pinta su marcador
async function calcularPortada(): Promise<string> {
  const ed = useEditorStore.getState()
  const medios = useProjectStore.getState().medios
  const clips = ed.pista.clips

  if (clips.length > 0) {
    const total = duracionTotal(clips)
    const ordenados = [...clips].sort((a, b) => a.inicio - b.inicio)
    const activo = clipEnTiempo(ordenados, total / 2) ?? ordenados[0]
    const medio = medios.find((m) => m.id === activo.assetId)
    if (medio) {
      const segundoFuente = activo.recorteInicio + (total / 2 - activo.inicio) * activo.velocidad
      const frame = await frameDeVideo(medio.url, segundoFuente)
      if (frame) return frame
    }
  }

  return medios[0]?.miniatura ?? ''
}

// recoge el estado vivo del editor y lo deja listo para guardar. el id se pasa
// desde fuera: si es el de un proyecto ya existente se sobrescribe, y si es uno
// nuevo se crea otra entrada
export function capturarProyecto(id: string, creado: number, portada: string): ProyectoGuardado {
  const ed = useEditorStore.getState()
  const pr = useProjectStore.getState()
  const medios = pr.medios.map(medioAGuardado)

  return {
    version: VERSION_FORMATO,
    id,
    titulo: pr.titulo,
    creado,
    modificado: Date.now(),
    portada,
    medios,
    edicion: {
      clips: ed.pista.clips,
      numPistas: ed.numPistas,
      altosPista: ed.altosPista,
      // el estado completo de los carriles: cuántos niveles hay de cada tipo, su
      // orden, sus alturas y nombres, y el ancho de la columna de cabeceras. así
      // reordenar, añadir o borrar filas y renombrar sobrevive a un refresco
      pistasMeta: ed.pistasMeta,
      nivelesTexto: ed.nivelesTexto,
      nivelesAudio: ed.nivelesAudio,
      nivelesImagen: ed.nivelesImagen,
      altoFilaTexto: ed.altoFilaTexto,
      altoFilaAudio: ed.altoFilaAudio,
      altoFilaImagen: ed.altoFilaImagen,
      nombreCarrilTexto: ed.nombreCarrilTexto,
      nombreCarrilAudio: ed.nombreCarrilAudio,
      nombreCarrilImagen: ed.nombreCarrilImagen,
      anchoCabeceras: ed.anchoCabeceras,
      ordenCarriles: ed.ordenCarriles,
      capas: ed.capas,
      audioRegiones: ed.audioRegiones,
      audios: ed.audios,
      volumenGlobal: ed.volumenGlobal,
      pxPorSegundo: ed.pxPorSegundo,
      resolucion: ed.resolucion,
      resolucionAuto: ed.resolucionAuto,
      lienzoManual: ed.lienzoManual,
      colorFondo: ed.colorFondo,
      fondo: ed.fondo,
      desenfoqueFondo: ed.desenfoqueFondo,
      marco: ed.marco,
    },
  }
}

export async function guardarSesion(id: string, creado: number): Promise<void> {
  // la portada se calcula antes de guardar porque puede implicar leer un frame
  // del video (la mitad del montaje), que es una operación asíncrona
  const portada = await calcularPortada()
  await guardarProyecto(capturarProyecto(id, creado, portada))
  // se recuerda cuál es el proyecto abierto, para poder recargarlo al refrescar
  try {
    localStorage.setItem(CLAVE_SESION, id)
  } catch {
    // sin almacenamiento no se recuerda, pero el guardado en sí ya se hizo
  }
}

// deja el editor exactamente como estaba al guardar. las direcciones temporales
// de los medios se rehacen aquí, porque las de la sesión anterior ya no valen
export async function abrirSesion(id: string): Promise<boolean> {
  const p = await leerProyecto(id)
  if (!p) return false

  // se anota cuándo se abrió, que es el dato que la lista enseña para reconocer
  // un proyecto. no se toca 'modificado', porque abrir no es editar
  void guardarProyecto({ ...p, abierto: Date.now() })

  // se liberan las direcciones del proyecto que estaba abierto para no dejar
  // archivos retenidos en memoria
  useProjectStore.getState().limpiar()

  const medios = (p.medios ?? []).map(guardadoAMedio)
  // al abrir se adopta la identidad del proyecto guardado, para que los
  // siguientes guardados actualicen este mismo y no creen uno nuevo
  useProjectStore.setState({ idProyecto: p.id, creado: p.creado, titulo: p.titulo, medios })
  try {
    localStorage.setItem(CLAVE_SESION, p.id)
  } catch {
    // sin almacenamiento se pierde solo el recuerdo de cuál está abierto
  }

  const e = p.edicion
  useEditorStore.setState({
    pista: { id: 'video-1', tipo: 'video', clips: e.clips ?? [] },
    // un proyecto guardado antes de la multipista no trae estos campos, así que
    // se cae a un solo nivel en lugar de dejar la línea de tiempo vacía
    numPistas: e.numPistas ?? 1,
    altosPista: e.altosPista ?? [64],
    // los carriles se rearman tal como quedaron. un proyecto viejo que no traiga
    // estos campos cae a un solo nivel de cada tipo y al orden por defecto, que es
    // como se comportaba antes de guardarlos
    ...(e.pistasMeta ? { pistasMeta: e.pistasMeta } : {}),
    nivelesTexto: e.nivelesTexto ?? 1,
    nivelesAudio: e.nivelesAudio ?? 1,
    nivelesImagen: e.nivelesImagen ?? 1,
    ...(e.altoFilaTexto ? { altoFilaTexto: e.altoFilaTexto } : {}),
    ...(e.altoFilaAudio ? { altoFilaAudio: e.altoFilaAudio } : {}),
    ...(e.altoFilaImagen ? { altoFilaImagen: e.altoFilaImagen } : {}),
    ...(e.nombreCarrilTexto ? { nombreCarrilTexto: e.nombreCarrilTexto } : {}),
    ...(e.nombreCarrilAudio ? { nombreCarrilAudio: e.nombreCarrilAudio } : {}),
    ...(e.nombreCarrilImagen ? { nombreCarrilImagen: e.nombreCarrilImagen } : {}),
    ...(e.anchoCabeceras ? { anchoCabeceras: e.anchoCabeceras } : {}),
    ordenCarriles: e.ordenCarriles ?? ['video', 'audio', 'imagen', 'texto'],
    capas: e.capas ?? [],
    audioRegiones: e.audioRegiones ?? [],
    audios: e.audios ?? [],
    volumenGlobal: e.volumenGlobal ?? 1,
    // si el proyecto se guardó sin zoom (versión vieja), se deja el que haya
    ...(e.pxPorSegundo ? { pxPorSegundo: e.pxPorSegundo } : {}),
    resolucion: e.resolucion ?? { ancho: 1920, alto: 1080 },
    resolucionAuto: e.resolucionAuto ?? { ancho: 1920, alto: 1080 },
    lienzoManual: e.lienzoManual ?? false,
    colorFondo: e.colorFondo ?? '#000000',
    fondo: e.fondo ?? 'color',
    desenfoqueFondo: e.desenfoqueFondo ?? 45,
    marco: e.marco,
    playhead: 0,
    reproduciendo: false,
    clipSeleccionado: null,
    capaSeleccionada: null,
    regionSeleccionada: null,
  })

  // los proyectos guardados antes del arreglo tienen miniaturas negras, porque en
  // su día se capturaba el primer fotograma del video (que solía salir oscuro). una
  // vez montada la sesión, se vuelve a leer el fotograma de la mitad de cada medio y
  // se refresca su miniatura. va en segundo plano a propósito: no interesa retrasar
  // la apertura, así que ni se espera ni se encadena al valor de retorno
  regenerarMiniaturas(medios)

  return true
}

// recorre los medios y, para cada uno, saca un fotograma de la mitad del video para
// usarlo como miniatura nueva. se hace medio por medio y cada resultado se vuelca en
// cuanto está listo, leyendo el estado más reciente del store para no pisar cambios
// que hayan ocurrido mientras tanto. si el proyecto ya se cerró o el medio ya no está,
// simplemente no se toca nada
function regenerarMiniaturas(medios: MediaAsset[]): void {
  for (const medio of medios) {
    const segundo = (medio.duracion || 0) / 2
    frameDeVideo(medio.url, segundo).then((frame) => {
      if (!frame) return
      const actuales = useProjectStore.getState().medios
      let cambio = false
      const nuevos = actuales.map((m) => {
        if (m.id !== medio.id) return m
        cambio = true
        return { ...m, miniatura: frame }
      })
      if (cambio) useProjectStore.setState({ medios: nuevos })
    })
  }
}

// estrena un proyecto en blanco. libera los medios del que estuviera abierto,
// reinicia el editor y le da una identidad nueva, además de apuntar esa identidad
// como la sesión activa. gracias a esto un proyecto nuevo no arrastra NADA del
// anterior: ni medios, ni clips, ni capas, ni audio. dos proyectos no se pisan
// aunque se llamen igual, porque cada uno tiene su propio id
export function nuevoProyecto(): void {
  // limpiar libera las direcciones temporales de los medios y vacía la lista
  useProjectStore.getState().limpiar()
  const id = crypto.randomUUID()
  useProjectStore.setState({
    idProyecto: id,
    creado: Date.now(),
    titulo: 'Proyecto sin título',
    guardadoEn: null,
    sinGuardar: false,
    guardando: false,
  })
  useEditorStore.getState().reiniciar()
  try {
    // se marca como la sesión activa para que al refrescar no se recargue el
    // proyecto anterior encima de este. al no estar guardado todavía, un intento
    // de restaurar esta sesión no encuentra nada y deja el editor en blanco
    localStorage.setItem(CLAVE_SESION, id)
  } catch {
    // sin almacenamiento no se recuerda cuál es el nuevo, no es grave
  }
}

// cambia el nombre de un proyecto guardado. si además es el que está abierto ahora
// mismo, se actualiza también el título en vivo para que la barra lo refleje
export async function renombrarProyecto(
  id: string,
  nombre: string,
  descripcion?: string,
): Promise<void> {
  const limpio = nombre.trim()
  if (!limpio) return
  const p = await leerProyecto(id)
  if (!p) return
  // la descripción llega sin definir cuando quien llama no la toca, así que en ese
  // caso se conserva la que hubiera en lugar de borrarla sin querer
  const nota = descripcion === undefined ? p.descripcion : descripcion.trim() || undefined
  await guardarProyecto({ ...p, titulo: limpio, descripcion: nota, modificado: Date.now() })
  if (useProjectStore.getState().idProyecto === id) {
    useProjectStore.setState({ titulo: limpio })
  }
}

// duplicar copia el proyecto entero con otro id, incluidos los archivos, para
// que tocar la copia no afecte al original. el nombre lo elige quien duplica; si
// no llega ninguno, se cae al viejo "(copia)" para no dejar la copia sin título
export async function duplicarProyecto(id: string, nombre?: string): Promise<void> {
  const p = await leerProyecto(id)
  if (!p) return
  const ahora = Date.now()
  const titulo = nombre?.trim() || `${p.titulo} (copia)`
  await guardarProyecto({
    ...p,
    id: crypto.randomUUID(),
    titulo,
    creado: ahora,
    modificado: ahora,
  })
}
