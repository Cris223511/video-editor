import { useEffect } from 'react'
import MediaLibrary from './MediaLibrary'
import Preview from './Preview'
import PlaybackControls from './PlaybackControls'
import OptionsPanel from './OptionsPanel'
import Timeline from './timeline/Timeline'
import ExportDialog from './ExportDialog'
import { useEditorStore } from '../../store/useEditorStore'

// disposición general del editor: opciones a la izquierda, visor y controles al
// centro, medios a la derecha y la línea de tiempo abajo
export default function EditorView() {
  // atajos de teclado del editor. se ignoran mientras se escribe en un campo
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      const objetivo = e.target as HTMLElement | null
      if (objetivo && (objetivo.tagName === 'INPUT' || objetivo.tagName === 'TEXTAREA')) return
      const estado = useEditorStore.getState()

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (estado.clipSeleccionado) {
          e.preventDefault()
          estado.quitarClip(estado.clipSeleccionado)
        } else if (estado.capaSeleccionada) {
          e.preventDefault()
          estado.quitarCapa(estado.capaSeleccionada)
        } else if (estado.regionSeleccionada) {
          e.preventDefault()
          estado.quitarRegionAudio(estado.regionSeleccionada)
        }
      } else if (e.key === ' ') {
        e.preventDefault()
        estado.alternarReproduccion()
      } else if (e.key === 's' || e.key === 'S') {
        estado.dividirEnCabezal()
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [])

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <OptionsPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <Preview />
          <PlaybackControls />
        </div>
        <MediaLibrary />
      </div>
      <Timeline />
      <ExportDialog />
    </div>
  )
}
