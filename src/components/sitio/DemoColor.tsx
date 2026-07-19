import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import RuedaColor from '../ui/RuedaColor'
import { PuntoRueda, RUEDAS_NEUTRAS, Ruedas } from '../../lib/color/ruedas'
import { CURVAS_NEUTRAS, Curvas, PuntoCurva } from '../../lib/color/curvas'
import { tablasColor } from '../../lib/color/tono'
import EditorCurva from '../ui/EditorCurva'
import { Deslizador } from '../ui/Controls'

// los mismos ajustes numéricos del editor, en dos columnas
const TONOS: { campo: 'exposicion' | 'contraste' | 'saturacion' | 'temperatura'; etiqueta: string }[] = [
  { campo: 'exposicion', etiqueta: 'Exposición' },
  { campo: 'contraste', etiqueta: 'Contraste' },
  { campo: 'saturacion', etiqueta: 'Saturación' },
  { campo: 'temperatura', etiqueta: 'Temperatura' },
]

const CANALES: { campo: keyof Curvas; etiqueta: string; color: string }[] = [
  { campo: 'maestra', etiqueta: 'Luz', color: '#8ea4c4' },
  { campo: 'r', etiqueta: 'Rojo', color: '#ff5a5a' },
  { campo: 'g', etiqueta: 'Verde', color: '#3ddc84' },
  { campo: 'b', etiqueta: 'Azul', color: '#4c8dff' },
]

// una toma aérea de costa, con cielo, agua y tierra: los tres rangos de tono
// que las ruedas tocan por separado se distinguen sin esfuerzo. la dirección es
// de las comprobadas en DemoVideo, que son las únicas de Pexels que responden
const CLIP = 'https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4'

const ZONAS: { campo: keyof Ruedas; etiqueta: string }[] = [
  { campo: 'sombras', etiqueta: 'Sombras' },
  { campo: 'medios', etiqueta: 'Medios' },
  { campo: 'altas', etiqueta: 'Luces' },
]

