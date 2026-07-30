import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { rectContenido } from '../../../lib/layers/rect'
import { rectClip, encuadreDe } from '../../../lib/timeline/encuadre'
import { clipEnTiempo } from '../../../lib/timeline/clips'
import { Ancla, redimensionar, aMarcoLocal, aMarcoLienzo, envolventeGirada } from '../../../lib/layers/resize'
import { Guia, imantar, imanesPorEje, imantarRedimension } from '../../../lib/layers/guias'
import { hayRecorte } from '../../../lib/layers/recorteMascara'
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
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const actualizarEncuadre = useEditorStore((s) => s.actualizarEncuadre)
  const setMoviendoVisor = useEditorStore((s) => s.setMoviendoVisor)
  const setRecorteRapido = useEditorStore((s) => s.setRecorteRapido)
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
  function normalizar(ev: globalThis.PointerEvent) {
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
    e: ReactPointerEvent,
    id: string,
    base: { x: number; y: number },
    tamCaja: { w: number; h: number },
    // desfase del centro del recorte respecto al centro del video, en fracción del
    // lienzo. con un clip recortado lo que se ve (y lo que hay que imantar) es la
    // caja del recorte, desplazada respecto al video; sin recorte queda en cero y
    // todo funciona igual que antes
    desfase: { x: number; y: number } = { x: 0, y: 0 },
  ) {
    e.stopPropagation()
    // al presionar sobre el clip queda elegido y, sin soltar, ya se puede arrastrar en
    // el mismo gesto: antes el primer clic solo seleccionaba y había que volver a
    // pulsar para moverlo
    seleccionar(id)
    setMoviendoVisor(true)
    const inicio = normalizar(e.nativeEvent)
    const mover = (ev: globalThis.PointerEvent) => {
      const p = normalizar(ev)
      const bruto = { x: base.x + (p.x - inicio.x), y: base.y + (p.y - inicio.y) }
      if (ev.altKey) {
        setGuias([])
        actualizarEncuadre(id, bruto)
        return
      }
      // se imanta la caja del recorte, que es el marco visible, y no el video
      // completo: sus bordes son los que se alinean con los del lienzo y donde deben
      // salir las guías laterales. se lleva el centro al del recorte, se imanta y se
      // devuelve al centro del video restando el mismo desfase
      const centroRec = { x: bruto.x + desfase.x, y: bruto.y + desfase.y }
      const iman = imanesPorEje(rect)
      const r = imantar({ x: centroRec.x, y: centroRec.y, w: tamCaja.w, h: tamCaja.h }, [], iman.x, iman.y)
      setGuias(r.guias)
      actualizarEncuadre(id, { x: r.x - desfase.x, y: r.y - desfase.y })
    }
    const soltar = () => {
      setGuias([])
      setMoviendoVisor(false)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // redimensionar por un tirador. el video escala uniforme, así que el factor de
  // crecimiento de la caja se traslada tal cual a la escala del encuadre, y el
  // nuevo centro sale de dejar quieto el borde contrario al que se agarra
  function iniciarRedimension(
    e: ReactPointerEvent,
    id: string,
    ancla: Ancla,
    caja: { x: number; y: number; w: number; h: number },
    escalaBase: number,
    // desfase del centro del recorte respecto al centro del video, en fracción del
    // lienzo. cuando el clip está recortado, los tiradores rodean el recorte, así
    // que el redimensionado se calcula sobre esa caja y luego se recoloca el video
    // para que el recorte quede anclado donde estaba, en vez de saltar a un lado
    desfase: { x: number; y: number } = { x: 0, y: 0 },
    // giro del clip: si está rotado, el cursor se lleva al marco derecho antes de
    // calcular, o estirar un lado terminaría estirando otro
    rotacion = 0,
  ) {
    e.stopPropagation()
    e.preventDefault()
    setMoviendoVisor(true)
    const este = ancla.includes('e')
    const oeste = ancla.includes('w')
    const norte = ancla.startsWith('n')
    const sur = ancla.startsWith('s')
    const girado = !!rotacion
    const mover = (ev: globalThis.PointerEvent) => {
      const bruto = normalizar(ev)
      // con el clip girado el cursor se des-rota al marco del propio clip, así el lado
      // que se agarra es el que de verdad se estira. derecho, queda igual que antes
      const p = girado ? aMarcoLocal(bruto, { x: caja.x, y: caja.y }, rect, rotacion) : bruto
      // el video escala uniforme, así que siempre va proporcional; lo que sí cambia
      // con Alt es que crece desde el centro por los dos lados en vez de anclar el
      // borde contrario. la caja tentativa sale de la posición cruda del cursor
      const n = redimensionar(caja, ancla, p.x, p.y, { proporcional: true, simetrico: ev.altKey }, 0.02)
      let fin = n
      let gs: Guia[] = []
      // el imantado y sus guías se calculan sobre los cuatro bordes de la caja derecha.
      // con el clip girado el recuadro se inclina y las guías del lienzo dejarían de
      // cuadrar, así que ahí se estira libre. con Alt también, para clavar un tamaño
      if (!ev.altKey && !girado) {
        const iman = imanesPorEje(rect)
        const anclaX = este ? 'min' : oeste ? 'max' : 'centro'
        const anclaY = norte ? 'max' : sur ? 'min' : 'centro'
        const r = imantarRedimension(caja, true, anclaX, anclaY, n, iman.x, iman.y)
        fin = r.caja
        gs = r.guias
      }
      setGuias(gs)
      const factor = caja.w > 0 ? fin.w / caja.w : 1
      // el nuevo centro sale en el marco local; girado, se lleva de vuelta al del
      // lienzo para que el borde anclado quede quieto en pantalla, no en el marco local
      let cx = fin.x
      let cy = fin.y
      if (girado) {
        const off = aMarcoLienzo({ x: fin.x - caja.x, y: fin.y - caja.y }, rect, rotacion)
        cx = caja.x + off.x
        cy = caja.y + off.y
      }
      actualizarEncuadre(id, {
        x: cx - desfase.x * factor,
        y: cy - desfase.y * factor,
        escala: escalaBase * factor,
      })
    }
    const soltar = () => {
      setGuias([])
      setMoviendoVisor(false)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // giro del video por la manija: el mismo cálculo que las capas, guardando el
  // ángulo en el encuadre del clip
  function iniciarGiroClip(e: ReactPointerEvent, id: string) {
    e.stopPropagation()
    e.preventDefault()
    const cajaEl = (e.currentTarget as HTMLElement).parentElement
    if (!cajaEl) return
    const cr = cajaEl.getBoundingClientRect()
    const cx = cr.left + cr.width / 2
    const cy = cr.top + cr.height / 2
    setMoviendoVisor(true)
    const mover = (ev: globalThis.PointerEvent) => {
      actualizarEncuadre(id, { rotacion: anguloGiro(cx, cy, ev) })
    }
    const soltar = () => {
      setMoviendoVisor(false)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  // el cuerpo arrastrable existe para el clip que hay bajo el cabezal aunque no esté
  // elegido: así, al presionar sobre él, queda seleccionado y se arrastra en el mismo
  // gesto. el contorno y los tiradores, en cambio, solo salen cuando ya está elegido
  if (!activo) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }
  const seleccionado = activo.id === clipSeleccionado
  const asset = medios.find((a) => a.id === activo.assetId)
  if (!asset || rect.w === 0) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }

  const enc = encuadreDe(activo)
  const r = rectClip(asset.ancho, asset.alto, rect.w, rect.h, enc)
  // si el clip está recortado, el contorno de selección se ciñe al área que queda
  // (lo que de verdad se ve), no al tamaño completo del video. así los tiradores
  // rodean lo recortado y no un marco más grande que la imagen
  const rec = activo.recorte ?? { izq: 0, der: 0, arr: 0, aba: 0 }
  const cajaVista = {
    left: rect.ox + r.dx + rec.izq * r.dw,
    top: rect.oy + r.dy + rec.arr * r.dh,
    width: r.dw * (1 - rec.izq - rec.der),
    height: r.dh * (1 - rec.arr - rec.aba),
  }
  // desfase del centro del recorte respecto al centro del video, y la caja del
  // recorte en fracción del lienzo. sobre esta caja se calcula el redimensionado
  // cuando el clip está recortado, para que los tiradores (que rodean el recorte)
  // escalen la imagen sin desplazarla de sitio
  const desfaseRecorte = {
    x: ((rec.izq - rec.der) / 2) * (r.dw / rect.w),
    y: ((rec.arr - rec.aba) / 2) * (r.dh / rect.h),
  }
  const cajaRecorte = {
    x: enc.x + desfaseRecorte.x,
    y: enc.y + desfaseRecorte.y,
    w: (r.dw / rect.w) * (1 - rec.izq - rec.der),
    h: (r.dh / rect.h) * (1 - rec.arr - rec.aba),
  }

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
        onPointerDown={(e) =>
          iniciarArrastre(
            e,
            activo.id,
            { x: enc.x, y: enc.y },
            // para el imantado se usa la caja envolvente recta del recorte girado, así
            // la guía salta cuando el borde que se ve toca el del lienzo
            envolventeGirada(cajaRecorte.w, cajaRecorte.h, rect, enc.rotacion),
            desfaseRecorte,
          )
        }
        onDoubleClick={(e) => {
          e.stopPropagation()
          // doble clic sobre un clip ya recortado abre su recorte en el visor para
          // retocarlo, sin desplegar el panel de la derecha. si no tiene recorte, no
          // pasa nada (antes esto recolocaba y agrandaba el video, que no era lo pedido)
          if (hayRecorte(activo.recorte)) setRecorteRapido(true)
        }}
        className={`pointer-events-auto absolute cursor-move rounded-[2px] ${
          seleccionado ? 'outline outline-2 outline-brand' : ''
        }`}
        style={{
          left: cajaVista.left,
          top: cajaVista.top,
          width: cajaVista.width,
          height: cajaVista.height,
          // la caja gira con el video alrededor de su centro, para que la selección
          // acompañe a la imagen rotada
          transform: enc.rotacion ? `rotate(${enc.rotacion}deg)` : undefined,
        }}
      >
        {seleccionado && (
          <>
            <Tiradores
              rotacion={enc.rotacion}
              onAgarrar={(a, e) =>
                iniciarRedimension(e, activo.id, a, cajaRecorte, enc.escala, desfaseRecorte, enc.rotacion ?? 0)
              }
            />
            <ManijaGiro onAgarrar={(e) => iniciarGiroClip(e, activo.id)} />
          </>
        )}
      </div>
    </div>
  )
}
