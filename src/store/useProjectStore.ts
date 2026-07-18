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

// guarda el nombre del proyecto y sus medios importados. al quitar uno se
// libera su object url para no dejar memoria colgando
export const useProjectStore = create<EstadoProyecto>((set) => ({
  idProyecto: crypto.randomUUID(),
  creado: Date.now(),
  guardadoEn: null,
  sinGuardar: false,
  titulo: 'Proyecto sin título',
  medios: [],
  renombrar: (titulo) => set({ titulo: titulo || 'Proyecto sin título' }),
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
