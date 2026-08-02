import { Clip, PistaMeta } from '../../types/timeline'
import { Capa } from '../../types/layers'
import { Impacto } from '../../types/impacto'
import { Marco } from '../../types/marco'
import { RegionAudio, ClipAudio } from '../../types/audio'
import { clipEnTiempo, duracionProyecto } from '../timeline/clips'
import { gananciaEn, fundidoAudioEn } from '../audio/ganancia'
import { usaMatriz, matrizTono, tablasColor, stdDeviationsDesenfoque } from '../color/tono'
import { mezclarTono, mezclarEfectos, mixEntradaEfecto } from '../color/mezcla'
import { paramsNB, nodosFiltroNB, NodoFiltro } from '../efectos/nitidezBrillo'
import { paramsGoPro, nodosFiltroGoPro } from '../efectos/goPro'
import { dibujarFotograma, Escena } from './compositor'

export interface DatosExport {
  ancho: number
  alto: number
  fps: number // imágenes por segundo del archivo final
  // cuánto se comprime el video. no toca la resolución, solo cuántos bits se gastan por la misma
  // imagen. si no viene, se asume 'equilibrada'
  compresion?: NivelCompresion
  colorFondo: string
  fondo?: 'color' | 'desenfoque'
  desenfoqueFondo?: number
  fondoGiro?: number
  clips: Clip[]
  capas: Capa[]
  impactos: Impacto[]
  marco: Marco
  audioRegiones: RegionAudio[]
  // audios importados sueltos en la pista de sonido, con su propio material
  audios: ClipAudio[]
  volumenGlobal: number
  // metadatos por nivel: se usan para saltar los ocultos al elegir el clip
  // visible y para callar los silenciados en la mezcla
  pistasMeta: PistaMeta[]
  urlDeAsset: (assetId: string) => string | undefined
  // el archivo real (File) de cada medio. la exportación lo usa DIRECTO, sin pasar por la
  // object URL: esa URL puede quedar revocada mientras la app sigue viva (el <video> del visor
  // guarda su propia referencia y sigue reproduciendo, pero un fetch de la URL da
  // ERR_FILE_NOT_FOUND y colgaba la exportación en "leyendo el video"). el File nunca caduca
  fileDeAsset: (assetId: string) => Blob | undefined
}

// aviso de avance de la exportación: la fracción hecha (0 a 1) y, opcionalmente, una nota de
// qué se está haciendo en ese momento (preparando, codificando tal segundo, añadiendo el audio…),
// para que el diálogo no solo muestre un porcentaje seco sino algo vivo y con contexto
export type OnProgreso = (v: number, detalle?: string) => void

