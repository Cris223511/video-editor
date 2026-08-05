import { useEffect, useState } from 'react'
import GaleriaTransiciones from './GaleriaTransiciones'
import SinSeleccion from '../../components/ui/SinSeleccion'
import Icon from '../../components/ui/Icon'
import { anterior, posterior } from '../../lib/transiciones/pintar'
import { buscarTransicion } from '../../lib/transiciones/catalogo'
import { Clip, TipoTransicion, Transicion } from '../../types/timeline'
import Tooltip from '../../components/ui/Tooltip'
import { useCongelarAncho } from './useCongelarAncho'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'
import { herramientas } from './RielHerramientas'
import { Campo, Deslizador, Segmentado } from '../../components/ui/Controls'
import TextPanel from './panels/TextPanel'
import AudioPanel from './panels/AudioPanel'
import SpeedPanel from './panels/SpeedPanel'
import CensuraPanel from './panels/CensuraPanel'
import TonePanel from './panels/TonePanel'
import EffectsPanel from './panels/EffectsPanel'
import ProyectoPanel from './panels/ProyectoPanel'
import LienzoPanel from './panels/LienzoPanel'
import MarcoPanel from './panels/MarcoPanel'
import FiguraPanel from './panels/FiguraPanel'
import DibujarPanel from './panels/DibujarPanel'
import TransformarPanel from './panels/TransformarPanel'
import RecortarPanel from './panels/RecortarPanel'
import BorradorPanel from './panels/BorradorPanel'

// transiciones del clip seleccionado. los datos del medio (dimensiones, formato)
// se consultan desde el panel de Medios, así que aquí va solo lo de las
// transiciones y la acción de quitar el clip. el encuadre se hace directamente en
// el visor, arrastrando el video y sus tiradores
// transición de entrada de la capa elegida. reutiliza la galería de los clips,
// pero aquí la transición se lee como la entrada del propio elemento sobre lo que
// ya hay debajo, no como una mezcla entre dos planos
// dirección del barrido para el desenfoque de movimiento (whip). solo aparece cuando la
// transición elegida es de esa técnica; el resto no la usa. se guarda en la propia transición
// del clip o la capa, así que cada elemento recuerda su dirección
type Dir = 'izq' | 'der' | 'arr' | 'aba'
function DireccionBarrido({
  tipo,
  direccion,
  onDir,
}: {
  tipo: TipoTransicion
  direccion?: Dir
  onDir: (d: Dir) => void
}) {
  if (buscarTransicion(tipo).tecnica !== 'barrido-movimiento') return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[color:var(--muted)]">Dirección del barrido</span>
      <Segmentado<Dir>
        valor={direccion ?? 'izq'}
        opciones={[
          { valor: 'izq', etiqueta: '←', titulo: 'Hacia la izquierda' },
          { valor: 'der', etiqueta: '→', titulo: 'Hacia la derecha' },
          { valor: 'arr', etiqueta: '↑', titulo: 'Hacia arriba' },
          { valor: 'aba', etiqueta: '↓', titulo: 'Hacia abajo' },
        ]}
        onChange={onDir}
      />
    </div>
  )
}

// tope del suavizado del borde en las máscaras, como fracción del lado menor. 0.2 ya es un
// degradado muy ancho, así que el 100 % del deslizador equivale a ese valor
const MAX_SUAVIZADO = 0.2

// etiqueta de la intensidad según la transición: no significa lo mismo un acercón que un fogonazo
function rotuloIntensidad(tecnica: string): string | null {
  switch (tecnica) {
    case 'barrido-movimiento':
    case 'desenfoque':
    case 'resplandor':
      return 'Intensidad del desenfoque'
    case 'flash':
    case 'flash-camara':
      return 'Intensidad del fogonazo'
    case 'escala':
      return 'Intensidad del acercamiento'
    case 'zoom-desenfoque':
      return 'Tamaño del acercamiento'
    default:
      return null
  }
}