// las ruedas de verdad del editor, corrigiendo un clip que está corriendo. no es
// una maqueta: usa el mismo control con captura de puntero y el mismo cálculo de
// tablas por canal que se aplica al video y a la exportación
export default function DemoColor() {
  const [ruedas, setRuedas] = useState<Ruedas>(RUEDAS_NEUTRAS)
  const [curvas, setCurvas] = useState<Curvas>(CURVAS_NEUTRAS)
  const [canal, setCanal] = useState<keyof Curvas>('maestra')
  const [tono, setTono] = useState({ exposicion: 0, contraste: 0, saturacion: 0, temperatura: 0 })

  function cambiar(zona: keyof Ruedas, p: PuntoRueda) {
    setRuedas((r) => ({ ...r, [zona]: p }))
  }

  const tocada =
    ZONAS.some((z) => Math.abs(ruedas[z.campo].x) > 0.001 || Math.abs(ruedas[z.campo].y) > 0.001) ||
    curvas !== CURVAS_NEUTRAS ||
    Object.values(tono).some((v) => v !== 0)

  // el filtro svg se reconstruye con las tablas de cada canal, igual que en el
  // editor. así lo que se ve aquí es exactamente la corrección real
  // se apoya en el mismo cálculo del editor, que compone ruedas y curvas en una
  // sola tabla por canal
  const tablas = useMemo(
    () =>
      tablasColor({
        exposicion: 0,
        contraste: 0,
        saturacion: 0,
        temperatura: 0,
        tinte: 0,
        ruedas,
        curvas,
      }) ?? ['', '', ''],
    [ruedas, curvas],
  )

  // exposición, contraste y saturación se resuelven con filtros nativos, que es
  // como los aplica también el editor
  const filtroNumerico = [
    `brightness(${1 + tono.exposicion / 100})`,
    `contrast(${1 + tono.contraste / 100})`,
    `saturate(${1 + tono.saturacion / 100})`,
    `sepia(${Math.max(0, tono.temperatura) / 220})`,
    `hue-rotate(${-tono.temperatura * 0.12}deg)`,
  ].join(' ')

  return (
    <div
      className="overflow-hidden rounded-2xl p-4 shadow-lg"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          src={CLIP}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          // el sitio va aislado con COOP y COEP, y bajo esa política un recurso de
          // otro dominio se descarta si no se pide en modo anónimo. sin este
          // atributo el marco se quedaría en negro, igual que pasaba en MedioHover
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
          style={{
            minHeight: 260,
            filter: tocada ? `url(#demo-color) ${filtroNumerico}` : undefined,
          }}
        />
        {!tocada && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-xs font-medium text-white">
            Arrastra una rueda para corregir este clip
          </span>
        )}
      </div>

      <svg className="absolute h-0 w-0">
        <defs>
          <filter id="demo-color" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={tablas[0]} />
              <feFuncG type="table" tableValues={tablas[1]} />
              <feFuncB type="table" tableValues={tablas[2]} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            Ruedas:
          </p>
          <div className="flex items-end gap-5">
            {ZONAS.map((z) => (
              <RuedaColor
                key={z.campo}
                etiqueta={z.etiqueta}
                valor={ruedas[z.campo]}
                onChange={(p) => cambiar(z.campo, p)}
                diametro={68}
              />
            ))}
          </div>

          <p className="mb-2.5 mt-5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            Ajustes:
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {TONOS.map((t) => (
              <div key={t.campo}>
                <p className="mb-1 text-[11px] text-[color:var(--muted)]">
                  {t.etiqueta}: <b className="text-brand">{tono[t.campo]}</b>
                </p>
                <Deslizador
                  valor={tono[t.campo]}
                  min={-100}
                  max={100}
                  onChange={(v) => setTono((a) => ({ ...a, [t.campo]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Curvas:
            </p>
            <div className="flex gap-1">
              {CANALES.map((c) => (
                <button
                  key={c.campo}
                  onClick={() => setCanal(c.campo)}
                  className={[
                    'rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 hover:-translate-y-0.5',
                    canal === c.campo ? 'text-white' : 'text-[color:var(--muted)]',
                  ].join(' ')}
                  style={
                    canal === c.campo
                      ? { background: c.color, border: `1px solid ${c.color}` }
                      : {
                          background: 'rgb(var(--border) / 0.07)',
                          border: '1px solid rgb(var(--border) / 0.1)',
                        }
                  }
                >
                  {c.etiqueta}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full max-w-[15rem]">
            <EditorCurva
              puntos={curvas[canal]}
              color={CANALES.find((c) => c.campo === canal)!.color}
              onChange={(p: PuntoCurva[]) => setCurvas((c) => ({ ...c, [canal]: p }))}
            />
            {/* los extremos de la curva dicen qué se está tocando en cada lado */}
            <div className="mt-1.5 flex justify-between text-[10px] text-[color:var(--muted)]">
              <span>Sombras</span>
              <span>Medios</span>
              <span>Luces</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--muted)]">
              Pulsa para añadir un punto, arrástralo para doblar la curva y dale doble clic para
              quitarlo.
            </p>
          </div>
        </div>
      </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-[color:var(--muted)]">
          El cursor se oculta al arrastrar y el movimiento se afina. Con <b>Shift</b> afinas más y
          con <b>doble clic</b> vuelve al centro.
        </p>
        {tocada && (
          <button
            onClick={() => {
              setRuedas(RUEDAS_NEUTRAS)
              setCurvas(CURVAS_NEUTRAS)
              setTono({ exposicion: 0, contraste: 0, saturacion: 0, temperatura: 0 })
            }}
            className="interactivo inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--muted)]"
          >
            <RotateCcw size={12} /> Restablecer
          </button>
        )}
      </div>
    </div>
  )
}
