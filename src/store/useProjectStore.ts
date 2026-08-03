import { create } from 'zustand'
import { MediaAsset } from '../types/media'

interface EstadoProyecto {
  // identidad del proyecto abierto, para que guardar dos veces actualice la
  // misma entrada en lugar de ir dejando copias sueltas
  idProyecto: string
  creado: number
  // cuándo se guardó por última vez y si hay cambios posteriores sin guardar
  guardadoEn: number | null
  sinGuardar: boolean
  // true mientras se está escribiendo en el almacén, tanto al guardar a mano como
  // en el guardado automático. la barra superior lo usa para mostrar el aviso de
  // "guardando" con su animación mientras dura
  guardando: boolean
  // true desde que se suelta un archivo para crear un proyecto hasta que el editor
  // ya lo tiene cargado y visible. mientras dura se muestra el cargador a pantalla
  // completa, para que uno no vea el editor a medio montar con un video pesado
  preparando: boolean
  titulo: string
  // nota libre del proyecto, la misma que se ve en la lista de proyectos. vive aquí para poder
  // fijarla desde el modal de un proyecto nuevo y que se guarde con él
  descripcion: string
  medios: MediaAsset[]
  renombrar: (titulo: string) => void
  setDescripcion: (descripcion: string) => void
  agregar: (medio: MediaAsset) => void
  quitar: (id: string) => void
  // reordena los medios según la lista de ids dada. la usa el modal del proyecto nuevo al arrastrar
  reordenarMedios: (ids: string[]) => void
  // marca un medio como no encontrado (su archivo ya no se puede leer). la interfaz lo
  // pinta como tal y deja de intentar cargarlo
  marcarFaltante: (id: string) => void
  // rehace la dirección temporal de un medio a partir de su archivo. sirve cuando el
  // blob anterior se murió (se revocó o el navegador perdió su copia) pero el archivo
  // sigue siendo legible: se crea una url nueva y el video vuelve a verse, sin faltante
  refrescarUrl: (id: string) => void
  limpiar: () => void
}

// clave donde se recuerda cuál es el proyecto abierto entre recargas de la
// página. sin esto, cada refresco estrenaba un id nuevo y la sesión guardada
// quedaba huérfana, así que el editor volvía en blanco aunque el trabajo seguía
// a salvo en el almacén
export const CLAVE_SESION = 've-sesion-activa'

// el id se recupera de la última sesión si la hay, para que al refrescar se
// pueda volver a cargar ese mismo proyecto en lugar de empezar de cero
function idInicial(): string {
  try {
    const guardado = localStorage.getItem(CLAVE_SESION)
    if (guardado) return guardado
  } catch {
    // sin acceso al almacenamiento se cae a un id nuevo
  }
  const nuevo = crypto.randomUUID()
  try {
    localStorage.setItem(CLAVE_SESION, nuevo)
  } catch {
    // idem
  }
  return nuevo
}

// guarda el nombre del proyecto y sus medios importados. al quitar uno se
// libera su object url para no dejar memoria colgando
export const useProjectStore = create<EstadoProyecto>((set) => ({
  idProyecto: idInicial(),
  creado: Date.now(),
  guardadoEn: null,
  sinGuardar: false,
  guardando: false,
  preparando: false,
  titulo: 'Proyecto sin título',
  descripcion: '',
  medios: [],
  // mientras se escribe se admite cualquier valor, incluido el vacío, para poder
  // borrar todo y volver a teclear. el relleno con el nombre por defecto se hace
  // recién al salir del foco, no en cada pulsación
  renombrar: (titulo) => set({ titulo }),
  setDescripcion: (descripcion) => set({ descripcion }),
  agregar: (medio) => set((s) => ({ medios: [...s.medios, medio] })),
  reordenarMedios: (ids) =>
    set((s) => ({
      medios: ids.map((id) => s.medios.find((m) => m.id === id)).filter((m): m is MediaAsset => !!m),
    })),
  quitar: (id) =>
    set((s) => {
      const objetivo = s.medios.find((m) => m.id === id)
      if (objetivo) URL.revokeObjectURL(objetivo.url)
      return { medios: s.medios.filter((m) => m.id !== id) }
    }),
  marcarFaltante: (id) =>
    set((s) => ({ medios: s.medios.map((m) => (m.id === id ? { ...m, faltante: true } : m)) })),
  refrescarUrl: (id) =>
    set((s) => ({
      medios: s.medios.map((m) => {
        if (m.id !== id) return m
        // la nueva apunta al mismo archivo (que sí se pudo leer) y se limpia la marca de
        // faltante. la ANTERIOR no se revoca en el acto: varios <video> del visor comparten
        // esa dirección y, al revocarla de golpe, fallaban un instante antes de re-renderizar
        // con la nueva, y ese parpadeo llenaba la consola de ERR_FILE_NOT_FOUND. se libera unos
        // segundos después, cuando ya todos pasaron a la nueva
        const vieja = m.url
        window.setTimeout(() => {
          try {
            URL.revokeObjectURL(vieja)
          } catch {
            // si ya estaba revocada, da igual
          }
        }, 4000)
        return { ...m, url: URL.createObjectURL(m.file), faltante: false }
      }),
    })),
  limpiar: () =>
    set((s) => {
      s.medios.forEach((m) => URL.revokeObjectURL(m.url))
      return { medios: [] }
    }),
}))