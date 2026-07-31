import { ReactNode, useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Ayuda } from './Tooltip'
import Icon from './Icon'

// el navegador de Chromium trae una pipeta nativa que deja tomar un color de
// cualquier píxel de la pantalla, incluso fuera de la pestaña, con su lupa y el
// código encima del cursor. no está en los tipos de TS, así que se declara aquí
interface CuentagotasNativo {
  open: () => Promise<{ sRGBHex: string }>
}
interface ConCuentagotas {
  EyeDropper?: new () => CuentagotasNativo
}

// pasa un hexadecimal suelto a la forma #rrggbb; admite el atajo de tres dígitos y
// devuelve null si no es un color válido, para no mostrar cuentas sin sentido
function normalizarHex(hex: string): string | null {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null
  return '#' + h.toLowerCase()
}

function hexARgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizarHex(hex)
  if (!n) return null
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  }
}

// rgb a hsl, con el tono en grados y saturación y luminosidad en porcentaje, que es
// como lo muestran illustrator y photoshop
function rgbAHsl(r: number, g: number, b: number) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const d = max - min
  let h = 0, s = 0
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0)
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// rgb a cmyk (0 a 100), la vista pensada para imprenta que se ve en illustrator
function rgbACmyk(r: number, g: number, b: number) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const k = 1 - Math.max(rr, gg, bb)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: Math.round(((1 - rr - k) / (1 - k)) * 100),
    m: Math.round(((1 - gg - k) / (1 - k)) * 100),
    y: Math.round(((1 - bb - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  }
}

// los caminos de vuelta, para poder EDITAR el color escribiendo en rgb, hsl o cmyk y que
// la rueda y el hexadecimal se pongan al día. cada canal se acota a su rango antes de convertir
function acotar(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number.isFinite(v) ? v : min)))
}

function rgbAHex(r: number, g: number, b: number): string {
  const h = (n: number) => acotar(n, 0, 255).toString(16).padStart(2, '0')
  return '#' + h(r) + h(g) + h(b)
}

function hslARgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360 / 360
  const ss = acotar(s, 0, 100) / 100
  const ll = acotar(l, 0, 100) / 100
  if (ss === 0) {
    const v = Math.round(ll * 255)
    return { r: v, g: v, b: v }
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const canal = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return {
    r: Math.round(canal(hh + 1 / 3) * 255),
    g: Math.round(canal(hh) * 255),
    b: Math.round(canal(hh - 1 / 3) * 255),
  }
}

function cmykARgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const cc = acotar(c, 0, 100) / 100
  const mm = acotar(m, 0, 100) / 100
  const yy = acotar(y, 0, 100) / 100
  const kk = acotar(k, 0, 100) / 100
  return {
    r: Math.round(255 * (1 - cc) * (1 - kk)),
    g: Math.round(255 * (1 - mm) * (1 - kk)),
    b: Math.round(255 * (1 - yy) * (1 - kk)),
  }
}

// estilo común de los botones que agregan un elemento (texto, censura, figura,
// dibujo). van con nuestro celeste primario relleno, igual en claro y en oscuro,
// en vez del fondo blanco de borde fino que se veía básico
export const BOTON_AGREGAR =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95'

// controles reutilizables de los paneles de opciones. todos comparten el mismo
// radio, la misma reacción al pasar el cursor y la posibilidad de llevar una
// ayuda al lado de su etiqueta, para que nada quede sin explicar

export function Campo({
  etiqueta,
  ayuda,
  valor,
  obligatorio = false,
  children,
}: {
  etiqueta: string
  // texto del signo de interrogación, opcional
  ayuda?: string
  // valor actual mostrado a la derecha de la etiqueta, útil en deslizadores
  valor?: ReactNode
  // marca el campo como obligatorio con un asterisco rojo, para distinguirlo de
  // los que se pueden dejar en blanco sin más
  obligatorio?: boolean
  children: ReactNode
}) {
  // la etiqueta acaba en dos puntos salvo que ya traiga su propio signo final
  const rotulo = /[:?]$/.test(etiqueta.trim()) ? etiqueta : `${etiqueta}:`
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-[color:var(--muted)]">
          {rotulo}
          {obligatorio && (
            <span className="ml-0.5 font-semibold" style={{ color: 'rgb(var(--alerta))' }} title="Obligatorio">
              *
            </span>
          )}
        </span>
        {ayuda && <Ayuda texto={ayuda} />}
        {valor !== undefined && (
          <span className="ml-auto text-xs font-semibold tabular-nums text-[color:var(--text)]">
            {valor}
          </span>
        )}
      </span>
      {children}
    </label>
  )
}

