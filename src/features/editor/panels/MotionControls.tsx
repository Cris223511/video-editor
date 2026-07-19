import { useEffect, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaBase } from '../../../types/layers'
import { posicionCapa } from '../../../lib/layers/motion'

// controles de movimiento compartidos por las capas que se pueden animar
// (texto, imagen, censura): grabar el recorrido con el cursor, con cuenta
// regresiva antes de empezar, añadir un punto en el cabezal, simplificar lo
// grabado o volver a dejar la capa fija
export default function MotionControls({ capa }: { capa: CapaBase }) {
  const playhead = useEditorStore((s) => s.playhead)
  const grabando = useEditorStore((s) => s.grabandoMovimiento)
  const setGrabando = useEditorStore((s) => s.setGrabandoMovimiento)
  const registrarPunto = useEditorStore((s) => s.registrarPunto)
  const quitarMovimiento = useEditorStore((s) => s.quitarMovimiento)
  const simplificarCapa = useEditorStore((s) => s.simplificarCapa)
  const velocidadGrabacion = useEditorStore((s) => s.velocidadGrabacion)
  const setVelocidadGrabacion = useEditorStore((s) => s.setVelocidadGrabacion)
  const cuentaActiva = useEditorStore((s) => s.cuentaActiva)
  const setCuentaActiva = useEditorStore((s) => s.setCuentaActiva)
  const segundosCuenta = useEditorStore((s) => s.segundosCuenta)
  const setSegundosCuenta = useEditorStore((s) => s.setSegundosCuenta)
  const cuentaEnCurso = useEditorStore((s) => s.cuentaEnCurso)
  const setCuentaEnCurso = useEditorStore((s) => s.setCuentaEnCurso)
  const inicioGrabacion = useEditorStore((s) => s.inicioGrabacion)
  const reproducir = useEditorStore((s) => s.reproducir)

  const puntos = capa.keyframes.length

  // tiempo transcurrido de la grabación, refrescado unas cuantas veces por
  // segundo mientras dura. no hace falta más precisión para un cronómetro
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

  // la cuenta regresiva descuenta un segundo por vez y, al llegar a cero, arranca
  // la grabación y pone el video a reproducir para poder seguir el recorrido
  useEffect(() => {
    if (cuentaEnCurso === null) return
    if (cuentaEnCurso <= 0) {
      setCuentaEnCurso(null)
      setGrabando(true)
      reproducir()
      return
    }
    const id = window.setTimeout(() => setCuentaEnCurso(cuentaEnCurso - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cuentaEnCurso])

  function alternarGrabacion() {
    if (grabando) {
      setGrabando(false)
      return
    }
    if (cuentaEnCurso !== null) {
      // cancelar la cuenta antes de que termine
      setCuentaEnCurso(null)
      return
    }
    if (cuentaActiva) setCuentaEnCurso(segundosCuenta)
    else {
      setGrabando(true)
      reproducir()
    }
  }

  const enCuenta = cuentaEnCurso !== null

  return (
    <div className="flex flex-col gap-3 border-t border-black/10 pt-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Movimiento</span>
        <span className="text-xs text-[color:var(--muted)]">
          {puntos === 0 ? 'fija' : `${puntos} punto${puntos === 1 ? '' : 's'}`}
        </span>
      </div>

      <button
        onClick={alternarGrabacion}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
          grabando || enCuenta
            ? 'bg-rose-500 text-white hover:bg-rose-600'
            : 'border border-black/10 hover:border-brand hover:text-brand dark:border-white/10',
        ].join(' ')}
      >
        <Icon name={grabando || enCuenta ? 'pausa' : 'play'} size={16} />
        {enCuenta
          ? `Empieza en ${cuentaEnCurso}...`
          : grabando
            ? 'Grabando: arrastra en el visor'
            : 'Grabar movimiento'}
      </button>

      {/* mientras se graba, el cronómetro y el indicador dejan claro que está
          activo y cuánto lleva */}
      {grabando && (
        <div className="flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-1.5">
          <span className="flex items-center gap-2 text-xs font-medium text-rose-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            Grabando
          </span>
          <span className="font-mono text-xs text-rose-500">{transcurrido.toFixed(1)} s</span>
        </div>
      )}

      {/* cuenta regresiva: se puede apagar y ajustar cuántos segundos dura */}
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
              value={segundosCuenta}
              onChange={(e) => setSegundosCuenta(Number(e.target.value))}
              className="w-12 rounded-md border border-black/10 bg-transparent px-1.5 py-0.5 text-xs dark:border-white/10"
            />
            <span className="text-xs text-[color:var(--muted)]">s</span>
          </div>
        )}
      </div>

      {/* seguir con el cursor algo que se mueve rápido es casi imposible a
          velocidad normal, así que el video se puede ralentizar mientras dura la
          grabación. el recorrido se guarda igual, en el tiempo real del video */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[color:var(--muted)]">Velocidad al grabar</span>
        <div className="flex gap-1">
          {[1, 0.5, 0.25].map((v) => (
            <button
              key={v}
              onClick={() => setVelocidadGrabacion(v)}
              className={[
                'rounded-md px-2 py-1 text-[13px] font-medium transition-colors duration-200',
                velocidadGrabacion === v
                  ? 'bg-brand text-white'
                  : 'interactivo text-[color:var(--muted)]',
              ].join(' ')}
            >
              {v === 1 ? 'Normal' : `${v}x`}
            </button>
          ))}
        </div>
      </div>

      {puntos > 0 && (
        <p className="text-xs leading-relaxed text-[color:var(--muted)]">
          El recorrido se ve dibujado sobre el visor. Arrastra cualquier nodo para corregir por dónde
          pasa, o dale doble clic para borrarlo.
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            const p = posicionCapa(capa, playhead)
            registrarPunto(capa.id, playhead, p.x, p.y)
          }}
          className="flex-1 rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
        >
          Añadir punto aquí
        </button>
        {puntos > 2 && (
          <button
            onClick={() => simplificarCapa(capa.id)}
            className="flex-1 rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
          >
            Simplificar
          </button>
        )}
      </div>

      {puntos > 0 && (
        <button
          onClick={() => quitarMovimiento(capa.id)}
          className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
        >
          Quitar movimiento
        </button>
      )}
    </div>
  )
}
