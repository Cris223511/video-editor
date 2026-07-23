import { useEffect, useRef } from 'react'
import Icon from '../../../components/ui/Icon'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaTrazo } from '../../../types/layers'
import { Campo, Deslizador, ColorCampo } from '../../../components/ui/Controls'
import MotionControls from './MotionControls'

// panel del lápiz libre. con la herramienta activa se pinta arrastrando sobre el
// visor; cada trazo se suma a la capa de dibujo en curso. desde aquí se eligen el
// color y el grosor, se abre un dibujo nuevo o se corrige lo pintado
export default function DibujarPanel() {
  const capas = useEditorStore((s) => s.capas)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const agregarTrazo = useEditorStore((s) => s.agregarTrazo)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)
  const deshacerTrazoDibujo = useEditorStore((s) => s.deshacerTrazoDibujo)
  const limpiarDibujo = useEditorStore((s) => s.limpiarDibujo)

  const capa = capas.find((c) => c.id === capaSeleccionada && c.tipo === 'trazo') as
    | CapaTrazo
    | undefined

  function editar<K extends keyof CapaTrazo>(campo: K, valor: CapaTrazo[K]) {
    if (capa) actualizarCapa(capa.id, { [campo]: valor } as Partial<CapaTrazo>)
  }

  // entrar al lápiz ya deja un dibujo listo. antes hacía falta pasar por una
  // pantalla que solo explicaba la herramienta y obligaba a pulsar un botón
  // para ver los controles, y ese paso extra sobraba
  const yaCreado = useRef(false)
  useEffect(() => {
    // el doble montaje de StrictMode en desarrollo dispararía esto dos veces; el
    // pestillo garantiza que solo nazca un elemento al abrir el panel vacío
    if (yaCreado.current) return
    yaCreado.current = true
    if (!capa) agregarTrazo()
    // solo interesa el arranque del panel, no cada cambio de capa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {capa && (
        <>
          <Campo etiqueta="Color">
            <ColorCampo valor={capa.color} onChange={(v) => editar('color', v)} />
          </Campo>

          <Campo etiqueta={`Grosor (${capa.grosor} px)`}>
            <Deslizador valor={capa.grosor} min={1} max={40} onChange={(v) => editar('grosor', v)} />
          </Campo>

          <Campo etiqueta={`Opacidad (${capa.opacidad}%)`}>
            <Deslizador valor={capa.opacidad} min={0} max={100} onChange={(v) => editar('opacidad', v)} />
          </Campo>

          {capa.trazos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => deshacerTrazoDibujo(capa.id)}
                className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-brand hover:text-brand dark:border-white/10"
              >
                Borrar último
              </button>
              <button
                onClick={() => limpiarDibujo(capa.id)}
                className="rounded-lg border border-black/10 py-2 text-sm transition-colors hover:border-rose-500 hover:text-rose-500 dark:border-white/10"
              >
                Limpiar
              </button>
            </div>
          )}

          <MotionControls capa={capa} />

          <button
            onClick={() => agregarTrazo()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand dark:border-white/10"
          >
            <Icon name="dibujar" size={16} /> Empezar otro dibujo
          </button>

          <button
            onClick={() => quitarCapa(capa.id)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Icon name="papelera" size={16} /> Eliminar dibujo
          </button>
        </>
      )}
    </div>
  )
}