// todos los ajustes que admite una transición, juntos. cada transición muestra solo lo que le
// aplica: dirección del barrido, fuerza del efecto, acercamiento del desenfoque de movimiento y
// suavidad del borde en los barridos y formas con máscara. las que no tienen nada configurable
// (corte, fundidos, empujes) no pintan controles
function ControlesTransicion({
  tipo,
  intensidad,
  acercamiento,
  grosor,
  direccion,
  onCambio,
}: {
  tipo: TipoTransicion
  intensidad?: number
  acercamiento?: number
  grosor?: number
  direccion?: Dir
  onCambio: (c: { intensidad?: number; acercamiento?: number; grosor?: number; direccion?: Dir }) => void
}) {
  const def = buscarTransicion(tipo)
  const tecnica = def.tecnica
  const esBarrido = tecnica === 'barrido-movimiento'
  const esMascara = tecnica === 'mascara'
  const rotulo = rotuloIntensidad(tecnica)
  const inten = intensidad ?? 0.6
  const acerc = acercamiento ?? 0
  // el borde suave arranca en el valor que trae la transición del catálogo, para no cambiar de golpe
  // el aspecto de una máscara que ya se veía bien
  const suave = grosor ?? def.suavizado ?? 0

  if (!rotulo && !esMascara && !esBarrido) return null
  return (
    <div className="flex flex-col gap-2.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
      {esBarrido && (
        <DireccionBarrido tipo={tipo} direccion={direccion} onDir={(d) => onCambio({ direccion: d })} />
      )}
      {rotulo && (
        <Campo etiqueta={`${rotulo} (${Math.round(inten * 100)} %)`}>
          <Deslizador valor={Math.round(inten * 100)} min={0} max={100} onChange={(v) => onCambio({ intensidad: v / 100 })} />
        </Campo>
      )}
      {esBarrido && (
        <Campo etiqueta={`Acercamiento (${Math.round(acerc * 100)} %)`}>
          <Deslizador valor={Math.round(acerc * 100)} min={0} max={100} onChange={(v) => onCambio({ acercamiento: v / 100 })} />
        </Campo>
      )}
      {esMascara && (
        <Campo etiqueta={`Suavidad del borde (${Math.round((suave / MAX_SUAVIZADO) * 100)} %)`}>
          <Deslizador
            valor={Math.round((suave / MAX_SUAVIZADO) * 100)}
            min={0}
            max={100}
            onChange={(v) => onCambio({ grosor: (v / 100) * MAX_SUAVIZADO })}
          />
        </Campo>
      )}
    </div>
  )
}

function TransicionCapa() {
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const capas = useEditorStore((s) => s.capas)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const [lado, setLado] = useState<'inicio' | 'final'>('inicio')
  const capa = capas.find((c) => c.id === capaSeleccionada)
  if (!capa) return null

  const trans: Transicion = capa.transicion ?? { tipo: 'ninguna', duracion: 0.5 }
  const salida: Transicion = capa.transicionSalida ?? { tipo: 'ninguna', duracion: 0.5 }
  type Cambios = { tipo?: TipoTransicion; duracion?: number; direccion?: Dir; intensidad?: number; acercamiento?: number }
  const activo =
    lado === 'inicio'
      ? {
          trans,
          // se reconstruye el objeto entero, así que hay que arrastrar también la dirección del
          // barrido y los ajustes de intensidad y acercamiento para no perderlos al cambiar otra cosa
          poner: (c: Cambios) =>
            actualizarCapa(capa.id, {
              transicion: {
                tipo: c.tipo ?? trans.tipo,
                duracion: c.duracion ?? trans.duracion,
                direccion: c.direccion ?? trans.direccion,
                intensidad: c.intensidad ?? trans.intensidad,
                acercamiento: c.acercamiento ?? trans.acercamiento,
              },
            }),
          ayuda: 'Cómo aparece este elemento cuando llega su turno en la línea de tiempo.',
        }
      : {
          trans: salida,
          poner: (c: Cambios) =>
            actualizarCapa(capa.id, {
              transicionSalida: {
                tipo: c.tipo ?? salida.tipo,
                duracion: c.duracion ?? salida.duracion,
                direccion: c.direccion ?? salida.direccion,
                intensidad: c.intensidad ?? salida.intensidad,
                acercamiento: c.acercamiento ?? salida.acercamiento,
              },
            }),
          ayuda: 'Cómo se va este elemento al final de su tramo.',
        }

  return (
    <div className="flex flex-col gap-3">
      {/* una sola transición a la vez: al inicio o al final del elemento */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--border) / 0.07)' }}>
        {(['inicio', 'final'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setLado(s)}
            className={[
              'flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors duration-100',
              lado === s ? 'bg-brand text-white shadow-sm' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
            ].join(' ')}
          >
            {s === 'inicio' ? 'Al inicio' : 'Al final'}
          </button>
        ))}
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">{activo.ayuda}</p>
        {activo.trans.tipo !== 'ninguna' && activo.trans.tipo !== 'corte' && (
          <button
            onClick={() => activo.poner({ tipo: 'ninguna' })}
            className="interactivo inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-[color:var(--muted)] transition-colors hover:text-rose-500"
          >
            <Icon name="papelera" size={13} /> Quitar
          </button>
        )}
      </div>
      <GaleriaTransiciones actual={activo.trans.tipo} onElegir={(t) => activo.poner({ tipo: t })} />
      {activo.trans.tipo !== 'ninguna' && activo.trans.tipo !== 'corte' && (
        <>
          <Campo etiqueta={`Duración (${activo.trans.duracion.toFixed(1)} s)`}>
            <Deslizador
              valor={Math.round(activo.trans.duracion * 10)}
              min={2}
              max={20}
              onChange={(v) => activo.poner({ duracion: v / 10 })}
            />
          </Campo>
          <DireccionBarrido
            tipo={activo.trans.tipo}
            direccion={activo.trans.direccion}
            onDir={(d) => activo.poner({ direccion: d })}
          />
        </>
      )}
    </div>
  )
}

