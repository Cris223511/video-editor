import { Clip, PistaMeta } from '../../types/timeline'
import { Capa } from '../../types/layers'
import { Marco } from '../../types/marco'
import { RegionAudio, ClipAudio } from '../../types/audio'
import { clipEnTiempo, duracionTotal } from '../timeline/clips'
import { gananciaEn } from '../audio/ganancia'
import { usaMatriz, matrizTono, tablasColor, stdDeviationsDesenfoque } from '../color/tono'
import { dibujarFotograma, Escena } from './compositor'

export interface DatosExport {
  ancho: number
  alto: number
  fps: number // imágenes por segundo del archivo final
  colorFondo: string
  fondo?: 'color' | 'desenfoque'
  desenfoqueFondo?: number
  clips: Clip[]
  capas: Capa[]
  marco: Marco
  audioRegiones: RegionAudio[]
  // audios importados sueltos en la pista de sonido, con su propio material
  audios: ClipAudio[]
  volumenGlobal: number
  // metadatos por nivel: se usan para saltar los ocultos al elegir el clip
  // visible y para callar los silenciados en la mezcla
  pistasMeta: PistaMeta[]
  urlDeAsset: (assetId: string) => string | undefined
}

export interface ControlExport {
  promesa: Promise<Blob>
  cancelar: () => void
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

// bits por segundo de video que se le pide a la grabadora. la fórmula sube con
// la cantidad de píxeles pero se topa en 40 Mbps para no disparar el archivo en
// resoluciones altas. vive suelta acá para que el diálogo estime el peso con el
// mismo número que se usa al grabar, sin copiarlo a mano
export function bitrateVideo(ancho: number, alto: number): number {
  return Math.min(40_000_000, Math.round(ancho * alto * 8))
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
export function exportarProyecto(datos: DatosExport, onProgreso: (v: number) => void): ControlExport {
  let cancelado = false
  let raf = 0
  const limpiezas: (() => void)[] = []

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
      const total = duracionTotal(clips)
      if (total <= 0) {
        reject(new Error('No hay nada que exportar.'))
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo preparar el lienzo.'))
        return
      }
      const off = document.createElement('canvas')

      // filtros svg de tono (temperatura y tinte) referenciados por el compositor
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('style', 'position:absolute;width:0;height:0')
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      clips.forEach((c) => {
        const efectos = c.efectos ?? []
        const desenfoques = stdDeviationsDesenfoque(efectos)

        // filtro de color: temperatura, tinte, ruedas y curvas. va aparte del
        // desenfoque porque el compositor los aplica en pasadas distintas para
        // esquivar el fallo de ctx.filter que ennegrece el canvas al mezclar
        // funciones nativas con un desenfoque svg
        if (usaMatriz(c.tono)) {
          const filtro = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
          filtro.setAttribute('id', `tonoexp-${c.id}`)
          filtro.setAttribute('color-interpolation-filters', 'sRGB')

          const fe = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix')
          fe.setAttribute('type', 'matrix')
          fe.setAttribute('values', matrizTono(c.tono))
          filtro.appendChild(fe)

          // las ruedas de color viajan como curva por canal, igual que en el
          // visor, para que lo exportado coincida con lo que se vio al corregir
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
        }

        // filtro de solo desenfoque, con el mismo stdDeviation direccional que
        // calcula el visor. el compositor lo aplica en su propia pasada, tras el
        // color, de modo que el orden coincide con el del visor
        if (desenfoques.length) {
          const filtroB = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
          filtroB.setAttribute('id', `blurexp-${c.id}`)
          filtroB.setAttribute('color-interpolation-filters', 'sRGB')
          desenfoques.forEach((sd) => {
            const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
            blur.setAttribute('stdDeviation', sd)
            blur.setAttribute('edgeMode', 'duplicate')
            filtroB.appendChild(blur)
          })
          defs.appendChild(filtroB)
        }
      })
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

        // un video independiente por clip para poder buscar sin interferencias
        const videos = new Map<string, HTMLVideoElement>()
        await Promise.all(
          clips.map(async (c) => {
            const url = datos.urlDeAsset(c.assetId)
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
        for (const a of datos.audios) {
          const url = datos.urlDeAsset(a.assetId)
          if (!url) continue
          try {
            const el = await cargarAudio(url)
            const fuente = ctxAudio.createMediaElementSource(el)
            const g = ctxAudio.createGain()
            g.gain.value = a.volumen * datos.volumenGlobal
            fuente.connect(g)
            g.connect(destino)
            audiosEl.set(a.id, el)
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
          videoBitsPerSecond: bitrateVideo(ancho, alto),
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
          const silenciada = (datos.pistasMeta[act.pista]?.silenciada ?? false) || !!act.mudo
          ganancia.gain.value = silenciada
            ? 0
            : gananciaEn(datos.audioRegiones, datos.volumenGlobal, t)
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

          dibujarFotograma(ctx, escena(), phRef.t, (id) => videos.get(id) ?? null, (id) => imagenes.get(id), off)
          onProgreso(Math.min(0.999, phRef.t / total))
          raf = requestAnimationFrame(paso)
        }

        const escena = (): Escena => ({
          ancho,
          alto,
          colorFondo: datos.colorFondo,
          fondo: datos.fondo,
          desenfoqueFondo: datos.desenfoqueFondo,
          clips,
          capas: datos.capas,
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

  return { promesa, cancelar }
}
