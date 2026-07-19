import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Crop,
  MousePointer2,
  Palette,
  Scissors,
  Sparkles,
  Type,
  Volume2,
  Wand2,
} from 'lucide-react'

// el guion completo, con lo que ocurre en cada tramo. cada paso arranca donde
// acaba el anterior, así que cambiar una duración no descuadra el resto.
// ojo con estos cortes: no van en el instante en que el clip toca la pista sino
// un poco después, cuando su animación de entrada ya terminó. si se ponen justo
// en el impacto, el pie de foto anuncia el clip siguiente mientras el anterior
// todavía se está dibujando y la pieza se contradice sola
const GUION = [
  { hasta: 2.31, texto: 'Traes un archivo desde tu carpeta' },
  { hasta: 4.1, texto: 'Colocas el siguiente al lado' },
  { hasta: 6.1, texto: 'Y el tercero en otro nivel' },
  { hasta: 8.35, texto: 'Estiras un clip para ajustar su duración' },
  { hasta: 10.1, texto: 'Añades un rótulo sobre la imagen' },
  { hasta: 12.8, texto: 'Reproduces el montaje terminado' },
]
const TOTAL = 12.8
// el montaje se arma durante los primeros once segundos y medio; lo que queda
// hasta el final de la vuelta es un descanso con el resultado a la vista. sin
// ese alto la pieza encadenaba una vuelta con la siguiente y el ojo no llegaba
// a quedarse con el montaje terminado
const ACCION = 11.5
// margen de cortesía al final y al principio del ciclo: en esos segundos la
// escena se atenúa y vuelve, así el salto del reloj queda tapado
const RETORNO = 0.75

// los clips ocupan la línea de tiempo casi entera: si se quedaban cortos, la
// mitad derecha de la pista se veía como un hueco muerto
const CLIPS = [
  { izq: 1, ancho: 34, pista: 0, entra: 1.86, de: '#2f6bd6', a: '#5aa9ff', nombre: 'sierra_01' },
  { izq: 44, ancho: 40, pista: 0, entra: 3.66, de: '#8a5ad6', a: '#c07af0', nombre: 'sierra_02' },
  { izq: 24, ancho: 38, pista: 1, entra: 5.68, de: '#1f8a7a', a: '#4fd0b5', nombre: 'detalle_01' },
]

// las herramientas de la columna izquierda, las mismas que tiene el editor de
// verdad. la que está encendida cambia según lo que se esté haciendo
const HERRAMIENTAS = [MousePointer2, Scissors, Type, Sparkles, Wand2, Palette, Volume2, Crop]

// dónde cae el botón de texto dentro de la columna, calculado a partir del
// ancho de la barra y de la altura de los iconos que lleva encima. el cursor lo
// necesita para poder ir a pulsarlo, que es de donde sale el rótulo
const HERRAMIENTA_TEXTO = { indice: 2, x: 4, y: 24 }

// los ajustes de arriba del panel no hacen nada, están para que la mitad
// superior tenga contenido y los medios puedan bajar a ocupar el resto. con tres
// barras seguía sobrando sitio entre la última y el rótulo de Medios, así que
// ahora son cinco, las que de verdad se tocan en un retoque de imagen y sonido
const AJUSTES = [
  { nombre: 'Brillo', valor: 62 },
  { nombre: 'Contraste', valor: 54 },
  { nombre: 'Saturación', valor: 48 },
  { nombre: 'Temperatura', valor: 41 },
  { nombre: 'Volumen', valor: 38 },
]

// debajo de las barras van dos atajos de los que suele haber en un panel así:
// uno que corrige la imagen solo y otro que devuelve todo a cero. rellenan la
// franja que quedaba entre la última barra y los medios
const ATAJOS_AJUSTE = [
  { nombre: 'Auto', activo: true },
  { nombre: 'Restablecer', activo: false },
]

// centros de cada cajita del panel de medios, en porcentaje del lienzo
// completo. el panel ocupa el rango x [8, 27] e y [2, 65] de la escena, y las
// tres cajitas van apiladas a todo lo ancho del panel (por eso comparten la
// misma x, el centro horizontal del panel). la y sale de convertir el centro
// de cada cajita, expresado en porcentaje del panel, a porcentaje de la
// escena: escena_y = 2 + (panel_y / 100) * 63
const MEDIOS = [
  { x: 17.5, y: 42.3 },
  { x: 17.5, y: 51.8 },
  { x: 17.5, y: 60 },
]

