import { useEditorStore } from '../../../store/useEditorStore'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'

// panel del borrador. no borra píxeles del video: se lleva lo que se dibujó
// encima, que es lo único que se puede deshacer sin tocar el material original
export default function BorradorPanel() {
  const filtro = useEditorStore((s) => s.borradorFiltro)
  const setFiltro = useEditorStore((s) => s.setBorradorFiltro)
  const grosor = useEditorStore((s) => s.borradorGrosor)
  const setGrosor = useEditorStore((s) => s.setBorradorGrosor)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-[color:var(--muted)]">
        Arrastra sobre el visor para ir borrando lo que toques. De un dibujo se lleva solo los
        trazos que roza, y si no le queda ninguno desaparece; el resto de elementos se borran
        enteros al pasarles por encima.
      </p>

      <Campo etiqueta={`Grosor (${grosor} px)`}>
        <Deslizador valor={grosor} min={4} max={200} onChange={setGrosor} />
      </Campo>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[color:var(--muted)]">Qué borra</span>
        <Segmentado
          valor={filtro}
          opciones={[
            { valor: 'todo', etiqueta: 'Todo' },
            { valor: 'trazo', etiqueta: 'Dibujos' },
            { valor: 'figura', etiqueta: 'Figuras' },
          ]}
          onChange={(v) => setFiltro(v as 'todo' | 'trazo' | 'figura')}
        />
        <Segmentado
          valor={filtro}
          opciones={[
            { valor: 'texto', etiqueta: 'Textos' },
            { valor: 'imagen', etiqueta: 'Imágenes' },
          ]}
          onChange={(v) => setFiltro(v as 'texto' | 'imagen')}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
        Limitar qué borra evita llevarse por delante lo que hay al lado. Todo lo que quites se
        recupera con deshacer.
      </p>
    </div>
  )
}
