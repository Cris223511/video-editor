// convierte un AudioBuffer ya decodificado en un archivo WAV (PCM de 16 bits). se
// usa al separar el audio de un video: el navegador decodifica la pista de sonido
// y aquí se empaqueta en un formato que un elemento de audio reproduce y que la
// exportación vuelve a mezclar, sin recodificar ni perder sincronía
export function bufferAWav(buffer: AudioBuffer): Blob {
  const canales = buffer.numberOfChannels
  const muestras = buffer.length
  const tasa = buffer.sampleRate
  const bytesPorMuestra = 2
  const bloque = canales * bytesPorMuestra
  const datos = muestras * bloque
  const total = 44 + datos

  const ab = new ArrayBuffer(total)
  const vista = new DataView(ab)

  const escribirTexto = (pos: number, texto: string) => {
    for (let i = 0; i < texto.length; i++) vista.setUint8(pos + i, texto.charCodeAt(i))
  }

  // cabecera RIFF/WAVE estándar
  escribirTexto(0, 'RIFF')
  vista.setUint32(4, 36 + datos, true)
  escribirTexto(8, 'WAVE')
  escribirTexto(12, 'fmt ')
  vista.setUint32(16, 16, true)
  vista.setUint16(20, 1, true) // PCM
  vista.setUint16(22, canales, true)
  vista.setUint32(24, tasa, true)
  vista.setUint32(28, tasa * bloque, true)
  vista.setUint16(32, bloque, true)
  vista.setUint16(34, 8 * bytesPorMuestra, true)
  escribirTexto(36, 'data')
  vista.setUint32(40, datos, true)

  // las muestras se intercalan canal por canal y se pasan de flotante (-1..1) a
  // entero de 16 bits con signo
  const pistas: Float32Array[] = []
  for (let c = 0; c < canales; c++) pistas.push(buffer.getChannelData(c))

  let pos = 44
  for (let i = 0; i < muestras; i++) {
    for (let c = 0; c < canales; c++) {
      let m = Math.max(-1, Math.min(1, pistas[c][i]))
      m = m < 0 ? m * 0x8000 : m * 0x7fff
      vista.setInt16(pos, m, true)
      pos += 2
    }
  }

  return new Blob([ab], { type: 'audio/wav' })
}