// el recorrido del cursor. la gracia está en que cada archivo se recoge de su
// cajita: primero el puntero viaja hasta ella, se queda quieto un instante
// (ese reposo es el "clic") y solo después baja arrastrando hasta la pista.
// luego tira del borde de un clip y acaba volviendo al punto de partida, que es
// lo que permite encadenar el bucle sin que se note el corte
// el tiempo de cada tramo sale de lo que mide el tramo, no de repartir la vuelta
// a partes iguales. midiendo el recorrido se veía que los regresos al panel, que
// cruzan la escena entera, iban al doble de velocidad que el resto y eran los
// que daban la sensación de prisa; ahora los viajes largos duran más de un
// segundo y ninguno pasa de unos ciento veinte por ciento de escena por segundo
const RUTA = [
  { t: 0, x: 50, y: 40 },
  { t: 0.56, x: MEDIOS[0].x, y: MEDIOS[0].y },
  { t: 0.96, x: MEDIOS[0].x, y: MEDIOS[0].y },
  { t: 1.86, x: 20, y: 74 },
  { t: 2.31, x: MEDIOS[1].x, y: MEDIOS[1].y },
  { t: 2.66, x: MEDIOS[1].x, y: MEDIOS[1].y },
  { t: 3.66, x: 63, y: 74 },
  { t: 4.48, x: MEDIOS[2].x, y: MEDIOS[2].y },
  { t: 4.83, x: MEDIOS[2].x, y: MEDIOS[2].y },
  { t: 5.68, x: 43, y: 84 },
  { t: 6.13, x: 36, y: 74 },
  { t: 7.03, x: 44, y: 74 },
  { t: 7.23, x: 44, y: 74 },
  { t: 8.33, x: HERRAMIENTA_TEXTO.x, y: HERRAMIENTA_TEXTO.y },
  { t: 8.73, x: HERRAMIENTA_TEXTO.x, y: HERRAMIENTA_TEXTO.y },
  { t: 9.88, x: 62, y: 46 },
  { t: ACCION, x: 46, y: 56 },
]

function posicion(t: number) {
  for (let i = 0; i < RUTA.length - 1; i++) {
    const a = RUTA[i]
    const b = RUTA[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t || 1)
      const s = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2
      return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s }
    }
  }
  return RUTA[RUTA.length - 1]
}