export function Deslizador({
  valor,
  min,
  max,
  paso = 1,
  imanes,
  onChange,
}: {
  valor: number
  min: number
  max: number
  paso?: number
  // valores a los que el deslizador se pega cuando pasa cerca. en un control
  // corto cada píxel vale varias unidades, así que sin esto es imposible clavar
  // el 100 a mano: se queda en 97 o en 101 por mucho cuidado que se ponga
  imanes?: number[]
  onChange: (v: number) => void
}) {
  // umbral de enganche proporcional al recorrido, para que se sienta igual de
  // firme en un rango corto que en uno largo
  const umbral = Math.max(1, (max - min) * 0.02)
  const pegar = (v: number) => {
    if (!imanes?.length) return v
    let mejor = v
    let dist = Infinity
    for (const m of imanes) {
      const d = Math.abs(m - v)
      if (d < dist && d <= umbral) {
        dist = d
        mejor = m
      }
    }
    return mejor
  }
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={paso}
      value={valor}
      onChange={(e) => onChange(pegar(Number(e.target.value)))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand"
      style={{
        background: `linear-gradient(to right, rgb(var(--accent)) ${
          ((valor - min) / (max - min)) * 100
        }%, rgb(var(--border) / 0.18) ${((valor - min) / (max - min)) * 100}%)`,
      }}
    />
  )
}

