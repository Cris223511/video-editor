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
  titulo: string
  medios: MediaAsset[]
  renombrar: (titulo: string) => void
  agregar: (medio: MediaAsset) => void
  quitar: (id: string) => void
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
  titulo: 'Proyecto sin título',
  medios: [],
  // mientras se escribe se admite cualquier valor, incluido el vacío, para poder
  // borrar todo y volver a teclear. el relleno con el nombre por defecto se hace
  // recién al salir del foco, no en cada pulsación
  renombrar: (titulo) => set({ titulo }),
  agregar: (medio) => set((s) => ({ medios: [...s.medios, medio] })),
  quitar: (id) =>
    set((s) => {
      const objetivo = s.medios.find((m) => m.id === id)
      if (objetivo) URL.revokeObjectURL(objetivo.url)
      return { medios: s.medios.filter((m) => m.id !== id) }
    }),
  limpiar: () =>
    set((s) => {
      s.medios.forEach((m) => URL.revokeObjectURL(m.url))
      return { medios: [] }
    }),
}))
