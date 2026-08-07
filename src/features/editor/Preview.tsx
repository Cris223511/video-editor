import { createElement, Fragment, ReactElement, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/ui/Icon'
import CapasOverlay from './overlays/CapasOverlay'
import ClipOverlay from './overlays/ClipOverlay'
import RecorteOverlay from './overlays/RecorteOverlay'
import CuentaRegresiva from './overlays/CuentaRegresiva'
import Vacio from '../../components/ui/Vacio'
import MarcoOverlay from './overlays/MarcoOverlay'
import { useEditorStore } from '../../store/useEditorStore'
import { useProjectStore } from '../../store/useProjectStore'
import { MediaAsset } from '../../types/media'
import { clipEnTiempo, duracionProyecto, resolverSolapes } from '../../lib/timeline/clips'
import { encuadreDe, encuadreNeutro, rectClip, giradoUnCuarto } from '../../lib/timeline/encuadre'
import { gananciaEn, fundidoAudioEn } from '../../lib/audio/ganancia'
import { rectContenido } from '../../lib/layers/rect'
import { posicionCapa } from '../../lib/layers/motion'
import { CapaCensura, CapaFigura } from '../../types/layers'
import { Clip, Encuadre } from '../../types/timeline'
import {
  esTonoNeutro,
  filtroCss,
  matrizTono,
  usaMatriz,
  usaNitidez,
  nodosNitidez,
  tablasColor,
  hayEfectoFiltro,
  stdDeviationsDesenfoque,
} from '../../lib/color/tono'
import { anterior, posterior, pintarTransicion, progreso, progresoSalida, esTransicionGlobal, efectoGlobalTrans, cruceCentradoEn } from '../../lib/transiciones/pintar'
import { cssEfectos } from '../../lib/efectos/catalogo'
import { paramsNB, nodosFiltroNB, NodoFiltro } from '../../lib/efectos/nitidezBrillo'
import { paramsGoPro, nodosFiltroGoPro } from '../../lib/efectos/goPro'
import { paramsCromatico, nodosFiltroCromatico } from '../../lib/efectos/cromatico'
import { efectoAnimado, pintarAnimado } from '../../lib/efectos/animados'
import { estadoImpactosEn } from '../../lib/impactos/catalogo'
import { dibujarContorno, dibujarLineas3d, dibujarRayos, crearLienzosContorno, LienzosContorno } from '../../lib/impactos/contorno'
import { dibujarManchas } from '../../lib/impactos/manchas'

// pinta un nodo del filtro de nitidez y brillo (y sus hijos) como elemento svg.
// la receta viene en datos desde el helper, la misma que usa la exportación, así
// que el visor y el archivo salen idénticos
function pintarNodoNB(n: NodoFiltro, clave: number): ReactElement {
  return createElement(
    n.tag,
    { key: clave, ...n.attrs },
    n.children?.map((h, i) => pintarNodoNB(h, i)),
  )
}
import { mezclarTono, mezclarEfectos, mixEntradaEfecto } from '../../lib/color/mezcla'
import { estiloRecorte, cajaContain } from '../../lib/layers/recorteMascara'
import { buscarTransicion } from '../../lib/transiciones/catalogo'
import { sufijoTransformCss, aplicarTransformCanvas } from '../../lib/layers/transform'
import { TIPO_FIGURA } from './panels/FiguraPanel'

// una disolución (técnica de opacidad) se centra en el corte y se pinta con la opacidad de
// los propios elementos del DOM. las demás transiciones entre dos clips —geométricas
// (barridos, puertas, empujes, escalas) y las de velo global (negro, flash, desenfoque)—
// también se centran, pero se pintan en el canvas con el motor compartido. y cualquier
// transición real (no el corte) hace que corran los dos clips a la vez durante el cruce
const esDisolucion = (tipo: string) => buscarTransicion(tipo).tecnica === 'opacidad'
const esGeometrica = (tipo: string) => {
  const t = buscarTransicion(tipo).tecnica
  return t !== 'corte' && t !== 'opacidad'
}
const esTransicionReal = (tipo: string) => tipo !== 'ninguna' && tipo !== 'corte'

// deja listo un lienzo auxiliar del tamaño pedido (lo crea la primera vez y lo redimensiona
// si hace falta). lo usan las pasadas de graduación del plano durante una transición
function prepararScratch(ref: React.MutableRefObject<HTMLCanvasElement | null>, w: number, h: number): HTMLCanvasElement {
  if (!ref.current) ref.current = document.createElement('canvas')
  if (ref.current.width !== w) ref.current.width = w
  if (ref.current.height !== h) ref.current.height = h
  return ref.current
}

// visor central. monta un video por clip y solo deja visible y sonando el que
// corresponde al cabezal. la reproducción se apoya en el tiempo nativo de cada
// video para que salga fluida, y el cabezal se deriva de ese tiempo
export default function Preview() {
  const clips = useEditorStore((s) => s.pista.clips)
  const playhead = useEditorStore((s) => s.playhead)
  const previsualizacion = useEditorStore((s) => s.previsualizacion)
  const impactos = useEditorStore((s) => s.impactos)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  // mientras se edita el recorte de un clip, ese clip se muestra entero (sin
  // aplicar todavía el recorte al video), para poder ver lo que se va a dejar fuera
  // y ajustarlo; la sombra del overlay de recorte es la que oscurece esa parte
  const herramienta = useEditorStore((s) => s.herramienta)
  const categoriaClip = useEditorStore((s) => s.categoriaClip)
  const recorteRapido = useEditorStore((s) => s.recorteRapido)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const irA = useEditorStore((s) => s.irA)
  const pausar = useEditorStore((s) => s.pausar)
  const seleccionar = useEditorStore((s) => s.seleccionar)
  const limpiarSeleccion = useEditorStore((s) => s.limpiarSeleccion)
  const seleccionarCapa = useEditorStore((s) => s.seleccionarCapa)
  const agregarFigura = useEditorStore((s) => s.agregarFigura)
  const hayCapas = useEditorStore((s) => s.capas.length > 0)
  const hayCensura = useEditorStore((s) => s.capas.some((c) => c.tipo === 'censura'))
  const hayContorno = useEditorStore((s) =>
    s.impactos.some((i) => i.tipo === 'contorno' || i.tipo === 'lineas3d' || i.tipo === 'rayosObjeto'),
  )
  // hay algún impacto de manchas, para encender su lienzo de inversión por diferencia
  const hayManchas = useEditorStore((s) => s.impactos.some((i) => i.tipo === 'manchas'))
  // hay alguna textura animada en algún clip, para encender su lienzo de dibujo por cuadro
  const hayAnimado = useEditorStore((s) =>
    s.pista.clips.some((c) => (c.efectos ?? []).some((e) => e.tipo === 'animado' && e.intensidad > 0)),
  )
  const resolucion = useEditorStore((s) => s.resolucion)
  const colorFondo = useEditorStore((s) => s.colorFondo)
  const fondo = useEditorStore((s) => s.fondo)
  const desenfoqueFondo = useEditorStore((s) => s.desenfoqueFondo)
  const fondoGiro = useEditorStore((s) => s.fondoGiro)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const audios = useEditorStore((s) => s.audios)
  const capasTodas = useEditorStore((s) => s.capas)
  const volumenGlobal = useEditorStore((s) => s.volumenGlobal)
  // volumen de monitorización: multiplica lo que suena en el visor sin tocar el
  // proyecto ni la exportación
  const volumenPreview = useEditorStore((s) => s.volumenPreview)
  const pistasMeta = useEditorStore((s) => s.pistasMeta)
  const medios = useProjectStore((s) => s.medios)

  const videosRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  // medios a los que ya se les rehízo la dirección tras un fallo de carga, para no
  // entrar en un bucle si el blob nuevo también fallara: al segundo tropiezo se acepta
  // que el archivo no está y se marca como faltante
  const urlRehecha = useRef<Set<string>>(new Set())
  const phRef = useRef(playhead)
  const censuraCanvasRef = useRef<HTMLCanvasElement>(null)
  // lienzo del impacto de contorno de neón, y los lienzos de trabajo que reaprovecha
  // el detector de bordes para no crear basura en cada fotograma
  const contornoCanvasRef = useRef<HTMLCanvasElement>(null)
  const contornoLienzos = useRef<LienzosContorno | null>(null)
  // lienzo del impacto de manchas: va con mix-blend-mode:difference, así los blobs invierten el
  // color de lo que tienen debajo (video y capas), igual que la exportación lo hace por diferencia
  const manchasCanvasRef = useRef<HTMLCanvasElement>(null)
  // lienzo de las texturas animadas del clip (grano, cine viejo, vhs, destellos). se
  // pinta por cuadro encima del video, con el mismo tiempo del cabezal
  const animCanvasRef = useRef<HTMLCanvasElement>(null)
  // lienzo que solo se enciende mientras dura una transición con geometría
  const transRef = useRef<HTMLCanvasElement>(null)
  // dos lienzos auxiliares para graduar cada plano de la transición en pasadas (color,
  // efectos y filtros svg), del mismo modo que la exportación. sin esto, el plano se
  // dibujaba crudo y en pleno cruce se veía su color original, sin la edición del clip
  const scratchA = useRef<HTMLCanvasElement | null>(null)
  const scratchB = useRef<HTMLCanvasElement | null>(null)
  // videos del relleno borroso, uno por clip (igual que los principales) para que el
  // del clip siguiente ya esté cargado y no haya un fotograma en negro al cambiar de
  // clip. solo se ve el del clip activo; el resto queda a opacidad cero, listo
  const fondosRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  // elementos de sonido de los audios importados, uno por clip de audio
  const audiosRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaTam, setAreaTam] = useState({ w: 0, h: 0 })
  // contenedor del visor y el recuadro de selección que se dibuja al arrastrar por
  // una zona vacía (incluidas las bandas de los lados), al estilo del escritorio
  const visorRef = useRef<HTMLDivElement>(null)
  // acercamiento manual del visor. arranca en 1, que es el lienzo entero, y de ahí
  // solo sube: alejarse más allá del lienzo no aporta nada
  const [zoomVisor, setZoomVisor] = useState({ z: 1, x: 0, y: 0 })
  // estado del pellizco de dos dedos en curso: la separación inicial y el zoom de arranque
  const pellizco = useRef<{ dist: number; z: number } | null>(null)
  // aplica un factor de acercamiento anclando el punto (clientX, clientY) de la pantalla, para que
  // eso que hay bajo el cursor o el centro del pellizco no se mueva mientras el resto crece. el
  // rango es 1 (encaje, no se aleja más) a 8; al volver a 1 se olvida el desplazamiento
  const anclar = (objetivo: number, clientX: number, clientY: number, caja: DOMRect) =>
    setZoomVisor((prev) => {
      const z = Math.min(8, Math.max(1, objetivo))
      if (z === prev.z) return prev
      const cx = clientX - caja.left - caja.width / 2
      const cy = clientY - caja.top - caja.height / 2
      const k = z / prev.z
      const x = cx - (cx - prev.x) * k
      const y = cy - (cy - prev.y) * k
      return z === 1 ? { z: 1, x: 0, y: 0 } : { z, x, y }
    })
  // la rueda multiplica el zoom actual por un factor; el pellizco fija un objetivo absoluto
  const acercarVisor = (factor: number, clientX: number, clientY: number, caja: DOMRect) =>
    setZoomVisor((prev) => {
      const z = Math.min(8, Math.max(1, prev.z * factor))
      if (z === prev.z) return prev
      const cx = clientX - caja.left - caja.width / 2
      const cy = clientY - caja.top - caja.height / 2
      const k = z / prev.z
      const x = cx - (cx - prev.x) * k
      const y = cy - (cy - prev.y) * k
      return z === 1 ? { z: 1, x: 0, y: 0 } : { z, x, y }
    })

  // la rueda y el pellizco van por listeners NO pasivos (React los pone pasivos y ahí
  // preventDefault falla y ensucia la consola). así el zoom no arrastra además la página
  useEffect(() => {
    const el = visorRef.current
    if (!el) return
    const alRodar = (e: WheelEvent) => {
      e.preventDefault()
      acercarVisor(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY, el.getBoundingClientRect())
    }
    const alMoverDedos = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pellizco.current) return
      e.preventDefault()
      const [a, b] = [e.touches[0], e.touches[1]]
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      const objetivo = pellizco.current.z * (dist / pellizco.current.dist)
      anclar(objetivo, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2, el.getBoundingClientRect())
    }
    el.addEventListener('wheel', alRodar, { passive: false })
    el.addEventListener('touchmove', alMoverDedos, { passive: false })
    return () => {
      el.removeEventListener('wheel', alRodar)
      el.removeEventListener('touchmove', alMoverDedos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // arrastrar desde una zona vacía dibuja un recuadro azul; al soltar, se
  // seleccionan todas las capas que toca. si no se arrastra (un clic seco), se
  // suelta lo que hubiera seleccionado, como antes
  function iniciarMarquee(e: ReactMouseEvent) {
    const cont = visorRef.current
    if (!cont) return
    // con el visor acercado, arrastrar MUEVE el encuadre (paneo), no hace recuadro ni selecciona:
    // así se lleva el zoom a donde se quiera. se limita para que la imagen no se salga del marco
    if (zoomVisor.z > 1) {
      const px0 = e.clientX
      const py0 = e.clientY
      const base = { x: zoomVisor.x, y: zoomVisor.y }
      const maxX = (lienzoRect.w * (zoomVisor.z - 1)) / 2
      const maxY = (lienzoRect.h * (zoomVisor.z - 1)) / 2
      const panear = (ev: globalThis.MouseEvent) =>
        setZoomVisor((p) => ({
          ...p,
          x: Math.max(-maxX, Math.min(maxX, base.x + (ev.clientX - px0))),
          y: Math.max(-maxY, Math.min(maxY, base.y + (ev.clientY - py0))),
        }))
      const soltarPan = () => {
        window.removeEventListener('mousemove', panear)
        window.removeEventListener('mouseup', soltarPan)
        document.body.style.cursor = ''
      }
      document.body.style.cursor = 'grabbing'
      window.addEventListener('mousemove', panear)
      window.addEventListener('mouseup', soltarPan)
      return
    }
    const r = cont.getBoundingClientRect()
    const x0 = e.clientX
    const y0 = e.clientY
    let movido = false
    const mover = (ev: globalThis.MouseEvent) => {
      if (Math.abs(ev.clientX - x0) > 3 || Math.abs(ev.clientY - y0) > 3) movido = true
      setMarquee({
        x: Math.min(x0, ev.clientX) - r.left,
        y: Math.min(y0, ev.clientY) - r.top,
        w: Math.abs(ev.clientX - x0),
        h: Math.abs(ev.clientY - y0),
      })
    }
    const soltar = (ev: globalThis.MouseEvent) => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      setMarquee(null)
      if (!movido) {
        limpiarSeleccion()
        return
      }
      // caja del recuadro en pantalla, contra la que se cruzan las capas visibles
      const mx0 = Math.min(x0, ev.clientX)
      const my0 = Math.min(y0, ev.clientY)
      const mx1 = Math.max(x0, ev.clientX)
      const my1 = Math.max(y0, ev.clientY)
      const ids: string[] = []
      cont.querySelectorAll('[data-capa-id]').forEach((el) => {
        const b = el.getBoundingClientRect()
        const cruza = !(b.right < mx0 || b.left > mx1 || b.bottom < my0 || b.top > my1)
        const id = el.getAttribute('data-capa-id')
        if (cruza && id && !ids.includes(id)) ids.push(id)
      })
      limpiarSeleccion()
      ids.forEach((id) => seleccionarCapa(id, true))
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  // grafo de audio: cada video se enruta por un nodo de ganancia común para
  // poder controlar el volumen general y por franjas con Web Audio
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gananciaRef = useRef<GainNode | null>(null)
  const cableadosRef = useRef<Set<string>>(new Set())
  // un nodo de ganancia por clip, entre su fuente y el nodo maestro. hace falta para las
  // transiciones: durante un cruce el clip que sale se deja corriendo (para que sus
  // fotogramas no se congelen) pero con su ganancia a cero, así no suena a la vez que el
  // que entra. sin esto, con un solo nodo compartido, no se puede callar solo a uno
  const gananciasClipRef = useRef<Map<string, GainNode>>(new Map())
  const audioRef = useRef({ regiones: audioRegiones, general: volumenGlobal, preview: volumenPreview })

  useEffect(() => {
    audioRef.current = { regiones: audioRegiones, general: volumenGlobal, preview: volumenPreview }
  }, [audioRegiones, volumenGlobal, volumenPreview])

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
      // fuente -> ganancia propia del clip -> ganancia maestra -> salida. la propia
      // arranca en 1 y solo se baja a cero cuando el clip es el que sale de un cruce
      const propia = ctx.createGain()
      fuente.connect(propia)
      propia.connect(nodo)
      gananciasClipRef.current.set(id, propia)
      cableadosRef.current.add(id)
    } catch {
      // el elemento ya estaba enrutado o el navegador no lo permite
    }
  }

  // mueve una ganancia de clip con una micro-rampa en vez de un salto. un cambio de volumen
  // instantáneo (callar el saliente en un corte, silenciar el compañero de un cruce, o devolverle
  // la voz al activo) corta la onda de golpe y suelta un "pup"/chasquido. la rampa arranca desde el
  // valor actual para ser continua y llega al destino en unos milisegundos, imperceptible al oído
  function rampaGanancia(g: GainNode, destino: number) {
    const ctx = audioCtxRef.current
    if (!ctx) {
      g.gain.value = destino
      return
    }
    try {
      g.gain.cancelScheduledValues(ctx.currentTime)
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime)
      g.gain.setTargetAtTime(destino, ctx.currentTime, 0.004)
    } catch {
      g.gain.value = destino
    }
  }

  // pausa el video de un clip pero antes baja su audio con la micro-rampa; la pausa se difiere un
  // pelo hasta que el sonido ya se apagó, así el corte entre clips no chasquea
  function pausarSuave(id: string, el: HTMLVideoElement) {
    const g = gananciasClipRef.current.get(id)
    if (g) {
      rampaGanancia(g, 0)
      window.setTimeout(() => {
        try {
          if (!el.paused) el.pause()
        } catch {
          // ya estaba pausado
        }
      }, 28)
    } else {
      try {
        el.pause()
      } catch {
        // ya estaba pausado
      }
    }
  }

  useEffect(() => () => void audioCtxRef.current?.close().catch(() => {}), [])

  // mide el área disponible para dibujar el marco del lienzo con su proporción
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const medir = () => setAreaTam({ w: el.clientWidth, h: el.clientHeight })
    const observar = new ResizeObserver(medir)
    observar.observe(el)
    medir()
    // el zoom del navegador (Ctrl +/-) no siempre dispara el ResizeObserver de forma
    // fiable, y el visor se quedaba con el tamaño viejo y descolocado. escuchar el
    // resize de la ventana, que sí salta con el zoom, y remedir además en el
    // siguiente cuadro asegura que el lienzo se reacomode a su tamaño real
    const alRedimensionar = () => {
      medir()
      requestAnimationFrame(medir)
    }
    window.addEventListener('resize', alRedimensionar)
    return () => {
      observar.disconnect()
      window.removeEventListener('resize', alRedimensionar)
    }
  }, [clips.length, hayCapas])

  // los clips que consume la reproducción y el render llevan los SOLAPES de transición ya resueltos:
  // cada cruce se vuelve un solape real donde el que sale (su cola) y el que entra (su cabeza) corren
  // a la vez. el estado guardado sigue con los clips pegados; esto es solo la vista resuelta
  const clipsOrdenados = useMemo(
    () => resolverSolapes(clips).sort((a, b) => a.inicio - b.inicio),
    [clips],
  )
  // niveles escondidos, en forma de conjunto para consultarlos rápido al elegir
  // el clip visible. esconder el de arriba deja aflorar el de debajo
  const ocultas = useMemo(() => {
    const set = new Set<number>()
    pistasMeta.forEach((m, i) => {
      if (m.oculta) set.add(i)
    })
    return set
  }, [pistasMeta])
  // el total usa los clips con los solapes resueltos: como cada cruce acorta la línea, la duración
  // real es menor que la suma de los clips pegados
  const total = useMemo(
    () => duracionProyecto(clipsOrdenados, capasTodas, audios, audioRegiones),
    [clipsOrdenados, capasTodas, audios, audioRegiones],
  )
  const assetPorId = useMemo(() => {
    const mapa = new Map<string, MediaAsset>()
    medios.forEach((a) => mapa.set(a.id, a))
    return mapa
  }, [medios])

  // instante que usa el visor para elegir y colocar lo que se ve. es el cabezal, pero
  // recortado justo por debajo del final del montaje: en el último instante exacto el
  // rango de un clip [inicio, fin) ya no lo incluye y el visor se quedaba en negro al
  // terminar. con este recorte, el final enseña el último fotograma del último clip
  // mientras se recorta un clip, el visor muestra el fotograma del borde que se arrastra en vez del
  // cabezal, para saber desde dónde se recorta. al soltar (previsualizacion vuelve a null) manda el
  // cabezal otra vez. como es el mismo tiempo que usa todo el visor, el fotograma sale con toda su
  // edición (color, efectos, capas), no crudo
  const baseTiempo = previsualizacion ?? playhead
  const phVista = total > 0 ? Math.min(baseTiempo, Math.max(0, total - 0.001)) : baseTiempo
  const activo = clipEnTiempo(clipsOrdenados, phVista, ocultas)
  // el archivo del clip visible ya no está: se avisa en el lienzo en vez de dejarlo negro
  const activoFaltante = !!(activo && assetPorId.get(activo.assetId)?.faltante)

  // en pausa, el cabezal manda: phRef lo sigue para arrancar donde toca
  useEffect(() => {
    if (!reproduciendo) phRef.current = playhead
  }, [playhead, reproduciendo])

  // en pausa cada video se coloca en su fotograma exacto y se detiene. se usa phVista
  // para que, parado al final del montaje, cada clip se sitúe en su último fotograma
  // en vez de quedarse el visor en negro
  useEffect(() => {
    if (reproduciendo) return
    const act = clipEnTiempo(clipsOrdenados, phVista, ocultas)
    clipsOrdenados.forEach((c) => {
      const v = videosRef.current.get(c.id)
      if (!v) return
      if (act && c.id === act.id) {
        const objetivo = c.recorteInicio + (phVista - c.inicio) * c.velocidad
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
    // coloca en el mismo fotograma y se queda quieto mientras el visor no corre. los
    // fondos de los demás clips se dejan en pausa, listos para cuando les toque
    fondosRef.current.forEach((f, id) => {
      if (act && id === act.id) {
        const objetivo = act.recorteInicio + (phVista - act.inicio) * act.velocidad
        if (Math.abs(f.currentTime - objetivo) > 0.05) {
          try {
            f.currentTime = objetivo
          } catch {
            // todavía sin metadatos, no pasa nada
          }
        }
      }
      if (!f.paused) f.pause()
    })
  }, [phVista, reproduciendo, clipsOrdenados, ocultas])

  // los audios importados siguen al cabezal: cada uno suena mientras el cabezal
  // cae en su tramo, colocado en el segundo de su fuente que le toca, y calla
  // fuera de él. el volumen combina el del clip con el general del proyecto. se
  // resincroniza en cada cambio de cabezal, que durante la reproducción llega
  // fotograma a fotograma
  useEffect(() => {
    audios.forEach((a) => {
      const el = audiosRef.current.get(a.id)
      if (!el) return
      const dentro = playhead >= a.inicio && playhead < a.inicio + a.duracion
      // el fundido del audio se aplica sobre su volumen, igual que en la exportación
      el.volume = Math.max(
        0,
        Math.min(
          1,
          a.volumen *
            volumenGlobal *
            volumenPreview *
            fundidoAudioEn(playhead, a.inicio, a.duracion, a.fundidoEntrada, a.fundidoSalida),
        ),
      )
      if (!dentro) {
        if (!el.paused) el.pause()
        return
      }
      const objetivo = a.recorteInicio + (playhead - a.inicio)
      if (reproduciendo) {
        if (Math.abs(el.currentTime - objetivo) > 0.25) el.currentTime = objetivo
        if (el.paused) el.play().catch(() => {})
      } else {
        if (Math.abs(el.currentTime - objetivo) > 0.05) {
          try {
            el.currentTime = objetivo
          } catch {
            // sin metadatos todavía, se ignora
          }
        }
        if (!el.paused) el.pause()
      }
    })
  }, [playhead, reproduciendo, audios, volumenGlobal, volumenPreview])

  // durante la reproducción avanza el clip activo y salta al siguiente al
  // terminar; el cabezal se calcula desde el tiempo real del video
  useEffect(() => {
    if (!reproduciendo) return
    // se puede reproducir aunque no haya ningún video: basta con que el proyecto
    // dure algo (un texto, un dibujo o un audio ya le dan duración). solo se para
    // en seco si de verdad no hay nada que mostrar ni oír
    if (total <= 0) {
      pausar()
      return
    }
    // el contexto de audio arranca suspendido; se reanuda dentro del gesto de
    // reproducir para que el navegador deje sonar
    asegurarGrafo()
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
    let raf = 0
    let cancelado = false
    // red de seguridad contra congelamientos: si el video del clip activo no está
    // listo (recién duplicado y aún cargando, buffer, cambio de clip), su
    // currentTime deja de avanzar y, atado a él, el cabezal se quedaba clavado. se
    // vigila cuánto lleva el video sin progresar y, pasado un umbral, el cabezal
    // avanza con el reloj para que la línea de tiempo nunca se congele
    let tPrev = performance.now()
    let ctPrev = -1
    let estancado = 0

    const paso = () => {
      if (cancelado) return
      // si el cabezal se movió a mano durante la reproducción (arrastrando la línea
      // azul), el store tendrá un instante distinto del que sigue el video. en ese
      // caso la reproducción salta a esa posición en vez de ignorarla, para poder
      // rebobinar o adelantar sin tener que pausar antes
      let ph = phRef.current
      const playheadStore = useEditorStore.getState().playhead
      const salto = Math.abs(playheadStore - ph) > 0.05
      if (salto) {
        ph = playheadStore
        phRef.current = ph
      }
      // tiempo real transcurrido desde el fotograma anterior, acotado por si la pestaña
      // estuvo en segundo plano y volvió con un salto enorme. se calcula aquí arriba
      // porque también hace avanzar el cabezal cuando no hay ningún clip de video que
      // marque el ritmo. antes se sumaba un 0.033 fijo por fotograma dando por hecho 30
      // hz, y en una pantalla de 60 o 120 hz el cabezal corría al doble o al cuádruple
      const ahora = performance.now()
      const dt = Math.min(0.25, (ahora - tPrev) / 1000)
      tPrev = ahora
      // mientras se graba un recorrido, la reproducción no se para al llegar al
      // final: el cabezal sigue y el elemento se va estirando para abarcar todo el
      // movimiento, tal como se pidió. fuera de la grabación, al acabar el montaje
      // se detiene en el último fotograma
      const grabando = useEditorStore.getState().grabandoMovimiento
      // mientras se graba, el bloque de la capa se estira cuadro a cuadro hasta el
      // cabezal, aunque el cursor no se mueva. así la toma no se corta y el elemento
      // no desaparece del visor al pasar del final que tenía el bloque
      if (grabando) useEditorStore.getState().crecerCapaGrabando(ph)
      if (ph >= total && !grabando) {
        irA(total)
        pausar()
        // nada puede seguir corriendo por detrás. si algún clip o el fondo borroso
        // se quedan reproduciendo, la imagen sigue moviéndose con el cabezal ya
        // parado y parece que el video se repitiera
        videosRef.current.forEach((el) => {
          if (!el.paused) el.pause()
        })
        fondosRef.current.forEach((el) => {
          if (!el.paused) el.pause()
        })
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
        // ya en el final del montaje y sin video que marque el ritmo (el audio o una
        // capa duran un poco más que el último clip): se detiene de verdad. sin esto
        // el bucle se quedaba girando con reproduciendo en true, y darle al play luego
        // solo pausaba ese estado congelado, dando la sensación de que "no hacía nada"
        if (!grabando && ph >= total - 0.02) {
          irA(total)
          pausar()
          videosRef.current.forEach((el) => { if (!el.paused) el.pause() })
          fondosRef.current.forEach((f) => { if (!f.paused) f.pause() })
          return
        }
        // sin clip de video que marque el ritmo, el cabezal avanza con el reloj real.
        // el avance normal se topa al final del montaje; grabando no, para que el
        // recorrido pueda pasarse y estirar el bloque
        phRef.current = grabando ? ph + dt : Math.min(ph + dt, total)
        irA(phRef.current)
        raf = requestAnimationFrame(paso)
        return
      }
      const v = videosRef.current.get(act.id)
      if (!v) {
        raf = requestAnimationFrame(paso)
        return
      }
      // fin del clip, en el tiempo del video (fin del recorte) y en el del montaje.
      // si este clip es lo último de la línea de tiempo y su video ya se terminó, la
      // reproducción se detiene aquí y se queda clavada en el último fotograma. sin
      // esta guarda, un video que acaba un pelín antes de que el cabezal alcance el
      // total se volvía a mandar reproducir, y darle play a un video ya terminado lo
      // reinicia desde cero: de ahí que la reproducción "volviera sola al inicio"
      const finUsoClip = act.recorteInicio + act.duracion * act.velocidad
      const finClip = act.inicio + act.duracion
      // se detiene solo si el cabezal llegó de verdad al final. antes bastaba con que el
      // video estuviera en `ended`, y al reiniciar desde el principio (con el `ended`
      // todavía puesto del pase anterior) esta guarda saltaba en el primer fotograma y
      // devolvía el cabezal al total: por eso "no se podía volver a reproducir"
      if (
        !grabando &&
        finClip >= total - 0.02 &&
        ph >= finClip - 0.05 &&
        (v.ended || v.currentTime >= finUsoClip - 0.03)
      ) {
        v.pause()
        irA(total)
        pausar()
        videosRef.current.forEach((el) => {
          if (!el.paused) el.pause()
        })
        fondosRef.current.forEach((el) => {
          if (!el.paused) el.pause()
        })
        return
      }
      // en un cruce centrado corren los dos clips a la vez: el activo por su camino normal
      // y el otro (el que sale, rodando hacia su cola; o el que entra, desde su cabeza aún
      // antes de su inicio) también, para que ninguna imagen se congele. su audio va a
      // cero para que no suene doble
      const cruceVivo = cruceCentradoEn(clipsOrdenados, ph, esTransicionReal)
      const companero = cruceVivo ? (act.id === cruceVivo.entra.id ? cruceVivo.sale : cruceVivo.entra) : null
      const companeroId = companero?.id
      clipsOrdenados.forEach((c) => {
        if (c.id !== act.id && c.id !== companeroId) {
          const otro = videosRef.current.get(c.id)
          if (otro && !otro.paused) pausarSuave(c.id, otro)
        }
      })
      const nodo = asegurarGrafo()
      cablearVideo(act.id, v)
      // la ganancia propia del activo vuelve a 1 (con rampa) por si venía de ser el saliente de un
      // cruce anterior, donde quedó a cero; subirla de golpe volvería a chasquear
      const gAct = gananciasClipRef.current.get(act.id)
      if (gAct) rampaGanancia(gAct, 1)
      // el compañero sigue corriendo (silenciado) para que su imagen no se congele
      if (companero) {
        const cv = videosRef.current.get(companero.id)
        if (cv) {
          cablearVideo(companero.id, cv)
          const gc = gananciasClipRef.current.get(companero.id)
          if (gc) rampaGanancia(gc, 0)
          cv.playbackRate = companero.velocidad
          // su tiempo continuo: la cola del que sale, o la cabeza del que entra antes de
          // su inicio (offset negativo). se recoloca si está pausado o se desfasó; si ya
          // venía rodando, se deja para no dar tirones
          const objetivo = companero.recorteInicio + (ph - companero.inicio) * companero.velocidad
          if (cv.paused || Math.abs(cv.currentTime - objetivo) > 0.4) {
            try {
              cv.currentTime = Math.max(0, objetivo)
            } catch {
              // sin metadatos todavía
            }
          }
          if (cv.paused) cv.play().catch(() => {})
        }
      }
      // un nivel silenciado no aporta sonido: su clip se ve pero la ganancia baja
      // a cero, igual que hará la exportación
      if (nodo) {
        // un nivel silenciado o un clip con su audio ya separado no suena: el
        // sonido de un clip separado lo lleva su clip de audio vinculado
        // el volumen propio del clip multiplica a la ganancia de la pista, así que
        // un clip bajo sigue respetando las franjas y el volumen general
        nodo.gain.value = metas[act.pista]?.silenciada || act.mudo || act.silenciado
          ? 0
          : gananciaEn(audioRef.current.regiones, audioRef.current.general, ph) *
            audioRef.current.preview *
            (act.volumen ?? 1) *
            fundidoAudioEn(ph, act.inicio, act.duracion, act.fundidoEntrada, act.fundidoSalida)
      }
      // grabando un recorrido el video corre más despacio, que es la única forma
      // de seguir con el cursor algo que se mueve rápido sin ir a tirones. el
      // cabezal se sigue calculando desde el tiempo real del video, así que la
      // línea de tiempo no se descuadra
      const st = useEditorStore.getState()
      v.playbackRate = act.velocidad * (st.grabandoMovimiento ? st.velocidadGrabacion : 1)
      // se recoloca el video si estaba en pausa o si el cabezal acaba de saltar a
      // mano; así el arrastre de la línea azul mueve de verdad la imagen. también pasa
      // al cambiar de un clip al siguiente, cuando el nuevo video entra pausado
      const recolocado = v.paused || salto
      if (recolocado) {
        try {
          v.currentTime = act.recorteInicio + (ph - act.inicio) * act.velocidad
        } catch {
          // sin metadatos todavía
        }
        if (v.paused) v.play().catch(() => {})
      }
      // el fondo borroso del clip activo persigue al video real: mismo asset, misma
      // velocidad y mismo tiempo, para que se vea el material en movimiento y no un
      // cuadro congelado. si se desfasa un poco se reengancha sin cortar la imagen. los
      // fondos de los otros clips se pausan para que no corran por detrás, salvo el del
      // compañero de un cruce, que sigue para que sus bandas tampoco se congelen
      fondosRef.current.forEach((otro, id) => {
        if (id !== act.id && id !== companeroId && !otro.paused) otro.pause()
      })
      if (companero) {
        const cf = fondosRef.current.get(companero.id)
        if (cf) {
          cf.playbackRate = companero.velocidad
          if (cf.paused) cf.play().catch(() => {})
        }
      }
      const f = fondosRef.current.get(act.id)
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
      // mientras se reproduce este clip se deja ya colocado el primer fotograma del que
      // viene después, para que al cambiar de clip muestre su imagen buena de una vez.
      // sin esto asomaba un instante su fotograma inicial (el segundo cero del video)
      // antes de saltar a donde toca, y el corte se veía con un frame malo
      // ...salvo que ese "siguiente" sea el COMPAÑERO de un cruce en curso: entonces ya lo está
      // reproduciendo el bloque del compañero (su cabeza, avanzando), y volver a clavarlo en su
      // primer fotograma cada frame lo dejaba pegado en cero y descuadraba el cabezal
      const sig = posterior(act, clipsOrdenados)
      if (sig && sig.id !== companeroId) {
        const vsig = videosRef.current.get(sig.id)
        if (vsig && Math.abs(vsig.currentTime - sig.recorteInicio) > 0.05) {
          try {
            vsig.currentTime = sig.recorteInicio
          } catch {
            // sin metadatos todavía
          }
        }
        // el relleno borroso del clip que viene se deja colocado igual que su video: si
        // no, al cruzar el corte sus bandas aparecen un instante en negro porque el video
        // del fondo aún no tiene fotograma decodificado en esa posición
        const fsig = fondosRef.current.get(sig.id)
        if (fsig && Math.abs(fsig.currentTime - sig.recorteInicio) > 0.05) {
          try {
            fsig.currentTime = sig.recorteInicio
          } catch {
            // sin metadatos todavía
          }
        }
      }
      // recolocar el video es un seek asíncrono: su currentTime todavía no refleja el
      // instante pedido, así que no se puede calcular el cabezal desde él (aún valdría 0 y
      // saltaría al inicio del clip). la diferencia clave está en QUÉ pasó:
      // - salto a mano (arrastrando la línea azul): el cabezal se queda donde el usuario soltó,
      //   esperando a que el video reenganche. no debe avanzar solo
      // - cambio de clip normal: el video nuevo entra pausado y tarda uno o dos fotogramas en
      //   arrancar. si el cabezal se CONGELA esperándolo, el corte se ve "pegado", repitiendo el
      //   último cuadro varias veces. por eso, en este caso, el cabezal AVANZA con el reloj y el
      //   video reengancha en cuanto tenga datos, dando un corte fluido
      if (recolocado) {
        phRef.current = Math.min(salto ? ph : ph + dt, total)
        irA(phRef.current)
        ctPrev = -1
        estancado = 0
        raf = requestAnimationFrame(paso)
        return
      }
      const finUso = act.recorteInicio + act.duracion * act.velocidad
      if (v.currentTime >= finUso - 0.02) {
        v.pause()
        phRef.current = Math.min(act.inicio + act.duracion, total)
        irA(phRef.current)
        raf = requestAnimationFrame(paso)
        return
      }
      // ¿avanzó el video desde la última vuelta? si no, se acumula ese tiempo; en
      // cuanto cambia su currentTime se reinicia el contador de estancamiento
      if (v.currentTime === ctPrev) estancado += dt
      else {
        estancado = 0
        ctPrev = v.currentTime
      }
      let nuevo: number
      if (estancado > 0.15) {
        // el video lleva un buen rato sin progresar: el cabezal avanza con el
        // reloj para no congelar la línea, y se empuja el video a esa posición
        // para que reenganche en cuanto tenga datos
        nuevo = phRef.current + dt * act.velocidad
        try {
          v.currentTime = act.recorteInicio + (nuevo - act.inicio) * act.velocidad
        } catch {
          // sin metadatos todavía
        }
      } else {
        nuevo = act.inicio + (v.currentTime - act.recorteInicio) / act.velocidad
      }
      phRef.current = Math.min(nuevo, total)
      irA(phRef.current)
      raf = requestAnimationFrame(paso)
    }

    raf = requestAnimationFrame(paso)
    return () => {
      cancelado = true
      cancelAnimationFrame(raf)
      videosRef.current.forEach((v) => v.pause())
      fondosRef.current.forEach((f) => f.pause())
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
      enc: Encuadre,
    ) => {
      const pos = posicionCapa(c, ph)
      const vw = video.videoWidth
      const vh = video.videoHeight
      // el rectángulo donde de verdad se dibuja el video dentro del lienzo (con su
      // encuadre y el encaje "contener"), en píxeles del lienzo. de aquí sale cuántos
      // píxeles de video hay por cada píxel de pantalla y dónde arranca el video, para
      // que la censura muestree la zona correcta sin ampliarla
      const vr = rectClip(vw, vh, rect.w, rect.h, enc)
      const escX = vw / vr.dw
      const escY = vh / vr.dh
      // origen del video en pantalla, contando el desplazamiento del área de contenido
      const oxV = rect.ox + vr.dx
      const oyV = rect.oy + vr.dy

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
          (dx - oxV - m) * escX,
          (dy - oyV - m) * escY,
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
          (dx - oxV) * escX,
          (dy - oyV) * escY,
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

    // se recuerda lo último dibujado para no repetir el trabajo caro (muestrear el
    // video y aplicar pixelado o desenfoque) cuando nada ha cambiado
    let firmaPrev = ''
    let capasPrev: unknown = null
    const render = () => {
      if (cancelado) return
      const canvas = censuraCanvasRef.current
      const stage = canvas?.parentElement
      const ctx = canvas?.getContext('2d')
      if (canvas && stage && ctx) {
        const dpr = window.devicePixelRatio || 1
        const w = stage.clientWidth
        const h = stage.clientHeight

        const st = useEditorStore.getState()
        const ph = st.playhead
        const ordenados = resolverSolapes(st.pista.clips).sort((a, b) => a.inicio - b.inicio)
        const ocultasSt = new Set<number>()
        st.pistasMeta.forEach((m, i) => {
          if (m.oculta) ocultasSt.add(i)
        })
        const activoClip = clipEnTiempo(ordenados, ph, ocultasSt)
        const video = activoClip ? videosRef.current.get(activoClip.id) : null

        // la censura sigue la misma opacidad que el video: si el clip está en un fundido
        // (de entrada o de salida) o lo tapa una transición, el propio <video> ya se
        // atenúa o desaparece, y la mancha de censura tiene que atenuarse igual leyendo
        // ese valor. antes se quedaba flotando a plena opacidad sobre un cuadro que ya
        // casi no se veía. se aplica siempre, incluso cuando el contenido no se redibuja,
        // porque en un fundido la opacidad cambia aunque el fotograma sea el mismo
        const opv = video ? parseFloat(video.style.opacity || '1') : 1
        canvas.style.opacity = Number.isFinite(opv) ? String(opv) : '1'

        // en reproducción se redibuja siempre, porque el fotograma del video cambia.
        // en pausa solo se rehace si algo se movió: el cabezal, el fotograma, las
        // capas o el tamaño del lienzo. así una censura quieta no quema gpu sin
        // parar, que es lo que pasaba antes al dejar el editor detenido.
        // el estado del video (readyState y ancho) entra en la firma a propósito: al
        // recargar la página el primer fotograma se dibuja con el video todavía sin
        // cargar, así que la censura no se pintaba; sin este dato la firma no cambiaba
        // al terminar de cargar el video y la censura quedaba invisible hasta moverla
        const firma = [
          ph,
          video ? Math.round(video.currentTime * 1000) : -1,
          video ? video.readyState : -1,
          video ? video.videoWidth : -1,
          w,
          h,
          dpr,
        ].join('|')
        if (!st.reproduciendo && firma === firmaPrev && st.capas === capasPrev) {
          raf = requestAnimationFrame(render)
          return
        }
        firmaPrev = firma
        capasPrev = st.capas

        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)

        const rect = rectContenido(w, h, st.resolucion.ancho / st.resolucion.alto)
        if (video && video.videoWidth > 0 && activoClip) {
          // el video no llena siempre el lienzo: uno vertical en un lienzo apaisado
          // entra con bandas a los lados, y el encuadre puede moverlo y escalarlo. la
          // censura necesita ese rectángulo real para muestrear justo lo que se ve
          // debajo, en su sitio y a su tamaño, y no una zona más ancha que salía ampliada
          const enc = encuadreDe(activoClip)
          for (const capa of st.capas) {
            if (capa.tipo !== 'censura') continue
            if (ph < capa.inicio || ph >= capa.inicio + capa.duracion) continue
            dibujarUna(ctx, video, rect, capa, ph, st.colorFondo, enc)
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

  // render del impacto de contorno de neón: mientras un impacto de este tipo está
  // dentro de su ventana, se muestrea el video activo, se le detectan los bordes y se
  // pintan como líneas eléctricas del color de la bolita. va en su propio lienzo, por
  // encima del video, y solo se enciende cuando hay un impacto así en el proyecto
  useEffect(() => {
    if (!hayContorno) {
      const c = contornoCanvasRef.current
      const ctx = c?.getContext('2d')
      if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
      return
    }
    if (!contornoLienzos.current) contornoLienzos.current = crearLienzosContorno()
    let raf = 0
    let cancelado = false
    const render = () => {
      if (cancelado) return
      const canvas = contornoCanvasRef.current
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
        const activos = st.impactos.filter(
          (i) =>
            (i.tipo === 'contorno' || i.tipo === 'lineas3d' || i.tipo === 'rayosObjeto') &&
            ph >= i.t &&
            ph < i.t + i.duracion,
        )
        if (activos.length) {
          const ordenados = resolverSolapes(st.pista.clips).sort((a, b) => a.inicio - b.inicio)
          const ocultasSt = new Set<number>()
          st.pistasMeta.forEach((m, i) => {
            if (m.oculta) ocultasSt.add(i)
          })
          const activoClip = clipEnTiempo(ordenados, ph, ocultasSt)
          const video = activoClip ? videosRef.current.get(activoClip.id) : null
          const rect = rectContenido(w, h, st.resolucion.ancho / st.resolucion.alto)
          const enc = activoClip ? encuadreDe(activoClip) : { x: 0.5, y: 0.5, escala: 1 }
          // los tres impactos de neón muestrean el video (el objeto se aísla por brillo),
          // así que todos necesitan el rectángulo real del video
          const vr = video && video.videoWidth > 0 ? rectClip(video.videoWidth, video.videoHeight, rect.w, rect.h, enc) : null
          const dst = vr ? { dx: rect.ox + vr.dx, dy: rect.oy + vr.dy, dw: vr.dw, dh: vr.dh } : null
          const trans = { rotacion: enc.rotacion, espejoH: enc.espejoH, espejoV: enc.espejoV }
          const lz = contornoLienzos.current!
          if (video && video.videoWidth > 0 && dst) {
            const vw = video.videoWidth
            const vh = video.videoHeight
            for (const im of activos) {
              const p = (ph - im.t) / im.duracion
              const suav = (im.suavidad ?? 50) / 100
              if (im.tipo === 'lineas3d') {
                dibujarLineas3d(ctx, video, vw, vh, dst, im.color, im.intensidad, im.densidad ?? 55, suav, im.direccion ?? 'der', p, ph, lz, trans)
              } else if (im.tipo === 'rayosObjeto') {
                dibujarRayos(ctx, video, vw, vh, dst, im.color, im.intensidad, suav, p, ph, lz, trans)
              } else {
                dibujarContorno(ctx, video, vw, vh, dst, im.color, im.intensidad, suav, p, ph, lz, trans)
              }
            }
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
  }, [hayContorno])

  // render del impacto de manchas: mientras un impacto de este tipo esté en su ventana, se pintan
  // los blobs del color elegido dentro del recuadro del lienzo, sobre su propio canvas. ese canvas
  // va con mix-blend-mode:difference (en el jsx), así los blobs invierten el color de lo que tienen
  // debajo. las manchas se mueven con el tiempo del cabezal, igual que en la exportación
  useEffect(() => {
    if (!hayManchas) {
      const c = manchasCanvasRef.current
      const ctx = c?.getContext('2d')
      if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
      return
    }
    let raf = 0
    let cancelado = false
    const render = () => {
      if (cancelado) return
      const canvas = manchasCanvasRef.current
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
        const activos = st.impactos.filter((i) => i.tipo === 'manchas' && ph >= i.t && ph < i.t + i.duracion)
        if (activos.length) {
          // las manchas se quedan dentro del recuadro del lienzo (no de las bandas del fondo)
          const rect = rectContenido(w, h, st.resolucion.ancho / st.resolucion.alto)
          for (const im of activos) {
            const p = (ph - im.t) / im.duracion
            const suav = (im.suavidad ?? 50) / 100
            dibujarManchas(ctx, rect.ox, rect.oy, rect.w, rect.h, im.color, im.intensidad, suav, p, ph)
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
  }, [hayManchas])

  // render de las texturas animadas: mientras el clip activo tenga un efecto de este
  // tipo (grano, cine viejo, vhs, destellos), se pinta por cuadro sobre el recuadro de
  // su video, con el tiempo del cabezal. es el mismo dibujo que usa la exportación, así
  // que lo que se ve aquí es lo que sale en el archivo
  useEffect(() => {
    if (!hayAnimado) {
      const c = animCanvasRef.current
      const ctx = c?.getContext('2d')
      if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
      return
    }
    let raf = 0
    let cancelado = false
    const render = () => {
      if (cancelado) return
      const canvas = animCanvasRef.current
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
        const ordenados = resolverSolapes(st.pista.clips).sort((a, b) => a.inicio - b.inicio)
        const ocultasSt = new Set<number>()
        st.pistasMeta.forEach((m, i) => {
          if (m.oculta) ocultasSt.add(i)
        })
        const activoClip = clipEnTiempo(ordenados, ph, ocultasSt)
        const anim = activoClip ? efectoAnimado(activoClip.efectos ?? []) : null
        if (activoClip && anim) {
          const video = videosRef.current.get(activoClip.id)
          if (video && video.videoWidth > 0) {
            const rect = rectContenido(w, h, st.resolucion.ancho / st.resolucion.alto)
            const enc = encuadreDe(activoClip)
            const vr = rectClip(video.videoWidth, video.videoHeight, rect.w, rect.h, enc)
            const dst = { dx: rect.ox + vr.dx, dy: rect.oy + vr.dy, dw: vr.dw, dh: vr.dh }
            const mix = mixEntradaEfecto(activoClip.inicio, activoClip.transicionEfecto, ph)
            pintarAnimado(ctx, anim, ph, dst, mix)
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
  }, [hayAnimado])

  // una disolución entre dos clips se resuelve como un cruce centrado en el corte: la
  // mitad se come la cola del que sale y la otra la cabeza del que entra. si el instante
  // cae dentro de uno, el que entra sube su opacidad y el que sale se queda entero por
  // debajo, dando un fundido limpio sin bajón al centro. las demás técnicas siguen su
  // camino de siempre
  const cruce = cruceCentradoEn(clipsOrdenados, phVista, esDisolucion)
  // el cruce centrado cuando la transición es geométrica o de velo (no una disolución): ese
  // se pinta en el canvas, no con la opacidad del DOM
  const cruceGeom = cruceCentradoEn(clipsOrdenados, phVista, esGeometrica)

  // id del clip cuyo video ya tiene un fotograma decodificado y se puede mostrar sin riesgo
  // de negro. al pausar en la junta o al arrastrar el cabezal a otro punto, el video del clip
  // nuevo hace un seek a su recorte; mientras decodifica, algunos navegadores (chrome con
  // decodificación por hardware) pintan ese cuadro en NEGRO en vez de conservar el último. para
  // evitar ese parpadeo se mantiene visible el clip anterior hasta que el nuevo confirma cuadro.
  // OJO: esto SOLO se hace en pausa. durante la reproducción manda la fluidez: retener el cuadro
  // anterior mientras el nuevo hace un seek lento congelaba la imagen un momento en la junta, y
  // ahí el clip que entra ya viene pre-posicionado por el bucle de reproducción, así que aparece
  // a tiempo sin necesidad de retención
  const [clipListoId, setClipListoId] = useState<string | null>(null)
  useEffect(() => {
    // reproduciendo, o en un cruce (sus opacidades las maneja el cruce): no se retiene nada,
    // el clip activo se muestra de una vez para no cortar la fluidez
    if (!activo || cruce || reproduciendo) {
      setClipListoId(activo ? activo.id : null)
      return
    }
    const v = videosRef.current.get(activo.id)
    // sin elemento todavía, o con un cuadro ya listo y sin seek en curso, se muestra de una vez
    if (!v || (v.readyState >= 2 && !v.seeking)) {
      setClipListoId(activo.id)
      return
    }
    // aún decodificando: se avanza al clip nuevo recién cuando su video tiene cuadro
    const marcar = () => {
      if (v.readyState >= 2 && !v.seeking) setClipListoId(activo.id)
    }
    v.addEventListener('seeked', marcar)
    v.addEventListener('loadeddata', marcar)
    v.addEventListener('canplay', marcar)
    return () => {
      v.removeEventListener('seeked', marcar)
      v.removeEventListener('loadeddata', marcar)
      v.removeEventListener('canplay', marcar)
    }
  }, [activo?.id, phVista, cruce, reproduciendo])

  // clip que de verdad se pinta opaco en un corte seco: normalmente el activo, pero si estando
  // en pausa su video todavía no tiene cuadro se sigue enseñando el anterior (clipListoId) para
  // no dejar un negro. solo fuera de un cruce, en pausa, y con el clip retenido aún existente
  const idMostrado =
    !cruce &&
    !reproduciendo &&
    activo &&
    clipListoId &&
    clipListoId !== activo.id &&
    clipsOrdenados.some((c) => c.id === clipListoId)
      ? clipListoId
      : activo?.id ?? null

  // opacidad de cada video teniendo en cuenta las transiciones: el clip activo
  // entra con su transición (fundido a negro o desvanecido con el anterior), y
  // el clip anterior se mantiene visible mientras dura un desvanecido
  function opacidadDe(clip: Clip): number {
    // en un cruce centrado, el que entra se funde por encima (0 a 1) y el que sale se
    // mantiene entero por debajo; así el resultado es p·entra + (1−p)·sale, sin bajón
    if (cruce) {
      if (clip.id === cruce.entra.id) return cruce.p
      if (clip.id === cruce.sale.id) return 1
    }
    // el video del clip nuevo aún no tiene cuadro: se mantiene opaco el anterior retenido y el
    // activo se deja invisible hasta que confirme, para que el corte no pase por un negro
    if (idMostrado && activo && idMostrado !== activo.id) {
      if (clip.id === idMostrado) return 1
      if (clip.id === activo.id) return 0
    }
    if (activo && clip.id === activo.id) {
      let op = 1
      const t = clip.transicion
      // una disolución entre dos clips ya la resuelve el cruce centrado de arriba dentro de
      // su ventana; fuera de ella el clip va entero, así que aquí no se le vuelve a aplicar
      // el fundido de entrada (si no, se sumaba un segundo fundido y quedaba a medias)
      const esCruceCentrado = esDisolucion(t.tipo) && !!anterior(clip, clipsOrdenados)
      // solo el fundido por opacidad rebaja el propio video; las transiciones que se
      // pintan encima de toda la composición (negro, desenfoque, flash...) dejan el
      // video como está y su velo o desenfoque se aplica aparte, sobre todo el lienzo
      if (t.tipo !== 'ninguna' && buscarTransicion(t.tipo).tecnica === 'opacidad' && !esCruceCentrado) {
        const entrado = phVista - clip.inicio
        if (entrado < t.duracion) op = Math.min(op, Math.max(0, entrado / t.duracion))
      }
      // NOTA: se quitó un resto viejo que, cuando el clip SIGUIENTE tenía un fundido a negro,
      // bajaba la opacidad de este clip (el que sale) desde corte − duración. eso oscurecía el
      // plano ANTES de que empezara la ventana centrada del cruce (el canvas aún no está, así que
      // el video semitransparente dejaba ver el negro de fondo), y luego, al entrar la ventana, el
      // canvas lo volvía a pintar opaco y se "aclaraba". ahora el fundido a negro entre dos clips
      // lo lleva ENTERO el cruce centrado, así que aquí el video del que sale se queda opaco
      return op
    }
    // el fundido del plano anterior también lo maneja ya el cruce centrado (lo deja entero
    // dentro de la ventana y en cero fuera), así que este camino viejo solo queda para un
    // 'desvanecer' que abra contra el fondo, sin plano anterior pegado
    if (activo && activo.transicion.tipo === 'desvanecer' && !anterior(activo, clipsOrdenados)) {
      const idxAct = clipsOrdenados.findIndex((c) => c.id === activo.id)
      const anterior = idxAct > 0 ? clipsOrdenados[idxAct - 1] : null
      if (anterior && anterior.id === clip.id) {
        const entrado = phVista - activo.inicio
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
  const pTrans = activo ? progreso(activo, phVista) : 1
  const tecnicaActual = activo ? buscarTransicion(activo.transicion.tipo).tecnica : 'corte'

  // transición que abre o cierra un solo clip contra el fondo (sin otro clip pegado):
  // su velo o su desenfoque se aplican sobre TODA la composición, no solo sobre el
  // video, para que también tapen la censura, el texto y las figuras que van por encima.
  // entre dos clips la transición sigue por el canvas, donde conviven los dos planos
  const anteriorAct = activo ? anterior(activo, clipsOrdenados) : null
  const posteriorAct = activo ? posterior(activo, clipsOrdenados) : null
  const tecSal =
    activo?.transicionSalida && activo.transicionSalida.tipo !== 'ninguna'
      ? buscarTransicion(activo.transicionSalida.tipo).tecnica
      : 'corte'
  const qTrans = activo ? progresoSalida(activo, phVista) : 1

  // el canvas de la transición se enciende tanto para la de ENTRADA como para la de
  // SALIDA. antes solo miraba la de entrada, así que una transición de salida con forma
  // (redondeado, barridos, puertas) no se animaba: el video se veía entero durante toda
  // su ventana y solo cortaba de golpe al final, dando la sensación de que "iba rápido"
  // y de que no respetaba el largo estirado. las globales de un plano aislado (negro,
  // desenfoque, flash) no usan el canvas: su velo se pinta encima de todo, aparte
  // cuando el clip tiene un plano ANTERIOR, su transición de entrada es en realidad un cruce
  // CENTRADO en el corte, y de eso ya se encarga cruceGeom dentro de su ventana [corte−medio,
  // corte+medio]. fuera de esa ventana el clip va entero y NO se le vuelve a aplicar la entrada:
  // si no, al pasar el corte la lógica de entrada no centrada seguía corriendo hasta corte+dur y
  // repetía el velo (un fundido a blanco daba un parpadeo blanco justo al terminar el cruce). por
  // eso la entrada por lienzo solo se enciende cuando el clip abre contra el fondo, sin anterior
  const conLienzoEntrada =
    !anteriorAct &&
    pTrans < 1 &&
    tecnicaActual !== 'corte' &&
    tecnicaActual !== 'opacidad' &&
    !esTransicionGlobal(tecnicaActual)
  const conLienzoSalida =
    qTrans < 1 &&
    tecSal !== 'corte' &&
    tecSal !== 'opacidad' &&
    !(esTransicionGlobal(tecSal) && !posteriorAct)
  // además, un cruce centrado geométrico entre dos clips también se pinta en el canvas,
  // aunque el cabezal aún esté en el primer clip (antes del corte): por eso se enciende con
  // cruceGeom, no solo con la transición del clip activo
  const conLienzo = conLienzoEntrada || conLienzoSalida || !!cruceGeom

  // dibuja la transición fotograma a fotograma mientras dura. se apoya en el
  // mismo motor que la exportación, así que lo que se ve aquí es lo que saldrá
  useEffect(() => {
    if (!conLienzo || !activo) return
    const lienzo = transRef.current
    const ctx = lienzo?.getContext('2d')
    if (!lienzo || !ctx) return
    // referencia al lienzo real del visor. pintar() suele componer aquí, pero puede recibir un
    // lienzo aparte (la estela de movimiento compone el clip una vez y repite copias baratas)
    const ctxVisor = ctx

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

      const pintar = (clip: Clip, alfa: number, destino?: CanvasRenderingContext2D) => {
        // por defecto compone en el lienzo del visor; un destino aparte lo usa la estela de
        // movimiento, que compone el clip una vez y luego repite copias baratas
        const ctx = destino ?? ctxVisor
        const v = videosRef.current.get(clip.id)
        if (!v || !v.videoWidth) return
        // durante una transición geométrica el video también respeta su encuadre,
        // para que reencuadrar un clip se vea igual dentro y fuera de la transición
        const enc = encuadreDe(clip)
        const W = lienzo.width
        const H = lienzo.height
        const { dx, dy, dw, dh } = rectClip(v.videoWidth, v.videoHeight, W, H, enc)
        ctx.save()
        ctx.globalAlpha = alfa
        // giro y espejo alrededor del centro del clip, para que se vean también
        // mientras dura la transición
        aplicarTransformCanvas(ctx, dx + dw / 2, dy + dh / 2, {
          rotacion: enc.rotacion,
          espejoH: enc.espejoH,
          espejoV: enc.espejoV,
        })

        // el plano se dibuja con su MISMA graduación que fuera de la transición (color,
        // efectos css, desenfoque de movimiento, nitidez, curvatura y textura animada), no
        // crudo. antes se pintaba el video tal cual y por eso en pleno cruce el clip mostraba
        // su color original sin editar, y al terminar la transición saltaba de golpe a como
        // estaba corregido. se resuelve en pasadas, igual que la exportación, porque mezclar
        // funciones nativas con un filtro svg en el mismo ctx.filter deja el cuadro en negro.
        // cada url() apunta al mismo <filter> que usa el <video> del DOM, así el visor y el
        // archivo exportado coinciden
        const mixEf = mixEntradaEfecto(clip.inicio, clip.transicionEfecto, st.playhead)
        const tonoEf = mezclarTono(clip.tono, mixEf)
        const efectos = mezclarEfectos(clip.efectos ?? [], mixEf)
        const nativo = `brightness(${1 + tonoEf.exposicion / 100}) contrast(${1 + tonoEf.contraste / 100}) saturate(${1 + tonoEf.saturacion / 100})`
        const css = cssEfectos(efectos)
        const usaTonoUrl = usaMatriz(tonoEf) || usaNitidez(tonoEf) || hayEfectoFiltro(efectos)
        const conNB = !!paramsNB(efectos)
        const conGoPro = !!paramsGoPro(efectos)
        const conCromatico = !!paramsCromatico(efectos)

        if (!usaTonoUrl && !conNB && !conGoPro && !conCromatico) {
          // solo funciones nativas (o nada): caben en una pasada directa sobre el lienzo
          const cadena = `${nativo} ${css}`.trim()
          if (cadena && cadena !== 'brightness(1) contrast(1) saturate(1)') ctx.filter = cadena
          ctx.drawImage(v, dx, dy, dw, dh)
          ctx.filter = 'none'
        } else {
          // hay filtros svg: se encadenan en pasadas separadas sobre lienzos auxiliares
          const sa = prepararScratch(scratchA, W, H)
          const aCtx = sa.getContext('2d')
          if (aCtx) {
            aCtx.setTransform(1, 0, 0, 1, 0, 0)
            aCtx.clearRect(0, 0, W, H)
            aCtx.filter = `${nativo} ${css}`.trim() || 'none'
            aCtx.drawImage(v, dx, dy, dw, dh)
            aCtx.filter = 'none'
            let fuente: HTMLCanvasElement = sa
            const pasarUrl = (id: string) => {
              const destino = prepararScratch(fuente === scratchA.current ? scratchB : scratchA, W, H)
              const dCtx = destino.getContext('2d')
              if (!dCtx) return
              dCtx.setTransform(1, 0, 0, 1, 0, 0)
              dCtx.clearRect(0, 0, W, H)
              dCtx.filter = `url(#${id})`
              dCtx.drawImage(fuente, 0, 0)
              dCtx.filter = 'none'
              fuente = destino
            }
            if (usaTonoUrl) pasarUrl(`tono-${clip.id}`)
            if (conNB) pasarUrl(`nb-${clip.id}`)
            if (conGoPro) pasarUrl(`gopro-${clip.id}`)
            if (conCromatico) pasarUrl(`cromatico-${clip.id}`)
            ctx.drawImage(fuente, 0, 0)
          }
        }

        // textura animada (grano, vhs, cromático, etc.) por encima del plano, recortada a su
        // recuadro y con el tiempo del cabezal. se pinta en un lienzo transparente aparte para
        // que su modo de fusión actúe contra el transparente y no contra el propio video, igual
        // que en la exportación, y luego se vuelca
        const anim = efectoAnimado(clip.efectos ?? [])
        if (anim) {
          const sc = prepararScratch(scratchB, W, H)
          const cCtx = sc.getContext('2d')
          if (cCtx) {
            cCtx.setTransform(1, 0, 0, 1, 0, 0)
            cCtx.clearRect(0, 0, W, H)
            cCtx.save()
            cCtx.beginPath()
            cCtx.rect(dx, dy, dw, dh)
            cCtx.clip()
            pintarAnimado(cCtx, anim, st.playhead, { dx, dy, dw, dh }, mixEf)
            cCtx.restore()
            ctx.drawImage(sc, 0, 0)
          }
        }
        ctx.restore()
      }

      // un cruce geométrico entre dos clips pegados manda sobre todo: se pinta centrado en el
      // corte, con los dos planos, igual que en la exportación. si no hay cruce, se cae a la
      // transición de salida del clip (si está cerrando) o a la de entrada de siempre
      const cruceVivo = cruceCentradoEn(clipsOrdenados, st.playhead, esGeometrica)
      const q = progresoSalida(act, st.playhead)
      if (cruceVivo) {
        pintarTransicion(ctx, lienzo.width, lienzo.height, cruceVivo.entra, cruceVivo.sale, cruceVivo.p, pintar, cruceVivo.entra.transicion.tipo)
      } else if (q < 1 && act.transicionSalida) {
        const sig = posterior(act, st.pista.clips)
        pintarTransicion(ctx, lienzo.width, lienzo.height, sig, act, q, pintar, act.transicionSalida.tipo)
      } else if (!sal) {
        // solo una entrada contra el fondo (sin plano anterior) se pinta como entrada suelta; si
        // hay anterior es un cruce centrado y ya lo cubre cruceVivo dentro de su ventana. sin este
        // filtro, en el borde de la ventana se colaba un fotograma de la entrada no centrada
        pintarTransicion(ctx, lienzo.width, lienzo.height, act, sal, p, pintar)
      }
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [conLienzo, activo, clipsOrdenados, resolucion, colorFondo])

  // clips que necesitan el filtro svg: los que corrigen color y también los que
  // llevan algún efecto de desenfoque, aunque no toquen el color
  // un clip lleva def de filtro svg si su color usa matriz o tiene un efecto de
  // filtro. con la aparición progresiva se evalúa sobre el tono ya mezclado en el
  // instante actual, así la def está lista justo cuando empieza a hacer falta
  const filtrosClip = clipsOrdenados
    .map((c) => {
      const mix = mixEntradaEfecto(c.inicio, c.transicionEfecto, phVista)
      return { clip: c, tono: mezclarTono(c.tono, mix), efectos: mezclarEfectos(c.efectos ?? [], mix) }
    })
    .filter(
      (x) =>
        usaMatriz(x.tono) ||
        usaNitidez(x.tono) ||
        hayEfectoFiltro(x.efectos) ||
        paramsNB(x.efectos) ||
        paramsGoPro(x.efectos) ||
        paramsCromatico(x.efectos),
    )

  const hayContenido = clipsOrdenados.length > 0 || hayCapas


  // el lienzo mantiene la proporción del proyecto dentro del área disponible;
  // su fondo se ve en las bandas cuando el video no lo cubre
  const lienzoRect = rectContenido(areaTam.w, areaTam.h, resolucion.ancho / resolucion.alto)

  // velo y desenfoque de una transición que abre o cierra un clip aislado, ya calculado
  // en píxeles del lienzo. se aplican sobre toda la composición (video y capas), no solo
  // sobre el video. entre dos clips la transición sigue por el canvas
  const ladoMenor = Math.min(lienzoRect.w, lienzoRect.h)
  const entGlobal =
    activo && !anteriorAct && pTrans < 1 && esTransicionGlobal(tecnicaActual)
      ? efectoGlobalTrans(tecnicaActual, pTrans, true, ladoMenor, activo.transicion?.intensidad)
      : null
  const salGlobal =
    activo && !posteriorAct && qTrans < 1 && esTransicionGlobal(tecSal)
      ? efectoGlobalTrans(tecSal, qTrans, false, ladoMenor, activo.transicionSalida?.intensidad)
      : null
  const veloEnt = entGlobal?.veloOpacidad ?? 0
  const veloSal = salGlobal?.veloOpacidad ?? 0
  const veloTransOpacidad = Math.max(veloEnt, veloSal)
  const veloTransColor = veloEnt >= veloSal ? entGlobal?.veloColor ?? '#000' : salGlobal?.veloColor ?? '#000'
  const blurTrans = (entGlobal?.blur ?? 0) + (salGlobal?.blur ?? 0)

  // efecto combinado de los impactos activos en este instante: deforma el cuadro
  // entero (clip y lo que tenga delante) y puede echarle un velo. va en tiempo
  // real, sin suavizado, para que el golpe se sienta seco
  const imp = estadoImpactosEn(impactos, phVista)
  // desenfoque direccional (barrido) del impacto de Movimiento, en píxeles del lienzo. si lo hay,
  // el filtro pasa a ser un feGaussianBlur SOLO en ese eje (estela), no el blur redondo de siempre
  const impBlurX = imp.desenfoqueX * lienzoRect.h
  const impBlurY = imp.desenfoqueY * lienzoRect.h
  const impDireccional = impBlurX > 0.1 || impBlurY > 0.1
  const impactoActivo = imp.escala !== 1 || imp.desenfoque > 0 || impDireccional || imp.x !== 0 || imp.y !== 0
  const impactoTransform = impactoActivo
    ? `scale(${imp.escala}) translate(${imp.x * lienzoRect.h}px, ${imp.y * lienzoRect.h}px)`
    : ''
  const impactoFiltro = impDireccional
    ? 'url(#ve-imp-mov)'
    : imp.desenfoque > 0
      ? `blur(${(imp.desenfoque * lienzoRect.h).toFixed(2)}px)`
      : undefined

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
      ].join(' ')}
      // las bandas alrededor del lienzo toman el color del marco del visor, claro en
      // modo claro y casi negro en oscuro; sin contenido se usa la superficie suave
      style={{ background: hayContenido ? 'rgb(var(--marco-visor))' : 'rgb(var(--surface-2))' }}
      // marca para poder apagar ese fondo desde el css cuando el visor va a pantalla
      // completa: ahí las bandas deben fundirse con el fondo oscuro en vez de dibujar
      // un marco claro alrededor del video
      data-visor
      ref={visorRef}
      // arrastrar por el fondo del visor (o las bandas de los lados) dibuja un
      // recuadro de selección; un clic seco suelta lo que hubiera seleccionado. el
      // lienzo y las capas cortan la propagación, así que esto solo salta fuera de
      // la imagen
      onMouseDown={iniciarMarquee}
      // el acercar con la rueda y con el pellizco va por listeners no pasivos (arriba). aquí solo
      // se apunta el arranque del pellizco de dos dedos: la separación inicial y el zoom de partida
      onTouchStart={(e) => {
        if (e.touches.length === 2) {
          const [a, b] = [e.touches[0], e.touches[1]]
          pellizco.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoomVisor.z }
        }
      }}
      onTouchEnd={(e) => {
        if (e.touches.length < 2) pellizco.current = null
      }}
    >
      {/* recuadro azul de selección múltiple */}
      {marquee && marquee.w > 2 && marquee.h > 2 && (
        <div
          className="pointer-events-none absolute z-50 rounded-[2px] border border-brand"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.w,
            height: marquee.h,
            background: 'rgb(24 97 255 / 0.14)',
          }}
        />
      )}

      {/* con el visor acercado, esta capa se pone por encima de todo y se queda con el arrastre para
          PANEAR el encuadre (mover el zoom a donde se quiera), desactivando cualquier otra acción de
          arrastre (mover un texto, un recuadro de selección...). la rueda y el pellizco siguen
          funcionando porque burbujean al contenedor; la lupa va por encima de esta capa */}
      {hayContenido && zoomVisor.z > 1.01 && (
        <div
          className="absolute inset-0 z-40"
          style={{ cursor: 'grab' }}
          onMouseDown={iniciarMarquee}
          // doble clic sobre el visor acercado vuelve al tamaño que encaja, la misma salida que la lupa.
          // esta capa solo existe con zoom, así que no pisa el doble clic que edita un texto sin acercar
          onDoubleClick={() => setZoomVisor({ z: 1, x: 0, y: 0 })}
        />
      )}

      {/* lupa del visor: cuando hay acercamiento, muestra el nivel y, al pulsarla, vuelve al encaje
          (100%). así se sabe que se está con zoom y hay una salida a un clic. el acercar es con la
          rueda o el pellizco de dos dedos */}
      {hayContenido && zoomVisor.z > 1.01 && (
        <button
          type="button"
          onClick={() => setZoomVisor({ z: 1, x: 0, y: 0 })}
          title="Volver al tamaño que encaja"
          className="absolute right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/75"
        >
          <Icon name="zoomMas" size={13} /> {Math.round(zoomVisor.z * 100)}%
        </button>
      )}
      {!hayContenido ? (
        <div className="w-full max-w-sm">
          <Vacio compacto icono={<Icon name="video" size={24} />} titulo="Aún no hay nada en el lienzo">
            Importa un video desde el panel de <b>Medios</b>, abajo a la izquierda, y arrástralo
            hasta la línea de tiempo para empezar a editar.
          </Vacio>
        </div>
      ) : (
        <div ref={areaRef} className="flex h-full w-full items-center justify-center overflow-hidden">
          <div
            className="relative shadow-2xl"
            data-zoom-visor={zoomVisor.z > 1 ? '1' : undefined}
            style={{
              width: lienzoRect.w,
              height: lienzoRect.h,
              background: colorFondo,
              // aquí solo va la lupa del visor. el impacto ya no se aplica al contenedor
              // entero (eso deformaba también el relleno borroso de las bandas): ahora se
              // aplica a un envoltorio interno que deja el fondo fuera. el desenfoque de
              // una transición que difumina todo el lienzo sí va aquí, sobre todo
              transform:
                zoomVisor.z > 1
                  ? `translate(${zoomVisor.x}px, ${zoomVisor.y}px) scale(${zoomVisor.z})`
                  : undefined,
              filter: blurTrans > 0 ? `blur(${blurTrans.toFixed(2)}px)` : undefined,
              transition: impactoActivo ? 'none' : 'transform 140ms ease-out',
            }}
            // un clic sobre la imagen elige el clip que hay bajo el cabezal para
            // poder reencuadrarlo. se corta la propagación para que no llegue al
            // fondo y deseleccione. las capas cortan el pointerdown, pero el
            // navegador dispara además un mousedown de compatibilidad que sí burbujea
            // hasta aquí: si nació dentro de una capa (censura, figura, texto), esa
            // capa ya se seleccionó sola y reencuadrar el clip le robaría la selección
            onMouseDown={(e) => {
              e.stopPropagation()
              if ((e.target as HTMLElement).closest('[data-capa-id]')) return
              if (activo) seleccionar(activo.id)
            }}
            // aceptar el soltar de una forma arrastrada desde el panel de figuras.
            // solo se admite si el arrastre trae ese tipo, para no interferir con
            // otros arrastres del editor
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(TIPO_FIGURA)) e.preventDefault()
            }}
            onDrop={(e) => {
              const forma = e.dataTransfer.getData(TIPO_FIGURA) as CapaFigura['forma']
              if (!forma) return
              e.preventDefault()
              // el propio div del lienzo ya tiene la proporción exacta, así que su
              // rectángulo basta para pasar el cursor a fracción 0..1 acotada
              const r = e.currentTarget.getBoundingClientRect()
              const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
              const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
              agregarFigura(forma, x, y)
            }}
          >
            {/* capa del relleno borroso de las bandas, aparte del resto. queda fuera del
                envoltorio del impacto para que un golpe no la sacuda ni la difumine. el
                overflow oculto recorta su ampliación, igual que hace la exportación */}
            <div className="absolute inset-0 overflow-hidden">
              {/* relleno de las bandas con el propio video, ampliado y borroso,
                  para que un video apaisado en un lienzo vertical no deje dos
                  franjas planas. va el primero, así queda por debajo del video
                  real que se pinta encima; no lleva z negativo porque eso lo
                  hundía por detrás del fondo del lienzo y no se veía. no suena,
                  que el sonido lo lleva el video de delante */}
              {fondo === 'desenfoque' &&
                clipsOrdenados.map((c) => {
                  const asset = assetPorId.get(c.assetId)
                  if (!asset || asset.faltante) return null
                  // se ve solo el fondo del clip activo; los demás quedan cargados y a
                  // opacidad cero, de modo que al pasar al siguiente ya tiene su fotograma
                  // listo y no aparece el negro del lienzo entre un clip y otro
                  const esActivo = !!activo && activo.id === c.id
                  return (
                    <video
                      key={`fondo-${c.id}`}
                      ref={(el) => {
                        if (el) fondosRef.current.set(c.id, el)
                        else fondosRef.current.delete(c.id)
                      }}
                      src={asset.url}
                      muted
                      playsInline
                      preload="auto"
                      aria-hidden
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      style={{
                        filter: `blur(${Math.round(desenfoqueFondo * 0.6)}px) brightness(0.72)`,
                        // giro del fondo en pasos de 90°. al girar un cuarto de vuelta hay
                        // que ampliar más para que el relleno siga cubriendo todo el lienzo
                        transform: `scale(${(1.12 * (fondoGiro % 180 === 90 ? Math.max(resolucion.ancho / resolucion.alto, resolucion.alto / resolucion.ancho) : 1)).toFixed(3)})${fondoGiro ? ` rotate(${fondoGiro}deg)` : ''}`,
                        // durante un cruce centrado, el fondo del que entra se funde igual
                        // que su video y el del que sale se queda entero, para que las
                        // bandas crucen a la par que la imagen
                        opacity: cruce && cruce.entra.id === c.id ? cruce.p : cruce && cruce.sale.id === c.id ? 1 : esActivo ? 1 : 0,
                      }}
                    />
                  )
                })}
            </div>
            {/* filtro de barrido del impacto de Movimiento: un desenfoque gaussiano SOLO en el eje
                elegido, que deja estelas en el sentido del movimiento (no un blur redondo). la
                desviación se calcula por fotograma y se aplica al envoltorio de abajo por su id */}
            {impDireccional && (
              <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden>
                <filter id="ve-imp-mov" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation={`${impBlurX.toFixed(2)} ${impBlurY.toFixed(2)}`} edgeMode="duplicate" />
                </filter>
              </svg>
            )}
            {/* envoltorio del impacto: aquí va lo que el impacto SÍ debe deformar (el
                video y lo que lleva delante: censura, texto, figuras). el relleno borroso
                de las bandas quedó en la capa de arriba, fuera de este transform, para que
                no se sacuda ni se difumine con el golpe */}
            <div
              className="absolute inset-0"
              style={{
                transform: impactoTransform || undefined,
                filter: impactoFiltro,
                transition: impactoActivo ? 'none' : 'transform 140ms ease-out',
              }}
            >
            <div className="absolute inset-0 overflow-hidden">
              {clipsOrdenados.map((c) => {
                const asset = assetPorId.get(c.assetId)
                // aparición progresiva del color y los efectos, si el clip la lleva
                const mixEf = mixEntradaEfecto(c.inicio, c.transicionEfecto, phVista)
                const mezclaEfecto = {
                  tono: mezclarTono(c.tono, mixEf),
                  efectos: mezclarEfectos(c.efectos ?? [], mixEf),
                  animando: !!c.transicionEfecto && mixEf < 1,
                }
                if (!asset || asset.faltante) return null
                // el encuadre se aplica como transformación del elemento: se
                // escala respecto al centro y luego se lleva a su posición, en
                // fracción del lienzo. coincide con lo que dibuja el compositor
                const enc = encuadreDe(c)
                // el reencuadre da el translate y la escala; el espejo se anexa
                // aparte, porque un clip solo volteado (sin mover ni escalar) tiene
                // el encuadre "neutro" y aun así debe voltearse
                const base = encuadreNeutro(enc)
                  ? ''
                  : `translate(${(enc.x - 0.5) * 100}%, ${(enc.y - 0.5) * 100}%) scale(${enc.escala})`
                const giro = sufijoTransformCss({
                  rotacion: enc.rotacion,
                  espejoH: enc.espejoH,
                  espejoV: enc.espejoV,
                })
                // el video del visor se coloca con object-contain, que encaja sin
                // saber del giro. cuando el clip va de lado, se le suma un factor de
                // escala para que, ya girado, llene el lienzo igual que en el
                // compositor (que sí encaja con las medidas cruzadas). así el visor y
                // la exportación muestran lo mismo
                let factorGiro = 1
                if (giradoUnCuarto(enc.rotacion)) {
                  const sinGirar = Math.min(resolucion.ancho / asset.ancho, resolucion.alto / asset.alto)
                  const cruzado = Math.min(resolucion.ancho / asset.alto, resolucion.alto / asset.ancho)
                  if (sinGirar > 0) factorGiro = cruzado / sinGirar
                }
                const escalaGiro = factorGiro !== 1 ? ` scale(${factorGiro.toFixed(4)})` : ''
                const transform = `${base} ${giro}${escalaGiro}`.trim() || undefined
                // el recorte se aplica al propio elemento: el rectángulo con un
                // clip-path duro y el óvalo con una máscara radial que, difuminada,
                // deja el borde suave y transparente. la viñeta blanca opcional va
                // en una capa aparte encima, recortada por la misma silueta
                // mientras la herramienta de recortar está abierta sobre este clip,
                // el recorte duro no se aplica al video: se ve entero y la parte de
                // fuera la oscurece la sombra del overlay, para poder cuadrar viendo
                // lo que se descarta. pero si el recorte lleva borde difuminado o
                // viñeta, sí se aplica la máscara mientras se edita, porque solo así
                // se ve en vivo cómo va quedando ese difuminado al mover sus mandos
                const recorteSuave = !!(c.recorte && (c.recorte.difuminado ?? 0) > 0)
                const editandoRecorte =
                  (herramienta === 'recortar' || categoriaClip === 'recortar' || recorteRapido) &&
                  clipSeleccionado === c.id &&
                  !recorteSuave
                // el video se pinta con object-contain, así que si su proporción no
                // coincide con la del lienzo queda encajado con bandas. la máscara del
                // recorte tiene que caer sobre esa caja real del video (no sobre todo
                // el elemento), o el óvalo se deforma y asoma el borde duro como un corte
                const cajaVideo = cajaContain(asset.ancho, asset.alto, resolucion.ancho, resolucion.alto)
                const recEstilo = editandoRecorte
                  ? { clipPath: undefined, maskImage: undefined, WebkitMaskImage: undefined }
                  : estiloRecorte(c.recorte, cajaVideo)
                const clipPath = recEstilo.clipPath
                return (
                  <Fragment key={c.id}>
                  <video
                    data-clip-id={c.id}
                    ref={(el) => {
                      if (el) videosRef.current.set(c.id, el)
                      else videosRef.current.delete(c.id)
                    }}
                    src={asset.url}
                    playsInline
                    preload="auto"
                    // si el cargador de preparación seguía encendido, se apaga en
                    // cuanto el primer video tiene datos listos para mostrarse
                    onLoadedData={() => {
                      if (useProjectStore.getState().preparando)
                        useProjectStore.setState({ preparando: false })
                    }}
                    // el blob del medio dejó de cargar (se revocó, o el navegador perdió
                    // su copia del archivo). se comprueba si el archivo aún se puede leer:
                    // si sí, se rehace la dirección una vez y el video se recupera solo; si
                    // no, se marca faltante para mostrar "no encontrado" y que nada vuelva a
                    // pedir ese blob roto en cada autoguardado, que es lo que llenaba la
                    // consola de errores de red
                    onError={() => {
                      const pr = useProjectStore.getState()
                      const a = pr.medios.find((m) => m.id === c.assetId)
                      if (!a || a.faltante) return
                      a.file
                        .slice(0, 1)
                        .arrayBuffer()
                        .then(() => {
                          if (urlRehecha.current.has(a.id)) {
                            pr.marcarFaltante(a.id)
                            return
                          }
                          urlRehecha.current.add(a.id)
                          pr.refrescarUrl(a.id)
                        })
                        .catch(() => pr.marcarFaltante(a.id))
                    }}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{
                      // durante la transición por canvas se ocultan los videos del DOM y pinta
                      // el lienzo; pero el clip activo se deja visible por DEBAJO para tapar el
                      // instante en que el canvas todavía no dibujó su primer cuadro (si no, se
                      // veía un parpadeo negro justo al empezar la transición)
                      opacity: conLienzo ? (activo?.id === c.id ? 1 : 0) : opacidadDe(c),
                      transform,
                      transformOrigin: 'center',
                      clipPath,
                      maskImage: recEstilo.maskImage,
                      WebkitMaskImage: recEstilo.WebkitMaskImage,
                      // el filtro de color nunca se suaviza: al arrastrar un
                      // deslizador de tono (exposición, contraste, temperatura...) o
                      // regular un efecto, el cambio tiene que verse pegado al cursor,
                      // no arrastrarse un tercio de segundo por detrás. el único
                      // suavizado que queda es el del transform, y solo durante la
                      // aparición progresiva del clip, que es una animación automática
                      // suya. cuando el usuario mueve, gira o escala el elemento a mano
                      // (desde el visor o desde un deslizador) responde uno a uno
                      transition: mezclaEfecto.animando
                        ? 'transform 320ms cubic-bezier(0.34, 1.2, 0.64, 1)'
                        : undefined,
                      filter: (() => {
                        const partes: string[] = []
                        // color y desenfoque de movimiento van juntos en el filtro
                        // svg del clip; sin ellos no hace falta esa parte
                        if (!esTonoNeutro(mezclaEfecto.tono) || hayEfectoFiltro(mezclaEfecto.efectos)) {
                          partes.push(filtroCss(mezclaEfecto.tono, `tono-${c.id}`, mezclaEfecto.efectos))
                        }
                        const css = cssEfectos(mezclaEfecto.efectos)
                        if (css) partes.push(css)
                        // la nitidez y el brillo se enganchan al final, en su propio
                        // filtro, para que afilen y hagan resplandecer lo ya corregido
                        if (paramsNB(mezclaEfecto.efectos)) partes.push(`url(#nb-${c.id})`)
                        // la curvatura de lente va la última: dobla el resultado ya
                        // corregido y afilado, como haría el cristal de la cámara
                        if (paramsGoPro(mezclaEfecto.efectos)) partes.push(`url(#gopro-${c.id})`)
                        // la aberración cromática cierra la cadena: corre los canales de color
                        // sobre lo que ya salió de todo lo anterior
                        if (paramsCromatico(mezclaEfecto.efectos)) partes.push(`url(#cromatico-${c.id})`)
                        return partes.join(' ') || undefined
                      })(),
                    }}
                  />
                  </Fragment>
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
              {/* texturas animadas del clip (grano, cine viejo, vhs, destellos), encima
                  del video */}
              <canvas
                ref={animCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {/* líneas de neón del impacto de contorno, por encima de todo lo demás */}
              <canvas
                ref={contornoCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {/* manchas del impacto de inversión: el modo diferencia hace que sus blobs
                  inviertan el color de todo lo que tienen debajo */}
              <canvas
                ref={manchasCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
                style={{ mixBlendMode: 'difference' }}
              />
            </div>

            {filtrosClip.length > 0 && (
              <svg className="absolute h-0 w-0">
                <defs>
                  {filtrosClip.map(({ clip: c, tono, efectos }) => {
                    const tablas = tablasColor(tono)
                    const desenfoques = stdDeviationsDesenfoque(efectos)
                    const nb = paramsNB(efectos)
                    const gopro = paramsGoPro(efectos)
                    const cromatico = paramsCromatico(efectos)
                    return (
                      <Fragment key={c.id}>
                      {nb && (
                        <filter id={`nb-${c.id}`} colorInterpolationFilters="sRGB">
                          {nodosFiltroNB(nb).map((n, i) => pintarNodoNB(n, i))}
                        </filter>
                      )}
                      {gopro && (
                        // primitiveUnits en fracción del elemento: la curvatura se ve
                        // igual en el visor pequeño y en el archivo a resolución completa
                        <filter id={`gopro-${c.id}`} primitiveUnits="objectBoundingBox">
                          {nodosFiltroGoPro(gopro).map((n, i) => pintarNodoNB(n, i))}
                        </filter>
                      )}
                      {cromatico && (
                        // el corrimiento de canales va en fracción del elemento, como la curvatura,
                        // para verse igual en el visor y en el archivo
                        <filter id={`cromatico-${c.id}`} primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
                          {nodosFiltroCromatico(cromatico).map((n, i) => pintarNodoNB(n, i))}
                        </filter>
                      )}
                      <filter id={`tono-${c.id}`} colorInterpolationFilters="sRGB">
                        {usaMatriz(tono) && (
                          <feColorMatrix type="matrix" values={matrizTono(tono)} />
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
                        {/* la nitidez del tono cierra la cadena: afila o ablanda lo ya corregido */}
                        {usaNitidez(tono) && nodosNitidez(tono).map((n, i) => pintarNodoNB(n, i))}
                      </filter>
                      </Fragment>
                    )
                  })}
                </defs>
              </svg>
            )}
            {/* los overlays quedan por encima del recorte: así se puede agarrar un
                tirador aunque el clip esté medio fuera del lienzo */}
            <ClipOverlay />
            <CapasOverlay />
            <RecorteOverlay />
            <MarcoOverlay alturaLienzo={lienzoRect.h} />
            <CuentaRegresiva />

            {/* el video del clip visible ya no está en el equipo: en lugar de dejar el
                lienzo en negro (y llenar la consola de errores intentando cargarlo), se
                avisa claro de que hay que volver a importarlo */}
            {activoFaltante && (
              <div
                className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 px-6 text-center"
                style={{ background: 'rgb(9 14 24 / 0.82)' }}
              >
                <Icon name="alerta" size={30} className="text-amber-400" />
                <p className="text-sm font-semibold text-white">Video no encontrado</p>
                <p className="max-w-xs text-[12px] leading-relaxed text-white/70">
                  El archivo se borró de tu equipo. Vuelve a importarlo desde el panel de medios para verlo.
                </p>
              </div>
            )}

            {/* velo del impacto (flash a negro, a blanco o de color) por encima de
                todo lo que se ve, incluidas las imágenes y textos de delante */}
            {imp.veloOpacidad > 0 && (
              <div
                className="pointer-events-none absolute inset-0 z-40"
                style={{ background: imp.veloColor, opacity: imp.veloOpacidad }}
              />
            )}

            {/* velo de una transición que abre o cierra un clip contra el fondo (fundido
                a negro o a blanco, flash): va por encima de TODO, así que tapa también la
                censura, el texto y las figuras, no solo el video */}
            {veloTransOpacidad > 0 && (
              <div
                className="pointer-events-none absolute inset-0 z-40"
                style={{ background: veloTransColor, opacity: veloTransOpacidad }}
              />
            )}

            {/* elementos de sonido de los audios importados. no se ven; solo
                suenan, sincronizados con el cabezal por el efecto de arriba */}
            {audios.map((a) => {
              const asset = assetPorId.get(a.assetId)
              if (!asset || asset.faltante) return null
              return (
                <audio
                  key={a.id}
                  ref={(el) => {
                    if (el) audiosRef.current.set(a.id, el)
                    else audiosRef.current.delete(a.id)
                  }}
                  src={asset.url}
                  preload="auto"
                />
              )
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
