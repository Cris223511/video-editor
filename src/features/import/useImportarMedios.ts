import { useState } from 'react'
import { useToast } from '../../components/ui/ToastProvider'
import { useProjectStore } from '../../store/useProjectStore'
import { validarMedio } from '../../lib/validation/validateVideo'
import { analizarVideo, analizarAudio, analizarImagen } from '../../lib/media/probeVideo'

// concentra el flujo de importar: validar, analizar y sumar al proyecto, con
// los avisos correspondientes. lo comparten la pantalla inicial y el editor.
// admite las tres familias de medios y elige el análisis que corresponde a cada
// una según la clase que devuelve la validación
export function useImportarMedios() {
  const { mostrar } = useToast()
  const agregar = useProjectStore((s) => s.agregar)
  const [ocupado, setOcupado] = useState(false)

  async function procesar(files: FileList) {
    setOcupado(true)
    for (const file of Array.from(files)) {
      const validacion = await validarMedio(file)
      if (!validacion.ok) {
        mostrar('error', `${file.name}: ${validacion.motivo}`)
        continue
      }
      try {
        const datos =
          validacion.clase === 'audio'
            ? await analizarAudio(file)
            : validacion.clase === 'imagen'
              ? await analizarImagen(file)
              : await analizarVideo(file)
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
