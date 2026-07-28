import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { rectContenido } from '../../../lib/layers/rect'
import { rectClip, encuadreDe } from '../../../lib/timeline/encuadre'
import { clipEnTiempo } from '../../../lib/timeline/clips'
import { posicionCapa } from '../../../lib/layers/motion'
import { CapaImagen } from '../../../types/layers'

const CERO = { izq: 0, der: 0, arr: 0, aba: 0 }

// acota cada lado del recorte al rango válido, sin cruzar al de enfrente, para
// que quede al menos un mínimo de imagen a la vista. es el mismo criterio que
// aplica el store al recorte del video
function acotarRecorte(base: typeof CERO, cambios: Partial<typeof CERO>): typeof CERO {
  const n = { ...base, ...cambios }
  const MIN = 0.05
  n.izq = Math.max(0, Math.min(1 - MIN - n.der, n.izq))
  n.der = Math.max(0, Math.min(1 - MIN - n.izq, n.der))
  n.arr = Math.max(0, Math.min(1 - MIN - n.aba, n.arr))
  n.aba = Math.max(0, Math.min(1 - MIN - n.arr, n.aba))
  return n
}

// los ocho agarres del recuadro de recorte y qué lados mueve cada uno. las
// esquinas tocan dos lados a la vez; los del medio, solo el suyo
type Lado = 'izq' | 'der' | 'arr' | 'aba'
const AGARRES: { id: string; lados: Lado[]; x: number; y: number; cursor: string }[] = [
  { id: 'nw', lados: ['arr', 'izq'], x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'n', lados: ['arr'], x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'ne', lados: ['arr', 'der'], x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'e', lados: ['der'], x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'se', lados: ['aba', 'der'], x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 's', lados: ['aba'], x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'sw', lados: ['aba', 'izq'], x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'w', lados: ['izq'], x: 0, y: 0.5, cursor: 'ew-resize' },
]

