import { useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore, CLAVE_SESION } from '../../store/useProjectStore'
import { abrirSesion } from '../../lib/proyecto/sesion'

// recarga la última sesión al entrar al editor. sin esto, refrescar la página
// estrenaba un proyecto vacío y el trabajo parecía perdido, cuando en realidad
// seguía guardado en el almacén bajo su id.
//
// solo actúa si el editor está vacío de verdad: sin medios y sin clips. asi no
// se pisa un proyecto que se acaba de abrir desde la lista, que ya llega con su
// contenido cargado, ni uno que se está empezando y todavía no se ha tocado pero
// tiene medios importados
export function useRestaurarSesion() {
  const yaIntentado = useRef(false)

  useEffect(() => {
    if (yaIntentado.current) return
    yaIntentado.current = true

    const pr = useProjectStore.getState()
    const ed = useEditorStore.getState()
    const vacio = pr.medios.length === 0 && ed.pista.clips.length === 0 && ed.capas.length === 0
    if (!vacio) return

    let id: string | null = null
    try {
      id = localStorage.getItem(CLAVE_SESION)
    } catch {
      return
    }
    if (!id) return

    // si la sesión guardada no existe o está vacía, abrirSesion devuelve false y
    // se queda el proyecto en blanco, que es lo correcto para un editor recién
    // estrenado
    abrirSesion(id).catch(() => {})
  }, [])
}
