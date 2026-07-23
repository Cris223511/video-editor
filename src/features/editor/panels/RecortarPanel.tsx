import Icon from '../../../components/ui/Icon'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import { useEditorStore } from '../../../store/useEditorStore'

// panel de la herramienta de recortar. el recorte en sí se hace arrastrando el
// recuadro sobre el video en el visor; aquí van solo la explicación y el botón
// para quitarlo. actúa sobre el clip de video seleccionado
export default function RecortarPanel() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const clips = useEditorStore((s) => s.pista.clips)
  const resetRecorteClipImagen = useEditorStore((s) => s.resetRecorteClipImagen)

  const clip = clips.find((c) => c.id === clipSeleccionado)

  if (!clip) {
    return (
      <SinSeleccion icono="recortar" titulo="Ningún video seleccionado">
        Pulsa un video en la línea de tiempo o en el visor y aquí podrás recortar su imagen con el
        recuadro que sale encima.
      </SinSeleccion>
    )
  }

  const rec = clip.recorte
  const tieneRecorte = !!rec && (rec.izq > 0 || rec.der > 0 || rec.arr > 0 || rec.aba > 0)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-[color:var(--muted)]">
        Arrastra los agarres del recuadro sobre el video para recortar su imagen. Lo que queda fuera
        del recuadro no se ve ni sale al exportar.
      </p>
      <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
        Con <b className="text-brand">Alt</b> el recorte se cierra por los dos costados a la vez,
        midiendo desde el centro. La tecla <b className="text-brand">C</b> abre esta herramienta
        sobre lo que tengas elegido.
      </p>

      {tieneRecorte && (
        <button
          onClick={() => resetRecorteClipImagen(clip.id)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:border-brand hover:text-brand dark:border-white/10"
        >
          <Icon name="restablecer" size={15} /> Quitar recorte
        </button>
      )}
    </div>
  )
}
