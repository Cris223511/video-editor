import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import CapasOverlay from './overlays/CapasOverlay'
import ClipOverlay from './overlays/ClipOverlay'
import Vacio from '../../components/ui/Vacio'
import MarcoOverlay from './overlays/MarcoOverlay'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { MediaAsset } from '../../types/media'
import { clipEnTiempo, duracionTotal } from '../../lib/timeline/clips'
import { encuadreDe, encuadreNeutro, rectClip } from '../../lib/timeline/encuadre'
import { gananciaEn } from '../../lib/audio/ganancia'
import { rectContenido } from '../../lib/layers/rect'
import { posicionCapa } from '../../lib/layers/motion'
import { CapaCensura } from '../../types/layers'
import { Clip } from '../../types/timeline'
import {
  esTonoNeutro,
  filtroCss,
  matrizTono,
  usaMatriz,
  tablasColor,
  hayEfectoFiltro,
  stdDeviationsDesenfoque,
} from '../../lib/color/tono'
import { anterior, pintarTransicion, progreso } from '../../lib/transiciones/pintar'
import { buscarTransicion } from '../../lib/transiciones/catalogo'

// visor central. monta un video por clip y solo deja visible y sonando el que
// corresponde al cabezal. la reproducción se apoya en el tiempo nativo de cada
// video para que salga fluida, y el cabezal se deriva de ese tiempo
export default function Preview() {
  const clips = useEditorStore((s) => s.pista.clips)
  const playhead = useEditorStore((s) => s.playhead)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const irA = useEditorStore((s) => s.irA)
  const pausar = useEditorStore((s) => s.pausar)
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const hayCapas = useEditorStore((s) => s.capas.length > 0)
  const hayCensura = useEditorStore((s) => s.capas.some((c) => c.tipo === 'censura'))
  const resolucion = useEditorStore((s) => s.resolucion)
  const colorFondo = useEditorStore((s) => s.colorFondo)
  const fondo = useEditorStore((s) => s.fondo)
  const desenfoqueFondo = useEditorStore((s) => s.desenfoqueFondo)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const volumenGlobal = useEditorStore((s) => s.volumenGlobal)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const medios = useProjectStore((s) => s.medios)

  const videosRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const phRef = useRef(playhead)
  const censuraCanvasRef = useRef<HTMLCanvasElement>(null)
  // lienzo que solo se enciende mientras dura una transición con geometría
  const transRef = useRef<HTMLCanvasElement>(null)
  // video del relleno borroso: sigue el tiempo del clip activo sin sonar
  const fondoRef = useRef<HTMLVideoElement | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaTam, setAreaTam] = useState({ w: 0, h: 0 })

  // grafo de audio: cada video se enruta por un nodo de ganancia común para
  // poder controlar el volumen general y por franjas con Web Audio
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gananciaRef = useRef<GainNode | null>(null)
  const cableadosRef = useRef<Set<string>>(new Set())
  const audioRef = useRef({ regiones: audioRegiones, general: volumenGlobal })

  useEffect(() => {
    audioRef.current = { regiones: audioRegiones, general: volumenGlobal }
  }, [audioRegiones, volumenGlobal])

  function asegurarGrafo(): GainNode | null {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      const ctx = new Ctor()
      const nodo = ctx.createGain()
      nodo.connect(ctx.destination)
      audioCtxRef.current = ctx
      gananciaRef.current = nodo
    }
    return gananciaRef.current
  }

  function cablearVideo(id: string, v: HTMLVideoElement) {
    const ctx = audioCtxRef.current
    const nodo = gananciaRef.current
    if (!ctx || !nodo || cableadosRef.current.has(id)) return
    try {
      const fuente = ctx.createMediaElementSource(v)
      fuente.connect(nodo)
      cableadosRef.current.add(id)
    } catch {
      // el elemento ya estaba enrutado o el navegador no lo permite
    }
  }

  useEffect(() => () => void audioCtxRef.current?.close().catch(() => {}), [])

  // mide el área disponible para dibujar el marco del lienzo con su proporción
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const observar = new ResizeObserver(() => setAreaTam({ w: el.clientWidth, h: el.clientHeight }))
    observar.observe(el)
    setAreaTam({ w: el.clientWidth, h: el.clientHeight })
    return () => observar.disconnect()
  }, [clips.length, hayCapas])

  const clipsOrdenados = useMemo(() => [...clips].sort((a, b) => a.inicio - b.inicio), [clips])
  // niveles escondidos, en forma de conjunto para consultarlos rápido al elegir
  // el clip visible. esconder el de arriba deja aflorar el de debajo
  const ocultas = useMemo(() => {
    const set = new Set<number>()
    pistasMeta.forEach((m, i) => {
      if (m.oculta) set.add(i)
    })
    return set
  }, [pistasMeta])
  const total = useMemo(() => duracionTotal(clips), [clips])
  const assetPorId = useMemo(() => {
    const mapa = new Map<string, MediaAsset>()
    medios.forEach((a) => mapa.set(a.id, a))
    return mapa
  }, [medios])

  const activo = clipEnTiempo(clipsOrdenados, playhead, ocultas)

  // en pausa, el cabezal manda: phRef lo sigue para arrancar donde toca
  useEffect(() => {
    if (!reproduciendo) phRef.current = playhead
  }, [playhead, reproduciendo])

  // en pausa cada video se coloca en su fotograma exacto y se detiene
  useEffect(() => {
    if (reproduciendo) return
    const act = clipEnTiempo(clipsOrdenados, playhead, ocultas)
    clipsOrdenados.forEach((c) => {
      const v = videosRef.current.get(c.id)
      if (!v) return
      if (act && c.id === act.id) {
        const objetivo = c.recorteInicio + (playhead - c.inicio) * c.velocidad
        if (Math.abs(v.currentTime - objetivo) > 0.05) {
          try {
            v.currentTime = objetivo
          } catch {
            // el video aún no tiene metadatos listos; se ignora
          }
        }
      }
      if (!v.paused) v.pause()
    })
    // el relleno borroso comparte asset y tiempos con el clip activo, así que se
    // coloca en el mismo fotograma y se queda quieto mientras el visor no corre
    const f = fondoRef.current
    if (f && act) {
      const objetivo = act.recorteInicio + (playhead - act.inicio) * act.velocidad
      if (Math.abs(f.currentTime - objetivo) > 0.05) {
        try {
          f.currentTime = objetivo
        } catch {
          // todavía sin metadatos, no pasa nada
        }
      }
      if (!f.paused) f.pause()
    }
  }, [playhead, reproduciendo, clipsOrdenados, ocultas])

  // durante la reproducción avanza el clip activo y salta al siguiente al
  // terminar; el cabezal se calcula desde el tiempo real del video
  useEffect(() => {
    if (!reproduciendo) return
    if (clipsOrdenados.length === 0) {
      pausar()
      return
    }
    // el contexto de audio arranca suspendido; se reanuda dentro del gesto de
    // reproducir para que el navegador deje sonar
    asegurarGrafo()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    let raf = 0
    let cancelado = false

    const paso = () => {
      if (cancelado) return
      const ph = phRef.current
      if (ph >= total) {
        irA(total)
        pausar()
        return
      }
      // los metadatos se leen en vivo para que esconder o silenciar un nivel
      // surta efecto sin cortar la reproducción
      const metas = useEditorStore.getState().pistasMeta
      const ocultasVivo = new Set<number>()
      metas.forEach((m, i) => {
        if (m.oculta) ocultasVivo.add(i)
      })
      const act = clipEnTiempo(clipsOrdenados, ph, ocultasVivo)
      if (!act) {
        phRef.current = Math.min(ph + 0.033, total)
        irA(phRef.current)
        raf = requestAnimationFrame(paso)
        return
      }
      const v = videosRef.current.get(act.id)
      if (!v) {
        raf = requestAnimationFrame(paso)
        return
      }
      clipsOrdenados.forEach((c) => {
        if (c.id !== act.id) {
          const otro = videosRef.current.get(c.id)
          if (otro && !otro.paused) otro.pause()
        }
      })
      const nodo = asegurarGrafo()
      cablearVideo(act.id, v)
      // un nivel silenciado no aporta sonido: su clip se ve pero la ganancia baja
      // a cero, igual que hará la exportación
      if (nodo) {
        nodo.gain.value = metas[act.pista]?.silenciada
          ? 0
          : gananciaEn(audioRef.current.regiones, audioRef.current.general, ph)
      }
      // grabando un recorrido el video corre más despacio, que es la única forma
      // de seguir con el cursor algo que se mueve rápido sin ir a tirones. el
      // cabezal se sigue calculando desde el tiempo real del video, así que la
      // línea de tiempo no se descuadra
      const st = useEditorStore.getState()
      v.playbackRate = act.velocidad * (st.grabandoMovimiento ? st.velocidadGrabacion : 1)
      if (v.paused) {
        try {
          v.currentTime = act.recorteInicio + (ph - act.inicio) * act.velocidad
        } catch {
          // sin metadatos todavía
        }
        v.play().catch(() => {})
      }
      // el fondo borroso persigue al video real: mismo asset, misma velocidad y
      // mismo tiempo, para que se vea el material en movimiento y no un cuadro
      // congelado. si se desfasa un poco se reengancha sin cortar la imagen
      const f = fondoRef.current
      if (f) {
        f.playbackRate = v.playbackRate
        if (Math.abs(f.currentTime - v.currentTime) > 0.15) {
          try {
            f.currentTime = v.currentTime
          } catch {
            // sin metadatos todavía
          }
        }
        if (f.paused) f.play().catch(() => {})
      }
      const finUso = act.recorteInicio + act.duracion * act.velocidad
      if (v.currentTime >= finUso - 0.02) {
        v.pause()
        phRef.current = Math.min(act.inicio + act.duracion, total)
        irA(phRef.current)
        raf = requestAnimationFrame(paso)
        return
      }
      phRef.current = Math.min(
        act.inicio + (v.currentTime - act.recorteInicio) / act.velocidad,
        total,
      )
      irA(phRef.current)
      raf = requestAnimationFrame(paso)
    }

    raf = requestAnimationFrame(paso)
    return () => {
      cancelado = true
      cancelAnimationFrame(raf)
      videosRef.current.forEach((v) => v.pause())
      fondoRef.current?.pause()
    }
  }, [reproduciendo, clipsOrdenados, total, irA, pausar])

  // render de la censura: por fotograma se muestrea solo la región de cada
  // máscara del video activo y se le aplica pixelado o desenfoque. al tocar
  // únicamente esas zonas, el navegador lo mueve con soltura
  useEffect(() => {
    if (!hayCensura) {
      const c = censuraCanvasRef.current
      const ctx = c?.getContext('2d')
      if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
      return
    }
    let raf = 0
    let cancelado = false
    const off = document.createElement('canvas')
    const offCtx = off.getContext('2d')

    const dibujarUna = (
      ctx: CanvasRenderingContext2D,
      video: HTMLVideoElement,
      rect: { w: number; h: number; ox: number; oy: number },
      c: CapaCensura,
      ph: number,
      colorFondo: string,
    ) => {
      const pos = posicionCapa(c, ph)
      const vw = video.videoWidth
      const vh = video.videoHeight
      const escX = vw / rect.w
      const escY = vh / rect.h

      // se arma la figura de la máscara y se calcula su caja envolvente
      let dx = 0
      let dy = 0
      let w = 0
      let h = 0
      ctx.save()
      ctx.beginPath()
      if (c.forma === 'pincel') {
        const radio = c.grosorPincel * rect.h
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const trazo of c.trazos) {
          for (const p of trazo) {
            const px = rect.ox + (pos.x + p.x) * rect.w
            const py = rect.oy + (pos.y + p.y) * rect.h
            ctx.moveTo(px + radio, py)
            ctx.arc(px, py, radio, 0, Math.PI * 2)
            if (px - radio < minX) minX = px - radio
            if (py - radio < minY) minY = py - radio
            if (px + radio > maxX) maxX = px + radio
            if (py + radio > maxY) maxY = py + radio
          }
        }
        if (!isFinite(minX)) {
          ctx.restore()
          return
        }
        dx = minX
        dy = minY
        w = maxX - minX
        h = maxY - minY
      } else {
        w = c.anchoRel * rect.w
        h = c.altoRel * rect.h
        const cx = rect.ox + pos.x * rect.w
        const cy = rect.oy + pos.y * rect.h
        dx = cx - w / 2
        dy = cy - h / 2
        if (c.forma === 'circulo') ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
        else ctx.rect(dx, dy, w, h)
      }
      ctx.clip()

      if (c.efecto === 'transparente') {
        ctx.fillStyle = colorFondo
        ctx.fillRect(dx, dy, w, h)
      } else if (c.efecto === 'difuminar') {
        const m = c.intensidad
        ctx.filter = `blur(${Math.max(1, c.intensidad * 0.5)}px)`
        ctx.drawImage(
          video,
          (dx - rect.ox - m) * escX,
          (dy - rect.oy - m) * escY,
          (w + 2 * m) * escX,
          (h + 2 * m) * escY,
          dx - m,
          dy - m,
          w + 2 * m,
          h + 2 * m,
        )
        ctx.filter = 'none'
      } else if (offCtx) {
        const bloque = Math.max(3, c.intensidad)
        const pw = Math.max(1, Math.round(w / bloque))
        const phx = Math.max(1, Math.round(h / bloque))
        off.width = pw
        off.height = phx
        offCtx.imageSmoothingEnabled = false
        offCtx.drawImage(
          video,
          (dx - rect.ox) * escX,
          (dy - rect.oy) * escY,
          w * escX,
          h * escY,
          0,
          0,
          pw,
          phx,
        )
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(off, 0, 0, pw, phx, dx, dy, w, h)
        ctx.imageSmoothingEnabled = true
      }
      ctx.restore()
    }

    const render = () => {
      if (cancelado) return
      const canvas = censuraCanvasRef.current
      const stage = canvas?.parentElement
      const ctx = canvas?.getContext('2d')
      if (canvas && stage && ctx) {
        const dpr = window.devicePixelRatio || 1
        const w = stage.clientWidth
        const h = stage.clientHeight
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)

        const st = useEditorStore.getState()
        const ph = st.playhead
        const rect = rectContenido(w, h, st.resolucion.ancho / st.resolucion.alto)
        const ordenados = [...st.pista.clips].sort((a, b) => a.inicio - b.inicio)
        const ocultasSt = new Set<number>()
        st.pistasMeta.forEach((m, i) => {
          if (m.oculta) ocultasSt.add(i)
        })
        const activoClip = clipEnTiempo(ordenados, ph, ocultasSt)
        const video = activoClip ? videosRef.current.get(activoClip.id) : null
        if (video && video.videoWidth > 0) {
          for (const capa of st.capas) {
            if (capa.tipo !== 'censura') continue
            if (ph < capa.inicio || ph >= capa.inicio + capa.duracion) continue
            dibujarUna(ctx, video, rect, capa, ph, st.colorFondo)
          }
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => {
      cancelado = true
      cancelAnimationFrame(raf)
    }
  }, [hayCensura])

  // opacidad de cada video teniendo en cuenta las transiciones: el clip activo
  // entra con su transición (fundido a negro o desvanecido con el anterior), y
  // el clip anterior se mantiene visible mientras dura un desvanecido
  function opacidadDe(clip: Clip): number {
    if (activo && clip.id === activo.id) {
      let op = 1
      const t = clip.transicion
      if (t.tipo !== 'ninguna') {
        const entrado = playhead - clip.inicio
        if (entrado < t.duracion) op = Math.min(op, Math.max(0, entrado / t.duracion))
      }
      const idx = clipsOrdenados.findIndex((c) => c.id === clip.id)
      const siguiente = clipsOrdenados[idx + 1]
      if (siguiente && siguiente.transicion.tipo === 'fundido') {
        const restante = clip.inicio + clip.duracion - playhead
        if (restante < siguiente.transicion.duracion) {
          op = Math.min(op, Math.max(0, restante / siguiente.transicion.duracion))
        }
      }
      return op
    }
    if (activo && activo.transicion.tipo === 'desvanecer') {
      const idxAct = clipsOrdenados.findIndex((c) => c.id === activo.id)
      const anterior = idxAct > 0 ? clipsOrdenados[idxAct - 1] : null
      if (anterior && anterior.id === clip.id) {
        const entrado = playhead - activo.inicio
        if (entrado < activo.transicion.duracion) {
          return Math.max(0, 1 - entrado / activo.transicion.duracion)
        }
      }
    }
    return 0
  }

  // las transiciones de mezcla y el corte los resuelve el propio elemento de
  // video con su opacidad, que es más fluido. las que mueven o recortan la
  // imagen necesitan lienzo, así que solo ahí se enciende
  const pTrans = activo ? progreso(activo, playhead) : 1
  const tecnicaActual = activo ? buscarTransicion(activo.transicion.tipo).tecnica : 'corte'
  const conLienzo =
    pTrans < 1 && tecnicaActual !== 'corte' && tecnicaActual !== 'opacidad'

  // dibuja la transición fotograma a fotograma mientras dura. se apoya en el
  // mismo motor que la exportación, así que lo que se ve aquí es lo que saldrá
  useEffect(() => {
    if (!conLienzo || !activo) return
    const lienzo = transRef.current
    const ctx = lienzo?.getContext('2d')
    if (!lienzo || !ctx) return

    let raf = 0
    const paso = () => {
      const st = useEditorStore.getState()
      const ocultasSt = new Set<number>()
      st.pistasMeta.forEach((m, i) => {
        if (m.oculta) ocultasSt.add(i)
      })
      const act = clipEnTiempo(clipsOrdenados, st.playhead, ocultasSt)
      if (!act) {
        raf = requestAnimationFrame(paso)
        return
      }
      const p = progreso(act, st.playhead)
      const sal = p < 1 ? anterior(act, clipsOrdenados) : null

      lienzo.width = resolucion.ancho
      lienzo.height = resolucion.alto
      ctx.clearRect(0, 0, lienzo.width, lienzo.height)
      ctx.fillStyle = colorFondo
      ctx.fillRect(0, 0, lienzo.width, lienzo.height)

      const pintar = (clip: Clip, alfa: number) => {
        const v = videosRef.current.get(clip.id)
        if (!v || !v.videoWidth) return
        // durante una transición geométrica el video también respeta su encuadre,
        // para que reencuadrar un clip se vea igual dentro y fuera de la transición
        const { dx, dy, dw, dh } = rectClip(v.videoWidth, v.videoHeight, lienzo.width, lienzo.height, encuadreDe(clip))
        ctx.save()
        ctx.globalAlpha = alfa
        ctx.drawImage(v, dx, dy, dw, dh)
        ctx.restore()
      }

      pintarTransicion(ctx, lienzo.width, lienzo.height, act, sal, p, pintar)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [conLienzo, activo, clipsOrdenados, resolucion, colorFondo])

  // clips que necesitan el filtro svg: los que corrigen color y también los que
  // llevan algún efecto de desenfoque, aunque no toquen el color
  const filtrosClip = clipsOrdenados.filter(
    (c) => usaMatriz(c.tono) || hayEfectoFiltro(c.efectos ?? []),
  )

  const hayContenido = clipsOrdenados.length > 0 || hayCapas


  // el lienzo mantiene la proporción del proyecto dentro del área disponible;
  // su fondo se ve en las bandas cuando el video no lo cubre
  const lienzoRect = rectContenido(areaTam.w, areaTam.h, resolucion.ancho / resolucion.alto)

  return (
    // el fondo oscuro solo tiene sentido cuando hay video: rodear la imagen de
    // negro ayuda a juzgar el color. sin nada que mostrar, ese mismo fondo deja
    // el texto de aviso en gris sobre gris y no se lee
    <div
      className={[
        // el relleno es más generoso a los lados que arriba y abajo. el alto es lo
        // que decide el tamaño del lienzo, porque casi todo lo que se edita es
        // apaisado: cada píxel que se quita de arriba y de abajo se convierte en
        // lienzo, mientras que quitarlo de los lados no cambia nada
        'relative flex min-h-0 flex-1 items-center justify-center px-4 py-2 transition-colors duration-300',
        hayContenido ? 'bg-black/40' : '',
      ].join(' ')}
      style={hayContenido ? undefined : { background: 'rgb(var(--surface-2))' }}
    >
      {!hayContenido ? (
        <div className="w-full max-w-sm">
          <Vacio compacto icono={<Icon name="video" size={24} />} titulo="Aún no hay nada en el lienzo">
            Importa un video desde el panel de <b>Medios</b>, abajo a la izquierda, y arrástralo
            hasta la línea de tiempo para empezar a editar.
          </Vacio>
        </div>
      ) : (
        <div ref={areaRef} className="flex h-full w-full items-center justify-center">
          <div
            className="relative shadow-2xl"
            style={{ width: lienzoRect.w, height: lienzoRect.h, background: colorFondo }}
            // un clic sobre la imagen elige el clip que hay bajo el cabezal para
            // poder reencuadrarlo; las capas y los tiradores cortan la
            // propagación, así que solo llega aquí el clic en el propio video
            onMouseDown={() => {
              if (activo) seleccionar(activo.id)
            }}
          >
            {/* capa recortada: aquí vive todo lo que es imagen del video. el
                overflow oculto hace que lo que un clip empuje fuera del lienzo no
                asome, tal como lo recorta el lienzo de la exportación */}
            <div className="absolute inset-0 overflow-hidden">
              {/* relleno de las bandas con el propio video, ampliado y borroso,
                  para que un video apaisado en un lienzo vertical no deje dos
                  franjas planas. va el primero, así queda por debajo del video
                  real que se pinta encima; no lleva z negativo porque eso lo
                  hundía por detrás del fondo del lienzo y no se veía. no suena,
                  que el sonido lo lleva el video de delante */}
              {fondo === 'desenfoque' &&
                (() => {
                  const act = clipEnTiempo(clipsOrdenados, playhead, ocultas)
                  const asset = act ? assetPorId.get(act.assetId) : null
                  if (!asset) return null
                  return (
                    <video
                      key={`fondo-${act!.id}`}
                      ref={(el) => {
                        if (el) fondoRef.current = el
                        else fondoRef.current = null
                      }}
                      src={asset.url}
                      muted
                      playsInline
                      preload="auto"
                      aria-hidden
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      style={{
                        filter: `blur(${Math.round(desenfoqueFondo * 0.6)}px) brightness(0.72)`,
                        transform: 'scale(1.12)',
                      }}
                    />
                  )
                })()}
              {clipsOrdenados.map((c) => {
                const asset = assetPorId.get(c.assetId)
                if (!asset) return null
                // el encuadre se aplica como transformación del elemento: se
                // escala respecto al centro y luego se lleva a su posición, en
                // fracción del lienzo. coincide con lo que dibuja el compositor
                const enc = encuadreDe(c)
                const transform = encuadreNeutro(enc)
                  ? undefined
                  : `translate(${(enc.x - 0.5) * 100}%, ${(enc.y - 0.5) * 100}%) scale(${enc.escala})`
                return (
                  <video
                    key={c.id}
                    ref={(el) => {
                      if (el) videosRef.current.set(c.id, el)
                      else videosRef.current.delete(c.id)
                    }}
                    src={asset.url}
                    playsInline
                    preload="auto"
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{
                      opacity: conLienzo ? 0 : opacidadDe(c),
                      transform,
                      transformOrigin: 'center',
                      filter:
                        esTonoNeutro(c.tono) && !hayEfectoFiltro(c.efectos ?? [])
                          ? undefined
                          : filtroCss(c.tono, `tono-${c.id}`, c.efectos ?? []),
                    }}
                  />
                )
              })}

              {conLienzo && (
                <canvas
                  ref={transRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
              )}
              <canvas
                ref={censuraCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            </div>

            {filtrosClip.length > 0 && (
              <svg className="absolute h-0 w-0">
                <defs>
                  {filtrosClip.map((c) => {
                    const tablas = tablasColor(c.tono)
                    const desenfoques = stdDeviationsDesenfoque(c.efectos ?? [])
                    return (
                      <filter key={c.id} id={`tono-${c.id}`} colorInterpolationFilters="sRGB">
                        {usaMatriz(c.tono) && (
                          <feColorMatrix type="matrix" values={matrizTono(c.tono)} />
                        )}
                        {/* las ruedas se aplican como curva por canal: cada zona
                            tonal empuja su tramo y deja el resto en su sitio */}
                        {tablas && (
                          <feComponentTransfer>
                            <feFuncR type="table" tableValues={tablas[0]} />
                            <feFuncG type="table" tableValues={tablas[1]} />
                            <feFuncB type="table" tableValues={tablas[2]} />
                          </feComponentTransfer>
                        )}
                        {/* el desenfoque de movimiento va después del color y con
                            stdDeviation en dos ejes queda direccional. cada efecto
                            encadenado se apoya en el resultado del anterior */}
                        {desenfoques.map((sd, i) => (
                          <feGaussianBlur key={i} stdDeviation={sd} edgeMode="duplicate" />
                        ))}
                      </filter>
                    )
                  })}
                </defs>
              </svg>
            )}
            {/* los overlays quedan por encima del recorte: así se puede agarrar un
                tirador aunque el clip esté medio fuera del lienzo */}
            <ClipOverlay />
            <CapasOverlay />
            <MarcoOverlay alturaLienzo={lienzoRect.h} />
          </div>
        </div>
      )}
    </div>
  )
}
