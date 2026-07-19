import { useEffect } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { duracionTotal } from '../../lib/timeline/clips'

// paso del cabezal con las flechas: un fotograma a 30 imágenes por segundo, o un
// segundo entero si se mantiene Shift
const PASO = 1 / 30
const PASO_LARGO = 1

// mientras se escribe en un campo los atajos no deben dispararse, o la barra
// espaciadora partiría el video en lugar de escribir un espacio
function escribiendo(destino: EventTarget | null) {
  const el = destino as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

// atajos de teclado del editor, con la misma lógica que un editor de escritorio
export function useAtajos() {
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (escribiendo(e.target)) return
      const st = useEditorStore.getState()
      const total = duracionTotal(st.pista.clips)
      const largo = e.shiftKey ? PASO_LARGO : PASO

      switch (e.key) {
        case ' ':
          e.preventDefault()
          st.alternarReproduccion()
          return

        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) return
          e.preventDefault()
          st.dividirEnCabezal()
          return

        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          if (st.clipSeleccionado) st.quitarClip(st.clipSeleccionado)
          else if (st.capaSeleccionada) st.quitarCapa(st.capaSeleccionada)
          else if (st.regionSeleccionada) st.quitarRegionAudio(st.regionSeleccionada)
          return

        case 'ArrowLeft':
          e.preventDefault()
          st.irA(Math.max(0, st.playhead - largo))
          return

        case 'ArrowRight':
          e.preventDefault()
          st.irA(Math.min(total, st.playhead + largo))
          return

        case 'Home':
          e.preventDefault()
          st.irA(0)
          return

        case 'End':
          e.preventDefault()
          st.irA(total)
          return

        case '+':
        case '=':
          e.preventDefault()
          st.aplicarZoom(1.3)
          return

        case '-':
          e.preventDefault()
          st.aplicarZoom(1 / 1.3)
          return

        case 'Escape':
          // suelta la selección, salvo que se esté grabando un recorrido o
          // dibujando una máscara, donde Escape ya tiene su propio cometido
          if (st.grabandoMovimiento || st.dibujandoMascara) return
          st.seleccionar(null)
          st.seleccionarCapa(null)
          return
      }
    }

    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [])
}
