import { create } from 'zustand'

type Vista = 'import' | 'editor'

interface EstadoApp {
  vista: Vista
  exportAbierto: boolean
  irAEditor: () => void
  irAImportar: () => void
  abrirExport: () => void
  cerrarExport: () => void
}

// controla qué pantalla se muestra y si el diálogo de exportación está abierto
export const useAppStore = create<EstadoApp>((set) => ({
  vista: 'import',
  exportAbierto: false,
  irAEditor: () => set({ vista: 'editor' }),
  irAImportar: () => set({ vista: 'import' }),
  abrirExport: () => set({ exportAbierto: true }),
  cerrarExport: () => set({ exportAbierto: false }),
}))
