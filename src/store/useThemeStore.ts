import { create } from 'zustand'

type Tema = 'light' | 'dark'

interface EstadoTema {
  tema: Tema
  alternar: () => void
  fijar: (t: Tema) => void
}

const CLAVE = 've-theme'

// cuánto dura el fundido entre temas. tiene que ir por delante de la transición
// declarada en la hoja de estilos, que es de 350 milisegundos
const FUNDIDO = 400

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

export const useThemeStore = create<EstadoTema>((set, get) => {
  // mientras el fundido corre, las pulsaciones de más se descartan sin más.
  // pulsar repetidamente encadenaba transiciones a medio hacer y la pantalla
  // acababa parpadeando entre los dos temas.
  //
  // el candado vive aquí y no en el botón a propósito: el botón sigue viéndose y
  // comportándose como siempre, se puede pulsar y responde al cursor, solo que
  // durante ese rato no pasa nada. deshabilitarlo delataría el mecanismo y daría
  // la sensación de que la interfaz se traba, que es peor que no reaccionar.
  //
  // se guarda fuera del estado porque nadie tiene que enterarse de esto ni volver
  // a dibujarse por su causa
  let ocupado = false

  const cambiar = (t: Tema) => {
    if (ocupado) return
    ocupado = true
    aplicar(t)
    set({ tema: t })
    window.setTimeout(() => {
      ocupado = false
    }, FUNDIDO)
  }

  return {
    tema: inicial(),
    alternar: () => cambiar(get().tema === 'dark' ? 'light' : 'dark'),
    fijar: (t) => cambiar(t),
  }
})
