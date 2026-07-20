import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore, CLAVE_SESION } from '../../store/useProjectStore'
import { guardarProyecto, leerProyecto } from './almacen'
import {
  guardadoAMedio,
  medioAGuardado,
  ProyectoGuardado,
  VERSION_FORMATO,
} from './formato'

// recoge el estado vivo del editor y lo deja listo para guardar. el id se pasa
// desde fuera: si es el de un proyecto ya existente se sobrescribe, y si es uno
// nuevo se crea otra entrada
export function capturarProyecto(id: string, creado: number): ProyectoGuardado {
  const ed = useEditorStore.getState()
  const pr = useProjectStore.getState()
  const medios = pr.medios.map(medioAGuardado)

  return {
    version: VERSION_FORMATO,
    id,
    titulo: pr.titulo,
    creado,
    modificado: Date.now(),
    portada: medios[0]?.miniatura ?? '',
    medios,
    edicion: {
      clips: ed.pista.clips,
      numPistas: ed.numPistas,
      altosPista: ed.altosPista,
      capas: ed.capas,
      audioRegiones: ed.audioRegiones,
      volumenGlobal: ed.volumenGlobal,
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
  await guardarProyecto(capturarProyecto(id, creado))
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
    volumenGlobal: e.volumenGlobal ?? 1,
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
  return true
}

// duplicar copia el proyecto entero con otro id, incluidos los archivos, para
// que tocar la copia no afecte al original
export async function duplicarProyecto(id: string): Promise<void> {
  const p = await leerProyecto(id)
  if (!p) return
  const ahora = Date.now()
  await guardarProyecto({
    ...p,
    id: crypto.randomUUID(),
    titulo: `${p.titulo} (copia)`,
    creado: ahora,
    modificado: ahora,
  })
}