// montaje completo reproducido con la misma disposición que tiene la aplicación:
// herramientas en columna, panel de medios al lado, visor grande arriba y la
// línea de tiempo cruzando abajo. antes las piezas flotaban sueltas y sobraba
// espacio por el centro
export default function DemoMontaje() {
  const caja = useRef<HTMLDivElement>(null)
  const visible = useInView(caja, { amount: 0.3 })
  const [bruto, setBruto] = useState(0)

  useEffect(() => {
    if (!visible) return
    let raf = 0
    const inicio = performance.now()
    const paso = () => {
      setBruto(((performance.now() - inicio) / 1000) % TOTAL)
      raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [visible])

  // pasada ACCION el reloj de la escena se planta en su fotograma final: el
  // montaje se queda quieto, terminado y a la vista, hasta que la vuelta empieza
  const t = Math.min(bruto, ACCION)

  const cursor = posicion(t)
  const pasoActual = GUION.find((g) => bruto < g.hasta) ?? GUION[GUION.length - 1]
  const arrastrando = (t > 0.96 && t < 1.86) || (t > 2.66 && t < 3.66) || (t > 4.83 && t < 5.68)
  // mientras el puntero está posado sobre una cajita se marca cuál, para que el
  // medio se ilumine y se entienda que lo acaba de coger
  const medioTocado = t > 0.5 && t < 1.0 ? 0 : t > 2.26 && t < 2.7 ? 1 : t > 4.43 && t < 4.88 ? 2 : -1
  const estirando = t > 6.13 && t < 7.03
  // el rótulo ya no se materializa solo: el cursor va a la columna, se posa
  // sobre el botón de texto igual que se posa sobre un medio, y lo que sale de
  // ese clic viaja colgado del puntero hasta soltarse encima del plano
  const pulsandoTexto = t > 8.28 && t < 8.78
  const llevandoRotulo = t > 8.73 && t < 9.88
  const conRotulo = t > 9.88
  const reproduciendo = t > 9.88

  // el primer clip se alarga mientras el cursor tira de su borde derecho
  const estirado = t < 6.13 ? 0 : t > 7.03 ? 1 : (t - 6.13) / 0.9
  const anchoPrimero = CLIPS[0].ancho + estirado * 8

  const avance = reproduciendo ? (t - 9.88) / (ACCION - 9.88) : 0
  // qué clip se ve según dónde esté el cabezal
  const enPantalla = avance < 0.45 ? 0 : avance < 0.75 ? 1 : 2
  const clip = CLIPS[enPantalla]
  // de qué medio va colgado el puntero. los cortes son los mismos instantes en
  // los que cada clip aterriza en la pista, si no el color que se lleva en la
  // mano deja de coincidir con el que acaba de coger
  const cogido = CLIPS[t < CLIPS[0].entra ? 0 : t < CLIPS[1].entra ? 1 : 2]

  // la herramienta encendida acompaña al paso: puntero al mover y tirador al
  // estirar. la de texto se prende en cuanto el cursor llega a su botón y
  // sigue encendida mientras el rótulo está en el aire, como haría el editor
  const herramientaActiva = estirando
    ? 1
    : t > 8.28 && t < 10.6
      ? HERRAMIENTA_TEXTO.indice
      : 0

  // el enlace entre la última vuelta y la siguiente. en lugar de cortar en seco
  // cuando el reloj vuelve a cero, los últimos y los primeros instantes se
  // atenúan con una curva suave: el ojo lee un fundido y no un salto. el cursor
  // acaba a un palmo de donde arrancó, y ese trecho lo recorre con la capa casi
  // apagada, así que no se ve saltar
  const margen = Math.min(bruto, TOTAL - bruto) / RETORNO
  const f = Math.min(1, Math.max(0, margen))
  const opacidadEscena = 0.1 + 0.9 * (f * f * (3 - 2 * f))

  return (
    <div
      ref={caja}
      className="relative overflow-hidden rounded-3xl p-4 shadow-lg sm:p-6"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl sm:aspect-[16/9]"
        style={{ background: 'rgb(var(--border) / 0.05)' }}
      >
        {/* todo el montaje vive dentro de esta capa, que es la que se funde al
            cerrar el bucle sin arrastrar consigo el fondo del recuadro */}
        <div className="absolute inset-0" style={{ opacity: opacidadEscena }}>
        {/* columna de herramientas, pegada al borde como en la aplicación */}
        <div
          className="absolute bottom-[35%] left-[1.5%] top-[2%] flex w-[5%] flex-col items-center justify-start gap-[3%] rounded-lg py-[3%]"
          style={{ background: 'rgb(var(--border) / 0.09)' }}
        >
          {HERRAMIENTAS.map((Icono, i) => (
            <span
              key={i}
              className="grid aspect-square w-[62%] place-items-center rounded-md transition-all duration-300"
              style={{
                background: i === herramientaActiva ? 'rgb(var(--accent-boton))' : 'transparent',
                color: i === herramientaActiva ? '#fff' : 'rgb(var(--border) / 0.55)',
                // el instante del clic se marca con un anillo, el mismo recurso
                // que avisa de qué medio acaba de coger el cursor
                outline:
                  pulsandoTexto && i === HERRAMIENTA_TEXTO.indice
                    ? '2px solid rgb(var(--accent))'
                    : 'none',
                outlineOffset: '1px',
                transform:
                  pulsandoTexto && i === HERRAMIENTA_TEXTO.indice ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              <Icono size={11} />
            </span>
          ))}
        </div>

        {/* panel de medios. cada bloque va posicionado en porcentaje del propio
            panel, igual que el resto de la pieza, para que las coordenadas de
            MEDIOS y RUTA se puedan calcular con la misma regla en vez de
            depender de cómo reparta el espacio un flex. los ajustes quedan
            arriba con aire entre el rótulo y cada barra, y las tres cajitas de
            medios bajan apiladas a todo lo ancho, del mismo tamaño entre sí,
            hasta llenar el panel sin dejar hueco al final */}
        <div
          className="absolute bottom-[35%] left-[8%] top-[2%] w-[19%] overflow-hidden rounded-lg"
          style={{ background: 'rgb(var(--border) / 0.09)' }}
        >
          <p
            className="absolute inset-x-[10%] text-[7px] font-bold uppercase tracking-wider sm:text-[8px]"
            style={{ top: '4%', color: 'var(--muted)' }}
          >
            Ajustes
          </p>
          {AJUSTES.map((a, i) => (
            <span
              key={a.nombre}
              className="absolute inset-x-[10%] flex items-center gap-1.5"
              // el reparto va desde justo debajo del rótulo hasta poco antes de
              // los atajos, con la misma distancia entre una barra y la siguiente
              style={{ top: `${12 + i * 6.2}%` }}
            >
              <span
                className="w-[42%] shrink-0 truncate text-[6px] sm:text-[7px]"
                style={{ color: 'var(--muted)' }}
              >
                {a.nombre}
              </span>
              <span
                className="relative h-[3px] flex-1 rounded-full"
                style={{ background: 'rgb(var(--border) / 0.22)' }}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${a.valor}%`, background: 'rgb(var(--accent) / 0.7)' }}
                />
              </span>
            </span>
          ))}

          <span className="absolute inset-x-[10%] flex gap-1" style={{ top: '43%' }}>
            {ATAJOS_AJUSTE.map((a) => (
              <span
                key={a.nombre}
                className="flex-1 truncate rounded px-1 py-[2px] text-center text-[5px] font-semibold sm:text-[6px]"
                style={{
                  background: a.activo ? 'rgb(var(--accent) / 0.18)' : 'rgb(var(--border) / 0.12)',
                  color: a.activo ? 'rgb(var(--accent))' : 'var(--muted)',
                }}
              >
                {a.nombre}
              </span>
            ))}
          </span>

          <p
            className="absolute inset-x-[10%] text-[7px] font-bold uppercase tracking-wider sm:text-[8px]"
            style={{ top: '50%', color: 'var(--muted)' }}
          >
            Medios
          </p>
          {CLIPS.map((c, i) => (
            <span
              key={i}
              className="absolute inset-x-[8%] flex flex-col gap-0.5 rounded-md p-1 transition-all duration-300"
              style={{
                // los topes y las alturas son los mismos que se usaron para
                // calcular el centro de cada cajita en MEDIOS: caja 1 va de
                // 58% a 70%, la 2 de 73% a 85% y la 3 de 87% a 97% del panel
                top: `${[58, 73, 87][i]}%`,
                height: `${[12, 12, 10][i]}%`,
                background:
                  medioTocado === i ? 'rgb(var(--accent) / 0.18)' : 'rgb(var(--border) / 0.12)',
                outline: medioTocado === i ? '1px solid rgb(var(--accent))' : 'none',
                opacity: t > c.entra ? 0.3 : 1,
              }}
            >
              <span
                className="w-full flex-1 rounded"
                style={{ background: `linear-gradient(120deg, ${c.de}, ${c.a})` }}
              />
              <span
                className="truncate text-[6px] leading-tight sm:text-[7px]"
                style={{ color: 'var(--muted)' }}
              >
                {c.nombre}
              </span>
            </span>
          ))}
        </div>

        {/* visor: ocupa todo el resto de la franja superior, que es lo que la
            pieza quiere enseñar */}
        <div
          className="absolute bottom-[35%] left-[29%] right-[1.5%] top-[2%] overflow-hidden rounded-lg shadow-lg"
          style={{ background: '#0b1424' }}
        >
          {/* el fotograma va centrado en 16/9, con el negro alrededor igual que
              en un visor real */}
          <div className="absolute inset-x-0 top-0 grid h-[86%] place-items-center">
            <div className="relative h-full overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
              <div
                className="absolute inset-0 transition-all duration-700"
                style={{ background: `linear-gradient(160deg, ${clip.de}, ${clip.a})` }}
              />
              <span
                className="absolute inset-x-0 bottom-0 h-[38%]"
                style={{ background: 'rgb(6 12 24 / 0.55)' }}
              />
              {/* dos montañas y un sol, que dan escala y hacen legible el encuadre */}
              <span
                className="absolute bottom-[32%] left-[12%] h-0 w-0"
                style={{
                  borderLeft: '26px solid transparent',
                  borderRight: '26px solid transparent',
                  borderBottom: '34px solid rgb(6 12 24 / 0.45)',
                }}
              />
              <span
                className="absolute bottom-[32%] left-[38%] h-0 w-0"
                style={{
                  borderLeft: '38px solid transparent',
                  borderRight: '38px solid transparent',
                  borderBottom: '50px solid rgb(6 12 24 / 0.6)',
                }}
              />
              <span
                className="absolute right-[18%] top-[14%] h-5 w-5 rounded-full"
                style={{ background: 'rgb(255 255 255 / 0.75)' }}
              />

              {conRotulo && (
                <motion.span
                  // cae desde arriba, que es por donde venía colgando del
                  // cursor, en vez de aparecer sin más
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-x-4 bottom-3 rounded px-2 py-1 text-center text-[11px] font-bold text-white sm:text-sm"
                  style={{ background: 'rgb(6 12 24 / 0.6)' }}
                >
                  Amanecer en la sierra
                </motion.span>
              )}

              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-white/90">
                00:0{Math.floor(avance * 9)}:{String(Math.floor(avance * 240) % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* barra de reproducción del visor, que avanza con el cabezal */}
          <div className="absolute inset-x-[4%] bottom-[4%] flex items-center gap-2">
            <span
              className="h-0 w-0 shrink-0"
              style={{
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: `6px solid ${reproduciendo ? 'rgb(255 255 255 / 0.85)' : 'rgb(255 255 255 / 0.35)'}`,
              }}
            />
            <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                style={{ width: `${avance * 100}%` }}
              />
            </span>
          </div>
        </div>

        {/* línea de tiempo, cruzando de lado a lado por debajo de todo */}
        <div
          className="absolute inset-x-[1.5%] bottom-[2%] top-[67%] rounded-lg p-[1.2%]"
          style={{ background: 'rgb(var(--border) / 0.09)' }}
        >
          <div className="relative flex h-full flex-col justify-center gap-[3%]">
            {[0, 1].map((pista) => (
              <div
                key={pista}
                className="relative h-[30%] rounded-md"
                style={{ background: 'rgb(var(--border) / 0.1)' }}
              >
                {CLIPS.filter((c) => c.pista === pista).map((c, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-0 h-full overflow-hidden rounded-md"
                    style={{
                      left: `${c.izq}%`,
                      width: `${c === CLIPS[0] ? anchoPrimero : c.ancho}%`,
                      background: `linear-gradient(120deg, ${c.de}, ${c.a})`,
                      // el clip que suena se resalta mientras el cabezal lo cruza
                      outline:
                        reproduciendo && c === CLIPS[enPantalla]
                          ? '2px solid rgb(var(--accent))'
                          : 'none',
                    }}
                    animate={{ opacity: t > c.entra ? 1 : 0, scaleX: t > c.entra ? 1 : 0.4 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="flex h-full">
                      {Array.from({ length: 10 }, (_, k) => (
                        <span
                          key={k}
                          className="h-full flex-1"
                          style={{ background: k % 2 ? 'rgb(255 255 255 / 0.1)' : 'transparent' }}
                        />
                      ))}
                    </span>
                  </motion.span>
                ))}
              </div>
            ))}

            {/* pista de rótulos, que se enciende al añadir el texto */}
            <div
              className="relative h-[22%] rounded-md transition-opacity duration-500"
              style={{
                background: 'rgb(var(--border) / 0.1)',
                opacity: conRotulo ? 1 : 0.35,
              }}
            >
              {conRotulo && (
                <motion.span
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  className="absolute top-0 flex h-full items-center gap-1 rounded-md px-1.5"
                  style={{ left: '30%', width: '34%', background: 'rgb(var(--accent) / 0.85)' }}
                >
                  <Type size={9} className="shrink-0 text-white" />
                  <span className="truncate text-[8px] font-medium text-white">Rótulo</span>
                </motion.span>
              )}
            </div>

            <span
              className="pointer-events-none absolute inset-y-0 w-px bg-brand"
              style={{ left: `${avance * 92 + 2}%`, opacity: reproduciendo ? 1 : 0.25 }}
            >
              <span className="absolute -left-[5px] -top-[2px] h-2 w-3 rounded-sm bg-brand" />
            </span>
          </div>
        </div>

        {/* cursor, con lo que lleva en la mano según el momento */}
        <span
          className="pointer-events-none absolute z-10"
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            transform: `translate(-4px, -2px) scale(${arrastrando || estirando || llevandoRotulo ? 0.92 : 1})`,
          }}
        >
          <MousePointer2
            size={19}
            className="text-brand drop-shadow"
            fill="currentColor"
            strokeWidth={1}
          />
          {arrastrando && (
            <span
              className="absolute left-4 top-3 h-4 w-7 rounded"
              style={{
                background: `linear-gradient(120deg, ${cogido.de}, ${cogido.a})`,
                opacity: 0.8,
              }}
            />
          )}
          {estirando && (
            <span className="absolute -left-1 top-4 text-[10px] font-bold text-brand">↔</span>
          )}
          {llevandoRotulo && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.9, scale: 1 }}
              className="absolute left-4 top-3 flex items-center gap-1 rounded px-1 py-0.5"
              style={{ background: 'rgb(var(--accent) / 0.85)' }}
            >
              <Type size={8} className="shrink-0 text-white" />
              <span className="whitespace-nowrap text-[7px] font-medium text-white">Rótulo</span>
            </motion.span>
          )}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex gap-1">
          {GUION.map((g) => (
            <span
              key={g.texto}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: g === pasoActual ? 22 : 7,
                background: g === pasoActual ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.22)',
              }}
            />
          ))}
        </span>
        <p className="text-sm font-medium text-[color:var(--muted)]">{pasoActual.texto}</p>
      </div>
    </div>
  )
}
