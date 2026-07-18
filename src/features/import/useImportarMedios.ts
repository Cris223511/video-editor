import { useState } from 'react'
import { useToast } from '../../components/ui/ToastProvider'
import { useProjectStore } from '../../store/useProjectStore'
import { validarVideo } from '../../lib/validation/validateVideo'
import { analizarVideo } from '../../lib/media/probeVideo'

// concentra el flujo de importar: validar, analizar y sumar al proyecto, con
// los avisos correspondientes. lo comparten la pantalla inicial y el editor
export function useImportarMedios() {
  const { mostrar } = useToast()
  const agregar = useProjectStore((s) => s.agregar)
  const [ocupado, setOcupado] = useState(false)

  async function procesar(files: FileList) {
    setOcupado(true)
    for (const file of Array.from(files)) {
      const validacion = await validarVideo(file)
      if (!validacion.ok) {
        mostrar('error', `${file.name}: ${validacion.motivo}`)
        continue
      }
      try {
        const datos = await analizarVideo(file)
        agregar({ id: crypto.randomUUID(), ...datos })
        mostrar('success', `${file.name} se importó correctamente.`)
      } catch {
        mostrar('error', `No se pudo procesar ${file.name}.`)
      }
    }
    setOcupado(false)
  }

  return { procesar, ocupado }
}
