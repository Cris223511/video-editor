import { create } from 'zustand'
import { MediaAsset } from '../types/media'

interface EstadoProyecto {
  medios: MediaAsset[]
  agregar: (medio: MediaAsset) => void
  quitar: (id: string) => void
  limpiar: () => void
}

// guarda los medios importados. al quitar uno se libera su object url para no
// dejar memoria colgando
export const useProjectStore = create<EstadoProyecto>((set) => ({
  medios: [],
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