// capa de recorte que sale sobre el visor cuando la herramienta de recortar está
// activa y hay un video seleccionado bajo el cabezal. muestra el recuadro que se
// conserva con líneas blancas finas, oscurece lo que queda fuera, y por sus
// agarres se ajusta cada lado. lo que se recorta se ve igual en el archivo
export default function RecorteOverlay() {
  const herramienta = useEditorStore((s) => s.herramienta)
  const categoriaClip = useEditorStore((s) => s.categoriaClip)
  const recorteRapido = useEditorStore((s) => s.recorteRapido)
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const playhead = useEditorStore((s) => s.playhead)
  const resolucion = useEditorStore((s) => s.resolucion)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const recortarClipImagen = useEditorStore((s) => s.recortarClipImagen)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const limpiarSeleccion = useEditorStore((s) => s.limpiarSeleccion)
  const medios = useProjectStore((s) => s.medios)

  const rootRef = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  // ejes en los que el recorte quedó centrado mientras se arrastra, para pintar la
  // línea guía que ayuda a cuadrarlo, igual que al mover el elemento entero
  const [guias, setGuias] = useState<('x' | 'y')[]>([])

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

  // la herramienta recorta o bien una imagen elegida, o bien el clip de video
  // bajo el cabezal. la imagen manda si está seleccionada, porque al elegirla se
  // suelta cualquier clip
  const capaImagen = capas.find(
    (c): c is CapaImagen =>
      c.id === capaSeleccionada &&
      c.tipo === 'imagen' &&
      playhead >= c.inicio &&
      playhead < c.inicio + c.duracion,
  )
  // solo se recorta el clip que está elegido y además bajo el cabezal, para que el
  // recuadro caiga sobre el video que de verdad se ve
  const objetivo = !capaImagen && activo && activo.id === clipSeleccionado ? activo : null
  const asset = objetivo ? medios.find((a) => a.id === objetivo.assetId) : null

  const enRecorte = herramienta === 'recortar' || categoriaClip === 'recortar' || recorteRapido
  const activa = enRecorte && rect.w > 0 && (capaImagen || (objetivo && asset))
  if (!activa) {
    return <div ref={rootRef} className="pointer-events-none absolute inset-0" />
  }

  // caja del objetivo en píxeles del visor, sobre la que se mide el recorte, y el
  // recorte vigente. el video sale de su encuadre; la imagen, de su posición y su
  // tamaño con la proporción natural completa
  let caja: { x: number; y: number; w: number; h: number }
  let rec: typeof CERO
  if (capaImagen) {
    const pos = posicionCapa(capaImagen, playhead)
    const w = capaImagen.anchoRel * rect.w
    // alto con la proporción natural entera, igual que lo pinta el visor
    const asp = capaImagen.anchoNatural > 0 ? capaImagen.anchoNatural / capaImagen.altoNatural : 1
    const h =
      capaImagen.altoRel !== undefined
        ? capaImagen.altoRel * rect.h
        : (capaImagen.anchoRel * aspecto) / (asp || 1) * rect.h
    caja = { x: rect.ox + pos.x * rect.w - w / 2, y: rect.oy + pos.y * rect.h - h / 2, w, h }
    rec = capaImagen.recorte ?? CERO
  } else {
    const enc = encuadreDe(objetivo!)
    const r = rectClip(asset!.ancho, asset!.alto, rect.w, rect.h, enc)
    caja = { x: rect.ox + r.dx, y: rect.oy + r.dy, w: r.dw, h: r.dh }
    rec = objetivo!.recorte ?? CERO
  }

  const crop = {
    x: caja.x + rec.izq * caja.w,
    y: caja.y + rec.arr * caja.h,
    w: caja.w * (1 - rec.izq - rec.der),
    h: caja.h * (1 - rec.arr - rec.aba),
  }

  // forma elegida y tamaño del recorte en píxeles reales del material (no de la
  // pantalla), para mostrarlo como referencia mientras se ajusta. el video sale de
  // su resolución nativa; la imagen, de la suya
  // la forma (rectángulo, círculo, óvalo) vive en el recorte del clip de video; la
  // imagen por ahora solo recorta en rectángulo, así que ahí se queda en rectángulo
  const forma = (objetivo?.recorte?.forma ?? 'rectangulo') as 'rectangulo' | 'elipse' | 'circulo'
  // las dos formas redondas (círculo nítido y círculo con borde difuminado) se
  // comportan igual al medir y redimensionar: nacen redondas y con Alt se pueden
  // estirar a un óvalo. lo único que cambia entre ellas es el borde
  const esRedondo = forma === 'circulo' || forma === 'elipse'
  const nativoW = capaImagen ? capaImagen.anchoNatural : asset?.ancho ?? 0
  const nativoH = capaImagen ? capaImagen.altoNatural : asset?.alto ?? 0
  const pxW = Math.round((1 - rec.izq - rec.der) * nativoW)
  const pxH = Math.round((1 - rec.arr - rec.aba) * nativoH)
  // una forma redonda perfecta se muestra por su diámetro; el resto, ancho por alto.
  // si un redondo se estiró a óvalo con Alt, deja de ser cuadrado y también va con
  // ancho por alto
  const redondoPerfecto = esRedondo && Math.abs(pxW - pxH) <= 2
  const etiquetaTam = redondoPerfecto ? `⌀ ${Math.min(pxW, pxH)} px` : `${pxW} × ${pxH} px`

  // deja el recorte cuadrado en pantalla (mismo tamaño en píxeles de visor por los
  // dos ejes) alrededor de su centro, que es lo que hace que el óvalo salga como un
  // círculo perfecto. el radio se acota para no salirse de la caja del elemento
  function recorteCircular(radioPx: number): Partial<typeof CERO> {
    const cxf = (rec.izq + (1 - rec.der)) / 2
    const cyf = (rec.arr + (1 - rec.aba)) / 2
    const maxPx = Math.min(cxf, 1 - cxf) * caja.w
    const maxPy = Math.min(cyf, 1 - cyf) * caja.h
    const r = Math.max(6, Math.min(radioPx, maxPx, maxPy))
    const hw = r / caja.w
    const hh = r / caja.h
    return { izq: cxf - hw, der: 1 - (cxf + hw), arr: cyf - hh, aba: 1 - (cyf + hh) }
  }

  // guarda el recorte en el objetivo que corresponda: la imagen lo lleva como un
  // campo de la capa (acotado aquí); el clip usa su acción del store, que ya acota
  function aplicarRecorte(cambios: Partial<typeof CERO>) {
    if (capaImagen) actualizarCapa(capaImagen.id, { recorte: acotarRecorte(rec, cambios) })
    else if (objetivo) recortarClipImagen(objetivo.id, cambios)
  }

  // arrastre de un agarre: la posición del cursor en fracción de la caja marca
  // dónde queda el lado que se mueve
  function iniciar(e: ReactMouseEvent, lados: Lado[]) {
    e.stopPropagation()
    e.preventDefault()
    const root = rootRef.current
    if (!root) return
    const rr = root.getBoundingClientRect()
    // el cursor llega en píxeles visuales; la caja está en píxeles de layout. con el
    // navegador a un zoom distinto de 100% esos dos espacios no coinciden y el recorte
    // se descuadraba respecto al cursor. la escala tam/rr (que es 1/zoom) lleva el
    // cursor al mismo espacio que la caja
    const escX = rr.width > 0 ? tam.w / rr.width : 1
    const escY = rr.height > 0 ? tam.h / rr.height : 1
    const mover = (ev: globalThis.MouseEvent) => {
      // una forma redonda se redimensiona a la vez por ancho y alto para mantenerse
      // redonda: el radio sale de la distancia del cursor al centro, y queda un
      // círculo perfecto centrado en su sitio. con Alt se rompe esa regla y se pasa
      // al ajuste libre por lado, que es como se estira a un óvalo
      if (esRedondo && !ev.altKey) {
        const cxpx = caja.x + ((rec.izq + (1 - rec.der)) / 2) * caja.w
        const cypx = caja.y + ((rec.arr + (1 - rec.aba)) / 2) * caja.h
        const dxp = Math.abs((ev.clientX - rr.left) * escX - cxpx)
        const dyp = Math.abs((ev.clientY - rr.top) * escY - cypx)
        aplicarRecorte(recorteCircular(Math.max(dxp, dyp)))
        return
      }
      const fx = ((ev.clientX - rr.left) * escX - caja.x) / caja.w
      const fy = ((ev.clientY - rr.top) * escY - caja.y) / caja.h
      const cambios: Partial<typeof CERO> = {}
      for (const lado of lados) {
        if (lado === 'izq') cambios.izq = fx
        if (lado === 'der') cambios.der = 1 - fx
        if (lado === 'arr') cambios.arr = fy
        if (lado === 'aba') cambios.aba = 1 - fy
      }
      // en el rectángulo, Alt cierra el recuadro por los dos costados a la vez,
      // midiendo desde el centro. en las formas redondas Alt hace lo contrario: en
      // vez de mantenerlas redondas, libera el lado que se arrastra para poder
      // estirarlas a óvalo, así que ahí no se refleja el borde de enfrente
      if (ev.altKey && !esRedondo) {
        if (cambios.izq !== undefined) cambios.der = cambios.izq
        if (cambios.der !== undefined && cambios.izq === undefined) cambios.izq = cambios.der
        if (cambios.arr !== undefined) cambios.aba = cambios.arr
        if (cambios.aba !== undefined && cambios.arr === undefined) cambios.arr = cambios.aba
      }
      aplicarRecorte(cambios)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // arrastrar por dentro del recuadro lo desplaza entero sin cambiar su tamaño.
  // los cuatro lados se mueven a la vez el mismo tanto, y el recorrido se topa
  // para que el recorte no se salga de la imagen por ningún borde
  function iniciarMoverRecorte(e: ReactMouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const root = rootRef.current
    if (!root) return
    const rr = root.getBoundingClientRect()
    // misma corrección de zoom que al redimensionar: el desplazamiento del cursor va en
    // píxeles visuales y la caja en píxeles de layout
    const escX = rr.width > 0 ? tam.w / rr.width : 1
    const escY = rr.height > 0 ? tam.h / rr.height : 1
    const inicioX = e.clientX
    const inicioY = e.clientY
    const base = { ...rec }
    // umbral de imantado al centro, en fracción de la caja. cerca de esa distancia
    // el recorte se pega al centro y sale la guía
    const IMAN = 0.02
    const mover = (ev: globalThis.MouseEvent) => {
      const dx = ((ev.clientX - inicioX) * escX) / caja.w
      const dy = ((ev.clientY - inicioY) * escY) / caja.h
      // el desplazamiento se recorta al hueco que queda a cada lado, así el ancho
      // y el alto del recorte se mantienen exactos mientras se arrastra
      let mx = Math.max(-base.izq, Math.min(base.der, dx))
      let my = Math.max(-base.arr, Math.min(base.aba, dy))
      // imantado al centro: si el recorte queda casi centrado en un eje, se clava en
      // el centro (izquierda = derecha, o arriba = abajo) y se enciende la guía. con
      // Alt se desactiva por si hay que colocarlo justo al lado sin que salte
      const marcas: ('x' | 'y')[] = []
      if (!ev.altKey) {
        const desplazadoX = base.izq + mx - (base.der - mx) // izq - der resultante
        if (Math.abs(desplazadoX) < IMAN * 2) {
          mx = (base.der - base.izq) / 2
          marcas.push('x')
        }
        const desplazadoY = base.arr + my - (base.aba - my)
        if (Math.abs(desplazadoY) < IMAN * 2) {
          my = (base.aba - base.arr) / 2
          marcas.push('y')
        }
      }
      setGuias(marcas)
      aplicarRecorte({
        izq: base.izq + mx,
        der: base.der - mx,
        arr: base.arr + my,
        aba: base.aba - my,
      })
    }
    const soltar = () => {
      setGuias([])
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-40"
      // pulsar la zona oscurecida de fuera del recuadro suelta la selección del
      // clip. como el recorte ya se guardó al ajustarlo, esto solo cierra la
      // herramienta y deja ver el resultado limpio, sin tener que buscar un botón.
      // el recuadro y sus agarres cortan la propagación, así que solo salta aquí
      onMouseDown={() => limpiarSeleccion()}
    >
      {/* líneas guía del centrado, visibles solo mientras se arrastra el recorte y
          queda cuadrado en ese eje. cruzan la caja del elemento por su mitad */}
      {guias.includes('x') && (
        <div
          className="pointer-events-none absolute z-10"
          style={{ left: caja.x + caja.w / 2, top: caja.y, width: 1, height: caja.h, background: '#ff3ba7' }}
        />
      )}
      {guias.includes('y') && (
        <div
          className="pointer-events-none absolute z-10"
          style={{ left: caja.x, top: caja.y + caja.h / 2, width: caja.w, height: 1, background: '#ff3ba7' }}
        />
      )}
      {/* zona de agarre del centro: pone la manito y mueve el recorte entero. va
          debajo de los agarres, así que tirar de un borde sigue redimensionando */}
      <div
        onMouseDown={iniciarMoverRecorte}
        title="Arrastra para mover el recorte"
        className="absolute cursor-move"
        style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
      />
      {/* el recuadro que se conserva, con su borde blanco fino. el oscurecido de
          alrededor lo pinta una sombra enorme proyectada hacia afuera, un truco
          clásico para tapar todo menos el hueco del recorte */}
      <div
        className="pointer-events-none absolute border border-white/90"
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.w,
          height: crop.h,
          // en las formas redondas el hueco se redondea del todo, y la misma sombra
          // tapa el resto con esa silueta, así se ve el recorte redondo de verdad
          // (con Alt convertido en óvalo, el 50% da una elipse, que es lo correcto)
          borderRadius: esRedondo ? '50%' : undefined,
          boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* guías de tercios, finísimas, para encuadrar como en una cámara. en las
            formas redondas estorban, así que ahí no salen */}
        {!esRedondo && (
          <div className="absolute inset-0">
            <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
            <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
            <div className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
            <div className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
          </div>
        )}
        {/* tamaño del recorte en píxeles reales, arriba del recuadro */}
        <span
          className="absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white"
          style={{ background: 'rgba(8,12,24,0.75)' }}
        >
          {etiquetaTam}
        </span>
      </div>

      {/* agarres blancos por lados y esquinas */}
      {AGARRES.map((a) => (
        <div
          key={a.id}
          onMouseDown={(e) => iniciar(e, a.lados)}
          className="absolute h-3 w-3 rounded-[2px] border border-black/30 bg-white shadow-sm"
          style={{
            left: crop.x + a.x * crop.w,
            top: crop.y + a.y * crop.h,
            transform: 'translate(-50%, -50%)',
            cursor: a.cursor,
          }}
        />
      ))}
    </div>
  )
}
