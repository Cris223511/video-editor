// reduce el ruido de fondo de la mezcla de audio con RNNoise (una red pequeña, pensada para la voz:
// quita zumbidos, siseo, ventilador y demás ruido constante). la librería wasm es grande, así que se
// carga con import dinámico: solo se descarga cuando de verdad se activa esta mejora, no en el arranque.
// la mezcla llega a 48 kHz, que es justo lo que RNNoise espera, por eso no hace falta remuestrear

// procesa un AudioBuffer y devuelve otro con el ruido reducido. trabaja canal por canal, en trozos del
// tamaño que pide la red, escalando a PCM de 16 bits (RNNoise asume ese formato) y volviendo a [-1, 1]
export async function reducirRuidoAudio(buffer: AudioBuffer): Promise<AudioBuffer> {
  const { Rnnoise } = await import('@shiguredo/rnnoise-wasm')
  const rnnoise = await Rnnoise.load()
  const tam = rnnoise.frameSize // 480 muestras (10 ms a 48 kHz)
  const canales = buffer.numberOfChannels

  const salida = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: canales,
    sampleRate: buffer.sampleRate,
  })

  const frame = new Float32Array(tam)
  for (let c = 0; c < canales; c++) {
    // cada canal lleva su propio estado, porque la red arrastra memoria de un trozo al siguiente
    const estado = rnnoise.createDenoiseState()
    const entrada = buffer.getChannelData(c)
    const salidaCanal = salida.getChannelData(c)
    for (let i = 0; i < buffer.length; i += tam) {
      const n = Math.min(tam, buffer.length - i)
      // se llena el trozo escalado a 16 bits; si el último queda corto, el resto va en cero
      for (let j = 0; j < tam; j++) frame[j] = j < n ? entrada[i + j] * 32768 : 0
      // processFrame limpia el ruido MODIFICANDO el propio trozo; devuelve la probabilidad de voz, que aquí no se usa
      estado.processFrame(frame)
      for (let j = 0; j < n; j++) salidaCanal[i + j] = frame[j] / 32768
    }
    estado.destroy()
  }

  return salida
}
