import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../../components/ui/ToastProvider'
import {
  IMPACTOS,
  TIPO_IMPACTO,
  COLOR_IMPACTO_DEF,
  colorPorDefectoImpacto,
  estadoImpacto,
  NOMBRES_CATEGORIA_IMPACTO,
  CategoriaImpacto,
} from '../../../lib/impactos/catalogo'
import { TipoImpacto } from '../../../types/impacto'
import { imagenArrastreReducida } from '../../../lib/ui/arrastre'

// duración de un pase de la vista previa y del ciclo completo (pase + descanso), en ms
const PASE = 750
const CICLO = 2400
// avance que deja la escena quieta (estadoImpacto trata fuera de 0..1 como reposo)
const REPOSO = 2

// tipos de neón: su efecto real vive sobre el video, así que en la tarjeta se muestran
// con una viñeta de líneas en vez de la escena que se deforma
const NEON = new Set<TipoImpacto>(['contorno', 'lineas3d', 'rayosObjeto', 'manchas'])

// viñeta para los impactos de neón: unas líneas y un brillo del color de marca
function VinetaNeon({ tipo }: { tipo: TipoImpacto }) {
  const c = COLOR_IMPACTO_DEF
  return (
    <span className="relative block h-11 w-full overflow-hidden rounded-md" style={{ background: '#0b1424' }}>
      {tipo === 'rayosObjeto' ? (
        <>
          <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: c, filter: 'blur(6px)', opacity: 0.9 }} />
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: '#fff' }} />
        </>
      ) : (
        <>
          <span className="absolute inset-x-3 top-3 h-px" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
          <span className="absolute inset-x-5 top-5 h-px" style={{ background: c, opacity: 0.8, boxShadow: `0 0 6px ${c}` }} />
          <span className="absolute inset-x-4 top-7 h-px" style={{ background: c, opacity: 0.6, boxShadow: `0 0 6px ${c}` }} />
          {tipo === 'lineas3d' && (
            <span className="absolute inset-x-6 bottom-1.5 h-px" style={{ background: c, opacity: 0.5 }} />
          )}
        </>
      )}
    </span>
  )
}

// escena mínima que se deforma para previsualizar los impactos de cámara. el velo usa el
// color de partida del propio tipo, así el Flash se ve negro en su tarjeta (su valor por
// defecto), no celeste
function MuestraImpacto({ tipo, p }: { tipo: TipoImpacto; p: number }) {
  const e = estadoImpacto(tipo, p, 80, colorPorDefectoImpacto(tipo))
  return (
    <span className="relative block h-11 w-full overflow-hidden rounded-md" style={{ background: '#0b1424' }}>
      <span
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1d3557, #4a8fd6)',
          transform: `scale(${e.escala}) translate(${e.x * 100}%, ${e.y * 100}%)`,
          filter: e.desenfoque > 0 ? `blur(${(e.desenfoque * 44).toFixed(1)}px)` : undefined,
        }}
      >
        <span className="absolute right-2 top-2 h-4 w-4 rounded-full" style={{ background: '#fde68a', boxShadow: '0 0 7px #fde68a' }} />
        <span className="absolute -bottom-2 left-0 h-6 w-full" style={{ background: 'radial-gradient(120% 100% at 30% 100%, #0b1f38 40%, transparent 70%)' }} />
        <span className="absolute bottom-2 left-2 h-1 w-8 rounded-full" style={{ background: '#e2f0ff', opacity: 0.7 }} />
      </span>
      {e.veloOpacidad > 0 && (
        <span className="absolute inset-0" style={{ background: e.veloColor, opacity: e.veloOpacidad }} />
      )}
    </span>
  )
}

