import { useState } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useToast } from '../../components/ui/ToastProvider'
import { Clip } from '../../types/timeline'

// separa el audio de un clip de video a un clip propio en la pista de sonido. en
// vez de decodificar el mp4 entero (decodeAudioData falla en muchos videos con
// imagen, que era el motivo de que "no ocurriera nada"), el audio separado
// reutiliza el propio archivo del video y suena por un <audio> con su url. el clip
// nuevo queda vinculado al video: se mueven juntos y borrar el video se lo lleva. el
// video de origen queda mudo para que el sonido no salga dos veces.
//
// vive en un hook para que lo compartan el menú del clic derecho y cualquier otro
// sitio, sin duplicar la lógica ni el manejo del cargador y los avisos
export function useSepararAudio() {
  const separarAudioStore = useEditorStore((s) => s.separarAudio)
  const medios = useProjectStore((s) => s.medios)
  const agregarMedio = useProjectStore((s) => s.agregar)
  const { mostrar } = useToast()
  const [separando, setSeparando] = useState(false)

  async function separar(clip: Clip) {
    if (separando || clip.mudo) return
    const asset = medios.find((m) => m.id === clip.assetId)
    if (!asset) return
    setSeparando(true)
    useProjectStore.setState({ preparando: true })
    try {
      // un respiro para que el cargador alcance a verse aunque el trabajo sea casi
      // instantáneo, así queda claro que algo pasó
      await new Promise((r) => setTimeout(r, 250))
      const url = URL.createObjectURL(asset.file)
      const idAudioAsset = crypto.randomUUID()
      agregarMedio({
        id: idAudioAsset,
        clase: 'audio',
        file: asset.file,
        nombre: `Audio de ${asset.nombre}`,
        tamano: asset.tamano,
        tipo: asset.tipo,
        duracion: asset.duracion,
        ancho: 0,
        alto: 0,
        url,
        miniatura: '',
      })
      separarAudioStore(clip.id, {
        id: crypto.randomUUID(),
        assetId: idAudioAsset,
        inicio: clip.inicio,
        duracion: clip.duracion,
        recorteInicio: clip.recorteInicio,
        duracionFuente: asset.duracion,
        volumen: 1,
        vinculadoA: clip.id,
      })
      mostrar('success', 'Audio separado a la pista de sonido.')
    } catch {
      mostrar('error', 'No se pudo separar el audio de este video.')
    } finally {
      setSeparando(false)
      useProjectStore.setState({ preparando: false })
    }
  }

  return { separar, separando }
}
