import { DatosExport } from './exportar'
import { gananciaEn, fundidoAudioEn } from '../audio/ganancia'

const SR = 48_000

// decodifica el audio de un archivo (un video trae su pista dentro; un audio es todo
// audio) a un AudioBuffer. si no tiene pista de sonido o no se puede decodificar, null
async function decodificar(ctx: BaseAudioContext, blob: Blob): Promise<AudioBuffer | null> {
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer())
  } catch {
    return null
  }
}

// mezcla todo el audio del proyecto (el de los clips de video más los audios importados,
// con sus volúmenes, franjas de ganancia y fundidos) en un solo AudioBuffer, renderizado
// con OfflineAudioContext (más rápido que en tiempo real). replica el mismo grafo que la
// exportación clásica para que suene igual. devuelve null si no hay nada que oír
export async function mezclarAudio(datos: DatosExport, total: number): Promise<AudioBuffer | null> {
  const largo = Math.ceil(total * SR)
  if (largo <= 0) return null
  const ctx = new OfflineAudioContext(2, largo, SR)

  // cada asset se descarga y decodifica una vez; se reparte entre los clips del mismo medio
  const cache = new Map<string, AudioBuffer | null>()
  const bufferDe = async (assetId: string): Promise<AudioBuffer | null> => {
    if (cache.has(assetId)) return cache.get(assetId) ?? null
    const url = datos.urlDeAsset(assetId)
    const buf = url ? await decodificar(ctx, await (await fetch(url)).blob()) : null
    cache.set(assetId, buf)
    return buf
  }

  let algo = false
  const DT = 1 / 60 // cada cuánto se recalcula la ganancia (automatización de la curva)

  // coloca una fuente en la línea de tiempo con su curva de ganancia. gananciaEnT da el
  // valor en cada instante de la línea (no de la fuente), igual que el grafo en vivo
  const programar = (
    buf: AudioBuffer,
    inicio: number,
    duracion: number,
    offsetFuente: number,
    velocidad: number,
    gananciaEnT: (t: number) => number,
  ) => {
    const fin = inicio + duracion
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = velocidad
    const g = ctx.createGain()
    for (let tt = inicio; tt < fin; tt += DT) {
      g.gain.setValueAtTime(Math.max(0, gananciaEnT(tt)), tt)
    }
    g.gain.setValueAtTime(Math.max(0, gananciaEnT(fin)), fin)
    src.connect(g).connect(ctx.destination)
    src.start(inicio, Math.max(0, offsetFuente))
    src.stop(fin)
    algo = true
  }

  // clips de video: aportan su audio salvo que el nivel esté silenciado, el clip esté
  // en mudo o tenga su audio separado a la pista de sonido
  for (const c of datos.clips) {
    const silenciada = (datos.pistasMeta[c.pista]?.silenciada ?? false) || !!c.mudo || !!c.silenciado
    if (silenciada) continue
    const buf = await bufferDe(c.assetId)
    if (!buf) continue
    programar(
      buf,
      c.inicio,
      c.duracion,
      c.recorteInicio,
      c.velocidad,
      (t) =>
        gananciaEn(datos.audioRegiones, datos.volumenGlobal, t) *
        (c.volumen ?? 1) *
        fundidoAudioEn(t, c.inicio, c.duracion, c.fundidoEntrada, c.fundidoSalida),
    )
  }

  // audios importados: su volumen propio por el general del proyecto, con su fundido. las
  // franjas de ganancia no los tocan, igual que en el grafo en vivo
  for (const a of datos.audios) {
    const buf = await bufferDe(a.assetId)
    if (!buf) continue
    programar(
      buf,
      a.inicio,
      a.duracion,
      a.recorteInicio,
      1,
      (t) => (a.volumen ?? 1) * datos.volumenGlobal * fundidoAudioEn(t, a.inicio, a.duracion, a.fundidoEntrada, a.fundidoSalida),
    )
  }

  if (!algo) return null
  return ctx.startRendering()
}
