// franja de ajuste de volumen. dentro de su tramo la ganancia manda sobre el
// volumen general del proyecto. 0 es silencio, 1 es 100% y 2 es 200%
export interface RegionAudio {
  id: string
  inicio: number
  duracion: number
  ganancia: number
}
