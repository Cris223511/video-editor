import Modal from '../../components/ui/Modal'
import { MediaAsset } from '../../types/media'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'

// proporción en su forma corta, la misma idea que la ficha de proyecto: 16:9 se
// reconoce de un vistazo, 1920 por 1080 no
function mcd(a: number, b: number): number {
  return b === 0 ? a : mcd(b, a % b)
}
function proporcion(ancho: number, alto: number): string {
  if (!ancho || !alto) return 'No disponible'
  const d = mcd(ancho, alto)
  const w = ancho / d
  const h = alto / d
  if (w > 30 || h > 30) return `${(ancho / alto).toFixed(2)}:1`
  return `${w}:${h}`
}
function orientacion(ancho: number, alto: number): string {
  if (ancho === alto) return 'Cuadrado'
  return ancho > alto ? 'Horizontal' : 'Vertical'
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 py-1.5"
      style={{ borderBottom: '1px solid rgb(var(--border) / 0.08)' }}
    >
      <dt className="shrink-0 text-[13px] text-[color:var(--muted)]">{nombre}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium">{valor}</dd>
    </div>
  )
}

// ficha de un medio importado, con lo que se sabe del archivo. se abre desde el
// botón de detalles de cada miniatura del panel de medios, y se apoya en la
// ventana comun para heredar su desenfoque y sus animaciones
export default function FichaMedio({
  medio,
  onCerrar,
}: {
  medio: MediaAsset | null
  onCerrar: () => void
}) {
  if (!medio) return <Modal titulo="" abierto={false} onCerrar={onCerrar}>{null}</Modal>

  const pixeles = medio.ancho * medio.alto
  const formato = medio.nombre.includes('.')
    ? medio.nombre.split('.').pop()!.toUpperCase()
    : 'Desconocido'

  return (
    <Modal
      titulo={medio.nombre}
      descripcion="Datos del archivo importado."
      abierto={medio !== null}
      onCerrar={onCerrar}
      ancho="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <img
          src={medio.miniatura}
          alt=""
          className="w-full rounded-lg bg-black/40 object-cover"
          style={{ aspectRatio: `${medio.ancho} / ${medio.alto}` }}
        />
        <dl>
          <Dato nombre="Dimensiones" valor={`${medio.ancho} × ${medio.alto} px`} />
          <Dato nombre="Proporción" valor={proporcion(medio.ancho, medio.alto)} />
          <Dato nombre="Orientación" valor={orientacion(medio.ancho, medio.alto)} />
          <Dato nombre="Duración" valor={formatearDuracion(medio.duracion)} />
          <Dato nombre="Tamaño" valor={formatearBytes(medio.tamano)} />
          <Dato nombre="Formato" valor={formato} />
          <Dato nombre="Tipo MIME" valor={medio.tipo || 'Desconocido'} />
          <Dato nombre="Megapíxeles" valor={`${(pixeles / 1_000_000).toFixed(2)} MP`} />
          <Dato nombre="Píxeles totales" valor={pixeles.toLocaleString('es')} />
        </dl>
      </div>
    </Modal>
  )
}
