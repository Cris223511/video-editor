import { AlertTriangle } from 'lucide-react'

// aviso de que el archivo de un clip ya no está accesible. ocurre cuando el
// navegador libera espacio y descarta los datos guardados, que es el único caso
// en que un proyecto puede perder su material: al guardar se conserva el archivo
// entero, así que mover o renombrar el original no lo rompe
export default function MedioNoDisponible({
  nombre,
  compacto = false,
}: {
  nombre: string
  compacto?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center gap-2 overflow-hidden rounded-lg',
        compacto ? 'h-full px-2' : 'px-3 py-2.5',
      ].join(' ')}
      style={{
        // borde discontinuo y fondo con franjas en diagonal, el lenguaje visual
        // de "esto está roto" que se usa en cualquier editor de video
        border: '1px dashed rgb(var(--alerta) / 0.55)',
        background:
          'repeating-linear-gradient(135deg, rgb(var(--alerta) / 0.1) 0 6px, transparent 6px 13px)',
      }}
    >
      <AlertTriangle size={compacto ? 13 : 15} style={{ color: 'rgb(var(--alerta))' }}
        className="shrink-0" />
      <span className="min-w-0">
        <span
          className={[
            'block font-medium',
            compacto ? 'text-[10px] leading-tight' : 'text-xs',
          ].join(' ')}
          style={{ color: 'rgb(var(--alerta))' }}
        >
          Video no encontrado
        </span>
        {!compacto && (
          <span className="mt-0.5 block truncate text-[13px] text-[color:var(--muted)]">
            {nombre}
          </span>
        )}
      </span>
    </div>
  )
}
