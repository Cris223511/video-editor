import { Tira } from '../../../lib/media/fotogramas'

// dibuja la tira de fotogramas dentro de un clip, alineada al tiempo real.
//
// la rejilla de fotogramas se ancla al tiempo ABSOLUTO de la línea de tiempo, no
// al borde del clip. así, al recortar por la izquierda, cada fotograma se queda en
// el mismo sitio en pantalla (el clip se hace más corto pero lo que se ve no se
// desplaza), y sirve de guía para saber en qué fotograma se está cortando. cada
// hueco calcula qué instante del video fuente le toca (según el recorte de entrada
// y la velocidad) y elige el fotograma más cercano.
export default function FrameStrip({
  tira,
  inicio,
  ancho,
  alto,
  recorteInicio,
  velocidad,
  pxPorSegundo,
}: {
  tira: Tira
  // segundo de la línea de tiempo donde arranca el clip. sitúa la rejilla en
  // coordenadas absolutas para que recortar no desplace lo que se ve
  inicio: number
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
  // píxel absoluto del borde izquierdo del clip, y desfase dentro de la rejilla
  // global de fotogramas. el primer hueco arranca un poco antes del borde (en el
  // trozo negativo que el overflow recorta) para que las divisiones caigan siempre
  // en los mismos puntos absolutos aunque el clip cambie de largo o de sitio
  const izqAbs = inicio * pxPorSegundo
  const desfase = ((izqAbs % anchoFoto) + anchoFoto) % anchoFoto
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
