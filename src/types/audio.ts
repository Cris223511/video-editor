// franja de ajuste de volumen. dentro de su tramo la ganancia manda sobre el
// volumen general del proyecto. 0 es silencio, 1 es 100% y 2 es 200%
export interface RegionAudio {
  id: string
  inicio: number
  duracion: number
  ganancia: number
}

// un audio importado colocado en la pista de sonido. a diferencia de la región
// de ganancia, este sí lleva su propio material (apunta a un medio) y suena por
// sí mismo. guarda dónde empieza en la pista, cuánto dura, desde qué punto de la
// fuente y su volumen propio
export interface ClipAudio {
  id: string
  assetId: string
  inicio: number
  duracion: number
  recorteInicio: number
  duracionFuente: number
  volumen: number // 0 es silencio, 1 es 100%
}