// una fila de duración: la etiqueta (o el propio valor si no la lleva) a la izquierda y el
// deslizador. cuando lleva etiqueta, el valor se repite a la derecha para no perderlo de vista
function FilaDur({
  etiqueta,
  dur,
  maxSeg,
  onChange,
}: {
  etiqueta?: string
  dur: number
  maxSeg: number
  onChange: (d: number) => void
}) {
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <span className="w-14 shrink-0 text-[11px] text-[color:var(--muted)]">
        {etiqueta ?? `${dur.toFixed(1)} s`}
      </span>
      <Deslizador
        valor={Math.round(dur * 10)}
        min={2}
        max={Math.max(2, Math.round(maxSeg * 10))}
        onChange={(v) => onChange(v / 10)}
      />
      {etiqueta && (
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-[color:var(--muted)]">
          {dur.toFixed(1)}s
        </span>
      )}
    </div>
  )
}

// resumen de las transiciones que tiene el clip (al inicio, al final y la junta con el clip
// pegado), cada una con su botón para quitarla. una junta entre dos clips se guarda en la
// entrada del que releva, así que quitarla desde aquí borra esa única transición para los
// dos. reemplaza a la vieja tarjeta de "corte" para poner una transición en nada
function ResumenTransicionesClip({
  clip,
  clips,
  lado,
  setLado,
}: {
  clip: Clip
  clips: Clip[]
  lado: 'inicio' | 'final'
  setLado: (l: 'inicio' | 'final') => void
}) {
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const setTransicionSalida = useEditorStore((s) => s.setTransicionSalida)
  const real = (t?: string) => !!t && t !== 'ninguna' && t !== 'corte'

  const ant = anterior(clip, clips)
  const antPegado = !!ant && Math.abs(clip.inicio - (ant.inicio + ant.duracion)) < 0.05
  const sig = posterior(clip, clips)
  const sigPegado = !!sig && Math.abs(sig.inicio - (clip.inicio + clip.duracion)) < 0.05

  // cada transición del clip con su duración editable ahí mismo, a qué lado pertenece y su tope.
  // el tope es la MITAD del clip (igual que el tirador de la línea de tiempo): así la de inicio y la
  // de final nunca se cruzan (cada una ocupa como mucho media cola) ni se comen el clip entero. un
  // cruce con el vecino se acota a la mitad del más corto de los dos
  const items: {
    clave: string
    lado: 'inicio' | 'final'
    etiqueta: string
    nombre: string
    dur: number
    maxSeg: number
    // un cruce entre dos clips pegados: solo estos pueden separar sus dos lados (dar a cada mitad su
    // propio tiempo). las transiciones contra el fondo (entrada del primer clip, salida del último)
    // tienen un solo lado, así que no muestran esa opción
    esCruce: boolean
    trans: Transicion
    poner: (c: Partial<Transicion>) => void
    setDur: (d: number) => void
    quitar: () => void
  }[] = []
  if (real(clip.transicion.tipo)) {
    items.push({
      clave: 'entrada',
      lado: 'inicio',
      etiqueta: antPegado ? 'Cruce con el clip anterior' : 'Al inicio',
      nombre: buscarTransicion(clip.transicion.tipo).nombre,
      dur: clip.transicion.duracion,
      maxSeg: antPegado && ant
        ? Math.min(10, Math.min(clip.duracion, ant.duracion))
        : Math.min(10, clip.duracion - (real(clip.transicionSalida?.tipo) ? clip.transicionSalida!.duracion : 0)),
      esCruce: antPegado,
      trans: clip.transicion,
      poner: (c) => setTransicion(clip.id, c),
      setDur: (d) => setTransicion(clip.id, { duracion: d }),
      quitar: () => setTransicion(clip.id, { tipo: 'ninguna' }),
    })
  }
  if (sigPegado && sig && real(sig.transicion.tipo)) {
    items.push({
      clave: 'juntaSig',
      lado: 'final',
      etiqueta: 'Cruce con el clip siguiente',
      nombre: buscarTransicion(sig.transicion.tipo).nombre,
      dur: sig.transicion.duracion,
      maxSeg: Math.min(10, Math.min(clip.duracion, sig.duracion)),
      esCruce: true,
      trans: sig.transicion,
      poner: (c) => setTransicion(sig.id, c),
      setDur: (d) => setTransicion(sig.id, { duracion: d }),
      quitar: () => setTransicion(sig.id, { tipo: 'ninguna' }),
    })
  }
  if (real(clip.transicionSalida?.tipo)) {
    items.push({
      clave: 'salida',
      lado: 'final',
      etiqueta: 'Al final',
      nombre: buscarTransicion(clip.transicionSalida!.tipo).nombre,
      dur: clip.transicionSalida!.duracion,
      maxSeg: Math.min(10, clip.duracion - (real(clip.transicion.tipo) ? clip.transicion.duracion : 0)),
      esCruce: false,
      trans: clip.transicionSalida!,
      poner: (c) => setTransicionSalida(clip.id, c),
      setDur: (d) => setTransicionSalida(clip.id, { duracion: d }),
      quitar: () => setTransicionSalida(clip.id, { tipo: 'ninguna' }),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Transiciones del clip</span>
      {items.length === 0 ? (
        <p className="text-[13px] italic leading-relaxed text-[color:var(--muted)]">
          Este clip todavía no tiene transiciones. Elige una abajo o arrástrala a la línea de tiempo.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => {
            const activa = lado === it.lado
            return (
              <div
                key={it.clave}
                // al pulsar la fila se salta a ese lado abajo (la galería muestra esa transición). la
                // fila del lado activo queda marcada, para saber cuál se está tocando
                onClick={() => setLado(it.lado)}
                className={[
                  'flex cursor-pointer flex-col gap-2 rounded-lg border p-2 transition-colors',
                  activa ? 'border-brand bg-brand/5' : 'border-black/10 dark:border-white/10',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{it.nombre}</p>
                    <p className="truncate text-[11px] text-[color:var(--muted)]">{it.etiqueta}</p>
                  </div>
                  <Tooltip texto="Quitar esta transición" lado="arriba">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        it.quitar()
                      }}
                      aria-label="Quitar la transición"
                      className="interactivo grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-rose-500"
                    >
                      <Icon name="papelera" size={15} />
                    </button>
                  </Tooltip>
                </div>
                {/* la duración de ESTA transición, editable acá mismo. en un cruce entre dos clips se
                    puede separar en dos lados con tiempos distintos: uno puede empezar más rápido que
                    el otro. enlazados, un solo deslizador mueve los dos por igual */}
                {it.esCruce && it.trans.duracionSalida !== undefined ? (
                  <>
                    <FilaDur etiqueta="Entrada" dur={it.trans.duracion} maxSeg={it.maxSeg} onChange={(d) => it.poner({ duracion: d })} />
                    <FilaDur etiqueta="Salida" dur={it.trans.duracionSalida} maxSeg={it.maxSeg} onChange={(d) => it.poner({ duracionSalida: d })} />
                  </>
                ) : (
                  <FilaDur dur={it.dur} maxSeg={it.maxSeg} onChange={it.setDur} />
                )}
                {it.esCruce && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // separar arranca el lado de salida igualado al de entrada, para que el cambio no
                      // se note de golpe; unir lo borra y los dos vuelven a moverse juntos
                      it.poner({ duracionSalida: it.trans.duracionSalida === undefined ? it.trans.duracion : undefined })
                    }}
                    className="interactivo self-start text-[11px] font-medium text-[color:var(--muted)] transition-colors hover:text-brand"
                  >
                    {it.trans.duracionSalida === undefined ? 'Separar los dos lados' : 'Unir los dos lados'}
                  </button>
                )}
                {/* el resto de ajustes de ESTA transición, aquí mismo bajo su duración: intensidad,
                    acercamiento, dirección o suavidad del borde, según lo que admita cada una */}
                <ControlesTransicion
                  tipo={it.trans.tipo}
                  intensidad={it.trans.intensidad}
                  acercamiento={it.trans.acercamiento}
                  grosor={it.trans.grosor}
                  direccion={it.trans.direccion}
                  onCambio={it.poner}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Transiciones() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const clips = useEditorStore((s) => s.pista.clips)
  const setTransicion = useEditorStore((s) => s.setTransicion)
  const setTransicionSalida = useEditorStore((s) => s.setTransicionSalida)
  // pestaña activa: se pone una sola transición a la vez (al inicio o al final del clip), en lugar de dos
  // galerías apiladas. vive en el store para que, al agarrar una cuña en la línea de tiempo, el panel
  // resalte el lado que de verdad se tocó y no el que quedó de la última vez
  const lado = useEditorStore((s) => s.ladoTransicion)
  const setLado = useEditorStore((s) => s.setLadoTransicion)

  const clip = clips.find((c) => c.id === clipSeleccionado) ?? null

  // si un fundido guardado excede la mitad del clip (por ejemplo puestos antes de este tope, cuando la
  // de inicio y la de final llegaban a cruzarse), se recorta solo al seleccionar el clip. corre una
  // vez por clip y no se dispara de nuevo tras recortar, porque depende solo de su id
  const real = (t?: string) => !!t && t !== 'ninguna' && t !== 'corte'
  useEffect(() => {
    if (!clip) return
    // tope seguro: 10 s o la mitad del clip, lo que sea menor. así ningún fundido guardado antes
    // pasa de 10 s ni se cruza con el del otro lado
    const tope = Math.min(10, clip.duracion / 2)
    if (real(clip.transicion.tipo) && clip.transicion.duracion > tope) {
      setTransicion(clip.id, { duracion: Number(tope.toFixed(2)) })
    }
    if (real(clip.transicionSalida?.tipo) && (clip.transicionSalida?.duracion ?? 0) > tope) {
      setTransicionSalida(clip.id, { duracion: Number(tope.toFixed(2)) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id])

  if (!clip) {
    // sin clip pero con una capa elegida, esta misma sección gobierna su entrada
    if (capaSeleccionada) return <TransicionCapa />
    return (
      <SinSeleccion icono="transiciones" titulo="Nada seleccionado">
        Pulsa un clip, un texto, una figura o cualquier elemento de la línea de tiempo para elegir
        con qué transición entra.
      </SinSeleccion>
    )
  }

  // "Al inicio" es cómo empieza este clip: su cruce con el clip anterior si están pegados, o
  // su aparición contra el fondo si es el primero. "Al final" es cómo termina: el cruce con el
  // siguiente si están pegados —que por dentro se guarda como la entrada de ese siguiente, una
  // sola transición para los dos— o su cierre contra el fondo si no hay nada pegado después.
  // así el usuario solo piensa en "inicio" o "final" y el editor la pone donde corresponde
  const ant = anterior(clip, clips)
  const antPegado = !!ant && Math.abs(clip.inicio - (ant.inicio + ant.duracion)) < 0.05
  const sig = posterior(clip, clips)
  const sigPegado = !!sig && Math.abs(sig.inicio - (clip.inicio + clip.duracion)) < 0.05

  type Cambios = { tipo?: TipoTransicion; duracion?: number; direccion?: Dir; intensidad?: number; acercamiento?: number }
  const finTrans: Transicion = sigPegado && sig ? sig.transicion : clip.transicionSalida ?? { tipo: 'ninguna', duracion: 0.5 }
  const setFin = (cambios: Cambios) => {
    if (sigPegado && sig) setTransicion(sig.id, cambios)
    else setTransicionSalida(clip.id, cambios)
  }

  const activo =
    lado === 'inicio'
      ? {
          trans: clip.transicion,
          poner: (c: Cambios) => setTransicion(clip.id, c),
          ayuda: antPegado
            ? 'Cómo se cruza este clip con el clip anterior (están pegados).'
            : 'Cómo aparece este clip cuando llega su turno.',
        }
      : {
          trans: finTrans,
          poner: setFin,
          ayuda: sigPegado
            ? 'Cómo se cruza este clip con el clip siguiente (están pegados). Es una sola transición para los dos.'
            : 'Cómo se va este clip al terminar su tramo.',
        }

  return (
    <div className="flex flex-col gap-4">
      <ResumenTransicionesClip clip={clip} clips={clips} lado={lado} setLado={setLado} />

      <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
        {/* una transición a la vez: al inicio o al final. la pestaña elige dónde, y abajo se
            muestra solo la galería de ese lado, en vez de dos apiladas. la duración de cada una ya
            se edita arriba, en su fila del resumen */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--border) / 0.07)' }}>
          {(['inicio', 'final'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setLado(s)}
              className={[
                'flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors duration-100',
                lado === s ? 'bg-brand text-white shadow-sm' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]',
              ].join(' ')}
            >
              {s === 'inicio' ? 'Al inicio' : 'Al final'}
            </button>
          ))}
        </div>
        <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">{activo.ayuda}</p>
        <GaleriaTransiciones actual={activo.trans.tipo} onElegir={(t) => activo.poner({ tipo: t })} />
      </div>
    </div>
  )
}

// panel derecho contextual. la barra de herramientas cambia el contenido; todas
// las herramientas ya tienen su panel funcionando
export default function OptionsPanel({
  onOcultar,
  plegando = false,
}: {
  onOcultar?: () => void
  plegando?: boolean
}) {
  const herramienta = useEditorStore((s) => s.herramienta)
  // mientras el panel se pliega o despliega, su ancho lo dicta este hook para
  // que el texto no se aplaste: el contenido conserva su ancho y se recorta
  const { ref, estiloAncho } = useCongelarAncho(plegando)

  const paneles: Record<Herramienta, JSX.Element> = {
    proyecto: <ProyectoPanel />,
    transiciones: <Transiciones />,
    lienzo: <LienzoPanel />,
    marco: <MarcoPanel />,
    texto: <TextPanel />,
    figura: <FiguraPanel />,
    dibujar: <DibujarPanel />,
    audio: <AudioPanel />,
    censura: <CensuraPanel />,
    velocidad: <SpeedPanel />,
    tono: <TonePanel />,
    efectos: <EffectsPanel />,
    transformar: <TransformarPanel />,
    recortar: <RecortarPanel />,
    borrador: <BorradorPanel />,
  }

  // el panel izquierdo es solo para lo del proyecto y para crear elementos nuevos.
  // la edición de un elemento (transformar, tono, recortar, etc.) vive en el panel
  // contextual de la derecha, así que si la herramienta activa es una de esas (no está
  // en el riel), aquí se cae a Proyecto en lugar de duplicar el panel de la derecha sin
  // título. era justo lo que pasaba al elegir una imagen: salía "Transformar" repetido
  const herramientaVista = herramientas.some((h) => h.id === herramienta) ? herramienta : 'proyecto'
  const actual = herramientas.find((h) => h.id === herramientaVista)

  return (
    <aside ref={ref} className="panel relative w-full overflow-hidden rounded-xl">
      {/* el bloque va en absoluto y con un ancho controlado: al animarse el panel
          este contenido no se estira ni se comprime, solo se descubre o se tapa */}
      <div
        className="absolute inset-y-0 left-0 flex flex-col"
        style={{ width: estiloAncho }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: '1px solid rgb(var(--border) / 0.1)' }}
        >
          {actual && <Icon name={actual.icono} size={14} className="text-brand" />}
          <h2 className="font-display text-[13px] font-bold">{actual?.etiqueta}</h2>
          {onOcultar && (
            <Tooltip texto="Ocultar el panel" lado="abajo">
              <button
                onClick={onOcultar}
                aria-label="Ocultar el panel"
                className="interactivo -mr-1 ml-auto grid h-7 w-7 place-items-center rounded-lg text-[color:var(--muted)]"
              >
                <Icon name="atras" size={14} />
              </button>
            </Tooltip>
          )}
        </div>
        {/* barra de desplazamiento fina, no la gruesa general: en un panel estrecho
            la ancha se veía tosca */}
        <div className="scroll-modal min-h-0 flex-1 overflow-y-auto p-3">{paneles[herramientaVista]}</div>
      </div>
    </aside>
  )
}
