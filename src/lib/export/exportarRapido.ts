import { DatosExport, ControlExport, bitrateVideo, OnProgreso, relojExport } from './exportar'
import { Escena, dibujarFotograma } from './compositor'
import { clipEnTiempo, duracionProyecto } from '../timeline/clips'
import { anterior, posterior } from '../transiciones/pintar'
import { montarDefsColor } from './defsColor'
import { demuxVideo, VideoDemux } from './demux'
import { FuenteDecodificada } from './fuente'
import { EscritorVideo } from './muxRapido'
import { EscritorMedios } from './muxMedios'
import { mezclarAudio } from './audioOffline'
import { hayFiltrosExport, montarFiltrosExport, fuerzaSuavizado, dentroDelTramo } from './filtrosExport'
import { reducirRuidoAudio } from './ruidoAudio'
import { Clip } from '../../types/timeline'

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagen'))
    img.src = src
  })
}

// exportación rápida: decodifica cada video con WebCodecs (mucho más veloz que a 1x),
// compone cada cuadro con el mismo motor que el visor y lo codifica con WebCodecs + un
// muxer, sin pasar por <video> ni MediaRecorder. el resultado es el mismo archivo que la
// ruta clásica, pero en una fracción del tiempo. de momento solo escribe el video; el
// audio se añade en el siguiente paso
export function exportarRapido(
  datos: DatosExport,
  onProgreso: OnProgreso,
  opciones?: { preferirSoftware?: boolean },
): ControlExport {
  const preferirSoftware = opciones?.preferirSoftware ?? false
  const { ancho, alto, fps } = datos
  // el lienzo se crea ya para devolverlo enseguida: el diálogo lo enseña como vista del
  // avance, igual que en la ruta clásica
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const señal = { cancelado: false }
  const cancelar = () => {
    señal.cancelado = true
  }

  const promesa = correr()
  return { promesa, cancelar, lienzo: canvas }

  async function correr(): Promise<Blob> {
  const clips = [...datos.clips].sort((a, b) => a.inicio - b.inicio)
  const ocultas = new Set<number>()
  datos.pistasMeta.forEach((m, i) => {
    if (m.oculta) ocultas.add(i)
  })
  const total = duracionProyecto(clips, datos.capas, datos.audios, datos.audioRegiones)
  if (total <= 0) throw new Error('No hay nada que exportar.')
  onProgreso(0, 'Preparando el video…')

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar el lienzo.')
  const off = document.createElement('canvas')
  // lienzo aparte para las pasadas de mejoras, para no pisar el que usa el compositor
  const offFx = document.createElement('canvas')
  const fx = hayFiltrosExport(datos.filtros) ? montarFiltrosExport(datos.filtros!) : null

  const defs = montarDefsColor(clips, datos.capas)
  const fuentes = new Map<string, FuenteDecodificada>()
  const limpiar = () => {
    defs.quitar()
    fuentes.forEach((f) => f.cerrar())
    fx?.quitar()
  }

  try {
    // imágenes de las capas
    const imagenes = new Map<string, HTMLImageElement>()
    await Promise.all(
      datos.capas
        .filter((c) => c.tipo === 'imagen')
        .map(async (c) => {
          if (c.tipo === 'imagen') imagenes.set(c.id, await cargarImagen(c.src))
        }),
    )

    // helpers de composición, definidos ya para poder pintar el primer fotograma antes de
    // terminar de leer todos los videos (la lectura es el paso lento)
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
    // el compositor solo le pide a la "fuente de video" su videoWidth/videoHeight y la
    // dibuja con drawImage; el lienzo del proveedor cumple ambas cosas, así que se pasa
    // como si fuera un <video> (el cast es a propósito, el runtime es correcto)
    const videoDe = (id: string) =>
      (fuentes.get(id)?.lienzo ?? null) as unknown as HTMLVideoElement | null
    const imagenDe = (id: string) => imagenes.get(id)

    // un proveedor de cuadros por clip. cada asset se desarma una sola vez y sus paquetes
    // se comparten entre los clips del mismo medio (cada clip con su propio decodificador,
    // porque cada uno va por un instante distinto). ya preparado no se rehace, así el primer
    // vistazo y el bucle no decodifican dos veces el mismo clip
    const demuxCache = new Map<string, VideoDemux>()
    const prepararFuente = async (c: Clip) => {
      if (fuentes.has(c.id)) return
      // el archivo real, tomado DIRECTO del medio; nada de fetch a una object URL que puede
      // estar revocada (era la causa del ERR_FILE_NOT_FOUND que dejaba la exportación clavada)
      const blob = datos.fileDeAsset(c.assetId)
      if (!blob) return
      let dem = demuxCache.get(c.assetId)
      if (!dem) {
        // leer y desarmar el archivo es lo que más tarda antes de arrancar, sobre todo con
        // videos pesados; se avisa para que el 0% no parezca colgado mientras tanto
        onProgreso(0, 'Leyendo el video…')
        dem = await demuxVideo(blob)
        demuxCache.set(c.assetId, dem)
      }
      fuentes.set(c.id, new FuenteDecodificada(dem.config, dem.chunks, preferirSoftware))
    }

    // primer vistazo: en cuanto el primer clip está listo se compone su fotograma inicial y se
    // deja pintado en el lienzo, para que la vista previa del diálogo muestre ese frame EDITADO
    // (con su color, capas y textos) en vez de un negro mientras se leen el resto de los videos.
    // si el vistazo falla por lo que sea, se salta sin tocar el resto de la exportación
    try {
      const clip0 = clipEnTiempo(clips, 0, ocultas) ?? clips[0]
      if (clip0) {
        await prepararFuente(clip0)
        const fu0 = fuentes.get(clip0.id)
        if (fu0) {
          await fu0.irAlSegundo(clip0.recorteInicio)
          defs.refrescar(0)
          dibujarFotograma(ctx, escena(), 0, videoDe, imagenDe, off)
          fx?.aplicar(ctx, canvas, offFx)
        }
      }
    } catch {
      // el vistazo es solo cosmético; que no impida exportar
    }

    // el resto de los clips (y el primero, si el vistazo no pudo con él) se preparan aquí
    for (const c of clips) await prepararFuente(c)

    // se mezcla todo el audio del proyecto en un solo buffer (rápido, con
    // OfflineAudioContext) antes de armar el escritor, que necesita saber si hay pista de
    // sonido para configurar el muxer
    let mezclaAudio = await mezclarAudio(datos, total)
    // si se pidió reducir el ruido del audio, se pasa la mezcla por RNNoise antes de codificarla. la
    // librería se carga solo aquí (import dinámico), así que no pesa nada si no se usa la mejora
    if (datos.filtros?.audioRuido && mezclaAudio) {
      onProgreso(0.97, 'Limpiando el audio…')
      mezclaAudio = await reducirRuidoAudio(mezclaAudio)
    }
    // bitrate objetivo igualado a la fuente (viene calculado desde el diálogo); si no llega, se cae a
    // una densidad por resolución. así el video sale con la misma calidad que el material original
    const bitrate = datos.bitrateObjetivo ?? bitrateVideo(ancho, alto, fps)
    const infoAudio = mezclaAudio
      ? { sampleRate: mezclaAudio.sampleRate, canales: mezclaAudio.numberOfChannels }
      : null
    // el mp4 con h264 sigue por el escritor de siempre (mp4-muxer), sin tocar nada. cualquier otro
    // contenedor (webm, mkv) o códec (h265, vp9) lo arma mediabunny, que comparte la misma interfaz
    const contenedor = datos.formato ?? 'mp4'
    const codec = datos.codecVideo ?? 'h264'
    const usarMediabunny = contenedor !== 'mp4' || codec !== 'h264'
    const escritor = usarMediabunny
      ? await EscritorMedios.crear(canvas, ancho, alto, fps, bitrate, contenedor, codec, infoAudio)
      : await EscritorVideo.crear(ancho, alto, fps, bitrate, infoAudio)

    // suavizado de movimiento: mezcla temporal. se guarda el cuadro anterior (ya terminado) y se pinta
    // una fracción sobre el actual, lo que deja una estela suave que reduce el salto entre cuadros
    const suav = fuerzaSuavizado(datos.filtros?.suavizar ?? 0)
    const frameAnterior = suav > 0 ? document.createElement('canvas') : null
    const antCtx = frameAnterior?.getContext('2d') ?? null
    let hayAnterior = false

    const totalFrames = Math.max(1, Math.round(total * fps))
    for (let f = 0; f < totalFrames; f++) {
      if (señal?.cancelado) throw new Error('Exportación cancelada.')
      // instante del cuadro. el último se recorta un pelo por debajo del total, igual que
      // el visor, para que el rango [inicio, fin) del último clip aún lo incluya
      const t = Math.min(f / fps, total - 0.0001)

      // se colocan los proveedores que este cuadro puede necesitar: el clip visible y, por
      // si hay transición, el de antes y el de después. cada uno en su instante de fuente,
      // acotado a su tramo (fuera de él se muestra su primer o último fotograma)
      const activo = clipEnTiempo(clips, t, ocultas)
      const necesarios = new Set<Clip>()
      if (activo) {
        necesarios.add(activo)
        const a = anterior(activo, clips)
        if (a) necesarios.add(a)
        const p = posterior(activo, clips)
        if (p) necesarios.add(p)
      }
      for (const c of necesarios) {
        const fu = fuentes.get(c.id)
        if (!fu) continue
        const s = c.recorteInicio + Math.max(0, Math.min(t - c.inicio, c.duracion)) * c.velocidad
        await fu.irAlSegundo(s)
      }

      defs.refrescar(t)
      dibujarFotograma(ctx, escena(), t, videoDe, imagenDe, off)
      // las mejoras de imagen solo se aplican si el instante cae dentro del tramo elegido (o siempre, si
      // no se acotó ninguno)
      if (dentroDelTramo(datos.filtros?.tramo, t)) {
        // mejoras sobre el cuadro ya compuesto (nitidez, etc.), antes de codificar
        fx?.aplicar(ctx, canvas, offFx)
        // mezcla temporal para suavizar el movimiento: una parte del cuadro anterior sobre el actual
        if (frameAnterior && antCtx) {
          if (hayAnterior) {
            ctx.globalAlpha = suav
            ctx.drawImage(frameAnterior, 0, 0)
            ctx.globalAlpha = 1
          }
          if (frameAnterior.width !== canvas.width) frameAnterior.width = canvas.width
          if (frameAnterior.height !== canvas.height) frameAnterior.height = canvas.height
          antCtx.clearRect(0, 0, frameAnterior.width, frameAnterior.height)
          antCtx.drawImage(canvas, 0, 0)
          hayAnterior = true
        }
      }
      await escritor.agregar(canvas, (f / fps) * 1_000_000)
      onProgreso(
        Math.min(0.97, f / totalFrames),
        `Codificando · ${relojExport(t)} / ${relojExport(total)} · cuadro ${f + 1} de ${totalFrames}`,
      )
    }

    // el audio ya mezclado se codifica al final; el muxer ordena video y audio por su
    // timestamp al empaquetar
    if (mezclaAudio) {
      onProgreso(0.98, 'Añadiendo el audio…')
      await escritor.escribirAudio(mezclaAudio)
    }
    onProgreso(0.99, 'Empaquetando el archivo…')

    const blob = await escritor.finalizar()
    onProgreso(1, 'Listo')
    return blob
  } finally {
    limpiar()
  }
  }
}