// vista previa de las manchas: la misma escena, con un par de blobs blancos en modo diferencia
// que invierten el color de lo que tapan, que es justo lo que hace el impacto
function MuestraManchas() {
  return (
    <span className="relative block h-11 w-full overflow-hidden rounded-md" style={{ background: '#0b1424' }}>
      <span className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1d3557, #4a8fd6)' }}>
        <span className="absolute right-2 top-2 h-4 w-4 rounded-full" style={{ background: '#fde68a', boxShadow: '0 0 7px #fde68a' }} />
        <span className="absolute bottom-2 left-2 h-1 w-8 rounded-full" style={{ background: '#e2f0ff', opacity: 0.7 }} />
      </span>
      {/* los blobs invierten lo de abajo */}
      <span className="absolute inset-0" style={{ mixBlendMode: 'difference' }}>
        <span className="absolute h-8 w-8 rounded-full" style={{ left: '18%', top: '20%', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)' }} />
        <span className="absolute h-9 w-9 rounded-full" style={{ left: '52%', top: '30%', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)' }} />
      </span>
    </span>
  )
}

// una tarjeta de la paleta: vista previa arriba y nombre abajo. la escena se anima al
// pasar el cursor. `activo` la resalta cuando es la del impacto seleccionado; si trae
// `onElegir`, un clic en ella la aplica (reemplaza el impacto en edición por esta)
function TarjetaImpacto({
  im,
  activo,
  onElegir,
}: {
  im: (typeof IMPACTOS)[number]
  activo: boolean
  onElegir?: (tipo: TipoImpacto) => void
}) {
  const [p, setP] = useState(REPOSO)
  const raf = useRef(0)
  const esNeon = NEON.has(im.tipo)
  const { mostrar } = useToast()

  const activar = () => {
    if (esNeon) return
    cancelAnimationFrame(raf.current)
    let inicio = 0
    const paso = (ts: number) => {
      if (!inicio) inicio = ts
      const local = (ts - inicio) % CICLO
      setP(local < PASE ? local / PASE : REPOSO)
      raf.current = requestAnimationFrame(paso)
    }
    raf.current = requestAnimationFrame(paso)
  }
  const desactivar = () => {
    cancelAnimationFrame(raf.current)
    setP(REPOSO)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <div
      draggable
      onDragStart={(ev) => {
        ev.dataTransfer.setData(TIPO_IMPACTO, im.tipo)
        ev.dataTransfer.effectAllowed = 'copy'
        imagenArrastreReducida(ev)
      }}
      // los impactos solo van sobre clips de video; soltarlos en otro sitio no hace nada, así que
      // se avisa en rojo en vez de dejar al usuario sin saber por qué no pasó nada
      onDragEnd={(ev) => {
        if (ev.dataTransfer.dropEffect === 'none') {
          mostrar('error', 'Los impactos solo se aplican a clips de video.')
        }
      }}
      onMouseEnter={activar}
      onMouseLeave={desactivar}
      // un clic aplica el impacto cuando hay uno en edición: reemplaza su tipo por el de
      // esta tarjeta sin salir del panel. si ya es el activo, no hace nada
      onClick={() => {
        if (onElegir && !activo) onElegir(im.tipo)
      }}
      className={[
        'group flex flex-col gap-1.5 rounded-xl p-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
        onElegir ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        activo ? 'ring-2 ring-brand' : 'ring-1 ring-black/10 hover:ring-brand/50 dark:ring-white/10',
      ].join(' ')}
      style={{ background: 'rgb(var(--border) / 0.05)' }}
    >
      {im.tipo === 'manchas' ? (
        <MuestraManchas />
      ) : esNeon ? (
        <VinetaNeon tipo={im.tipo} />
      ) : (
        <MuestraImpacto tipo={im.tipo} p={p} />
      )}
      <span className="block truncate px-0.5 text-[11px] font-semibold leading-tight text-[color:var(--text)]">
        {im.nombre}
      </span>
    </div>
  )
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// paleta de impactos: tabs por categoría (Cámara / Neón 3D), buscador y rejilla que se
// acomoda a lo ancho. `tipoActivo` resalta el que está puesto; `categoriaInicial` abre
// su tab de una al seleccionarlo
export default function ImpactosPanel({
  tipoActivo,
  categoriaInicial = 'camara',
  onElegir,
}: {
  tipoActivo?: TipoImpacto
  categoriaInicial?: CategoriaImpacto
  // cuando se edita un impacto, un clic en una tarjeta lo reemplaza por ese tipo
  onElegir?: (tipo: TipoImpacto) => void
} = {}) {
  const [cat, setCat] = useState<CategoriaImpacto>(categoriaInicial)
  const [busca, setBusca] = useState('')

  // al cambiar el impacto seleccionado (y con él su categoría), el tab sigue
  useEffect(() => {
    setCat(categoriaInicial)
  }, [categoriaInicial])

  const lista = useMemo(() => {
    const q = norm(busca.trim())
    return IMPACTOS.filter((im) => {
      if (im.oculto) return false // los flash viejos no salen en la paleta
      if (im.categoria !== cat) return false
      if (!q) return true
      return norm(im.nombre).includes(q)
    })
  }, [cat, busca])

  const tabs: { id: CategoriaImpacto; nombre: string }[] = [
    { id: 'camara', nombre: NOMBRES_CATEGORIA_IMPACTO.camara },
    { id: 'neon', nombre: NOMBRES_CATEGORIA_IMPACTO.neon },
  ]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
        Arrastra un impacto hasta un clip para ponerlo ahí. La duración se cambia estirándolo en la
        línea de tiempo.
      </p>

      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--border) / 0.07)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setCat(t.id)}
            className={[
              'flex-1 whitespace-nowrap rounded-lg py-1.5 text-[12px] transition-colors duration-100',
              cat === t.id
                ? 'bg-brand text-white shadow-sm'
                : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
            ].join(' ')}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar impacto"
        className="w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-[12px] outline-none transition-colors focus:border-brand"
        style={{ borderColor: 'rgb(var(--border) / 0.15)' }}
      />

      {lista.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-[color:var(--muted)]">Sin resultados.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
          {lista.map((im) => (
            <TarjetaImpacto key={im.tipo} im={im} activo={im.tipo === tipoActivo} onElegir={onElegir} />
          ))}
        </div>
      )}
    </div>
  )
}
