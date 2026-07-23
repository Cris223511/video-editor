// franja de ajuste de volumen. dentro de su tramo la ganancia manda sobre el
// volumen general del proyecto. 0 es silencio, 1 es 100% y 2 es 200%
export interface RegionAudio {
  id: string
  inicio: number
  duracion: number
  ganancia: number
  // fila del carril de audio donde se dibuja. igual que en las capas, solo ordena
  // la vista de la línea de tiempo para no amontonar bloques que coinciden en el
  // tiempo; el sonido se mezcla igual sin importar la fila. sin definir es la 0
  nivel?: number
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
  // si nació de separar el audio de un clip de video, guarda su id: así se mueven
  // juntos y borrar el video se lleva también este audio
  vinculadoA?: string
  // fila del carril de audio donde se muestra. mismo criterio que la región: es
  // orden visual, no afecta la mezcla. sin definir cae en la fila 0
  nivel?: number
  // fundido de entrada y de salida, en segundos, para que el audio no entre ni
  // se corte de golpe. sin definir suena plano de principio a fin
  fundidoEntrada?: number
  fundidoSalida?: number
}