// selector de color con la rueda de react-colorful, que se despliega al pulsar
// la muestra. al lado queda el código hexadecimal, editable a mano
export function ColorCampo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  // color que muestra la rueda mientras se arrastra. se mantiene local y se vuelca
  // al proyecto acompasado a los fotogramas, no en cada micro-movimiento del cursor.
  // así el resto de la app deja de re-renderizarse a lo loco durante el arrastre
  const [local, setLocal] = useState(valor)
  const raf = useRef<number | null>(null)
  // pestaña activa del bloque de detalle (rgb, hsl o cmyk); cada una deja editar sus canales
  const [tab, setTab] = useState<'RGB' | 'HSL' | 'CMYK'>('RGB')
  // desplazamiento horizontal del desplegable para que no se salga de la pantalla cuando el
  // campo está pegado al borde (típico en el panel derecho, que va contra el filo de la ventana)
  const pop = useRef<HTMLDivElement>(null)
  const [dx, setDx] = useState(0)

  // cuando el valor llega de fuera (deshacer, otro control) la rueda se pone al día
  useEffect(() => {
    setLocal(valor)
  }, [valor])

  // vuelca al proyecto una sola vez por fotograma como mucho, para no atragantar la
  // app durante un arrastre continuo
  function empujar(v: string) {
    setLocal(v)
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      raf.current = null
      onChange(v)
    })
  }

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // la pipeta nativa solo existe en Chromium; en Firefox no está y por eso el botón
  // se oculta en lugar de fallar al pulsarlo. se resuelve una vez al montar
  const [hayGota, setHayGota] = useState(false)
  useEffect(() => {
    setHayGota(typeof (window as unknown as ConCuentagotas).EyeDropper === 'function')
  }, [])

  async function tomarConGota() {
    const Cuentagotas = (window as unknown as ConCuentagotas).EyeDropper
    if (!Cuentagotas) return
    try {
      // abre la lupa sobre el cursor y espera a que se pulse un píxel de la pantalla;
      // si se cancela con Escape simplemente no cambia nada
      const { sRGBHex } = await new Cuentagotas().open()
      empujar(sRGBHex)
    } catch {
      // cancelado por el usuario, no hay nada que reportar
    }
  }

  // las tres vistas del color para el bloque de detalle, recalculadas del color en
  // curso. si el hexadecimal está a medio escribir, no se dibujan cuentas raras
  const rgb = hexARgb(local)
  const hsl = rgb ? rgbAHsl(rgb.r, rgb.g, rgb.b) : null
  const cmyk = rgb ? rgbACmyk(rgb.r, rgb.g, rgb.b) : null

  // la rueda se cierra solo con Escape o con un clic fuera de ella. nunca por soltar
  // el cursor a media edición: por eso el botón de la muestra solo abre (ver abajo),
  // así el clic que a veces genera el navegador al terminar un arrastre no la cierra
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  // al abrir, se comprueba si el desplegable se sale de la pantalla y se corre lo justo para que
  // quepa. es lo que faltaba: en el panel derecho el campo va pegado al borde y la rueda se cortaba
  useEffect(() => {
    if (!abierto) {
      setDx(0)
      return
    }
    const id = requestAnimationFrame(() => {
      const el = pop.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const margen = 8
      if (r.right > window.innerWidth - margen) setDx((prev) => prev + (window.innerWidth - margen - r.right))
      else if (r.left < margen) setDx((prev) => prev + (margen - r.left))
    })
    return () => cancelAnimationFrame(id)
  }, [abierto])

  return (
    <div ref={caja} className="relative flex items-center gap-2">
      {/* la muestra solo ABRE la rueda; cerrar es cosa de Escape o de un clic fuera.
          al terminar un arrastre dentro de la rueda el navegador dispara a veces un
          clic sobre esta muestra, y si aquí se alternara, ese clic la cerraba sola */}
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Elegir color"
        className="h-9 w-11 shrink-0 rounded-lg border transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: valor, borderColor: 'rgb(var(--border) / 0.2)' }}
      />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus:border-brand"
        style={{ borderColor: 'rgb(var(--border) / 0.15)' }}
      />

      {/* el desplegable va con una animación de entrada por css, no con
          AnimatePresence: bajo los re-renders rápidos del arrastre, el montaje y
          desmontaje de framer-motion llegaba a sacar la rueda de en medio */}
      {abierto && (
        <div
          ref={pop}
          className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-[212px] overflow-y-auto rounded-xl p-3 shadow-xl scroll-modal"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.14)',
            animation: 'fundido-in 0.16s ease-out',
            transform: `translateX(${dx}px)`,
          }}
        >
          {/* fila de arriba: la pipeta para robar un color de la pantalla y, al lado,
              el hexadecimal en curso. la pipeta solo aparece si el navegador la trae */}
          <div className="mb-2.5 flex items-center gap-2">
            {hayGota && (
              <button
                type="button"
                onClick={tomarConGota}
                aria-label="Tomar un color de la pantalla"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors hover:border-brand hover:text-brand"
                style={{ borderColor: 'rgb(var(--border) / 0.2)', color: 'rgb(var(--muted))' }}
              >
                <Icon name="gota" size={15} />
              </button>
            )}
            {/* el hexadecimal también se puede escribir a mano aquí, no solo mirar */}
            <input
              value={local}
              onChange={(e) => empujar(e.target.value)}
              spellCheck={false}
              className="w-full min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-[12px] font-medium uppercase tracking-wide outline-none focus:ring-1 focus:ring-brand"
              style={{ background: 'rgb(var(--border) / 0.12)', color: 'rgb(var(--text))' }}
            />
          </div>

          <HexColorPicker color={local} onChange={empujar} />

          {/* detalle editable del color, repartido en pestañas rgb / hsl / cmyk. escribir en
              cualquier canal recompone el color y pone al día la rueda y el hexadecimal */}
          {rgb && hsl && cmyk && (
            <div className="mt-3">
              <div className="mb-2 flex gap-1 rounded-lg p-0.5" style={{ background: 'rgb(var(--border) / 0.1)' }}>
                {(['RGB', 'HSL', 'CMYK'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={[
                      'flex-1 rounded-md py-1 text-[11px] font-medium transition-colors',
                      tab === t ? 'bg-brand text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {tab === 'RGB' &&
                  (['R', 'G', 'B'] as const).map((c, i) => (
                    <CanalColor
                      key={c}
                      etiqueta={c}
                      valor={[rgb.r, rgb.g, rgb.b][i]}
                      max={255}
                      onChange={(v) => {
                        const n = [rgb.r, rgb.g, rgb.b]
                        n[i] = v
                        empujar(rgbAHex(n[0], n[1], n[2]))
                      }}
                    />
                  ))}
                {tab === 'HSL' &&
                  (['H', 'S', 'L'] as const).map((c, i) => (
                    <CanalColor
                      key={c}
                      etiqueta={c}
                      valor={[hsl.h, hsl.s, hsl.l][i]}
                      max={i === 0 ? 360 : 100}
                      onChange={(v) => {
                        const n = [hsl.h, hsl.s, hsl.l]
                        n[i] = v
                        const { r, g, b } = hslARgb(n[0], n[1], n[2])
                        empujar(rgbAHex(r, g, b))
                      }}
                    />
                  ))}
                {tab === 'CMYK' &&
                  (['C', 'M', 'Y', 'K'] as const).map((c, i) => (
                    <CanalColor
                      key={c}
                      etiqueta={c}
                      valor={[cmyk.c, cmyk.m, cmyk.y, cmyk.k][i]}
                      max={100}
                      onChange={(v) => {
                        const n = [cmyk.c, cmyk.m, cmyk.y, cmyk.k]
                        n[i] = v
                        const { r, g, b } = cmykARgb(n[0], n[1], n[2], n[3])
                        empujar(rgbAHex(r, g, b))
                      }}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// un canal editable del color (R, G, B, H, S...): su letra encima y una casilla numérica debajo.
// escribir un valor lo acota a su rango y avisa al padre, que recompone el color completo
function CanalColor({
  etiqueta,
  valor,
  max,
  onChange,
}: {
  etiqueta: string
  valor: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-1 flex-col items-center gap-1">
      <span className="text-[10px] font-semibold" style={{ color: 'rgb(var(--muted))' }}>
        {etiqueta}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={valor}
        onChange={(e) => onChange(acotar(parseInt(e.target.value, 10), 0, max))}
        className="w-full min-w-0 rounded-md border bg-transparent px-1 py-1 text-center text-[11px] tabular-nums outline-none transition-colors focus:border-brand"
        style={{ borderColor: 'rgb(var(--border) / 0.15)', color: 'rgb(var(--text))' }}
      />
    </label>
  )
}

export function Interruptor({
  etiqueta,
  ayuda,
  activo,
  onChange,
}: {
  etiqueta: string
  ayuda?: string
  activo: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="flex items-center gap-1.5">
        <span className="text-sm">{etiqueta}</span>
        {ayuda && <Ayuda texto={ayuda} />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onChange(!activo)}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        style={{
          background: activo ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.22)',
        }}
      >
        <span
          className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: activo ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { valor: T; etiqueta: ReactNode; titulo?: string }[]
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div
      className="flex gap-1 rounded-xl p-1"
      style={{ background: 'rgb(var(--border) / 0.07)' }}
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          title={o.titulo}
          onClick={() => onChange(o.valor)}
          className={[
            // texto un punto más chico y en una sola línea, para que tres etiquetas
            // largas (cuadrado, círculo, difuminado) quepan sin quedar apretadas
            'flex h-8 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-1 text-[13px] transition-colors duration-100',
            valor === o.valor
              ? 'bg-brand text-white shadow-sm'
              : // solo el botón activo lleva relleno. el hover NO pinta ninguna caja,
                // únicamente aclara el texto: así nunca se ven dos botones marcados a la
                // vez (el activo y el que se está señalando), que confundía al elegir
                'text-[color:var(--muted)] hover:text-[color:var(--text)] cursor-pointer',
          ].join(' ')}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}
