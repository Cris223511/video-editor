import { Tira } from '../../../lib/media/fotogramas'

// dibuja la tira de fotogramas dentro de un clip, alineada al tiempo real.
// para cada hueco de la tira se calcula qué instante del video fuente le toca,
// teniendo en cuenta el recorte de entrada y la velocidad, y se elige el
// fotograma más cercano. así, al recortar o al acercar el zoom, lo que se ve
// sigue correspondiendo con lo que hay en esa parte del clip
export default function FrameStrip({
  tira,
  ancho,
  alto,
  recorteInicio,
  velocidad,
  pxPorSegundo,
}: {
  tira: Tira
  ancho: number
  alto: number
  recorteInicio: number
  velocidad: number
  pxPorSegundo: number
}) {
  if (!tira.imagenes.length || ancho <= 0) return null

  const anchoFoto = Math.max(24, Math.round(alto * tira.aspecto))
  const cuantos = Math.max(1, Math.ceil(ancho / anchoFoto))

  const huecos = []
  for (let i = 0; i < cuantos; i += 1) {
    // instante del video fuente que cae en el borde izquierdo de este hueco
    const segundosEnPista = (i * anchoFoto) / pxPorSegundo
    const enFuente = recorteInicio + segundosEnPista * velocidad
    // fotograma cuyo tiempo queda más cerca de ese instante
    let mejor = 0
    let distancia = Infinity
    for (let f = 0; f < tira.tiempos.length; f += 1) {
      const d = Math.abs(tira.tiempos[f] - enFuente)
      if (d < distancia) {
        distancia = d
        mejor = f
      }
    }
    huecos.push({ src: tira.imagenes[mejor], ancho: Math.min(anchoFoto, ancho - i * anchoFoto) })
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex overflow-hidden">
      {huecos.map((h, i) => (
        <img
          key={i}
          src={h.src}
          alt=""
          draggable={false}
          className="h-full shrink-0 object-cover"
          style={{ width: h.ancho }}
        />
      ))}
    </div>
  )
}
