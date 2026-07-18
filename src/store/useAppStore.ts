import { create } from 'zustand'

interface EstadoApp {
  exportAbierto: boolean
  abrirExport: () => void
  cerrarExport: () => void
}

// de la navegación se encarga el enrutador, así que aquí solo queda si el
// diálogo de exportación está abierto
export const useAppStore = create<EstadoApp>((set) => ({
  exportAbierto: false,
  abrirExport: () => set({ exportAbierto: true }),
  cerrarExport: () => set({ exportAbierto: false }),
}))
