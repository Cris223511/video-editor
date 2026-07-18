import { CSSProperties, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { Capa, CapaCensura, CapaFigura, CapaImagen } from '../../types/layers'
import { hexAOpacidad } from '../../lib/layers/defaults'
import { rectContenido } from '../../lib/layers/rect'
import { posicionCapa } from '../../lib/layers/motion'

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
  const seleccionarCapa = useEditorStore((s) => s.seleccionarCapa)
  const moverCapaLienzo = useEditorStore((s) => s.moverCapaLienzo)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const desplazarCapa = useEditorStore((s) => s.desplazarCapa)
  const registrarPunto = useEditorStore((s) => s.registrarPunto)
  const dibujandoMascara = useEditorStore((s) => s.dibujandoMascara)
  const anadirTrazo = useEditorStore((s) => s.anadirTrazo)

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
    seleccionarCapa(capa.id)
    let ultima = normalizar(e.nativeEvent)
    const mover = (ev: globalThis.MouseEvent) => {
      const p = normalizar(ev)
      const st = useEditorStore.getState()
      if (st.grabandoMovimiento) {
        registrarPunto(capa.id, st.playhead, p.x, p.y)
      } else if (capa.keyframes.length > 0) {
        desplazarCapa(capa.id, p.x - ultima.x, p.y - ultima.y)
      } else {
        moverCapaLienzo(capa.id, p.x, p.y)
      }
      ultima = p
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
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

  function iniciarRedimensionImagen(e: ReactMouseEvent, capa: CapaImagen) {
    e.stopPropagation()
    seleccionarCapa(capa.id)
    const mover = (ev: globalThis.MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      const r = root.getBoundingClientRect()
      const rc = rectContenido(r.width, r.height, aspecto)
      const pos = posicionCapa(capa, useEditorStore.getState().playhead)
      const centroX = r.left + rc.ox + pos.x * rc.w
      const anchoRel = (Math.abs(ev.clientX - centroX) * 2) / rc.w
      actualizarCapa(capa.id, { anchoRel: entre(0.03, 2, anchoRel) })
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // redimensiona por ancho y alto (censura y figuras) desde el tirador
  function iniciarRedimensionCaja(e: ReactMouseEvent, capa: CapaCensura | CapaFigura) {
    e.stopPropagation()
    seleccionarCapa(capa.id)
    const mover = (ev: globalThis.MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      const r = root.getBoundingClientRect()
      const rc = rectContenido(r.width, r.height, aspecto)
      const pos = posicionCapa(capa, useEditorStore.getState().playhead)
      const centroX = r.left + rc.ox + pos.x * rc.w
      const centroY = r.top + rc.oy + pos.y * rc.h
      const anchoRel = (Math.abs(ev.clientX - centroX) * 2) / rc.w
      const altoRel = (Math.abs(ev.clientY - centroY) * 2) / rc.h
      actualizarCapa(capa.id, {
        anchoRel: entre(0.03, 1.5, anchoRel),
        altoRel: entre(0.03, 1.5, altoRel),
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
      {visibles.map((c) => {
        const seleccion = c.id === capaSeleccionada
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
                <div
                  onMouseDown={(e) => iniciarRedimensionCaja(e, c)}
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-white bg-brand"
                />
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
                <div
                  onMouseDown={(e) => iniciarRedimensionCaja(e, c)}
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-white bg-brand"
                />
              )}
            </div>
          )
        }

        if (c.tipo === 'imagen') {
          const rec = c.recorte
          const fw = Math.max(0.05, 1 - rec.izq - rec.der)
          const fh = Math.max(0.05, 1 - rec.arr - rec.aba)
          const ancho = c.anchoRel * rect.w
          const aspecto = c.anchoNatural > 0 ? (fw * c.anchoNatural) / (fh * c.altoNatural) : 1
          const alto = ancho / (aspecto || 1)
          return (
            <div
              key={c.id}
              onMouseDown={(e) => iniciarArrastre(e, c)}
              className={[
                'pointer-events-auto absolute cursor-move overflow-hidden',
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
              {seleccion && (
                <div
                  onMouseDown={(e) => iniciarRedimensionImagen(e, c)}
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-white bg-brand"
                />
              )}
            </div>
          )
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
          borderRadius: c.fondo ? 6 : 0,
          textShadow: c.sombra ? '0 2px 8px rgba(0,0,0,.6)' : 'none',
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
          </div>
        )
      })}
    </div>
  )
}
