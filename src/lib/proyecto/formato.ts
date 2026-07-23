import { Capa } from '../../types/layers'
import { Clip } from '../../types/timeline'
import { MediaAsset, ClaseMedio } from '../../types/media'
import { RegionAudio, ClipAudio } from '../../types/audio'
import { Marco } from '../../types/marco'

// versión del formato guardado. si más adelante cambia la forma de los datos,
// este número permite reconocer proyectos viejos y adaptarlos al abrirlos en
// lugar de romper con un error
export const VERSION_FORMATO = 1

// un medio tal como se guarda: los datos que describen el archivo, más el
// archivo en sí. la url temporal no se guarda porque solo vale en la sesión que
// la creó; al abrir el proyecto se genera una nueva
export interface MedioGuardado {
  id: string
  // clase del medio; opcional para no romper proyectos guardados antes de que
  // existieran el audio y la imagen, que se dan por video al leerlos
  clase?: ClaseMedio
  nombre: string
  tamano: number
  tipo: string
  duracion: number
  ancho: number
  alto: number
  miniatura: string
  archivo: Blob
}

// todo lo que hace falta para reconstruir un proyecto tal cual se dejó
export interface ProyectoGuardado {
  version: number
  id: string
  titulo: string
  // nota libre que escribe quien monta, para reconocer el proyecto de un vistazo
  // cuando el título no basta. opcional, así que lo guardado antes sigue valiendo
  descripcion?: string
  creado: number
  modificado: number
  // última vez que se abrió el proyecto, que suele decir más que la fecha de
  // creación a la hora de reconocerlo en la lista
  abierto?: number
  portada: string // miniatura del primer medio, para la lista de proyectos
  medios: MedioGuardado[]
  edicion: {
    clips: Clip[]
    numPistas: number
    altosPista: number[]
    capas: Capa[]
    audioRegiones: RegionAudio[]
    audios?: ClipAudio[]
    volumenGlobal: number
    // zoom de la línea de tiempo (píxeles por segundo), para reabrir el proyecto
    // con el mismo acercamiento con que se dejó
    pxPorSegundo?: number
    resolucion: { ancho: number; alto: number }
    resolucionAuto: { ancho: number; alto: number }
    lienzoManual: boolean
    colorFondo: string
    fondo: 'color' | 'desenfoque'
    desenfoqueFondo: number
    marco: Marco
  }
}

// resumen para pintar la lista sin cargar los medios, que es lo que pesa
export interface ResumenProyecto {
  id: string
  titulo: string
  descripcion?: string
  creado: number
  modificado: number
  abierto?: number
  portada: string
  numMedios: number
  duracion: number
}

// pasa los medios en memoria a la forma guardable. se conserva el archivo
// original, no una copia recodificada, para no perder calidad
export function medioAGuardado(m: MediaAsset): MedioGuardado {
  return {
    id: m.id,
    clase: m.clase,
    nombre: m.nombre,
    tamano: m.tamano,
    tipo: m.tipo,
    duracion: m.duracion,
    ancho: m.ancho,
    alto: m.alto,
    miniatura: m.miniatura,
    archivo: m.file,
  }
}

// devuelve un medio a la forma que usa el editor, creando una url nueva para
// esta sesión. quien llame se encarga de liberarla cuando ya no haga falta
export function guardadoAMedio(g: MedioGuardado): MediaAsset {
  const file =
    g.archivo instanceof File
      ? g.archivo
      : new File([g.archivo], g.nombre, { type: g.tipo || g.archivo.type })
  return {
    id: g.id,
    // los proyectos viejos no guardaban la clase: se asumen video
    clase: g.clase ?? 'video',
    file,
    nombre: g.nombre,
    tamano: g.tamano,
    tipo: g.tipo,
    duracion: g.duracion,
    ancho: g.ancho,
    alto: g.alto,
    url: URL.createObjectURL(file),
    miniatura: g.miniatura,
  }
}
