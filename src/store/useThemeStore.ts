import { create } from 'zustand'

type Tema = 'light' | 'dark'

interface EstadoTema {
  tema: Tema
  alternar: () => void
  fijar: (t: Tema) => void
}

const CLAVE = 've-theme'

// refleja el tema en el html y lo recuerda entre sesiones. durante un instante
// se marca la raíz para que los colores se fundan en lugar de saltar de golpe
function aplicar(tema: Tema) {
  const raiz = document.documentElement
  raiz.classList.add('tema-en-transicion')
  raiz.classList.toggle('dark', tema === 'dark')
  window.setTimeout(() => raiz.classList.remove('tema-en-transicion'), 400)
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // si el almacenamiento no está disponible, seguimos sin recordar
  }
}

// arranca con lo último elegido; si no hay nada guardado, claro por defecto
function inicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE) as Tema | null
    if (guardado === 'light' || guardado === 'dark') return guardado
  } catch {
    // sin acceso al almacenamiento, se cae al valor por defecto
  }
  return 'light'
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
