import Icon from '../../../components/ui/Icon'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { Campo, Deslizador, Segmentado } from '../../../components/ui/Controls'
import { hayRecorte } from '../../../lib/layers/recorteMascara'

// panel de la herramienta de recortar. el recuadro se arrastra sobre el video en
// el visor; aquí van la forma del recorte, el difuminado del borde y la viñeta
// blanca, además del botón para quitarlo. actúa sobre el clip de video elegido
export default function RecortarPanel() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const clips = useEditorStore((s) => s.pista.clips)
  const recortarClipImagen = useEditorStore((s) => s.recortarClipImagen)
  const resetRecorteClipImagen = useEditorStore((s) => s.resetRecorteClipImagen)
  const medios = useProjectStore((s) => s.medios)

  const clip = clips.find((c) => c.id === clipSeleccionado)

  // al pasar a una forma redonda (círculo nítido o círculo difuminado), el recorte
  // se cuadra alrededor de su centro para que salga redondo de verdad. el lado
  // cuadrado se saca del más corto de los dos, usando la resolución del video (su
  // aspecto), que es como se ve en pantalla. el círculo difuminado nace además con
  // algo de degradado en el borde, que es lo que lo distingue del nítido
  function elegirForma(v: 'rectangulo' | 'elipse' | 'circulo') {
    if (!clip) return
    const redondo = v === 'circulo' || v === 'elipse'
    if (!redondo) {
      recortarClipImagen(clip.id, { forma: v })
      return
    }
    const asset = medios.find((m) => m.id === clip.assetId)
    const aw = asset?.ancho || 1
    const ah = asset?.alto || 1
    const r = clip.recorte ?? { izq: 0, der: 0, arr: 0, aba: 0 }
    const cwFrac = 1 - (r.izq ?? 0) - (r.der ?? 0)
    const chFrac = 1 - (r.arr ?? 0) - (r.aba ?? 0)
    const dPx = Math.min(cwFrac * aw, chFrac * ah)
    const nw = dPx / aw
    const nh = dPx / ah
    const cxf = ((r.izq ?? 0) + (1 - (r.der ?? 0))) / 2
    const cyf = ((r.arr ?? 0) + (1 - (r.aba ?? 0))) / 2
    const degradado = v === 'elipse' && !(clip.recorte?.difuminado ?? 0) ? { difuminado: 40 } : {}
    recortarClipImagen(clip.id, {
      forma: v,
      izq: cxf - nw / 2,
      der: 1 - (cxf + nw / 2),
      arr: cyf - nh / 2,
      aba: 1 - (cyf + nh / 2),
      ...degradado,
    })
  }

  if (!clip) {
    return (
      <SinSeleccion icono="recortar" titulo="Ningún video seleccionado">
        Pulsa un video en la línea de tiempo o en el visor y aquí podrás recortar su imagen con el
        recuadro que sale encima.
      </SinSeleccion>
    )
  }

  const rec = clip.recorte
  const forma = rec?.forma ?? 'rectangulo'
  // el difuminado y la viñeta valen tanto para el óvalo como para el círculo
  const esOvalo = forma === 'elipse' || forma === 'circulo'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-[color:var(--muted)]">
        Arrastra los agarres del recuadro sobre el video para recortar su imagen. Lo que queda fuera
        no se ve ni sale al exportar.
      </p>

      <Campo etiqueta="Forma del recorte">
        <Segmentado
          valor={forma}
          opciones={[
            { valor: 'rectangulo', etiqueta: 'Rectángulo' },
            { valor: 'circulo', etiqueta: 'Círculo' },
            { valor: 'elipse', etiqueta: 'Difuminado' },
          ]}
          onChange={(v) => elegirForma(v as 'rectangulo' | 'elipse' | 'circulo')}
        />
      </Campo>

      {esOvalo && (
        <>
          {/* el borde del óvalo se difumina hacia transparente, así que lo de debajo
              (fondo o capas) asoma por los lados en lugar de un corte seco */}
          <Campo etiqueta={`Difuminado del borde (${rec?.difuminado ?? 0}%)`}>
            <Deslizador
              valor={rec?.difuminado ?? 0}
              min={0}
              max={100}
              onChange={(v) => recortarClipImagen(clip.id, { difuminado: v })}
            />
          </Campo>

          {/* tiñe de blanco el borde interior en vez de dejarlo transparente, para el
              aire de foto antigua o de recuerdo */}
          <Campo etiqueta={`Viñeta blanca (${rec?.vinetaBlanca ?? 0}%)`}>
            <Deslizador
              valor={rec?.vinetaBlanca ?? 0}
              min={0}
              max={100}
              onChange={(v) => recortarClipImagen(clip.id, { vinetaBlanca: v })}
            />
          </Campo>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
        {esOvalo ? (
          <>
            El círculo y el difuminado nacen redondos. Con <b className="text-brand">Alt</b> se libera
            el lado que arrastras y puedes estirarlos a un óvalo.{' '}
          </>
        ) : (
          <>
            Con <b className="text-brand">Alt</b> el recuadro se cierra por los dos costados a la vez,
            midiendo desde el centro.{' '}
          </>
        )}
        La tecla <b className="text-brand">C</b> abre esta herramienta sobre lo que tengas elegido.
      </p>

      {hayRecorte(rec) && (
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
