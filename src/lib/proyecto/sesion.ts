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
