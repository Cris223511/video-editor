import { ReactNode } from 'react'
import {
  Blend,
  Clapperboard,
  Film,
  Gauge,
  Layers,
  Palette,
  Scissors,
  Sparkles,
  Wind,
} from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { Clip } from '../../../types/timeline'
import { useProjectStore } from '../../../store/useProjectStore'
import { formatearDuracion } from '../../../lib/format/duracion'
import { esTonoNeutro, usaRuedas, usaCurvas } from '../../../lib/color/tono'
import { buscarTransicion } from '../../../lib/transiciones/catalogo'

// resumen de solo lectura con lo que define a un clip: de qué medio sale, cuánto
// se recortó, a qué velocidad va, si lleva color, efectos o transición de
// entrada. es un vistazo rápido, no un panel de edición, así que ningún valor se
// puede tocar desde aquí
export default function PropiedadesClip({
  clip,
  onCerrar,
}: {
  clip: Clip
  onCerrar: () => void
}) {
  // el nombre y la resolución no viven en el clip sino en el medio al que apunta;
  // se cruza por assetId con la biblioteca del proyecto. puede no encontrarse si
  // el medio se quitó, así que todo lo que dependa de él tiene su alternativa
  const medio = useProjectStore((s) => s.medios.find((m) => m.id === clip.assetId))

  const nombreMedio = medio?.nombre ?? 'Medio no disponible'
  const resolucion = medio && medio.ancho && medio.alto ? `${medio.ancho} × ${medio.alto} px` : null

  // la velocidad se muestra sin ceros de más: 1x, 1.5x, 2x, y no 1.50x
  const velocidad = `${Number(clip.velocidad.toFixed(2))}x`

  // corrección de color: si el tono es neutro no hay nada que corregir; si no, se
  // arma una lista corta con lo que sí está tocado, para que se lea qué se cambió
  const colorNeutro = esTonoNeutro(clip.tono)
  const tocado = descripcionColor(clip)

  // efectos aplicados. de momento el único tipo es el desenfoque de movimiento,
  // que se describe con su intensidad y el ángulo del barrido
  const efectos = clip.efectos.map((e) => {
    if (e.tipo === 'desenfoque-movimiento') {
      return `Desenfoque de movimiento · intensidad ${Math.round(e.intensidad)}, ${Math.round(
        e.angulo,
      )}°`
    }
    return 'Efecto'
  })

  // transición de entrada, o sea la unión con el clip anterior. el corte directo
  // no lleva mezcla, así que se nombra aparte de las que sí tienen duración
  const trans = buscarTransicion(clip.transicion.tipo)
  const esCorte = clip.transicion.tipo === 'ninguna' || trans.tecnica === 'corte'
  const textoTransicion = esCorte
    ? 'Corte directo'
    : `${trans.nombre} · ${formatearDuracion(clip.transicion.duracion)}`

  return (
    <Modal
      titulo="Propiedades del clip"
      descripcion="Un resumen de lo que se le aplicó a este clip en la línea de tiempo."
      abierto
      onCerrar={onCerrar}
      ancho="max-w-md"
    >
      <dl className="flex flex-col">
        <Fila icono={<Film size={15} />} etiqueta="Medio">
          <span className="truncate" title={nombreMedio}>
            {nombreMedio}
          </span>
        </Fila>

        {resolucion && (
          <Fila icono={<Clapperboard size={15} />} etiqueta="Resolución">
            {resolucion}
          </Fila>
        )}

        <Fila icono={<Scissors size={15} />} etiqueta="Duración en la pista">
          {formatearDuracion(clip.duracion)}
        </Fila>

        <Fila icono={<Scissors size={15} />} etiqueta="Punto de entrada">
          {formatearDuracion(clip.recorteInicio)}
        </Fila>

        <Fila icono={<Film size={15} />} etiqueta="Duración del original">
          {formatearDuracion(clip.duracionFuente)}
        </Fila>

        <Fila icono={<Gauge size={15} />} etiqueta="Velocidad">
          {velocidad}
        </Fila>

        <Fila icono={<Palette size={15} />} etiqueta="Corrección de color">
          {colorNeutro ? (
            <span className="text-[color:var(--muted)]">Sin corrección de color</span>
          ) : (
            <span title={tocado}>Color corregido{tocado ? ` · ${tocado}` : ''}</span>
          )}
        </Fila>

        <Fila icono={<Sparkles size={15} />} etiqueta="Efectos">
          {efectos.length === 0 ? (
            <span className="text-[color:var(--muted)]">Sin efectos</span>
          ) : (
            <span className="flex flex-col items-end gap-0.5">
              {efectos.map((e, i) => (
                <span key={i} className="flex items-center gap-1">
                  <Wind size={12} className="shrink-0 text-brand" />
                  {e}
                </span>
              ))}
            </span>
          )}
        </Fila>

        <Fila icono={<Blend size={15} />} etiqueta="Transición de entrada">
          {textoTransicion}
        </Fila>

        <Fila icono={<Layers size={15} />} etiqueta="Nivel de video" ultima>
          Nivel {clip.pista + 1}
        </Fila>
      </dl>
    </Modal>
  )
}

// una fila etiqueta/valor de la ficha. el icono y el nombre a la izquierda en
// gris, el valor a la derecha con el color del texto. el borde inferior separa
// las filas salvo en la última, que ya cierra la lista
function Fila({
  icono,
  etiqueta,
  children,
  ultima,
}: {
  icono: ReactNode
  etiqueta: string
  children: ReactNode
  ultima?: boolean
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-2.5"
      style={ultima ? undefined : { borderBottom: '1px solid rgb(var(--border) / 0.08)' }}
    >
      <dt className="flex shrink-0 items-center gap-2 text-[13px] text-[color:var(--muted)]">
        <span className="text-[color:var(--muted)]">{icono}</span>
        {etiqueta}
      </dt>
      <dd className="min-w-0 text-right text-[13px] font-medium">{children}</dd>
    </div>
  )
}

// arma la lista de lo que está tocado en la corrección de color, para acompañar
// al aviso de "color corregido" con el detalle de por dónde va el ajuste. solo
// entra lo que de verdad se apartó del neutro
function descripcionColor(clip: Clip): string {
  const t = clip.tono
  const partes: string[] = []
  if (t.exposicion !== 0) partes.push('exposición')
  if (t.contraste !== 0) partes.push('contraste')
  if (t.saturacion !== 0) partes.push('saturación')
  if (t.temperatura !== 0) partes.push('temperatura')
  if (t.tinte !== 0) partes.push('tinte')
  if (usaRuedas(t)) partes.push('ruedas')
  if (usaCurvas(t)) partes.push('curvas')
  return partes.join(', ')
}
