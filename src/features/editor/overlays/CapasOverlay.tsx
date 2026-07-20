import { CSSProperties, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../../store/useEditorStore'
import { Capa, CapaCensura, CapaFigura, CapaImagen } from '../../../types/layers'
import { REPETICIONES_BRILLO, desenfoqueBrillo, hexAOpacidad } from '../../../lib/layers/defaults'
import { rectContenido } from '../../../lib/layers/rect'
import { posicionCapa } from '../../../lib/layers/motion'
import { Ancla, Caja, redimensionar } from '../../../lib/layers/resize'
import { CajaGuia, Guia, imantar } from '../../../lib/layers/guias'
import Tiradores from './Tiradores'
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
  const resolucion = useEditorStore((s) => s.resolucion)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const capasSeleccionadas = useEditorStore((s) => s.capasSeleccionadas)
  const seleccionarCapa = useEditorStore((s) => s.seleccionarCapa)
  const moverCapaLienzo = useEditorStore((s) => s.moverCapaLienzo)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const desplazarCapa = useEditorStore((s) => s.desplazarCapa)
  const registrarPunto = useEditorStore((s) => s.registrarPunto)
  const dibujandoMascara = useEditorStore((s) => s.dibujandoMascara)
  const anadirTrazo = useEditorStore((s) => s.anadirTrazo)

  const rootRef = useRef<HTMLDivElement>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  // líneas de alineación que se muestran solo mientras dura el arrastre
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

    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const st = useEditorStore.getState()
      if (st.grabandoMovimiento) {
        registrarPunto(capa.id, st.playhead, p.x, p.y)
      } else if (capa.keyframes.length > 0) {
        desplazarCapa(capa.id, p.x - ultima.x, p.y - ultima.y)
      } else {
        // con Alt el imantado se desactiva, por si hace falta colocar algo justo
        // al lado de una guía sin que salte
        if (ev.altKey || !propia) {
          moverCapaLienzo(capa.id, p.x, p.y)
          setGuias([])
        } else {
          const r = imantar({ x: p.x, y: p.y, w: propia.w, h: propia.h }, vecinas)
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

  // alto que ocupa una imagen en unidades del lienzo. mientras no se haya
  // deformado a mano sale de su proporción natural y del recorte aplicado
  function altoImagen(c: CapaImagen) {
    if (c.altoRel !== undefined) return c.altoRel
    const rec = c.recorte
    const fw = Math.max(0.05, 1 - rec.izq - rec.der)
    const fh = Math.max(0.05, 1 - rec.arr - rec.aba)
    const asp = c.anchoNatural > 0 ? (fw * c.anchoNatural) / (fh * c.altoNatural) : 1
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

  const visibles = capas.filter((c) => playhead >= c.inicio && playhead < c.inicio + c.duracion)

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* recorrido de la capa seleccionada, para verlo y retocarlo */}
      {visibles
        .filter((c) => c.id === capaSeleccionada && c.keyframes.length > 0)
        .map((c) => (
          <RecorridoOverlay key={`ruta-${c.id}`} capa={c} rect={rect} normalizar={normalizar} />
        ))}

      {/* guías de alineación, visibles solo durante el arrastre */}
      {guias.map((g) => (
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
              onMouseDown={(e) => iniciarArrastre(e, c)}
              className="pointer-events-auto absolute cursor-move"
              style={{
                left: centroX,
                top: centroY,
                width: c.anchoRel * rect.w,
                height: c.altoRel * rect.h,
                transform: 'translate(-50%, -50%)',
                border: `2px solid ${seleccion ? '#1861ff' : 'rgba(255,255,255,.6)'}`,
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
                transform: 'translate(-50%, -50%)',
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
                <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />
              )}
            </div>
          )
        }

        if (c.tipo === 'imagen') {
          const rec = c.recorte
          const fw = Math.max(0.05, 1 - rec.izq - rec.der)
          const fh = Math.max(0.05, 1 - rec.arr - rec.aba)
          const ancho = c.anchoRel * rect.w
          const alto = altoImagen(c) * rect.h
          return (
            <div
              key={c.id}
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
                transform: 'translate(-50%, -50%)',
                opacity: c.opacidad / 100,
              }}
            >
              {/* el recorte se aplica en esta capa interior; si estuviera en el
                  contenedor recortaría también los tiradores de la selección */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={c.src}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none select-none"
                  style={{
                    width: ancho / fw,
                    height: alto / fh,
                    left: -rec.izq * (ancho / fw),
                    top: -rec.arr * (alto / fh),
                  }}
                />
              </div>
              {seleccion && (
                <Tiradores onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />
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
          transform: 'translate(-50%, -50%)',
          fontFamily: `'${c.fuente}', sans-serif`,
          fontSize: c.tamano * escala,
          fontWeight: c.negrita ? 700 : 400,
          fontStyle: c.cursiva ? 'italic' : 'normal',
          textDecoration: c.subrayado ? 'underline' : 'none',
          textAlign: c.alineacion,
          color: c.color,
          opacity: c.opacidad / 100,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.2,
          padding: c.fondo ? `${0.18 * c.tamano * escala}px ${0.36 * c.tamano * escala}px` : 0,
          background: c.fondo ? hexAOpacidad(c.colorFondo, c.opacidadFondo) : 'transparent',
          borderRadius: c.fondo ? (c.radioFondo ?? 6) * escala : 0,
          textShadow: sombras.length ? sombras.join(', ') : 'none',
          WebkitTextStroke: c.contorno ? `${c.grosorContorno * escala}px ${c.colorContorno}` : undefined,
        }
        return (
          <div
            key={c.id}
            onMouseDown={(e) => iniciarArrastre(e, c)}
            className={[
              'pointer-events-auto absolute max-w-[92%] cursor-move select-none',
              seleccion ? 'outline outline-2 outline-brand' : '',
            ].join(' ')}
            style={estilo}
          >
            {c.texto}
            {/* el texto solo escala por las esquinas: estirarlo por un lado lo
                deformaría y dejaría de leerse bien */}
            {seleccion && <Tiradores soloEsquinas onAgarrar={(a, e) => iniciarRedimension(e, c, a)} />}
          </div>
        )
      })}
    </div>
  )
}
