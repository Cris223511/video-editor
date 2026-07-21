import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { rectContenido } from '../../../lib/layers/rect'
import { rectClip, encuadreDe } from '../../../lib/timeline/encuadre'
import { clipEnTiempo } from '../../../lib/timeline/clips'
import { Ancla, redimensionar } from '../../../lib/layers/resize'
import { Guia, imantar } from '../../../lib/layers/guias'
import Tiradores from './Tiradores'
import ManijaGiro, { anguloGiro } from './ManijaGiro'

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
  // líneas guía que aparecen solo mientras se arrastra, cuando un borde o el
  // centro del clip se alinea con el centro o los bordes del lienzo
  const [guias, setGuias] = useState<Guia[]>([])

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
  // total del cursor, en vez de acumular pasos, para que no haya deriva. mientras
  // se mueve, el clip se imanta al centro y a los bordes del lienzo, y ahí sale la
  // línea guía; con Alt se desactiva por si hay que colocarlo justo al lado sin que
  // salte
  function iniciarArrastre(
    e: ReactMouseEvent,
    id: string,
    base: { x: number; y: number },
    tamCaja: { w: number; h: number },
  ) {
    e.stopPropagation()
    const inicio = normalizar(e.nativeEvent)
    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const bruto = { x: base.x + (p.x - inicio.x), y: base.y + (p.y - inicio.y) }
      if (ev.altKey) {
        setGuias([])
        actualizarEncuadre(id, bruto)
        return
      }
      const r = imantar({ x: bruto.x, y: bruto.y, w: tamCaja.w, h: tamCaja.h }, [])
      setGuias(r.guias)
      actualizarEncuadre(id, { x: r.x, y: r.y })
    }
    const soltar = () => {
      setGuias([])
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

  // giro del video por la manija: el mismo cálculo que las capas, guardando el
  // ángulo en el encuadre del clip
  function iniciarGiroClip(e: ReactMouseEvent, id: string) {
    e.stopPropagation()
    e.preventDefault()
    const cajaEl = (e.currentTarget as HTMLElement).parentElement
    if (!cajaEl) return
    const cr = cajaEl.getBoundingClientRect()
    const cx = cr.left + cr.width / 2
    const cy = cr.top + cr.height / 2
    const mover = (ev: globalThis.MouseEvent) => {
      actualizarEncuadre(id, { rotacion: anguloGiro(cx, cy, ev) })
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
      {/* líneas guía del imantado, visibles solo durante el arrastre */}
      {guias.map((g) => (
        <div
          key={`${g.eje}-${g.pos}`}
          className="pointer-events-none absolute z-30"
          style={
            g.eje === 'x'
              ? { left: rect.ox + g.pos * rect.w, top: rect.oy, width: 1, height: rect.h, background: '#f472b6' }
              : { left: rect.ox, top: rect.oy + g.pos * rect.h, width: rect.w, height: 1, background: '#f472b6' }
          }
        />
      ))}
      <div
        onMouseDown={(e) => iniciarArrastre(e, activo.id, { x: enc.x, y: enc.y }, { w: caja.w, h: caja.h })}
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
          // la caja gira con el video alrededor de su centro, para que la selección
          // acompañe a la imagen rotada
          transform: enc.rotacion ? `rotate(${enc.rotacion}deg)` : undefined,
        }}
      >
        <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, activo.id, a, caja, enc.escala)} />
        <ManijaGiro onAgarrar={(e) => iniciarGiroClip(e, activo.id)} />
      </div>
    </div>
  )
}
