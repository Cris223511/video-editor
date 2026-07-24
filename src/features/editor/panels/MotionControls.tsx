import { useEffect, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaBase } from '../../../types/layers'
import { posicionCapa } from '../../../lib/layers/motion'
import { Campo, ColorCampo } from '../../../components/ui/Controls'

// controles de movimiento compartidos por las capas que se pueden animar (texto,
// imagen, censura): abrir una toma para grabar el recorrido con el cursor, pausarla
// y reanudarla, y luego retocar el trazo grabado (color, nodos, suavizado). la
// cuenta regresiva se ve animada en el visor, no aquí
export default function MotionControls({ capa }: { capa: CapaBase }) {
  const playhead = useEditorStore((s) => s.playhead)
  const grabando = useEditorStore((s) => s.grabandoMovimiento)
  const grabacionActiva = useEditorStore((s) => s.grabacionActiva)
  const capaGrabando = useEditorStore((s) => s.capaGrabando)
  const iniciarGrabacion = useEditorStore((s) => s.iniciarGrabacion)
  const reanudarGrabacion = useEditorStore((s) => s.reanudarGrabacion)
  const pausarGrabacion = useEditorStore((s) => s.pausarGrabacion)
  const guardarGrabacion = useEditorStore((s) => s.guardarGrabacion)
  const cancelarGrabacion = useEditorStore((s) => s.cancelarGrabacion)
  const registrarPunto = useEditorStore((s) => s.registrarPunto)
  const quitarMovimiento = useEditorStore((s) => s.quitarMovimiento)
  const simplificarCapa = useEditorStore((s) => s.simplificarCapa)
  const suavizarCapa = useEditorStore((s) => s.suavizarCapa)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const editandoNodos = useEditorStore((s) => s.editandoNodos)
  const setEditandoNodos = useEditorStore((s) => s.setEditandoNodos)
  const velocidadGrabacion = useEditorStore((s) => s.velocidadGrabacion)
  const setVelocidadGrabacion = useEditorStore((s) => s.setVelocidadGrabacion)
  const cuentaActiva = useEditorStore((s) => s.cuentaActiva)
  const setCuentaActiva = useEditorStore((s) => s.setCuentaActiva)
  const segundosCuenta = useEditorStore((s) => s.segundosCuenta)
  const setSegundosCuenta = useEditorStore((s) => s.setSegundosCuenta)
  const cuentaEnCurso = useEditorStore((s) => s.cuentaEnCurso)
  const setCuentaEnCurso = useEditorStore((s) => s.setCuentaEnCurso)
  const inicioGrabacion = useEditorStore((s) => s.inicioGrabacion)

  const puntos = capa.keyframes.length
  // esta capa es la de la toma en curso (por si hubiera varias animables elegidas)
  const esLaGrabando = grabacionActiva && capaGrabando === capa.id

  // tiempo transcurrido de la captura, para el cronómetro mientras corre
  const [transcurrido, setTranscurrido] = useState(0)
  useEffect(() => {
    if (!grabando || inicioGrabacion === null) {
      setTranscurrido(0)
      return
    }
    const id = window.setInterval(() => {
      setTranscurrido((performance.now() - inicioGrabacion) / 1000)
    }, 100)
    return () => window.clearInterval(id)
  }, [grabando, inicioGrabacion])

  // la cuenta regresiva descuenta de segundo en segundo y, al llegar a cero, pone
  // la captura en marcha. el número grande se pinta en el visor, no aquí
  useEffect(() => {
    if (cuentaEnCurso === null) return
    if (cuentaEnCurso <= 0) {
      setCuentaEnCurso(null)
      reanudarGrabacion()
      return
    }
    const id = window.setTimeout(() => setCuentaEnCurso(cuentaEnCurso - 1), 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentaEnCurso])

  const enCuenta = cuentaEnCurso !== null

  // arranca una toma nueva: guarda el respaldo y, o bien lanza la cuenta, o entra
  // derecho a grabar si la cuenta está apagada
  function empezar() {
    iniciarGrabacion(capa.id)
    if (cuentaActiva) setCuentaEnCurso(segundosCuenta)
    else reanudarGrabacion()
  }

  function editar(campo: 'colorRuta', valor: string) {
    actualizarCapa(capa.id, { [campo]: valor } as Partial<CapaBase>)
  }

  return (
    <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Movimiento</span>
        <span className="text-xs text-[color:var(--muted)]">
          {puntos === 0 ? 'fija' : `${puntos} punto${puntos === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* una toma abierta manda: se ve su estado y los botones de pausar, guardar o
          descartar. fuera de una toma, el botón grande abre una nueva */}
      {esLaGrabando ? (
        <>
          <div className="flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-rose-500">
              <span className={['h-2 w-2 rounded-full bg-rose-500', grabando ? 'animate-pulse' : ''].join(' ')} />
              {enCuenta ? `Empieza en ${cuentaEnCurso}...` : grabando ? 'Grabando' : 'En pausa'}
            </span>
            <span className="font-mono text-xs text-rose-500">{transcurrido.toFixed(1)} s</span>
          </div>

          <button
            onClick={() => (grabando ? pausarGrabacion() : reanudarGrabacion())}
            disabled={enCuenta}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand disabled:opacity-40 dark:border-white/10"
          >
            <Icon name={grabando ? 'pausa' : 'play'} size={16} />
            {grabando ? 'Pausar (barra espaciadora)' : 'Seguir grabando'}
          </button>

          <p className="text-xs leading-relaxed text-[color:var(--muted)]">
            Arrastra el elemento en el visor para trazar su recorrido. Al soltar, la toma se pausa: puedes
            moverlo, cambiar su tamaño y luego seguir, o guardar lo grabado.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={guardarGrabacion}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              <Icon name="check" size={16} /> Guardar
            </button>
            <button
              onClick={cancelarGrabacion}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
            >
              <Icon name="cerrar" size={16} /> Cancelar
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={empezar}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
        >
          <Icon name="play" size={16} />
          {puntos > 0 ? 'Grabar de nuevo' : 'Grabar movimiento'}
        </button>
      )}

      {/* ajustes de la captura: cuenta previa y velocidad. solo tienen sentido antes
          de grabar, así que se ocultan con una toma ya en marcha */}
      {!esLaGrabando && (
        <>
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <input
                type="checkbox"
                checked={cuentaActiva}
                onChange={(e) => setCuentaActiva(e.target.checked)}
                className="accent-brand"
              />
              Cuenta antes de grabar
            </label>
            {cuentaActiva && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  inputMode="numeric"
                  value={segundosCuenta}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', ','].includes(e.key)) e.preventDefault()
                  }}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (!Number.isFinite(n)) return
                    setSegundosCuenta(Math.max(1, Math.min(10, Math.round(n))))
                  }}
                  className="w-12 rounded-md border border-black/10 bg-transparent px-1.5 py-0.5 text-xs dark:border-white/10"
                />
                <span className="text-xs text-[color:var(--muted)]">s</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[color:var(--muted)]">Velocidad al grabar</span>
            <div className="flex gap-1">
              {[1, 0.5, 0.25].map((v) => (
                <button
                  key={v}
                  onClick={() => setVelocidadGrabacion(v)}
                  className={[
                    'rounded-md px-2 py-1 text-[13px] font-medium transition-colors duration-200',
                    velocidadGrabacion === v ? 'bg-brand text-white' : 'interactivo text-[color:var(--muted)]',
                  ].join(' ')}
                >
                  {v === 1 ? 'Normal' : `${v}x`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* retoque del recorrido ya grabado: solo aparece cuando la capa tiene nodos y
          no hay una toma abierta. antes «añadir punto» salía siempre, incluso sin
          movimiento, y no venía a cuento */}
      {puntos > 0 && !grabacionActiva && (
        <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
          <Campo etiqueta="Color de la línea">
            <ColorCampo valor={capa.colorRuta ?? '#ff2d2d'} onChange={(v) => editar('colorRuta', v)} />
          </Campo>

          <button
            onClick={() => setEditandoNodos(!editandoNodos)}
            className={[
              'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
              editandoNodos
                ? 'bg-brand text-white'
                : 'border border-black/10 hover:border-brand hover:text-brand dark:border-white/10',
            ].join(' ')}
          >
            <Icon name="dibujar" size={16} />
            {editandoNodos ? 'Editando nodos: pulsa la línea o un nodo' : 'Editar nodos con el pincel'}
          </button>

          <p className="text-xs leading-relaxed text-[color:var(--muted)]">
            Con el pincel, pulsa sobre la línea para añadir un nodo y sobre un nodo para quitarlo. Arrastra
            cualquiera para corregir el trazo, o usa sus tiradores para curvarlo.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => suavizarCapa(capa.id)}
              className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
            >
              Suavizar
            </button>
            {puntos > 2 ? (
              <button
                onClick={() => simplificarCapa(capa.id)}
                className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
              >
                Simplificar
              </button>
            ) : (
              <button
                onClick={() => {
                  const p = posicionCapa(capa, playhead)
                  registrarPunto(capa.id, playhead, p.x, p.y)
                }}
                className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
              >
                Añadir punto aquí
              </button>
            )}
          </div>

          <button
            onClick={() => quitarMovimiento(capa.id)}
            className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
          >
            Quitar movimiento
          </button>
        </div>
      )}
    </div>
  )
}