// formatea un instante en segundos a m:ss, para las notas de avance
export function relojExport(s: number): string {
  const t = Math.max(0, Math.floor(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export interface ControlExport {
  promesa: Promise<Blob>
  cancelar: () => void
  // el mismo lienzo en el que se va dibujando cada fotograma. el diálogo lo mete
  // en pantalla para enseñar por dónde va la exportación. no lleva sonido: el
  // audio va por su propio camino hacia la grabadora, así que mostrarlo es mudo
  lienzo: HTMLCanvasElement
}

// elige el mejor formato de contenedor que soporte el navegador
export function elegirMime(): string {
  const candidatos = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const m of candidatos) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
  }
  return 'video/webm'
}

// nivel de compresión que elige el usuario. no cambia la resolución (eso es "calidad"): cambia
// cuántos bits se gastan por la MISMA imagen. menos compresión = más fiel y más pesado
export type NivelCompresion = 'alta' | 'equilibrada' | 'comprimida'

// QP (cuantizador) para el modo de CALIDAD CONSTANTE de WebCodecs, que es lo que hace un compresor
// tipo CRF: en vez de fijar un bitrate, fija una calidad y gasta bits solo donde hacen falta, así el
// archivo pesa mucho menos a la misma vista. menor QP = mejor calidad y más peso. los keyframes van
// con un QP algo menor para anclar mejor la imagen. rango del H.264: 0 (sin pérdida) a 51 (mínimo)
export function qpDeNivel(nivel: NivelCompresion): { qp: number; qpKey: number } {
  if (nivel === 'alta') return { qp: 28, qpKey: 24 }
  if (nivel === 'comprimida') return { qp: 38, qpKey: 32 }
  return { qp: 33, qpKey: 28 } // equilibrada
}

// bits por píxel de respaldo cuando el navegador NO soporta calidad constante: se usa un VBR con
// esta densidad. son valores muy por debajo del 0.27 de antes, que era el que inflaba el archivo
function bppDeNivel(nivel: NivelCompresion): number {
  if (nivel === 'alta') return 0.14
  if (nivel === 'comprimida') return 0.045
  return 0.08 // equilibrada
}

// bits por segundo de video para el modo por bitrate (VBR, respaldo cuando no hay calidad constante).
// sube con los píxeles y con los fps, con una densidad sana según la compresión. se topa en 40 Mbps
export function bitrateVideo(ancho: number, alto: number, fps = 30, nivel: NivelCompresion = 'equilibrada'): number {
  return Math.min(40_000_000, Math.round(ancho * alto * fps * bppDeNivel(nivel)))
}

// densidad para ESTIMAR el peso en el diálogo. va bastante por debajo del bitrate del respaldo porque
// casi siempre se codifica por calidad constante (QP), que gasta muchísimos menos bits que un VBR a
// tope: un video corriente a QP equilibrado ronda estos valores. sigue siendo aproximado (el tamaño
// real depende del movimiento: uno muy quieto pesa aún menos), pero ya no dispara un número enorme
function bppEstimado(nivel: NivelCompresion): number {
  if (nivel === 'alta') return 0.08
  if (nivel === 'comprimida') return 0.018
  return 0.035 // equilibrada
}

// peso estimado en bits por segundo, pensado para el número que muestra el diálogo. usa la densidad
// de la codificación por calidad constante, que es como se exporta de verdad casi siempre
export function bitrateEstimado(ancho: number, alto: number, fps = 30, nivel: NivelCompresion = 'equilibrada'): number {
  return Math.round(ancho * alto * fps * bppEstimado(nivel))
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagen'))
    img.src = src
  })
}

function cargarVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.src = src
    v.preload = 'auto'
    v.crossOrigin = 'anonymous'
    v.onloadeddata = () => resolve(v)
    v.onerror = () => reject(new Error('video'))
  })
}

function cargarAudio(src: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const a = document.createElement('audio')
    a.src = src
    a.preload = 'auto'
    a.crossOrigin = 'anonymous'
    a.onloadeddata = () => resolve(a)
    a.onerror = () => reject(new Error('audio'))
  })
}

