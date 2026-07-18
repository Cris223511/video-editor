import { create } from 'zustand'

type Tema = 'light' | 'dark'

interface EstadoTema {
  tema: Tema
  alternar: () => void
  fijar: (t: Tema) => void
}

const CLAVE = 've-theme'

// refleja el tema en el html y lo recuerda entre sesiones
function aplicar(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark')
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // si el almacenamiento no está disponible, seguimos sin recordar
  }
}

// arranca con lo último elegido; si no hay nada guardado, oscuro por defecto,
// que es la estética base del editor
function inicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE) as Tema | null
    if (guardado === 'light' || guardado === 'dark') return guardado
  } catch {
    // sin acceso al almacenamiento, se cae al valor por defecto
  }
  return 'dark'
}

export const useThemeStore = create<EstadoTema>((set, get) => ({
  tema: inicial(),
  alternar: () => {
    const siguiente: Tema = get().tema === 'dark' ? 'light' : 'dark'
    aplicar(siguiente)
    set({ tema: siguiente })
  },
  fijar: (t) => {
    aplicar(t)
    set({ tema: t })
  },
}))
