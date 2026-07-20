import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { rectContenido } from '../../../lib/layers/rect'
import { rectClip, encuadreDe } from '../../../lib/timeline/encuadre'
import { clipEnTiempo } from '../../../lib/timeline/clips'
import { Ancla, redimensionar } from '../../../lib/layers/resize'
import Tiradores from './Tiradores'

// caja de selección del clip activo sobre el visor. arrastrando el cuerpo se
// recoloca el video dentro del lienzo, y por los tiradores se agranda o achica
// conservando su proporción, que deformarlo dejaría la imagen estirada. el video
// puede sobresalir del lienzo: lo que se sale no se ve ni se exporta, porque el
// contenedor del visor recorta y el canvas de exportación hace lo mismo
export default function ClipOverlay() {
  const clips = useEditorStore((s) => s.pista.clips)
  const playhead = useEditorStore((s) => s.playhead)
  const resolucion = useEditorStore((s) => s.resolucion)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const actualizarEncuadre = useEditorStore((s) => s.actualizarEncuadre)
  const resetEncuadre = useEditorStore((s) => s.resetEncuadre)
  const medios = useProjectStore((s) => s.medios)

  const rootRef = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observar = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }))
    observar.observe(el)
    setTam({ w: el.clientWidth, h: el.clientHeight })
    return () => observar.disconnect()
  }, [])

  const aspecto = resolucion.ancho / resolucion.alto
  const rect = rectContenido(tam.w, tam.h, aspecto)

  const ocultas = useMemo(() => {
    const set = new Set<number>()
    pistasMeta.forEach((m, i) => {
      if (m.oculta) set.add(i)
    })
    return set
  }, [pistasMeta])

  const ordenados = useMemo(() => [...clips].sort((a, b) => a.inicio - b.inicio), [clips])
  const activo = clipEnTiempo(ordenados, playhead, ocultas)

  // el cursor, llevado a fracción del lienzo (0 a 1 dentro del área útil)
  function normalizar(ev: globalThis.MouseEvent) {
    const root = rootRef.current
    if (!root) return { x: 0.5, y: 0.5 }
    const r = root.getBoundingClientRect()
    const rc = rectContenido(r.width, r.height, aspecto)
    return { x: (ev.clientX - r.left - rc.ox) / rc.w, y: (ev.clientY - r.top - rc.oy) / rc.h }
  }

  // recolocar: se toma el encuadre del arranque y se le suma el desplazamiento
  // total del cursor, en vez de acumular pasos, para que no haya deriva
  function iniciarArrastre(e: ReactMouseEvent, id: string, base: { x: number; y: number }) {
    e.stopPropagation()
    const inicio = normalizar(e.nativeEvent)
    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      actualizarEncuadre(id, { x: base.x + (p.x - inicio.x), y: base.y + (p.y - inicio.y) })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // redimensionar por un tirador. el video escala uniforme, así que el factor de
  // crecimiento de la caja se traslada tal cual a la escala del encuadre, y el
  // nuevo centro sale de dejar quieto el borde contrario al que se agarra
  function iniciarRedimension(
    e: ReactMouseEvent,
    id: string,
    ancla: Ancla,
    caja: { x: number; y: number; w: number; h: number },
    escalaBase: number,
  ) {
    e.stopPropagation()
    e.preventDefault()
    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const n = redimensionar(caja, ancla, p.x, p.y, true, 0.02)
      const factor = caja.w > 0 ? n.w / caja.w : 1
      actualizarEncuadre(id, { x: n.x, y: n.y, escala: escalaBase * factor })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // la caja solo aparece cuando el clip bajo el cabezal es el que está elegido
  if (!activo || activo.id !== clipSeleccionado) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }
  const asset = medios.find((a) => a.id === activo.assetId)
  if (!asset || rect.w === 0) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }

  const enc = encuadreDe(activo)
  const r = rectClip(asset.ancho, asset.alto, rect.w, rect.h, enc)
  // caja del clip en fracción del lienzo, que es lo que espera el redimensionado
  const caja = { x: enc.x, y: enc.y, w: r.dw / rect.w, h: r.dh / rect.h }

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      <div
        onMouseDown={(e) => iniciarArrastre(e, activo.id, { x: enc.x, y: enc.y })}
        onDoubleClick={(e) => {
          e.stopPropagation()
          resetEncuadre(activo.id)
        }}
        className="pointer-events-auto absolute cursor-move rounded-[2px] outline outline-2 outline-brand"
        style={{
          left: rect.ox + r.dx,
          top: rect.oy + r.dy,
          width: r.dw,
          height: r.dh,
        }}
      >
        <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, activo.id, a, caja, enc.escala)} />
      </div>
    </div>
  )
}
