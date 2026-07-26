import { Tira } from '../../../lib/media/fotogramas'

// dibuja la tira de fotogramas dentro de un clip, alineada al tiempo real.
//
// la rejilla se ancla al contenido del propio clip (a su recorte de entrada), no a
// la posición del clip en la línea de tiempo. así, mover el clip de sitio no desplaza
// las miniaturas dentro de él: se ven idénticas antes y después de moverlo. y como al
// recortar por la izquierda el recorte de entrada avanza junto con el inicio, las
// miniaturas siguen quedándose en el mismo punto en pantalla al recortar, que era la
// razón de anclar la rejilla. cada hueco calcula qué instante del video fuente le
// toca (según el recorte de entrada y la velocidad) y elige el fotograma más cercano.
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

  // el ancho de cada hueco de la tira. antes cada fotograma se veía entero (alto
  // por la proporción del video, unos 114 px en 16:9), y por eso salían pocos y muy
  // anchos, que es lo que se leía como estirado. ahora los huecos son más angostos
  // (algo menos que el alto de la fila) y el fotograma se recorta a ese ancho con
  // object-cover: entran muchos más y la tira se lee como una película de verdad
  const anchoFoto = Math.max(28, Math.round(alto * 0.62))
  // posición del recorte de entrada expresada en píxeles de la línea de tiempo, y
  // desfase dentro de la rejilla de fotogramas. faseando por la fuente (no por el
  // inicio del clip) la tira no se mueve al arrastrar el clip de sitio, pero sigue
  // acompañando al recorte, donde inicio y recorte avanzan a la par. el primer hueco
  // arranca un poco antes del borde (en el trozo negativo que el overflow recorta)
  // para que las divisiones caigan siempre en los mismos puntos del contenido
  const fuentePx = (recorteInicio / velocidad) * pxPorSegundo
  const desfase = ((fuentePx % anchoFoto) + anchoFoto) % anchoFoto
  const primeraLocal = -desfase
  const cuantos = Math.ceil((ancho - primeraLocal) / anchoFoto)

  const huecos = []
  for (let i = 0; i < cuantos; i += 1) {
    const local = primeraLocal + i * anchoFoto
    // instante del video fuente que cae en el borde izquierdo de este hueco
    const segundosEnPista = local / pxPorSegundo
    const enFuente = recorteInicio + segundosEnPista * velocidad
    let mejor = 0
    let distancia = Infinity
    for (let f = 0; f < tira.tiempos.length; f += 1) {
      const d = Math.abs(tira.tiempos[f] - enFuente)
      if (d < distancia) {
        distancia = d
        mejor = f
      }
    }
    huecos.push({ src: tira.imagenes[mejor], left: local })
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {huecos.map((h, i) => (
        <img
          key={i}
          src={h.src}
          alt=""
          draggable={false}
          className="absolute top-0 h-full object-cover"
          style={{ left: h.left, width: anchoFoto }}
        />
      ))}
    </div>
  )
}
