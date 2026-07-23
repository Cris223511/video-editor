import { useState } from 'react'
import { AjusteTono } from '../../../types/timeline'

import { CATEGORIAS_PRESET, presetAplicado } from '../../../lib/color/presets'

// filtro para la miniatura. el del visor apoya la temperatura y el tinte en un
// filtro svg con su propia matriz, que no se puede referenciar desde una muestra
// suelta, así que acá se aproximan con sepia y un giro de tono. es una muestra
// para elegir a ojo, no la corrección real, que ya la aplica el visor
function filtroMuestra(t: AjusteTono): string {
  const partes = [
    `brightness(${(1 + t.exposicion / 100).toFixed(3)})`,
    `contrast(${(1 + t.contraste / 100).toFixed(3)})`,
    `saturate(${Math.max(0, 1 + t.saturacion / 100).toFixed(3)})`,
  ]
  if (t.temperatura > 0) partes.push(`sepia(${Math.min(0.55, t.temperatura / 110).toFixed(3)})`)
  if (t.temperatura < 0) partes.push(`hue-rotate(${(t.temperatura * 0.3).toFixed(1)}deg)`)
  if (t.tinte) partes.push(`hue-rotate(${(t.tinte * 0.25).toFixed(1)}deg)`)
  return partes.join(' ')
}

// muestras de color. cada una enseña el mismo material con el preset ya puesto,
// que es la única forma de elegir a ojo en vez de adivinar por el nombre. si hay
// una miniatura del clip elegido se usa esa, para juzgar sobre el propio video;
// si no la hay todavía, se cae a un degradado con bastantes tonos como para que
// se note lo que hace cada preset
export default function PresetsColor({
  tono,
  miniatura,
  onAplicar,
}: {
  tono: AjusteTono
  miniatura?: string
  onAplicar: (t: AjusteTono) => void
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_PRESET[0].id)
  const actual = CATEGORIAS_PRESET.find((c) => c.id === categoria) ?? CATEGORIAS_PRESET[0]

  const fondo = miniatura
    ? { backgroundImage: `url(${miniatura})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {
        backgroundImage:
          'linear-gradient(135deg, #2b5cff 0%, #46c1ff 22%, #7ee787 45%, #ffd166 68%, #ff6b6b 88%, #8a2be2 100%)',
      }

  return (
    <div className="flex flex-col gap-3">
      {/* las categorías van en una tira que se desplaza a lo ancho, para que quepan
          todas sin partir el panel ni obligar a plegar nada */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {CATEGORIAS_PRESET.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.id)}
            className={[
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              c.id === categoria
                ? 'bg-brand text-white'
                : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
            ].join(' ')}
            style={c.id === categoria ? undefined : { background: 'rgb(var(--border) / 0.1)' }}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {actual.presets.map((p) => {
          const puesto = presetAplicado(tono, p)
          return (
            <button
              key={p.id}
              onClick={() => onAplicar(p.tono)}
              title={p.nombre}
              className="group flex flex-col gap-1 text-left"
            >
              <span
                className={[
                  'block h-12 w-full overflow-hidden rounded-lg border transition-all duration-150',
                  puesto
                    ? 'border-brand ring-2 ring-brand/40'
                    : 'border-black/10 group-hover:border-brand dark:border-white/10',
                ].join(' ')}
                style={{ ...fondo, filter: filtroMuestra(p.tono) }}
              />
              <span
                className={[
                  'truncate text-[10px] leading-tight transition-colors',
                  puesto ? 'font-medium text-brand' : 'text-[color:var(--muted)]',
                ].join(' ')}
              >
                {p.nombre}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
