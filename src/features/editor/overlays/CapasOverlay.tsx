import { CSSProperties, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTrazo } from '../../../types/layers'
import { REPETICIONES_BRILLO, desenfoqueBrillo, hexAOpacidad } from '../../../lib/layers/defaults'
import { rectContenido } from '../../../lib/layers/rect'
import { posicionCapa } from '../../../lib/layers/motion'
import { fundidoEn } from '../../../lib/audio/ganancia'
import { Ancla, Caja, redimensionar } from '../../../lib/layers/resize'
import { CajaGuia, Guia, imantar } from '../../../lib/layers/guias'
import { sufijoTransformCss } from '../../../lib/layers/transform'
import { esTonoNeutro, filtroCss, usaMatriz, matrizTono, tablasColor } from '../../../lib/color/tono'
import Tiradores from './Tiradores'
import ManijaGiro, { anguloGiro } from './ManijaGiro'
import RecorridoOverlay from './RecorridoOverlay'

const entre = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v))

// genera la figura svg dentro de una caja de w×h píxeles, con grosor de borde g
function dibujoFigura(c: CapaFigura, w: number, h: number, g: number) {
  const fill = c.relleno ? c.colorRelleno : 'none'
  const stroke = c.borde ? c.colorBorde : 'none'
  const sw = c.borde ? g : 0
  const i = sw / 2

  switch (c.forma) {
    case 'rectangulo':
      return <rect x={i} y={i} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} fill={fill} stroke={stroke} strokeWidth={sw} />
    case 'redondeado':
      return (
        <rect x={i} y={i} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} rx={Math.min(w, h) * 0.15} fill={fill} stroke={stroke} strokeWidth={sw} />
      )
    case 'elipse':
      return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - i)} ry={Math.max(0, h / 2 - i)} fill={fill} stroke={stroke} strokeWidth={sw} />
    case 'triangulo':
      return <polygon points={`${w / 2},${i} ${w - i},${h - i} ${i},${h - i}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    case 'estrella': {
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) / 2 - i
      const r = R * 0.42
      const pts: string[] = []
      for (let k = 0; k < 10; k++) {
        const ang = ((k * 36 - 90) * Math.PI) / 180
        const rr = k % 2 === 0 ? R : r
        pts.push(`${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)}`)
      }
      return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    }
    case 'linea':
      return <line x1={g} y1={h / 2} x2={w - g} y2={h / 2} stroke={c.colorRelleno} strokeWidth={g} strokeLinecap="round" />
    case 'flecha': {
      const y = h / 2
      const cabeza = g * 3
      return (
        <>
          <line x1={g} y1={y} x2={Math.max(g, w - cabeza)} y2={y} stroke={c.colorRelleno} strokeWidth={g} strokeLinecap="round" />
          <polygon points={`${w - g},${y} ${w - cabeza},${y - cabeza / 1.6} ${w - cabeza},${y + cabeza / 1.6}`} fill={c.colorRelleno} />
        </>
      )
    }
    default:
      return null
  }
}

// dibuja las capas visibles en el instante actual sobre el video. cada capa se
// arrastra para recolocarla o, si está grabando, para trazar su recorrido; las
// imágenes y la censura se redimensionan por su tirador. el efecto de censura
// lo pinta el canvas del visor; aquí va solo la caja interactiva
export default function CapasOverlay() {
  const capas = useEditorStore((s) => s.capas)
  const playhead = useEditorStore((s) => s.playhead)
  const herramienta = useEditorStore((s) => s.herramienta)
  const resolucion = useEditorStore((s) => s.resolucion)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const capasSeleccionadas = useEditorStore((s) => s.capasSeleccionadas)
  const seleccionarCapa = useEditorStore((s) => s.seleccionarCapa)
  const moverCapaLienzo = useEditorStore((s) => s.moverCapaLienzo)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const desplazarCapa = useEditorStore((s) => s.desplazarCapa)
  const registrarPunto = useEditorStore((s) => s.registrarPunto)
  const dibujandoMascara = useEditorStore((s) => s.dibujandoMascara)
  const grabandoMovimiento = useEditorStore((s) => s.grabandoMovimiento)
  const anadirTrazo = useEditorStore((s) => s.anadirTrazo)
  const agregarTrazo = useEditorStore((s) => s.agregarTrazo)
  const anadirTrazoDibujo = useEditorStore((s) => s.anadirTrazoDibujo)
  const borrarEn = useEditorStore((s) => s.borrarEn)
  const borradorGrosor = useEditorStore((s) => s.borradorGrosor)
  const abrirGesto = useEditorStore((s) => s.abrirGesto)
  const finGesto = useEditorStore((s) => s.finGesto)

  const rootRef = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  // líneas de alineación que se muestran solo mientras dura el arrastre
  const [guias, setGuias] = useState<Guia[]>([])
  // id de la capa de texto que se está editando en el sitio, tras un doble clic
  const [editando, setEditando] = useState<string | null>(null)
  // trazo que se está pintando ahora mismo con el pincel. se guarda aparte del
  // store para dibujarlo en vivo sin abrir un paso de deshacer por cada punto;
  // al soltar el ratón pasa a la capa de una sola vez y esto vuelve a quedar en null
  const [trazoVivo, setTrazoVivo] = useState<{ id: string; puntos: { x: number; y: number }[] } | null>(
    null,
  )
  const editRef = useRef<HTMLDivElement | null>(null)

  // al entrar en edición se vuelca el texto actual en el elemento editable, se le
  // da el foco y el cursor se coloca al final, listo para escribir
  useEffect(() => {
    const el = editRef.current
    if (!el || !editando) return
    // se lee del store y no de la prop para no depender de `capas`: si dependiera,
    // cada avance del cabezal reejecutaría esto y borraría el cursor a media palabra
    const capa = useEditorStore.getState().capas.find((c) => c.id === editando)
    el.innerText = capa && capa.tipo === 'texto' ? capa.texto : ''
    el.focus()
    const rango = document.createRange()
    rango.selectNodeContents(el)
    rango.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(rango)
  }, [editando])

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
  const escala = rect.h > 0 ? rect.h / resolucion.alto : 0

  function normalizar(ev: globalThis.MouseEvent) {
    const root = rootRef.current
    if (!root) return { x: 0.5, y: 0.5 }
    const r = root.getBoundingClientRect()
    const rc = rectContenido(r.width, r.height, aspecto)
    return { x: (ev.clientX - r.left - rc.ox) / rc.w, y: (ev.clientY - r.top - rc.oy) / rc.h }
  }

  // arrastre unificado: grabando escribe el recorrido; con recorrido ya hecho
  // desplaza todo; y sin recorrido mueve la posición fija
  function iniciarArrastre(e: ReactMouseEvent, capa: Capa) {
    e.stopPropagation()
    // con shift la capa solo se suma o se quita del conjunto para alinear varias,
    // sin arrastrar; sin shift se elige esta y empieza el movimiento normal
    if (e.shiftKey) {
      seleccionarCapa(capa.id, true)
      return
    }
    seleccionarCapa(capa.id)
    let ultima = normalizar(e.nativeEvent)
    const propia = cajaDe(capa, (e.currentTarget as HTMLElement) ?? null)
    const vecinas = cajasVecinas(capa.id)
    // desfase entre donde se agarró y el centro del elemento. sin esto, al mover
    // un elemento tomándolo por una esquina, su centro saltaba de golpe bajo el
    // cursor; conservando este desfase, el elemento se desliza desde donde estaba
    const agarre = propia ? { x: ultima.x - propia.x, y: ultima.y - propia.y } : { x: 0, y: 0 }

    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const st = useEditorStore.getState()
      if (st.grabandoMovimiento) {
        registrarPunto(capa.id, st.playhead, p.x, p.y)
      } else if (capa.keyframes.length > 0) {
        desplazarCapa(capa.id, p.x - ultima.x, p.y - ultima.y)
      } else {
        // el centro objetivo es el cursor menos el desfase de agarre, de modo que
        // el punto por el que se sujeta el elemento se mantiene bajo el ratón
        const cx = p.x - agarre.x
        const cy = p.y - agarre.y
        // con Alt el imantado se desactiva, por si hace falta colocar algo justo
        // al lado de una guía sin que salte
        if (ev.altKey || !propia) {
          moverCapaLienzo(capa.id, cx, cy)
          setGuias([])
        } else {
          const r = imantar({ x: cx, y: cy, w: propia.w, h: propia.h }, vecinas)
          moverCapaLienzo(capa.id, r.x, r.y)
          setGuias(r.guias)
        }
      }
      ultima = p
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      setGuias([])
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // dibujo de máscara con pincel: cada trazo se guarda relativo al centro de la
  // capa para que se mueva con ella
  function iniciarPincel(e: ReactMouseEvent, capa: CapaCensura) {
    e.stopPropagation()
    seleccionarCapa(capa.id)
    if (!useEditorStore.getState().dibujandoMascara) {
      iniciarArrastre(e, capa)
      return
    }
    const centro = posicionCapa(capa, useEditorStore.getState().playhead)
    const puntos: { x: number; y: number }[] = []
    const agregar = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      puntos.push({ x: p.x - centro.x, y: p.y - centro.y })
    }
    agregar(e.nativeEvent)
    const mover = (ev: globalThis.MouseEvent) => agregar(ev)
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      if (puntos.length) anadirTrazo(capa.id, puntos)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // lápiz libre: la superficie de dibujo captura un trazo a mano alzada y lo
  // guarda en la capa de dibujo activa. si la seleccionada no es un dibujo, se
  // crea una nueva al vuelo. el gesto se abre y se cierra a mano para que crear la
  // capa y añadirle el trazo cuenten como un solo paso de deshacer
  function iniciarDibujo(e: ReactMouseEvent) {
    e.stopPropagation()
    const st = useEditorStore.getState()
    const actual = st.capas.find((c) => c.id === st.capaSeleccionada && c.tipo === 'trazo')
    abrirGesto()
    const id = actual ? actual.id : agregarTrazo()
    // el centro contra el que se miden los puntos: el de la capa donde se dibuja,
    // igual que hace la máscara de pincel, para que el trazo se mueva con ella
    const capa = useEditorStore.getState().capas.find((c) => c.id === id) as CapaTrazo
    const centro = posicionCapa(capa, useEditorStore.getState().playhead)
    const puntos: { x: number; y: number }[] = []
    const agregar = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      puntos.push({ x: p.x - centro.x, y: p.y - centro.y })
      // se copia el array para que react vea un valor nuevo y repinte: así el
      // trazo va apareciendo bajo el cursor en lugar de saltar entero al soltar
      setTrazoVivo({ id, puntos: [...puntos] })
    }
    agregar(e.nativeEvent)
    const mover = (ev: globalThis.MouseEvent) => agregar(ev)
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      if (puntos.length) anadirTrazoDibujo(id, puntos)
      // el trazo ya vive en la capa, así que la copia en vivo sobra
      setTrazoVivo(null)
      finGesto()
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // borrador: mientras se arrastra va quitando lo que el círculo toca. el radio se
  // pasa a unidades del lienzo, que es en las que viven las capas, y todo el gesto
  // cuenta como un solo paso de deshacer
  function iniciarBorrado(e: ReactMouseEvent) {
    e.stopPropagation()
    abrirGesto()
    const radio = borradorGrosor / 2 / Math.max(1, rect.w)
    const borrar = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      borrarEn(p.x, p.y, radio)
    }
    borrar(e.nativeEvent)
    const mover = (ev: globalThis.MouseEvent) => borrar(ev)
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      finGesto()
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // alto que ocupa una imagen en unidades del lienzo. la caja abarca la imagen
  // entera con su proporción natural; el recorte ya no encoge la caja, sino que
  // se pinta encima tapando los lados, igual que hace el recorte del video
  function altoImagen(c: CapaImagen) {
    if (c.altoRel !== undefined) return c.altoRel
    const asp = c.anchoNatural > 0 ? c.anchoNatural / c.altoNatural : 1
    return (c.anchoRel * aspecto) / (asp || 1)
  }

  // caja que ocupa una capa ahora mismo, en coordenadas del lienzo. el texto no
  // guarda medidas propias, así que se mide lo que está ocupando en pantalla
  function cajaDe(capa: Capa, caja: HTMLElement | null): Caja | null {
    const pos = posicionCapa(capa, useEditorStore.getState().playhead)
    if (capa.tipo === 'censura' || capa.tipo === 'figura')
      return { x: pos.x, y: pos.y, w: capa.anchoRel, h: capa.altoRel }
    if (capa.tipo === 'imagen')
      return { x: pos.x, y: pos.y, w: capa.anchoRel, h: altoImagen(capa) }
    if (capa.tipo === 'trazo') {
      // el centro sigue siendo el de la capa (los puntos van relativos a él), y el
      // ancho y alto salen de la caja que abarcan los trazos, para dar una medida
      // razonable al arrastre y a las guías
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const tr of capa.trazos)
        for (const p of tr) {
          if (p.x < minX) minX = p.x
          if (p.x > maxX) maxX = p.x
          if (p.y < minY) minY = p.y
          if (p.y > maxY) maxY = p.y
        }
      const w = isFinite(minX) ? maxX - minX : 0
      const h = isFinite(minY) ? maxY - minY : 0
      return { x: pos.x, y: pos.y, w, h }
    }
    if (!caja) return { x: pos.x, y: pos.y, w: 0, h: 0 }
    const r = caja.getBoundingClientRect()
    return { x: pos.x, y: pos.y, w: r.width / rect.w, h: r.height / rect.h }
  }

  // cajas de las demás capas visibles, que son contra las que se alinea la que
  // se está arrastrando
  function cajasVecinas(idExcluido: string): CajaGuia[] {
    const st = useEditorStore.getState()
    return st.capas
      .filter(
        (c) =>
          c.id !== idExcluido &&
          st.playhead >= c.inicio &&
          st.playhead < c.inicio + c.duracion,
      )
      .map((c) => cajaDe(c, null) as CajaGuia)
  }

  // redimensionado común a todo lo que va sobre el lienzo. el borde contrario al
  // agarre no se mueve, y Shift conserva la proporción. el texto escala siempre
  // proporcional, porque deformarlo lo dejaría ilegible
  function iniciarRedimension(e: ReactMouseEvent, capa: Capa, ancla: Ancla) {
    e.stopPropagation()
    e.preventDefault()
    seleccionarCapa(capa.id)

    const contenedor = (e.currentTarget as HTMLElement).parentElement
    const inicial = cajaDe(capa, contenedor)
    if (!inicial) return
    const tamanoInicial = capa.tipo === 'texto' ? capa.tamano : 0
    // una capa con recorrido grabado se coloca sola en cada instante, así que
    // recolocar su centro aquí pelearía con los keyframes
    const fija = capa.keyframes.length === 0

    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const forzarProporcion = capa.tipo === 'texto' || ev.shiftKey
      const n = redimensionar(inicial, ancla, p.x, p.y, forzarProporcion)
      const posicion = fija ? { x: entre(0, 1, n.x), y: entre(0, 1, n.y) } : {}

      if (capa.tipo === 'texto') {
        const factor = inicial.w > 0 ? n.w / inicial.w : 1
        actualizarCapa(capa.id, {
          ...posicion,
          tamano: Math.round(entre(8, 400, tamanoInicial * factor)),
        })
        return
      }
      actualizarCapa(capa.id, {
        ...posicion,
        anchoRel: entre(0.03, 2, n.w),
        altoRel: entre(0.03, 2, n.h),
      })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // giro por la manija: se toma el centro del elemento en pantalla y se sigue el
  // ángulo del cursor respecto de él. la caja se rota alrededor de su centro, así
  // que su rectángulo envolvente sigue centrado ahí y sirve para el cálculo
  function iniciarGiro(e: ReactMouseEvent, capa: Capa) {
    e.stopPropagation()
    e.preventDefault()
    seleccionarCapa(capa.id)
    const cajaEl = (e.currentTarget as HTMLElement).parentElement
    if (!cajaEl) return
    const cr = cajaEl.getBoundingClientRect()
    const cx = cr.left + cr.width / 2
    const cy = cr.top + cr.height / 2
    const mover = (ev: globalThis.MouseEvent) => {
      actualizarCapa(capa.id, { rotacion: anguloGiro(cx, cy, ev) })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // el fundido de la capa se resuelve aquí, rebajando su opacidad, en lugar de
  // repartirlo por cada sitio que la dibuja. así el resto del render no se entera
  // y la exportación puede hacer exactamente lo mismo
  const visibles = capas
    .filter((c) => playhead >= c.inicio && playhead < c.inicio + c.duracion)
    .map((c) => {
      const f = fundidoEn(playhead, c.inicio, c.duracion, c.fundidoEntrada, c.fundidoSalida)
      return f >= 1 ? c : ({ ...c, opacidad: c.opacidad * f } as Capa)
    })

  // imágenes cuyo color necesita el filtro svg (temperatura, tinte, ruedas o
  // curvas). el brillo, el contraste y la saturación salen de funciones nativas
  // y no requieren esta parte
  const imagenesColor = capas.filter(
    (c): c is CapaImagen => c.tipo === 'imagen' && !!c.tono && usaMatriz(c.tono),
  )

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* recorrido de la capa seleccionada, para verlo y retocarlo */}
      {visibles
        .filter((c) => c.id === capaSeleccionada && c.keyframes.length > 0)
        .map((c) => (
          <RecorridoOverlay key={`ruta-${c.id}`} capa={c} rect={rect} normalizar={normalizar} />
        ))}

      {/* guías de alineación, visibles solo durante el arrastre. mientras se graba
          un recorrido no deben salir: ahí el arrastre traza el movimiento y las
          líneas inteligentes solo estorbarían la vista */}
      {!grabandoMovimiento && guias.map((g) => (
        <div
          key={`${g.eje}-${g.pos}`}
          className="pointer-events-none absolute z-30"
          style={
            g.eje === 'x'
              ? {
                  left: rect.ox + g.pos * rect.w,
                  top: rect.oy,
                  width: 1,
                  height: rect.h,
                  background: '#ff3ba7',
                }
              : {
                  left: rect.ox,
                  top: rect.oy + g.pos * rect.h,
                  width: rect.w,
                  height: 1,
                  background: '#ff3ba7',
                }
          }
        />
      ))}

      {visibles.map((c) => {
        // una capa se resalta si es la principal o si está en el conjunto de
        // seleccionadas, para que al marcar varias se vean todas a la vez
        const seleccion = c.id === capaSeleccionada || capasSeleccionadas.includes(c.id)
        const pos = posicionCapa(c, playhead)
        const centroX = rect.ox + pos.x * rect.w
        const centroY = rect.oy + pos.y * rect.h
        // giro y espejo de la capa, que se anexan al translate de centrado. la
        // censura queda fuera: su efecto muestrea el video y girarla descuadraría
        // la zona tapada, así que ahí no se ofrece transformar
        const extra = c.tipo === 'censura' ? '' : sufijoTransformCss(c)

        if (c.tipo === 'censura' && c.forma === 'pincel') {
          // superficie para dibujar o mover la máscara de pincel; solo activa
          // cuando esta censura está seleccionada
          if (!seleccion) return null
          return (
            <div
              key={c.id}
              onMouseDown={(e) => iniciarPincel(e, c)}
              className="pointer-events-auto absolute inset-0"
              style={{ cursor: dibujandoMascara ? 'crosshair' : 'move' }}
            />
          )
        }

        if (c.tipo === 'censura') {
          return (
            <div
              key={c.id}
              data-capa-id={c.id}
              onMouseDown={(e) => iniciarArrastre(e, c)}
              className="pointer-events-auto absolute cursor-move"
              style={{
                left: centroX,
                top: centroY,
                width: c.anchoRel * rect.w,
                height: c.altoRel * rect.h,
                transform: 'translate(-50%, -50%)',
                // borde fino: el trazo grueso de antes tapaba parte de la escena y
                // se veía tosco. seleccionada va en azul, en reposo en blanco tenue
                border: `1px solid ${seleccion ? '#1861ff' : 'rgba(255,255,255,.5)'}`,
                borderRadius: c.forma === 'circulo' ? '50%' : 6,
              }}
            >
              {seleccion && (
                <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />
              )}
            </div>
          )
        }

        if (c.tipo === 'figura') {
          const ancho = Math.max(1, c.anchoRel * rect.w)
          const alto = Math.max(1, c.altoRel * rect.h)
          const g = c.grosorBorde * escala
          return (
            <div
              key={c.id}
              data-capa-id={c.id}
              onMouseDown={(e) => iniciarArrastre(e, c)}
              className={[
                'pointer-events-auto absolute cursor-move',
                seleccion ? 'outline outline-2 outline-brand' : '',
              ].join(' ')}
              style={{
                left: centroX,
                top: centroY,
                width: ancho,
                height: alto,
                transform: `translate(-50%, -50%) ${extra}`.trim(),
                opacity: c.opacidad / 100,
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${ancho} ${alto}`}
                preserveAspectRatio="none"
              >
                {dibujoFigura(c, ancho, alto, g)}
              </svg>
              {seleccion && (
                <>
                  <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />
                  <ManijaGiro onAgarrar={(e) => iniciarGiro(e, c)} />
                </>
              )}
            </div>
          )
        }

        if (c.tipo === 'trazo') {
          const g = Math.max(1, c.grosor * escala)
          // el svg cubre todo el lienzo; cada trazo se pinta en coordenadas del
          // lienzo sumándole la posición de la capa. el giro y el volteo se aplican
          // con transform-origin en el centro de la capa, igual que el resto
          const origen = `${pos.x * rect.w}px ${pos.y * rect.h}px`
          // mientras la herramienta dibujar está activa el arrastre pinta (lo
          // gestiona la superficie de dibujo), así que aquí no se captura nada. con
          // cualquier otra herramienta el dibujo se puede agarrar aunque todavía no
          // esté elegido, y el propio agarre lo selecciona, igual que pasa con un
          // texto o una figura. antes hacía falta tenerlo ya seleccionado, y como
          // elegirlo abría la herramienta de dibujar, no había manera de moverlo
          const movible = herramienta !== 'dibujar'
          return (
            <div
              key={c.id}
              data-capa-id={c.id}
              className="pointer-events-none absolute"
              style={{ left: rect.ox, top: rect.oy, width: rect.w, height: rect.h, opacity: c.opacidad / 100 }}
            >
              <svg
                width={rect.w}
                height={rect.h}
                className={movible ? 'overflow-visible' : 'pointer-events-none overflow-visible'}
                style={{ transform: extra || undefined, transformOrigin: origen }}
              >
                {c.trazos.map((tr, i) => {
                  if (tr.length === 1) {
                    const p = tr[0]
                    return (
                      <circle
                        key={i}
                        cx={(pos.x + p.x) * rect.w}
                        cy={(pos.y + p.y) * rect.h}
                        r={g / 2}
                        fill={c.color}
                      />
                    )
                  }
                  return (
                    <polyline
                      key={i}
                      points={tr.map((p) => `${(pos.x + p.x) * rect.w},${(pos.y + p.y) * rect.h}`).join(' ')}
                      fill="none"
                      stroke={c.color}
                      strokeWidth={g}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )
                })}
                {/* trazo que se está pintando en este instante. se dibuja igual que
                    los ya guardados, así el pincel deja rastro bajo el cursor */}
                {trazoVivo?.id === c.id &&
                  trazoVivo.puntos.length > 0 &&
                  (trazoVivo.puntos.length === 1 ? (
                    <circle
                      cx={(pos.x + trazoVivo.puntos[0].x) * rect.w}
                      cy={(pos.y + trazoVivo.puntos[0].y) * rect.h}
                      r={g / 2}
                      fill={c.color}
                    />
                  ) : (
                    <polyline
                      points={trazoVivo.puntos
                        .map((p) => `${(pos.x + p.x) * rect.w},${(pos.y + p.y) * rect.h}`)
                        .join(' ')}
                      fill="none"
                      stroke={c.color}
                      strokeWidth={g}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                {/* copia gruesa e invisible de cada trazo, solo para poder agarrarlo
                    y moverlo cuando no se está pintando */}
                {movible &&
                  c.trazos.map((tr, i) =>
                    tr.length === 1 ? (
                      <circle
                        key={`hit-${i}`}
                        cx={(pos.x + tr[0].x) * rect.w}
                        cy={(pos.y + tr[0].y) * rect.h}
                        r={Math.max(g, 14) / 2}
                        fill="transparent"
                        className="pointer-events-auto cursor-move"
                        onMouseDown={(e) => iniciarArrastre(e, c)}
                      />
                    ) : (
                      <polyline
                        key={`hit-${i}`}
                        points={tr.map((p) => `${(pos.x + p.x) * rect.w},${(pos.y + p.y) * rect.h}`).join(' ')}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={Math.max(g, 14)}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ pointerEvents: 'stroke' }}
                        className="pointer-events-auto cursor-move"
                        onMouseDown={(e) => iniciarArrastre(e, c)}
                      />
                    ),
                  )}
              </svg>
            </div>
          )
        }

        if (c.tipo === 'imagen') {
          const rec = c.recorte
          const ancho = c.anchoRel * rect.w
          const alto = altoImagen(c) * rect.h
          // el recorte tapa los lados con un clip-path inset, igual que el video;
          // el orden de inset es arriba, derecha, abajo, izquierda
          const hayRecorte = rec.izq || rec.der || rec.arr || rec.aba
          const clipPath = hayRecorte
            ? `inset(${rec.arr * 100}% ${rec.der * 100}% ${rec.aba * 100}% ${rec.izq * 100}%)`
            : undefined
          // el color se resuelve por el mismo camino que los clips: filtro nativo
          // más, si hay temperatura, ruedas o curvas, el filtro svg referenciado
          const filtroImagen =
            c.tono && !esTonoNeutro(c.tono) ? filtroCss(c.tono, `tono-img-${c.id}`, []) : undefined
          return (
            <div
              key={c.id}
              data-capa-id={c.id}
              onMouseDown={(e) => iniciarArrastre(e, c)}
              className={[
                'pointer-events-auto absolute cursor-move',
                seleccion ? 'outline outline-2 outline-brand' : '',
              ].join(' ')}
              style={{
                left: centroX,
                top: centroY,
                width: ancho,
                height: alto,
                transform: `translate(-50%, -50%) ${extra}`.trim(),
                opacity: c.opacidad / 100,
              }}
            >
              {/* la imagen entera llena la caja; el recorte se aplica como inset
                  sobre ella, no encogiendo la caja, para dejar ver el fondo */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={c.src}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none"
                  style={{ clipPath, filter: filtroImagen }}
                />
              </div>
              {seleccion && (
                <>
                  <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />
                  <ManijaGiro onAgarrar={(e) => iniciarGiro(e, c)} />
                </>
              )}
            </div>
          )
        }

        // la sombra y el resplandor se apilan en una sola propiedad textShadow.
        // el brillo se arma con varias sombras iguales del color elegido y sin
        // desplazamiento, con el mismo desenfoque y las mismas repeticiones que
        // usa el exportador, ya escalado al tamaño en pantalla para que el halo
        // que se ve al editar sea el que sale al exportar
        const sombras: string[] = []
        if (c.sombra) sombras.push('0 2px 8px rgba(0,0,0,.6)')
        if (c.brillo && c.intensidadBrillo > 0) {
          const b = desenfoqueBrillo(c.tamano, c.intensidadBrillo) * escala
          for (let k = 0; k < REPETICIONES_BRILLO; k++) sombras.push(`0 0 ${b}px ${c.colorBrillo}`)
        }

        const estilo: CSSProperties = {
          left: centroX,
          top: centroY,
          transform: `translate(-50%, -50%) ${extra}`.trim(),
          fontFamily: `'${c.fuente}', sans-serif`,
          fontSize: c.tamano * escala,
          fontWeight: c.negrita ? 700 : 400,
          fontStyle: c.cursiva ? 'italic' : 'normal',
          textDecoration: c.subrayado ? 'underline' : 'none',
          textAlign: c.alineacion,
          color: c.color,
          opacity: c.opacidad / 100,
          whiteSpace: 'pre-wrap',
          lineHeight: c.interlineado ?? 1.2,
          letterSpacing: `${(c.tracking ?? 0) * escala}px`,
          padding: c.fondo ? `${0.18 * c.tamano * escala}px ${0.36 * c.tamano * escala}px` : 0,
          background: c.fondo ? hexAOpacidad(c.colorFondo, c.opacidadFondo) : 'transparent',
          borderRadius: c.fondo ? (c.radioFondo ?? 6) * escala : 0,
          textShadow: sombras.length ? sombras.join(', ') : 'none',
          WebkitTextStroke: c.contorno ? `${c.grosorContorno * escala}px ${c.colorContorno}` : undefined,
        }
        // en edición el texto pasa a ser editable: doble clic lo abre, con un
        // contorno azul que deja claro que se está escribiendo dentro
        const enEdicion = editando === c.id
        return (
          <div
            // la clave cambia al entrar y salir de edición para que react rehaga el
            // nodo desde cero. sin esto, al cerrar quedaba el texto que tecleó el
            // usuario en el dom más el que react vuelve a pintar, y salía duplicado
            key={enEdicion ? `${c.id}-edit` : c.id}
            data-capa-id={c.id}
            ref={enEdicion ? editRef : undefined}
            // con doble clic se entra a escribir el texto directamente sobre el
            // video, sin ir al panel; el arrastre queda en pausa mientras se edita
            onDoubleClick={(e) => {
              e.stopPropagation()
              seleccionarCapa(c.id)
              setEditando(c.id)
            }}
            onMouseDown={(e) => {
              if (enEdicion) {
                // durante la edición el clic coloca el cursor, no mueve la capa
                e.stopPropagation()
                return
              }
              iniciarArrastre(e, c)
            }}
            contentEditable={enEdicion}
            suppressContentEditableWarning
            onKeyDown={
              enEdicion
                ? (e) => {
                    e.stopPropagation()
                    // enter confirma y sale; con shift se hace un salto de línea.
                    // escape también cierra dejando lo escrito
                    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
                      e.preventDefault()
                      ;(e.currentTarget as HTMLElement).blur()
                    }
                  }
                : undefined
            }
            onBlur={
              enEdicion
                ? (e) => {
                    actualizarCapa(c.id, { texto: (e.currentTarget as HTMLElement).innerText })
                    setEditando(null)
                  }
                : undefined
            }
            className={[
              'pointer-events-auto absolute max-w-[92%]',
              enEdicion
                ? 'cursor-text outline outline-2 outline-brand'
                : 'cursor-move select-none',
              seleccion && !enEdicion ? 'outline outline-2 outline-brand' : '',
            ].join(' ')}
            style={estilo}
          >
            {/* mientras se edita, el contenido lo maneja el propio elemento editable
                (se vuelca en el efecto), así que aquí no se pinta para no pelear con
                el cursor */}
            {!enEdicion && c.texto}
            {/* el texto solo escala por las esquinas: estirarlo por un lado lo
                deformaría y dejaría de leerse bien */}
            {seleccion && !enEdicion && (
              <>
                <Tiradores soloEsquinas onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />
                <ManijaGiro onAgarrar={(e) => iniciarGiro(e, c)} />
              </>
            )}
          </div>
        )
      })}

      {/* filtros svg del color de las imágenes, con la misma forma que los de los
          clips: la matriz de temperatura y tinte, y las tablas por canal de las
          ruedas y curvas. se referencian por su id desde el filter de cada imagen */}
      {imagenesColor.length > 0 && (
        <svg className="absolute h-0 w-0">
          <defs>
            {imagenesColor.map((c) => {
              const tablas = tablasColor(c.tono!)
              return (
                <filter key={c.id} id={`tono-img-${c.id}`} colorInterpolationFilters="sRGB">
                  <feColorMatrix type="matrix" values={matrizTono(c.tono!)} />
                  {tablas && (
                    <feComponentTransfer>
                      <feFuncR type="table" tableValues={tablas[0]} />
                      <feFuncG type="table" tableValues={tablas[1]} />
                      <feFuncB type="table" tableValues={tablas[2]} />
                    </feComponentTransfer>
                  )}
                </filter>
              )
            })}
          </defs>
        </svg>
      )}

      {/* superficie de dibujo: con la herramienta de lápiz activa cubre el lienzo
          y convierte el arrastre en un trazo a mano alzada. va por encima de todo
          para que pintar no mueva las capas de debajo */}
      {herramienta === 'dibujar' && (
        <div
          onMouseDown={iniciarDibujo}
          className="pointer-events-auto absolute z-20"
          style={{ left: rect.ox, top: rect.oy, width: rect.w, height: rect.h, cursor: 'crosshair' }}
        />
      )}

      {/* superficie del borrador: mismo tamaño que la de dibujo, pero el arrastre
          quita en lugar de pintar. el cursor se dibuja del tamaño real del borrador
          para saber qué se va a llevar antes de pulsar */}
      {herramienta === 'borrador' && (
        <div
          onMouseDown={iniciarBorrado}
          className="pointer-events-auto absolute z-20"
          style={{
            left: rect.ox,
            top: rect.oy,
            width: rect.w,
            height: rect.h,
            cursor: `url("data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='${borradorGrosor}' height='${borradorGrosor}'><circle cx='${borradorGrosor / 2}' cy='${borradorGrosor / 2}' r='${Math.max(2, borradorGrosor / 2 - 1)}' fill='rgba(255,255,255,0.25)' stroke='white' stroke-width='1.5'/></svg>`,
            )}") ${borradorGrosor / 2} ${borradorGrosor / 2}, crosshair`,
          }}
        />
      )}
    </div>
  )
}
