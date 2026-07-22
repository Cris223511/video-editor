import { useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { guardarSesion } from '../../lib/proyecto/sesion'

// cuánto se espera desde el último cambio antes de guardar solo. guardar en
// cada tecla sería absurdo cuando el proyecto lleva videos dentro, pero tampoco
// conviene tardar tanto que el aviso de "guardando" llegue mucho después del
// cambio; un reposo corto se siente inmediato sin disparar en cada micro-ajuste
const ESPERA = 1200

// el aviso de "guardando" se deja puesto un mínimo de tiempo aunque el guardado
// real termine antes. si no, con un montaje ligero el texto y su animación
// parpadearían tan rápido que ni se verían
const VISIBLE_MIN = 1600

// firma de todo lo que compone el proyecto guardado. cualquier acción que toque
// el montaje, por mínima que sea, cambia esta firma y dispara el autoguardado:
// borrar un clip, silenciar o reordenar una pista, sumar un nivel de texto,
// mover una capa, cambiar el fondo o el marco, ajustar el volumen, todo. lo único
// que queda fuera a propósito es lo que no forma parte del documento, como mover
// el cabezal o cambiar de herramienta, que solo es mirar el video sin editarlo.
// hay que mantener esta lista al día: si mañana se suma un campo editable nuevo
// al proyecto, va también aquí para que no se escape del guardado
function huella() {
  const e = useEditorStore.getState()
  const p = useProjectStore.getState()
  return JSON.stringify([
    p.titulo,
    p.medios.map((m) => m.id),
    e.pista.clips,
    e.numPistas,
    e.altosPista,
    e.pistasMeta,
    e.nivelesTexto,
    e.nivelesAudio,
    e.capas,
    e.audioRegiones,
    e.audios,
    e.volumenGlobal,
    e.resolucion,
    e.resolucionAuto,
    e.lienzoManual,
    e.colorFondo,
    e.fondo,
    e.desenfoqueFondo,
    e.marco,
    // el acercamiento de la línea de tiempo también se recuerda: al cambiarlo se
    // guarda solo, para reabrir el proyecto con el mismo zoom con que se dejó
    e.pxPorSegundo,
  ])
}

// guarda solo, sin que haya que acordarse. marca además si quedan cambios sin
// guardar y avisa antes de cerrar la pestaña con trabajo pendiente
export function useAutoguardado(activo: boolean) {
  const ultima = useRef<string | null>(null)
  const temporizador = useRef<number | null>(null)
  const guardando = useRef(false)

  useEffect(() => {
    if (!activo) return
    // la primera huella se toma sin guardar: abrir un proyecto no es un cambio
    ultima.current = huella()

    const revisar = () => {
      const ahora = huella()
      if (ahora === ultima.current) return
      ultima.current = ahora
      useProjectStore.setState({ sinGuardar: true })

      if (temporizador.current) window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(intentarGuardar, ESPERA)
    }

    // guarda de verdad. si justo hay otro guardado en curso no se pierde el
    // cambio: se reintenta enseguida en lugar de descartarlo, así el último estado
    // siempre acaba en disco aunque lleguen cambios encimados
    const intentarGuardar = async () => {
      if (guardando.current) {
        temporizador.current = window.setTimeout(intentarGuardar, 300)
        return
      }
      // solo se salta cuando el proyecto está de verdad en blanco, sin medios ni
      // nada en la línea de tiempo. en cuanto hay un clip, una capa o un audio ya
      // se guarda, aunque no se haya importado ningún archivo a la biblioteca
      const ed = useEditorStore.getState()
      const pr = useProjectStore.getState()
      const vacio =
        pr.medios.length === 0 &&
        ed.pista.clips.length === 0 &&
        ed.capas.length === 0 &&
        ed.audios.length === 0 &&
        ed.audioRegiones.length === 0
      if (vacio) return

      guardando.current = true
      // se enciende el aviso visible y se anota el instante para no apagarlo
      // antes del mínimo, aunque el guardado en sí sea casi instantáneo
      const desde = Date.now()
      useProjectStore.setState({ guardando: true })
      try {
        const p = useProjectStore.getState()
        await guardarSesion(p.idProyecto, p.creado)
        useProjectStore.setState({ sinGuardar: false, guardadoEn: Date.now() })
      } catch {
        // si falla se deja marcado como pendiente y se reintenta al siguiente
        // cambio; avisar aquí con un mensaje sería ruido constante
      } finally {
        const resto = VISIBLE_MIN - (Date.now() - desde)
        const apagar = () => {
          guardando.current = false
          useProjectStore.setState({ guardando: false })
        }
        if (resto > 0) window.setTimeout(apagar, resto)
        else apagar()
      }
    }

    const quitarEditor = useEditorStore.subscribe(revisar)
    const quitarProyecto = useProjectStore.subscribe(revisar)
    return () => {
      quitarEditor()
      quitarProyecto()
      if (temporizador.current) window.clearTimeout(temporizador.current)
    }
  }, [activo])

  // el navegador solo permite pedir confirmación al cerrar, no elegir el texto
  useEffect(() => {
    const alSalir = (e: BeforeUnloadEvent) => {
      if (!useProjectStore.getState().sinGuardar) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', alSalir)
    return () => window.removeEventListener('beforeunload', alSalir)
  }, [])
}
