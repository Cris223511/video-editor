// lectura de la onda real de un medio. la idea es decodificar el audio del
// archivo una sola vez (es costoso) y quedarse con un perfil de picos por tramos,
// de modo que dibujar la onda luego sea barato. como los medios del proyecto son
// blobs locales, decodeAudioData sobre su ArrayBuffer no topa con CORS ni con el
// aislamiento COOP/COEP del sitio

// cuántos picos se guardan por segundo de audio. cien tramos por segundo dan
// bastante detalle para barras finas sin inflar la memoria en videos largos
const PICOS_POR_SEGUNDO = 100

// perfil de picos ya calculado de un medio: la amplitud máxima (0..1) de cada
// tramo y a qué resolución se midió, para poder mapear un segundo a su tramo
export interface PerfilPicos {
  picos: Float32Array
  porSegundo: number
}

// una sola instancia de AudioContext para todas las decodificaciones; crear uno
// por archivo gasta recursos y algunos navegadores limitan cuántos se abren
let contexto: AudioContext | null = null
function audioContext(): AudioContext | null {
  if (contexto) return contexto
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  contexto = new Ctor()
  return contexto
}

// caché de perfiles por id de medio. la promesa se guarda tal cual para que dos
// bloques que pidan el mismo audio a la vez compartan una única decodificación
const cache = new Map<string, Promise<PerfilPicos | null>>()

// reduce el buffer decodificado a un pico por tramo. por cada tramo se toma la
// muestra de mayor amplitud (el pico), que es lo que da el contorno nervioso de
// una onda real; si hay varios canales se mezclan promediándolos
function perfilDesdeBuffer(buffer: AudioBuffer): PerfilPicos {
  const canales: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) canales.push(buffer.getChannelData(c))
  const muestrasPorTramo = Math.max(1, Math.floor(buffer.sampleRate / PICOS_POR_SEGUNDO))
  const total = Math.ceil(buffer.length / muestrasPorTramo)
  const picos = new Float32Array(total)
  for (let t = 0; t < total; t++) {
    const desde = t * muestrasPorTramo
    const hasta = Math.min(desde + muestrasPorTramo, buffer.length)
    let max = 0
    for (let i = desde; i < hasta; i++) {
      let mezcla = 0
      for (let c = 0; c < canales.length; c++) mezcla += canales[c][i]
      mezcla /= canales.length
      const abs = mezcla < 0 ? -mezcla : mezcla
      if (abs > max) max = abs
    }
    picos[t] = max
  }
  return { picos, porSegundo: PICOS_POR_SEGUNDO }
}

// devuelve el perfil de picos de un medio, decodificándolo la primera vez y
// sirviéndolo de caché las siguientes. si el navegador no puede decodificar ese
// archivo (formato raro, pista de audio ausente), resuelve a null y quien llama
// recurre a la onda sintética de respaldo
export function picosDeMedio(id: string, file: File): Promise<PerfilPicos | null> {
  const enCache = cache.get(id)
  if (enCache) return enCache
  const tarea = (async () => {
    const ctx = audioContext()
    if (!ctx) return null
    try {
      const datos = await file.arrayBuffer()
      // decodeAudioData necesita su propia copia del buffer; algunos navegadores
      // dejan el original en estado «detached» tras decodificar
      const buffer = await ctx.decodeAudioData(datos.slice(0))
      return perfilDesdeBuffer(buffer)
    } catch {
      return null
    }
  })()
  cache.set(id, tarea)
  return tarea
}

// consulta ya hecha, sin decodificar: si el perfil está en caché y resuelto,
// devuelve la amplitud (0..1) del tramo que corresponde a ese segundo del medio.
// fuera de rango o sin datos devuelve 0
export function amplitudEn(perfil: PerfilPicos, segundo: number): number {
  const tramo = Math.floor(segundo * perfil.porSegundo)
  if (tramo < 0 || tramo >= perfil.picos.length) return 0
  return perfil.picos[tramo]
}