// exporta el proyecto a un archivo de video. reproduce la línea de tiempo en
// tiempo real dibujando cada fotograma en un canvas a la resolución del
// proyecto, mezcla el audio con Web Audio y lo graba todo junto
export function exportarProyecto(datos: DatosExport, onProgreso: OnProgreso): ControlExport {
  let cancelado = false
  let raf = 0
  const limpiezas: (() => void)[] = []
  // se crea acá fuera para poder devolverlo de inmediato, antes de que arranque
  // el trabajo, y que el diálogo pueda enseñarlo desde el primer fotograma
  const canvas = document.createElement('canvas')

  const cancelar = () => {
    cancelado = true
    cancelAnimationFrame(raf)
    limpiezas.forEach((f) => f())
  }

  const promesa = new Promise<Blob>((resolve, reject) => {
    ;(async () => {
      const { ancho, alto } = datos
      const clips = [...datos.clips].sort((a, b) => a.inicio - b.inicio)
      // niveles escondidos y silenciados, resueltos una sola vez. el visible se
      // elige ignorando los ocultos y el audio se apaga si el clip que suena cae
      // en un nivel silenciado, exactamente el criterio del visor
      const ocultas = new Set<number>()
      datos.pistasMeta.forEach((m, i) => {
        if (m.oculta) ocultas.add(i)
      })
      const total = duracionProyecto(clips, datos.capas, datos.audios, datos.audioRegiones)
      if (total <= 0) {
        reject(new Error('No hay nada que exportar.'))
        return
      }

      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo preparar el lienzo.'))
        return
      }
      const off = document.createElement('canvas')


      // arma (o rearma) el filtro de color de un clip a partir de un tono. se usa
      // en el montaje y, para los clips con aparición progresiva, en cada cuadro
      const NS = 'http://www.w3.org/2000/svg'
      const construirFiltroTono = (id: string, tono: typeof clips[number]['tono']) => {
        if (!usaMatriz(tono)) return null
        const filtro = document.createElementNS(NS, 'filter')
        filtro.setAttribute('id', id)
        filtro.setAttribute('color-interpolation-filters', 'sRGB')
        const fe = document.createElementNS(NS, 'feColorMatrix')
        fe.setAttribute('type', 'matrix')
        fe.setAttribute('values', matrizTono(tono))
        filtro.appendChild(fe)
        const tablas = tablasColor(tono)
        if (tablas) {
          const trans = document.createElementNS(NS, 'feComponentTransfer')
          ;(['feFuncR', 'feFuncG', 'feFuncB'] as const).forEach((nombre, i) => {
            const fn = document.createElementNS(NS, nombre)
            fn.setAttribute('type', 'table')
            fn.setAttribute('tableValues', tablas[i])
            trans.appendChild(fn)
          })
          filtro.appendChild(trans)
        }
        return filtro
      }
      const construirFiltroBlur = (id: string, efectos: typeof clips[number]['efectos']) => {
        const desenfoques = stdDeviationsDesenfoque(efectos ?? [])
        if (!desenfoques.length) return null
        const filtroB = document.createElementNS(NS, 'filter')
        filtroB.setAttribute('id', id)
        filtroB.setAttribute('color-interpolation-filters', 'sRGB')
        desenfoques.forEach((sd) => {
          const blur = document.createElementNS(NS, 'feGaussianBlur')
          blur.setAttribute('stdDeviation', sd)
          blur.setAttribute('edgeMode', 'duplicate')
          filtroB.appendChild(blur)
        })
        return filtroB
      }
      // pinta un nodo del grafo de nitidez y brillo (con sus hijos) como elemento del
      // dom. es la misma receta en datos que usa el visor, así el archivo sale igual
      const construirNodoNB = (n: NodoFiltro): Element => {
        const el = document.createElementNS(NS, n.tag)
        for (const [k, v] of Object.entries(n.attrs)) el.setAttribute(k, v)
        n.children?.forEach((h) => el.appendChild(construirNodoNB(h)))
        return el
      }
      const construirFiltroNB = (id: string, efectos: typeof clips[number]['efectos']) => {
        const p = paramsNB(efectos ?? [])
        if (!p) return null
        const filtro = document.createElementNS(NS, 'filter')
        filtro.setAttribute('id', id)
        filtro.setAttribute('color-interpolation-filters', 'sRGB')
        nodosFiltroNB(p).forEach((n) => filtro.appendChild(construirNodoNB(n)))
        return filtro
      }
      // filtro de la curvatura de lente. usa la misma receta en datos que el visor y,
      // como aquel, mide la escala en fracción del elemento (objectBoundingBox), así
      // el archivo se curva igual que la vista previa
      const construirFiltroGoPro = (id: string, efectos: typeof clips[number]['efectos']) => {
        const p = paramsGoPro(efectos ?? [])
        if (!p) return null
        const filtro = document.createElementNS(NS, 'filter')
        filtro.setAttribute('id', id)
        filtro.setAttribute('primitiveUnits', 'objectBoundingBox')
        nodosFiltroGoPro(p).forEach((n) => filtro.appendChild(construirNodoNB(n)))
        return filtro
      }

      // filtros svg de tono (temperatura y tinte) referenciados por el compositor
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('style', 'position:absolute;width:0;height:0')
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      // los clips con aparición progresiva de color/efectos rehacen sus defs en
      // cada cuadro, así que se apuntan aquí para actualizarlos en el bucle
      const clipsConEntradaEfecto = clips.filter((c) => c.transicionEfecto && c.transicionEfecto > 0)
      clips.forEach((c) => {
        const fTono = construirFiltroTono(`tonoexp-${c.id}`, c.tono)
        if (fTono) defs.appendChild(fTono)
        const fBlur = construirFiltroBlur(`blurexp-${c.id}`, c.efectos)
        if (fBlur) defs.appendChild(fBlur)
        const fNB = construirFiltroNB(`nbexp-${c.id}`, c.efectos)
        if (fNB) defs.appendChild(fNB)
        const fGP = construirFiltroGoPro(`goproexp-${c.id}`, c.efectos)
        if (fGP) defs.appendChild(fGP)
      })

      // rehace las defs de un clip con el tono y los efectos ya mezclados por su
      // factor de aparición en el instante dado. quita las anteriores por id y
      // vuelve a crearlas, para que el color de matriz (temperatura, ruedas,
      // curvas) también anime, no solo las funciones nativas
      const refrescarDefsEfecto = (t: number) => {
        for (const c of clipsConEntradaEfecto) {
          const mix = mixEntradaEfecto(c.inicio, c.transicionEfecto, t)
          defs.querySelector(`#tonoexp-${c.id}`)?.remove()
          defs.querySelector(`#blurexp-${c.id}`)?.remove()
          defs.querySelector(`#nbexp-${c.id}`)?.remove()
          defs.querySelector(`#goproexp-${c.id}`)?.remove()
          const fTono = construirFiltroTono(`tonoexp-${c.id}`, mezclarTono(c.tono, mix))
          if (fTono) defs.appendChild(fTono)
          const efectosMix = mezclarEfectos(c.efectos ?? [], mix)
          const fBlur = construirFiltroBlur(`blurexp-${c.id}`, efectosMix)
          if (fBlur) defs.appendChild(fBlur)
          const fNB = construirFiltroNB(`nbexp-${c.id}`, efectosMix)
          if (fNB) defs.appendChild(fNB)
          const fGP = construirFiltroGoPro(`goproexp-${c.id}`, efectosMix)
          if (fGP) defs.appendChild(fGP)
        }
      }
      // las imágenes de capa también corrigen color por el mismo camino que los
      // clips: si usan temperatura, tinte, ruedas o curvas, arman su propio
      // filtro svg con la matriz y las tablas por canal, referenciado por el id
      // que espera el compositor
      datos.capas.forEach((c) => {
        if (c.tipo !== 'imagen' || !c.tono || !usaMatriz(c.tono)) return
        const filtro = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
        filtro.setAttribute('id', `tono-img-exp-${c.id}`)
        filtro.setAttribute('color-interpolation-filters', 'sRGB')

        const fe = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix')
        fe.setAttribute('type', 'matrix')
        fe.setAttribute('values', matrizTono(c.tono))
        filtro.appendChild(fe)

        const tablas = tablasColor(c.tono)
        if (tablas) {
          const trans = document.createElementNS('http://www.w3.org/2000/svg', 'feComponentTransfer')
          ;(['feFuncR', 'feFuncG', 'feFuncB'] as const).forEach((nombre, i) => {
            const fn = document.createElementNS('http://www.w3.org/2000/svg', nombre)
            fn.setAttribute('type', 'table')
            fn.setAttribute('tableValues', tablas[i])
            trans.appendChild(fn)
          })
          filtro.appendChild(trans)
        }
        defs.appendChild(filtro)
      })

      svg.appendChild(defs)
      document.body.appendChild(svg)
      limpiezas.push(() => svg.remove())

      try {
        // precarga de imágenes de capa
        const imagenes = new Map<string, HTMLImageElement>()
        await Promise.all(
          datos.capas
            .filter((c) => c.tipo === 'imagen')
            .map(async (c) => {
              if (c.tipo === 'imagen') imagenes.set(c.id, await cargarImagen(c.src))
            }),
        )

        // una object URL FRESCA a partir del archivo real de cada medio, en vez de la que
        // guarda el proyecto (que puede estar revocada y da ERR_FILE_NOT_FOUND). se crean aquí
        // y se revocan al terminar para no filtrar memoria. si no hubiera archivo, cae a la url
        const urlsCreadas: string[] = []
        const urlFresca = (assetId: string): string | undefined => {
          const f = datos.fileDeAsset(assetId)
          if (f) {
            const u = URL.createObjectURL(f)
            urlsCreadas.push(u)
            return u
          }
          return datos.urlDeAsset(assetId)
        }
        limpiezas.push(() => urlsCreadas.forEach((u) => URL.revokeObjectURL(u)))

        // un video independiente por clip para poder buscar sin interferencias
        const videos = new Map<string, HTMLVideoElement>()
        await Promise.all(
          clips.map(async (c) => {
            const url = urlFresca(c.assetId)
            if (url) videos.set(c.id, await cargarVideo(url))
          }),
        )
        limpiezas.push(() => videos.forEach((v) => v.pause()))
        if (cancelado) return

        // grafo de audio hacia un destino de stream
        const ctxAudio = new AudioContext()
        const destino = ctxAudio.createMediaStreamDestination()
        const ganancia = ctxAudio.createGain()
        ganancia.connect(destino)
        const cableados = new Set<string>()
        limpiezas.push(() => ctxAudio.close().catch(() => {}))
        await ctxAudio.resume().catch(() => {})

        // audios importados: cada uno se enruta por su propio nodo de ganancia
        // hacia el mismo destino que graba la mezcla, con su volumen ya aplicado
        const audiosEl = new Map<string, HTMLAudioElement>()
        // el nodo de ganancia de cada audio se guarda aparte porque su valor deja
        // de ser fijo: el fundido lo cambia en cada fotograma
        const gananciasAudio = new Map<string, GainNode>()
        for (const a of datos.audios) {
          const url = urlFresca(a.assetId)
          if (!url) continue
          try {
            const el = await cargarAudio(url)
            const fuente = ctxAudio.createMediaElementSource(el)
            const g = ctxAudio.createGain()
            g.gain.value = a.volumen * datos.volumenGlobal
            fuente.connect(g)
            g.connect(destino)
            audiosEl.set(a.id, el)
            gananciasAudio.set(a.id, g)
          } catch {
            // si un audio no carga, la exportación sigue sin él
          }
        }
        limpiezas.push(() => audiosEl.forEach((el) => el.pause()))

        // stream de video del canvas + audio mezclado
        const streamVideo = canvas.captureStream(datos.fps)
        const stream = new MediaStream([
          ...streamVideo.getVideoTracks(),
          ...destino.stream.getAudioTracks(),
        ])
        const mime = elegirMime()
        const grabadora = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: bitrateVideo(ancho, alto, datos.fps, datos.compresion),
        })
        const trozos: BlobPart[] = []
        grabadora.ondataavailable = (e) => {
          if (e.data.size) trozos.push(e.data)
        }
        grabadora.onstop = () => {
          limpiezas.forEach((f) => f())
          if (cancelado) return
          resolve(new Blob(trozos, { type: mime }))
        }

        const phRef = { t: 0 }
        grabadora.start()

        const cablear = (id: string, v: HTMLVideoElement) => {
          if (cableados.has(id)) return
          try {
            ctxAudio.createMediaElementSource(v).connect(ganancia)
            cableados.add(id)
          } catch {
            // ya enrutado
          }
        }

        // coloca cada audio importado en el segundo que le toca y lo reproduce o
        // lo calla según si el instante actual cae dentro de su tramo
        const sincronizarAudios = (t: number) => {
          datos.audios.forEach((a) => {
            const el = audiosEl.get(a.id)
            if (!el) return
            const dentro = t >= a.inicio && t < a.inicio + a.duracion
            if (!dentro) {
              if (!el.paused) el.pause()
              return
            }
            // el fundido se recalcula en cada instante, igual que hace el visor
            const g = gananciasAudio.get(a.id)
            if (g) {
              g.gain.value =
                a.volumen *
                datos.volumenGlobal *
                fundidoAudioEn(t, a.inicio, a.duracion, a.fundidoEntrada, a.fundidoSalida)
            }
            const objetivo = a.recorteInicio + (t - a.inicio)
            if (Math.abs(el.currentTime - objetivo) > 0.25) el.currentTime = objetivo
            if (el.paused) el.play().catch(() => {})
          })
        }

        const paso = () => {
          if (cancelado) return
          const t = phRef.t
          sincronizarAudios(t)
          if (t >= total) {
            dibujarFotograma(ctx, escena(), Math.max(0, total - 0.001), (id) => videos.get(id) ?? null, (id) => imagenes.get(id), off)
            onProgreso(1)
            grabadora.stop()
            return
          }
          const act = clipEnTiempo(clips, t, ocultas)
          if (!act) {
            phRef.t = Math.min(t + 0.033, total)
            dibujarFotograma(ctx, escena(), t, (id) => videos.get(id) ?? null, (id) => imagenes.get(id), off)
            raf = requestAnimationFrame(paso)
            return
          }
          const v = videos.get(act.id)
          if (!v) {
            raf = requestAnimationFrame(paso)
            return
          }
          videos.forEach((otro, id) => {
            if (id !== act.id && !otro.paused) otro.pause()
          })
          cablear(act.id, v)
          // un nivel silenciado, o un clip con su audio separado, no aporta sonido
          const silenciada =
            (datos.pistasMeta[act.pista]?.silenciada ?? false) || !!act.mudo || !!act.silenciado
          // el volumen propio del clip multiplica a la ganancia, igual que en el
          // visor, para que lo exportado suene exactamente como se oía al montar
          ganancia.gain.value = silenciada
            ? 0
            : gananciaEn(datos.audioRegiones, datos.volumenGlobal, t) *
              (act.volumen ?? 1) *
              fundidoAudioEn(t, act.inicio, act.duracion, act.fundidoEntrada, act.fundidoSalida)
          v.playbackRate = act.velocidad
          if (v.paused) {
            try {
              v.currentTime = act.recorteInicio + (t - act.inicio) * act.velocidad
            } catch {
              // sin metadatos aún
            }
            v.play().catch(() => {})
          }
          const finUso = act.recorteInicio + act.duracion * act.velocidad
          if (v.currentTime >= finUso - 0.02) {
            v.pause()
            phRef.t = Math.min(act.inicio + act.duracion, total)
          } else {
            phRef.t = Math.min(act.inicio + (v.currentTime - act.recorteInicio) / act.velocidad, total)
          }

          // antes de pintar, se ponen al día las defs de color de los clips cuya
          // corrección aparece progresivamente, para el instante actual
          if (clipsConEntradaEfecto.length) refrescarDefsEfecto(phRef.t)
          dibujarFotograma(ctx, escena(), phRef.t, (id) => videos.get(id) ?? null, (id) => imagenes.get(id), off)
          onProgreso(Math.min(0.999, phRef.t / total), `Grabando · ${relojExport(phRef.t)} / ${relojExport(total)}`)
          raf = requestAnimationFrame(paso)
        }

        const escena = (): Escena => ({
          ancho,
          alto,
          colorFondo: datos.colorFondo,
          fondo: datos.fondo,
          desenfoqueFondo: datos.desenfoqueFondo,
          fondoGiro: datos.fondoGiro,
          clips,
          capas: datos.capas,
          impactos: datos.impactos,
          marco: datos.marco,
          ocultas,
        })

        raf = requestAnimationFrame(paso)
      } catch (err) {
        limpiezas.forEach((f) => f())
        reject(err instanceof Error ? err : new Error('Error al exportar.'))
      }
    })()
  })

  return { promesa, cancelar, lienzo: canvas }
}
