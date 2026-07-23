import { create } from 'zustand'
import { Track, Clip, AjusteTono, Transicion, PistaMeta, EfectoClip, Encuadre } from '../types/timeline'
import { MediaAsset } from '../types/media'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTexto, CapaTrazo } from '../types/layers'
import { RegionAudio, ClipAudio } from '../types/audio'
import { Marco } from '../types/marco'
import { tonoNeutro } from '../lib/color/tono'
import {
  crearCapaCensura,
  crearCapaFigura,
  crearCapaImagen,
  crearCapaTexto,
  crearCapaTrazo,
} from '../lib/layers/defaults'
import { simplificarRecorrido } from '../lib/layers/motion'
import { duracionTotal } from '../lib/timeline/clips'

// estado del clip al empezar un arrastre de recorte o de velocidad. arrastrar
// midiendo el desplazamiento total desde este punto de partida, en vez de sumar
// deltas fotograma a fotograma, evita que el recorte se descuadre cuando el
// cursor se pasa del límite y luego vuelve
export type BaseRecorte = {
  inicio: number
  duracion: number
  recorteInicio: number
  velocidad: number
  duracionFuente: number
}

const PX_POR_SEGUNDO_DEFECTO = 60
// mínimo muy bajo para poder alejar mucho: así un clip largo se encoge hasta caber
// de sobra en la línea de tiempo. la regla adapta sola la separación de sus marcas
const PX_MIN = 2
const PX_MAX = 400

// escala en píxeles por segundo que hace caber toda la duración dentro del ancho
// útil de la pista, dejando un pequeño margen a la derecha para que el último
// clip no quede pegado al borde. devuelve null cuando aún no se conoce el ancho
// o no hay nada que encuadrar, y en ese caso el zoom se deja como estaba
function zoomParaEncuadrar(total: number, anchoUtil: number): number | null {
  if (anchoUtil <= 0 || total <= 0) return null
  const px = (anchoUtil - 40) / total
  return Math.max(PX_MIN, Math.min(PX_MAX, px))
}
const DURACION_MINIMA = 0.1
const DURACION_MINIMA_CAPA = 0.2

// ancho y alto de una capa en fracción del lienzo, para poder alinearla por sus
// bordes. las de caja lo llevan directo; la imagen deduce su alto de la
// proporción si no se deformó a mano; el texto no guarda medidas, así que se le
// da una aproximación cómoda que basta para colocarlo
function medidaCapa(c: Capa, aspecto: number): { w: number; h: number } {
  if (c.tipo === 'censura' || c.tipo === 'figura') return { w: c.anchoRel, h: c.altoRel }
  if (c.tipo === 'trazo') {
    // el dibujo no guarda medidas propias, así que se mide la caja que abarcan
    // sus trazos (relativos al centro) para poder alinearlo por sus bordes
    let min = Infinity
    let max = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const tr of c.trazos)
      for (const p of tr) {
        if (p.x < min) min = p.x
        if (p.x > max) max = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
    if (min === Infinity) return { w: 0, h: 0 }
    return { w: max - min, h: maxY - minY }
  }
  if (c.tipo === 'imagen') {
    const w = c.anchoRel
    const h =
      c.altoRel ??
      (c.anchoNatural > 0 ? (c.anchoRel * aspecto * c.altoNatural) / c.anchoNatural : c.anchoRel)
    return { w, h }
  }
  return { w: 0.25, h: 0.12 }
}

export type Herramienta =
  | 'proyecto'
  | 'transiciones'
  | 'texto'
  | 'audio'
  | 'censura'
  | 'velocidad'
  | 'tono'
  | 'efectos'
  | 'lienzo'
  | 'marco'
  | 'figura'
  | 'dibujar'
  | 'transformar'
  | 'recortar'

// las tres secciones que conviven en la línea de tiempo, cada una con sus filas
export type Carril = 'video' | 'audio' | 'texto'

interface EstadoEditor {
  pista: Track
  // niveles de video visibles y el alto en píxeles de cada uno. los clips viven
  // todos en la misma lista y su campo pista dice en cuál se dibujan
  numPistas: number
  altosPista: number[]
  // metadatos de cada nivel, en el mismo orden que altosPista. lo que decide si
  // un nivel suena, se ve o se puede tocar vive aquí
  pistasMeta: PistaMeta[]
  // cuántas filas muestra el carril de texto y figuras y cuántas el de audio.
  // arrancan en 1 y crecen cuando el usuario añade una, para repartir en varias
  // alturas los bloques que se pisan en el tiempo. cada capa, región o audio
  // guarda en su campo nivel en qué fila cae
  nivelesTexto: number
  nivelesAudio: number
  // en qué orden se apilan las tres secciones de la línea de tiempo, de arriba
  // abajo. de fábrica el video manda arriba, luego el audio y al final el texto y
  // las figuras, pero se puede reordenar a gusto
  ordenCarriles: Carril[]
  // sube o baja una sección entera. el video no lleva flechas propias: se mueve
  // solo cuando el audio o el texto le pasan por encima, y con esas dos se llega
  // igualmente a cualquier orden posible
  moverCarril: (carril: Carril, direccion: -1 | 1) => void
  capas: Capa[]
  playhead: number
  reproduciendo: boolean
  clipSeleccionado: string | null
  capaSeleccionada: string | null
  regionSeleccionada: string | null
  herramienta: Herramienta
  pxPorSegundo: number
  // ancho útil en píxeles del área de clips, medido en vivo desde la interfaz.
  // sirve para calcular el zoom que encuadra un video recién soltado sin que el
  // usuario tenga que alejar a mano
  anchoTimeline: number
  setAnchoTimeline: (px: number) => void
  resolucion: { ancho: number; alto: number }
  resolucionAuto: { ancho: number; alto: number }
  lienzoManual: boolean
  colorFondo: string
  // qué rellena las bandas cuando el video no cubre el lienzo entero
  fondo: 'color' | 'desenfoque'
  // cuánto se desenfoca ese relleno, de 1 a 100
  desenfoqueFondo: number
  marco: Marco
  volumenGlobal: number
  audioRegiones: RegionAudio[]

  // trae un medio a la línea de tiempo. sin destino aterriza al final de la pista
  // base, como siempre; con destino se puede pedir un nivel concreto (pista) o
  // abrir uno nuevo en una separación (insertarEn), que es lo que necesita el
  // arrastre desde el panel para soltar justo donde la guía prometió
  agregarDesdeAsset: (asset: MediaAsset, destino?: { pista?: number; insertarEn?: number }) => void
  quitarClip: (id: string) => void
  // separa el audio de un clip de video: lo deja mudo y añade el clip de audio ya
  // decodificado, vinculado a él. el decodificado va fuera del store, en el panel
  separarAudio: (clipId: string, audio: import('../types/audio').ClipAudio) => void
  // crea otra instancia del mismo clip (nuevo id, mismo assetId, recortes, tono y
  // efectos). no toca los medios del proyecto: es otra aparición del mismo asset
  // en la línea de tiempo. devuelve el id de la copia para poder arrastrarla
  duplicarClip: (id: string) => string | null
  moverClip: (id: string, nuevoInicio: number) => void
  recortarClip: (
    id: string,
    lado: 'inicio' | 'fin',
    deltaSegundos: number,
    base?: BaseRecorte,
  ) => void
  estirarVelocidad: (
    id: string,
    lado: 'inicio' | 'fin',
    deltaSegundos: number,
    base?: BaseRecorte,
  ) => void
  setVelocidadClip: (id: string, velocidad: number) => void
  setTono: (id: string, cambios: Partial<AjusteTono>) => void
  resetTono: (id: string) => void
  // encuadre del clip en el lienzo: posición y tamaño del video. actualizar
  // recibe cambios sueltos y reset lo devuelve al centrado de siempre
  actualizarEncuadre: (id: string, cambios: Partial<Encuadre>) => void
  resetEncuadre: (id: string) => void
  // recorte de la IMAGEN del clip por lados, en fracción (distinto de recortarClip,
  // que recorta el clip en el tiempo). actualizar recibe cambios sueltos y reset lo
  // quita del todo
  recortarClipImagen: (id: string, cambios: Partial<import('../types/timeline').RecorteRel>) => void
  resetRecorteClipImagen: (id: string) => void
  // cadena de efectos del clip: se suman, se ajustan y se quitan por su id
  agregarEfecto: (id: string, efecto: EfectoClip) => void
  actualizarEfecto: (id: string, efectoId: string, cambios: Partial<EfectoClip>) => void
  quitarEfecto: (id: string, efectoId: string) => void
  setTransicion: (id: string, cambios: Partial<Transicion>) => void
  dividirEnCabezal: () => void
  cerrarHueco: (desde: number, pista: number) => void
  seleccionar: (id: string | null) => void
  // deja sin selección cualquier clip, capa o región a la vez. la usa el clic en
  // una zona vacía de la línea de tiempo para soltar lo que estuviera marcado
  limpiarSeleccion: () => void
  // selección múltiple de bloques de la línea de tiempo. guarda ids de cualquier
  // tipo (clip de video, capa, audio o franja) para poder borrarlos o moverlos en
  // conjunto. convive con la selección de uno solo, que es la que abre los paneles
  bloquesSeleccionados: string[]
  alternarBloque: (id: string) => void
  limpiarBloques: () => void
  // menú que sale al pulsar con el botón derecho sobre un bloque de la línea de
  // tiempo. guarda dónde se pulsó y sobre qué, y de ahí sale lo que se ofrece
  menuContextual: { x: number; y: number; tipo: 'clip' | 'capa' | 'audio' | 'region'; id: string } | null
  abrirMenuContextual: (m: { x: number; y: number; tipo: 'clip' | 'capa' | 'audio' | 'region'; id: string }) => void
  cerrarMenuContextual: () => void
  // borra de una vez todos los bloques marcados, sea cual sea su tipo
  quitarBloques: (ids: string[]) => void
  // desplaza en el tiempo todos los bloques marcados a la vez, sumando el mismo
  // salto a cada uno. ninguno baja de cero, y si uno topa con el arranque el resto
  // se frena con él para no descuadrar el conjunto
  moverBloques: (ids: string[], delta: number) => void

  // vacía el documento por completo y borra el historial, para estrenar un
  // proyecto en blanco sin que quede nada del anterior
  reiniciar: () => void

  agregarPista: () => void
  // crea un nivel nuevo en la posición indicada empujando hacia arriba los que ya
  // estaban en ese índice o por encima. si se pasa un clip, aterriza en el nivel
  // recién creado. es lo que permite soltar un clip entre dos pistas y abrir un
  // hueco propio para él
  insertarPistaEn: (indice: number, clipId?: string) => void
  quitarPista: (indice: number) => void
  setAltoPista: (indice: number, alto: number) => void
  moverClipAPista: (id: string, pista: number) => void
  // añade una fila al carril de texto o al de audio. la última fila siempre queda
  // libre para recibir un bloque, así que se puede seguir subiendo mientras haga
  // falta hasta el tope
  // enciende o apaga el silencio de un clip de video desde su propio bloque en la
  // línea de tiempo, sin pasar por ningún panel
  alternarSilencioClip: (id: string) => void
  // volumen del clip. dejarlo en cero equivale a silenciarlo y subirlo desde cero
  // le quita el silencio, para que el botón y el deslizador cuenten lo mismo
  setVolumenClip: (id: string, volumen: number) => void
  // fundido de entrada o de salida, en segundos, de un clip de video o de un audio
  // importado. nunca pasa de la mitad de lo que dura el bloque, para que los dos
  // tramos no se coman el sonido entero
  setFundido: (id: string, lado: 'entrada' | 'salida', segundos: number) => void
  agregarNivelTexto: () => void
  agregarNivelAudio: () => void
  // lleva una capa a otra fila del carril de texto, o un audio o región a otra del
  // de audio. si la fila destino es la última vacía, el carril crece solo para
  // dejar de nuevo una libre encima
  moverCapaNivel: (id: string, nivel: number) => void
  moverAudioNivel: (id: string, nivel: number) => void
  // guía celeste que aparece mientras se arrastra un clip sobre la separación
  // entre dos niveles: guarda el índice donde nacería la pista nueva, o null si
  // ahora mismo no se está apuntando a ninguna separación
  insercionPista: number | null
  setInsercionPista: (indice: number | null) => void
  // instante (en segundos) donde se dibuja la línea guía del imantado mientras se
  // mueve o recorta un bloque. queda en null cuando no hay ningún enganche activo
  guiaImantado: number | null
  setGuiaImantado: (segundo: number | null) => void
  alternarSilencioPista: (indice: number) => void
  alternarOcultarPista: (indice: number) => void
  alternarBloquearPista: (indice: number) => void
  // sube o baja un nivel un puesto, llevándose consigo sus clips, su alto y sus
  // metadatos. 'arriba' lo acerca a la cima (índice mayor), 'abajo' al suelo
  reordenarPista: (indice: number, direccion: 'arriba' | 'abajo') => void

  agregarTexto: () => void
  agregarImagen: (src: string, anchoNatural: number, altoNatural: number) => void
  agregarCensura: () => void
  agregarFigura: (forma?: CapaFigura['forma'], x?: number, y?: number) => void
  // crea una capa de dibujo nueva desde el cabezal y devuelve su id, para poder
  // encadenar el primer trazo en el mismo gesto
  agregarTrazo: () => string
  actualizarCapa: (
    id: string,
    cambios:
      | Partial<CapaTexto>
      | Partial<CapaImagen>
      | Partial<CapaCensura>
      | Partial<CapaFigura>
      | Partial<CapaTrazo>,
  ) => void
  quitarCapa: (id: string) => void
  // clona una capa completa con nuevo id y los mismos datos (texto, estilo,
  // recorrido y trazos incluidos). devuelve el id de la copia para arrastrarla
  duplicarCapa: (id: string) => string | null
  // clona un clip de audio como uno independiente (nuevo id, sin vínculo). devuelve
  // el id de la copia para arrastrarla siguiendo el cursor
  duplicarAudio: (id: string) => string | null
  // orden de apilado de las capas: las capas se dibujan en el orden del array, así
  // que llevar una al final la pone delante de todo y al principio, detrás de todo
  traerAlFrente: (id: string) => void
  enviarAtras: (id: string) => void
  // portapapeles del editor: guarda una copia de lo que se copió con Ctrl+C, para
  // pegarlo con Ctrl+V. es transitorio, no entra en el guardado ni en el historial
  portapapeles:
    | { tipo: 'clip'; dato: Clip }
    | { tipo: 'capa'; dato: Capa }
    | { tipo: 'audio'; dato: ClipAudio }
    | null
  copiar: () => void
  pegar: () => void
  // conjunto de capas marcadas a la vez, para alinearlas o distribuirlas. la
  // capaSeleccionada es la principal (la última tocada); este array las lleva
  // todas. seleccionar con aditivo (shift) suma o quita del conjunto
  capasSeleccionadas: string[]
  seleccionarCapa: (id: string | null, aditivo?: boolean) => void
  // alinea las capas seleccionadas respecto al lienzo, por un borde o por el
  // centro, al estilo de un editor vectorial
  alinearCapas: (modo: 'izquierda' | 'centro-h' | 'derecha' | 'arriba' | 'centro-v' | 'abajo') => void
  // reparte el espacio entre las capas seleccionadas (hacen falta tres o más)
  distribuirCapas: (eje: 'horizontal' | 'vertical') => void
  moverCapaLienzo: (id: string, x: number, y: number) => void
  moverCapaTiempo: (id: string, nuevoInicio: number) => void
  recortarCapaTiempo: (id: string, lado: 'inicio' | 'fin', deltaSegundos: number) => void

  grabandoMovimiento: boolean
  setGrabandoMovimiento: (v: boolean) => void
  desplazarCapa: (id: string, dx: number, dy: number) => void
  registrarPunto: (id: string, playhead: number, x: number, y: number) => void
  quitarMovimiento: (id: string) => void
  // el recorrido grabado se puede retocar después: mover un nodo o borrarlo
  moverKeyframe: (id: string, indice: number, x: number, y: number) => void
  quitarKeyframe: (id: string, indice: number) => void
  // fija los tiradores de curvatura de un nodo (la tangente de la curva a su
  // paso). con undefined en ambos, el nodo vuelve a calcular su tangente solo
  setTiradorNodo: (id: string, indice: number, hx?: number, hy?: number) => void
  // reduce los cientos de puntos de una grabación a los que definen la forma
  simplificarCapa: (id: string) => void
  // a qué ritmo corre el video mientras se graba un recorrido
  velocidadGrabacion: number
  setVelocidadGrabacion: (v: number) => void
  // cuenta regresiva antes de empezar a grabar, para dar tiempo a colocar el
  // cursor. se puede apagar y elegir cuántos segundos dura
  cuentaActiva: boolean
  setCuentaActiva: (v: boolean) => void
  segundosCuenta: number
  setSegundosCuenta: (n: number) => void
  // segundos que restan de la cuenta en curso, o null si no hay ninguna corriendo
  cuentaEnCurso: number | null
  setCuentaEnCurso: (n: number | null) => void
  // momento en el que arrancó la grabación, para mostrar el tiempo transcurrido
  inicioGrabacion: number | null

  dibujandoMascara: boolean
  setDibujandoMascara: (v: boolean) => void
  anadirTrazo: (id: string, puntos: { x: number; y: number }[]) => void
  limpiarTrazos: (id: string) => void

  // trazos del lápiz libre sobre una capa de dibujo: añadir uno nuevo, deshacer
  // el último o vaciar la capa por completo
  anadirTrazoDibujo: (id: string, puntos: { x: number; y: number }[]) => void
  deshacerTrazoDibujo: (id: string) => void
  limpiarDibujo: (id: string) => void

  setVolumenGlobal: (v: number) => void
  agregarRegionAudio: () => void
  actualizarRegionAudio: (id: string, cambios: Partial<RegionAudio>) => void
  quitarRegionAudio: (id: string) => void
  // duplica una franja de volumen con nuevo id y los mismos valores. devuelve el
  // id de la copia para arrastrarla al soltar
  duplicarRegionAudio: (id: string) => string | null
  seleccionarRegion: (id: string | null) => void
  moverRegionAudio: (id: string, nuevoInicio: number) => void
  recortarRegionAudio: (id: string, lado: 'inicio' | 'fin', deltaSegundos: number) => void

  // audios importados sueltos en la pista de sonido, cada uno con su material
  audios: ClipAudio[]
  moverAudio: (id: string, nuevoInicio: number) => void
  recortarAudio: (id: string, lado: 'inicio' | 'fin', deltaSegundos: number) => void
  quitarAudio: (id: string) => void
  setVolumenAudio: (id: string, volumen: number) => void
  // borra en cascada todo lo que use un medio que se quita del proyecto: sus
  // clips de video, los audios importados desde él y las capas de imagen creadas
  // a partir de su object url. la url hace falta porque las capas de imagen no
  // guardan el id del asset, solo el src con el que se pintan
  quitarUsosDeAsset: (assetId: string, url: string) => void

  setHerramienta: (h: Herramienta) => void
  setLienzo: (ancho: number, alto: number) => void
  setLienzoAuto: () => void
  setColorFondo: (color: string) => void
  setFondo: (f: 'color' | 'desenfoque') => void
  setDesenfoqueFondo: (v: number) => void
  setMarco: (cambios: Partial<Marco>) => void
  irA: (t: number) => void
  reproducir: () => void
  pausar: () => void
  alternarReproduccion: () => void
  aplicarZoom: (factor: number) => void

  // historial de deshacer y rehacer. cada entrada es una instantánea del
  // documento (solo lo editable), sin la selección ni el cabezal ni el zoom
  pasado: Documento[]
  futuro: Documento[]
  // guarda el estado actual antes de una edición. se usa una sola vez por gesto:
  // varias llamadas seguidas de un mismo arrastre se funden en un único paso
  capturar: () => void
  // marca que el gesto en curso terminó, para que la siguiente edición abra un
  // paso nuevo aunque llegue enseguida. la dispara el soltar del ratón o la tecla
  finGesto: () => void
  // abre un paso de historial continuo mientras se escribe en un campo, para que
  // toda la edición cuente como uno solo; se cierra con finGesto al perder el foco
  abrirGesto: () => void
  deshacer: () => void
  rehacer: () => void
}

// el documento es lo único que entra al historial: el contenido editable del
// proyecto, nada de selección, cabezal, herramienta ni zoom. si mañana se añade
// un campo editable, hay que sumarlo también a esta lista
type Documento = Pick<
  EstadoEditor,
  | 'pista'
  | 'numPistas'
  | 'altosPista'
  | 'pistasMeta'
  | 'nivelesTexto'
  | 'nivelesAudio'
  | 'ordenCarriles'
  | 'capas'
  | 'marco'
  | 'volumenGlobal'
  | 'audioRegiones'
  | 'audios'
  | 'resolucion'
  | 'resolucionAuto'
  | 'lienzoManual'
  | 'colorFondo'
  | 'fondo'
  | 'desenfoqueFondo'
>

// toma la foto del documento a partir del estado. como el store siempre sustituye
// objetos y arrays en lugar de mutarlos, basta con quedarse con las referencias:
// nadie va a cambiarlas por debajo
function tomarDocumento(s: EstadoEditor): Documento {
  return {
    pista: s.pista,
    numPistas: s.numPistas,
    altosPista: s.altosPista,
    pistasMeta: s.pistasMeta,
    nivelesTexto: s.nivelesTexto,
    nivelesAudio: s.nivelesAudio,
    ordenCarriles: s.ordenCarriles,
    audios: s.audios,
    capas: s.capas,
    marco: s.marco,
    volumenGlobal: s.volumenGlobal,
    audioRegiones: s.audioRegiones,
    resolucion: s.resolucion,
    resolucionAuto: s.resolucionAuto,
    lienzoManual: s.lienzoManual,
    colorFondo: s.colorFondo,
    fondo: s.fondo,
    desenfoqueFondo: s.desenfoqueFondo,
  }
}

// vuelca una foto en el estado. si el elemento que estaba seleccionado ya no
// existe en la foto restaurada, la selección se limpia para no dejar apuntando a
// algo que desapareció; el resto de la selección y el cabezal se respetan
function restaurarDocumento(doc: Documento, s: EstadoEditor): Partial<EstadoEditor> {
  const clip = s.clipSeleccionado && doc.pista.clips.some((c) => c.id === s.clipSeleccionado)
    ? s.clipSeleccionado
    : null
  const capa = s.capaSeleccionada && doc.capas.some((c) => c.id === s.capaSeleccionada)
    ? s.capaSeleccionada
    : null
  const region = s.regionSeleccionada && doc.audioRegiones.some((r) => r.id === s.regionSeleccionada)
    ? s.regionSeleccionada
    : null
  return {
    ...doc,
    clipSeleccionado: clip,
    capaSeleccionada: capa,
    regionSeleccionada: region,
  }
}

// cuántos pasos guarda el historial hacia atrás; pasado ese tope se olvidan los
// más antiguos para no dejar que la memoria crezca sin freno
const MAX_HISTORIAL = 50

// nombres de las acciones que tocan el documento. son las únicas que se envuelven
// para capturar antes de mutar. seleccionar, mover el cabezal, el zoom o cambiar
// de herramienta no entran, porque no son parte de lo que se deshace
const ACCIONES_DOCUMENTO: (keyof EstadoEditor)[] = [
  'agregarDesdeAsset',
  'quitarClip',
  'separarAudio',
  'duplicarClip',
  'moverClip',
  'recortarClip',
  'estirarVelocidad',
  'setVelocidadClip',
  'setTono',
  'resetTono',
  'actualizarEncuadre',
  'resetEncuadre',
  'recortarClipImagen',
  'resetRecorteClipImagen',
  'agregarEfecto',
  'actualizarEfecto',
  'quitarEfecto',
  'setTransicion',
  'dividirEnCabezal',
  'cerrarHueco',
  'agregarPista',
  'insertarPistaEn',
  'quitarPista',
  'setAltoPista',
  'moverClipAPista',
  'alternarSilencioClip',
  'setVolumenClip',
  'setFundido',
  'quitarBloques',
  'moverBloques',
  'moverCarril',
  'agregarNivelTexto',
  'agregarNivelAudio',
  'moverCapaNivel',
  'moverAudioNivel',
  'alternarSilencioPista',
  'alternarOcultarPista',
  'alternarBloquearPista',
  'reordenarPista',
  'agregarTexto',
  'agregarImagen',
  'agregarCensura',
  'agregarFigura',
  'agregarTrazo',
  'actualizarCapa',
  'quitarCapa',
  'duplicarCapa',
  'duplicarAudio',
  'traerAlFrente',
  'enviarAtras',
  'pegar',
  'alinearCapas',
  'distribuirCapas',
  'moverCapaLienzo',
  'moverCapaTiempo',
  'recortarCapaTiempo',
  'desplazarCapa',
  'registrarPunto',
  'quitarMovimiento',
  'moverKeyframe',
  'quitarKeyframe',
  'setTiradorNodo',
  'simplificarCapa',
  'anadirTrazo',
  'limpiarTrazos',
  'anadirTrazoDibujo',
  'deshacerTrazoDibujo',
  'limpiarDibujo',
  'setVolumenGlobal',
  'agregarRegionAudio',
  'actualizarRegionAudio',
  'quitarRegionAudio',
  'duplicarRegionAudio',
  'moverRegionAudio',
  'recortarRegionAudio',
  'moverAudio',
  'recortarAudio',
  'quitarAudio',
  'setVolumenAudio',
  'quitarUsosDeAsset',
  'setLienzo',
  'setLienzoAuto',
  'setColorFondo',
  'setFondo',
  'setDesenfoqueFondo',
  'setMarco',
]

const pistaVacia: Track = { id: 'video-1', tipo: 'video', clips: [] }

// límites de la multipista: cuántos niveles se permiten y hasta dónde puede
// crecer o encogerse cada uno al estirar su borde inferior
const MAX_PISTAS = 6
// tope de filas para los carriles de texto y de audio. seis basta de sobra para
// repartir bloques solapados sin que la línea de tiempo crezca de forma absurda
const MAX_NIVELES = 6
const ALTO_PISTA_BASE = 64
const ALTO_PISTA_MIN = 40
const ALTO_PISTA_MAX = 160
const entre01 = (v: number) => Math.max(0, Math.min(1, v))

// metadatos de partida para un nivel recién nacido: rótulo con su número y los
// tres interruptores en reposo
const metaPista = (n: number): PistaMeta => ({
  id: crypto.randomUUID(),
  nombre: `Video ${n}`,
  silenciada: false,
  oculta: false,
  bloqueada: false,
})

// estado del editor: una pista de video con posiciones libres, las capas que se
// dibujan encima, el cabezal, la selección y el zoom. cada clip guarda la
// duración de su fuente para saber hasta dónde alargarse al recortar
export const useEditorStore = create<EstadoEditor>((set, get) => {
  // bandera del gesto en curso y sello de tiempo de la última captura. mientras
  // un gesto sigue abierto (por ejemplo, un arrastre) las capturas repetidas se
  // ignoran, así cientos de fotogramas de movimiento cuentan como un solo paso.
  // el tiempo es una red de seguridad por si el soltar del ratón no llega
  let capturado = false
  let ultimoSello = 0
  // mientras un campo de escritura tiene el foco se abre un gesto continuo: todas
  // las teclas cuentan como un solo paso aunque haya pausas largas, para que
  // deshacer no vaya letra a letra sino que revierta la edición entera de una vez
  let gestoContinuo = false

  // empuja la foto actual a la pila de pasado y borra el futuro, porque tras una
  // edición nueva ya no tiene sentido rehacer lo que se había deshecho
  const preparar = () => {
    const ahora = performance.now()
    if (capturado && (gestoContinuo || ahora - ultimoSello < 500)) {
      ultimoSello = ahora
      return
    }
    const s = get()
    const pasado = [...s.pasado, tomarDocumento(s)]
    if (pasado.length > MAX_HISTORIAL) pasado.shift()
    set({ pasado, futuro: [] })
    capturado = true
    ultimoSello = ahora
  }

  // al entrar en un campo de texto se arranca el gesto continuo. capturado vuelve
  // a false para que el primer cambio guarde la foto de antes de editar; a partir
  // de ahí todo se agrupa hasta que el campo pierde el foco
  const abrirGesto = () => {
    gestoContinuo = true
    capturado = false
  }

  const finGesto = () => {
    capturado = false
    gestoContinuo = false
  }

  const deshacer = () => {
    const s = get()
    if (s.pasado.length === 0) return
    const anterior = s.pasado[s.pasado.length - 1]
    // lo que se ve ahora pasa al futuro por si el usuario quiere rehacer
    const actual = tomarDocumento(s)
    capturado = false
    set({
      ...restaurarDocumento(anterior, s),
      pasado: s.pasado.slice(0, -1),
      futuro: [...s.futuro, actual],
    })
  }

  const rehacer = () => {
    const s = get()
    if (s.futuro.length === 0) return
    const siguiente = s.futuro[s.futuro.length - 1]
    const actual = tomarDocumento(s)
    capturado = false
    set({
      ...restaurarDocumento(siguiente, s),
      pasado: [...s.pasado, actual],
      futuro: s.futuro.slice(0, -1),
    })
  }

  const acciones: EstadoEditor = {
  pista: pistaVacia,
  numPistas: 1,
  altosPista: [64],
  pistasMeta: [metaPista(1)],
  nivelesTexto: 1,
  nivelesAudio: 1,
  ordenCarriles: ['video', 'audio', 'texto'],
  capas: [],
  playhead: 0,
  reproduciendo: false,
  clipSeleccionado: null,
  capaSeleccionada: null,
  capasSeleccionadas: [],
  bloquesSeleccionados: [],
  menuContextual: null,
  regionSeleccionada: null,
  herramienta: 'transiciones',
  pxPorSegundo: PX_POR_SEGUNDO_DEFECTO,
  anchoTimeline: 0,
  setAnchoTimeline: (px) => set({ anchoTimeline: px }),
  resolucion: { ancho: 1920, alto: 1080 },
  resolucionAuto: { ancho: 1920, alto: 1080 },
  lienzoManual: false,
  colorFondo: '#000000',
  fondo: 'color',
  desenfoqueFondo: 45,
  marco: { tipo: 'ninguno', color: '#ffffff', grosor: 30, radio: 40 },
  volumenGlobal: 1,
  audioRegiones: [],
  audios: [],
  grabandoMovimiento: false,
  dibujandoMascara: false,
  insercionPista: null,
  guiaImantado: null,
  portapapeles: null,

  // guarda una copia de lo seleccionado (clip, capa o audio) para pegarla luego
  copiar: () =>
    set((s) => {
      if (s.clipSeleccionado) {
        const c = s.pista.clips.find((x) => x.id === s.clipSeleccionado)
        return c ? { portapapeles: { tipo: 'clip', dato: structuredClone(c) } } : {}
      }
      if (s.capaSeleccionada) {
        const c = s.capas.find((x) => x.id === s.capaSeleccionada)
        return c ? { portapapeles: { tipo: 'capa', dato: structuredClone(c) } } : {}
      }
      if (s.regionSeleccionada) {
        const a = s.audios.find((x) => x.id === s.regionSeleccionada)
        return a ? { portapapeles: { tipo: 'audio', dato: structuredClone(a) } } : {}
      }
      return {}
    }),

  // pega lo copiado en el cabezal, con todas sus propiedades, y lo deja elegido.
  // los clips y las capas nuevas se ponen al final (delante del resto)
  pegar: () =>
    set((s) => {
      const p = s.portapapeles
      if (!p) return {}
      const ph = s.playhead
      if (p.tipo === 'clip') {
        const c = structuredClone(p.dato)
        c.id = crypto.randomUUID()
        c.inicio = ph
        c.efectos = c.efectos.map((e) => ({ ...e, id: crypto.randomUUID() }))
        return {
          pista: { ...s.pista, clips: [...s.pista.clips, c] },
          clipSeleccionado: c.id,
          capaSeleccionada: null,
          regionSeleccionada: null,
        }
      }
      if (p.tipo === 'capa') {
        const c = structuredClone(p.dato)
        c.id = crypto.randomUUID()
        c.inicio = ph
        return {
          capas: [...s.capas, c],
          capaSeleccionada: c.id,
          capasSeleccionadas: [c.id],
          clipSeleccionado: null,
          regionSeleccionada: null,
        }
      }
      const a = structuredClone(p.dato)
      a.id = crypto.randomUUID()
      a.inicio = ph
      a.vinculadoA = undefined
      return {
        audios: [...s.audios, a],
        regionSeleccionada: a.id,
        clipSeleccionado: null,
        capaSeleccionada: null,
      }
    }),

  // devuelve el documento a su estado de estreno. se usa al crear un proyecto
  // nuevo, para que no arrastre nada del que estaba abierto antes: ni clips, ni
  // capas, ni audios, ni el historial de deshacer
  reiniciar: () =>
    set({
      pista: { id: 'video-1', tipo: 'video', clips: [] },
      numPistas: 1,
      altosPista: [64],
      pistasMeta: [metaPista(1)],
      nivelesTexto: 1,
      nivelesAudio: 1,
      ordenCarriles: ['video', 'audio', 'texto'],
      capas: [],
      playhead: 0,
      reproduciendo: false,
      clipSeleccionado: null,
      capaSeleccionada: null,
      capasSeleccionadas: [],
      regionSeleccionada: null,
      pxPorSegundo: PX_POR_SEGUNDO_DEFECTO,
      resolucion: { ancho: 1920, alto: 1080 },
      resolucionAuto: { ancho: 1920, alto: 1080 },
      lienzoManual: false,
      colorFondo: '#000000',
      fondo: 'color',
      desenfoqueFondo: 45,
      marco: { tipo: 'ninguno', color: '#ffffff', grosor: 30, radio: 40 },
      volumenGlobal: 1,
      audioRegiones: [],
      audios: [],
      grabandoMovimiento: false,
      dibujandoMascara: false,
      insercionPista: null,
      guiaImantado: null,
      pasado: [],
      futuro: [],
    }),

  agregarDesdeAsset: (asset, destino) =>
    set((s) => {
      // una imagen no ocupa un nivel de video: entra como capa desde el cabezal,
      // con una duración corta que se ajusta si el montaje termina antes, igual
      // que la imagen que se coloca desde su propio panel
      if (asset.clase === 'imagen') {
        const capa = crearCapaImagen(s.playhead, asset.url, asset.ancho, asset.alto)
        const DUR_IMAGEN = 5
        const fin = duracionTotal(s.pista.clips)
        const disponible = fin > s.playhead ? fin - s.playhead : DUR_IMAGEN
        // nunca por debajo de cuatro segundos, aunque el montaje termine antes
        capa.duracion = Math.max(4, Math.min(DUR_IMAGEN, disponible))
        return { capas: [...s.capas, capa], capaSeleccionada: capa.id, clipSeleccionado: null }
      }

      // un audio importado va a la pista de sonido como un clip propio, pegado al
      // final de lo que ya haya ahí, con su duración completa y a volumen normal
      if (asset.clase === 'audio') {
        const inicio = s.audios.reduce((t, a) => Math.max(t, a.inicio + a.duracion), 0)
        const audio: ClipAudio = {
          id: crypto.randomUUID(),
          assetId: asset.id,
          inicio,
          duracion: asset.duracion,
          recorteInicio: 0,
          duracionFuente: asset.duracion,
          volumen: 1,
        }
        return { audios: [...s.audios, audio], regionSeleccionada: null, clipSeleccionado: null, capaSeleccionada: null }
      }

      // por defecto los tres arrays de niveles se quedan como están; solo cambian
      // si el arrastre pidió abrir una pista nueva en una separación
      let numPistas = s.numPistas
      let altosPista = s.altosPista
      let pistasMeta = s.pistasMeta
      let clipsPrevios = s.pista.clips
      let pistaDestino = destino?.pista ?? 0

      // cuando se suelta sobre una separación se abre allí un nivel, empujando
      // hacia arriba lo que ya vivía en ese índice o por encima, igual que hace
      // insertarPistaEn al soltar un clip. si no queda cupo, el medio cae en la
      // pista base y no se crea nada
      const quiereInsertar = destino?.insertarEn != null && s.numPistas < MAX_PISTAS
      if (quiereInsertar) {
        const k = Math.max(0, Math.min(s.numPistas, destino!.insertarEn!))
        clipsPrevios = clipsPrevios.map((c) => (c.pista >= k ? { ...c, pista: c.pista + 1 } : c))
        altosPista = [...altosPista]
        altosPista.splice(k, 0, ALTO_PISTA_BASE)
        pistasMeta = [...pistasMeta]
        pistasMeta.splice(k, 0, metaPista(s.numPistas + 1))
        numPistas = s.numPistas + 1
        pistaDestino = k
      } else {
        // sin inserción, el destino se sujeta al rango de niveles existentes
        pistaDestino = Math.max(0, Math.min(s.numPistas - 1, pistaDestino))
      }

      // el medio entra al final de SU nivel de destino, no del proyecto entero,
      // para que lo apilado en otros niveles no lo empuje hacia adelante y para
      // que aterrice pegado a lo que ya hubiera en esa misma pista
      const inicio = duracionTotal(clipsPrevios.filter((c) => c.pista === pistaDestino))
      const clip = {
        id: crypto.randomUUID(),
        assetId: asset.id,
        inicio,
        pista: pistaDestino,
        duracion: asset.duracion,
        recorteInicio: 0,
        duracionFuente: asset.duracion,
        velocidad: 1,
        tono: { ...tonoNeutro },
        efectos: [] as EfectoClip[],
        transicion: { tipo: 'ninguna' as const, duracion: 0.5 },
      }
      // el primer clip fija la resolución automática del lienzo; solo se aplica
      // si el usuario no eligió una proporción a mano
      const primero = s.pista.clips.length === 0 && asset.ancho > 0
      const resolucionAuto = primero ? { ancho: asset.ancho, alto: asset.alto } : s.resolucionAuto
      const resolucion = primero && !s.lienzoManual ? resolucionAuto : s.resolucion
      // al colocar el video se reajusta el zoom para que su duración entera quepa
      // en el ancho visible; así no hace falta alejar a mano para ver el clip
      // completo. si todavía no se conoce el ancho, el zoom se queda como estaba
      const nuevosClips = [...clipsPrevios, clip]
      const encaje = zoomParaEncuadrar(duracionTotal(nuevosClips), s.anchoTimeline)
      return {
        numPistas,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips: nuevosClips },
        clipSeleccionado: clip.id,
        capaSeleccionada: null,
        pxPorSegundo: encaje ?? s.pxPorSegundo,
        resolucion,
        resolucionAuto,
      }
    }),

  alternarBloque: (id) =>
    set((s) => ({
      bloquesSeleccionados: s.bloquesSeleccionados.includes(id)
        ? s.bloquesSeleccionados.filter((x) => x !== id)
        : [...s.bloquesSeleccionados, id],
    })),

  limpiarBloques: () => set({ bloquesSeleccionados: [] }),

  abrirMenuContextual: (m) => set({ menuContextual: m }),
  cerrarMenuContextual: () => set({ menuContextual: null }),

  moverBloques: (ids, delta) =>
    set((s) => {
      const dentro = new Set(ids)
      // el salto se recorta al que puede dar el bloque que esté más a la izquierda,
      // así el grupo se mueve en bloque en lugar de irse apelotonando contra el cero
      let minimo = Infinity
      s.pista.clips.forEach((c) => dentro.has(c.id) && (minimo = Math.min(minimo, c.inicio)))
      s.capas.forEach((c) => dentro.has(c.id) && (minimo = Math.min(minimo, c.inicio)))
      s.audios.forEach((a) => dentro.has(a.id) && (minimo = Math.min(minimo, a.inicio)))
      s.audioRegiones.forEach((r) => dentro.has(r.id) && (minimo = Math.min(minimo, r.inicio)))
      if (!Number.isFinite(minimo)) return {}
      const d = Math.max(delta, -minimo)
      const correr = <T extends { id: string; inicio: number }>(x: T): T =>
        dentro.has(x.id) ? { ...x, inicio: x.inicio + d } : x
      return {
        pista: { ...s.pista, clips: s.pista.clips.map(correr) },
        capas: s.capas.map(correr),
        audios: s.audios.map(correr),
        audioRegiones: s.audioRegiones.map(correr),
      }
    }),

  quitarBloques: (ids) =>
    set((s) => {
      const fuera = new Set(ids)
      // un id puede ser de cualquiera de los cuatro tipos, así que se barre cada
      // lista. borrar un video se lleva además el audio que se le separó
      const clipsFuera = s.pista.clips.filter((c) => fuera.has(c.id)).map((c) => c.id)
      return {
        pista: { ...s.pista, clips: s.pista.clips.filter((c) => !fuera.has(c.id)) },
        capas: s.capas.filter((c) => !fuera.has(c.id)),
        audios: s.audios.filter(
          (a) => !fuera.has(a.id) && !(a.vinculadoA && clipsFuera.includes(a.vinculadoA)),
        ),
        audioRegiones: s.audioRegiones.filter((r) => !fuera.has(r.id)),
        bloquesSeleccionados: [],
        clipSeleccionado: null,
        capaSeleccionada: null,
        capasSeleccionadas: [],
        regionSeleccionada: null,
      }
    }),

  quitarClip: (id) =>
    set((s) => {
      const clips = s.pista.clips.filter((c) => c.id !== id)
      return {
        pista: { ...s.pista, clips },
        // borrar el video se lleva también el audio que se había separado de él
        audios: s.audios.filter((a) => a.vinculadoA !== id),
        clipSeleccionado: s.clipSeleccionado === id ? null : s.clipSeleccionado,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
    }),

  // separa el audio del video: marca el clip como mudo (su sonido ya no viene del
  // propio video) y suma a la pista de sonido el clip de audio decodificado, que
  // llega ya vinculado a este clip para moverse y borrarse junto a él
  separarAudio: (clipId, audio) =>
    set((s) => {
      // el audio que sale del video no debe aterrizar encima de lo que ya suena:
      // se busca la primera fila del carril que esté libre y, si todas están
      // ocupadas, se abre una nueva encima hasta llegar al tope
      const ocupados = new Set<number>([
        ...s.audios.map((a) => a.nivel ?? 0),
        ...s.audioRegiones.map((r) => r.nivel ?? 0),
      ])
      let destino = 0
      while (destino < MAX_NIVELES - 1 && ocupados.has(destino)) destino++
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => (c.id === clipId ? { ...c, mudo: true } : c)),
        },
        audios: [...s.audios, { ...audio, nivel: destino }],
        nivelesAudio: Math.max(s.nivelesAudio, destino + 1),
      }
    }),

  duplicarClip: (id) => {
    const s = get()
    const orig = s.pista.clips.find((c) => c.id === id)
    if (!orig) return null
    // la copia arranca clavada sobre el original; el arrastre que dispara el gesto
    // se encarga de llevarla a su sitio. structuredClone lleva consigo el tono con
    // sus ruedas y curvas, y los efectos, sin referencias compartidas con el padre
    const copia = structuredClone(orig)
    copia.id = crypto.randomUUID()
    // los efectos estrenan id propio: siguen siendo la misma cadena pero cada clip
    // los edita por su cuenta sin pisar al otro
    copia.efectos = copia.efectos.map((e) => ({ ...e, id: crypto.randomUUID() }))
    set({
      pista: { ...s.pista, clips: [...s.pista.clips, copia] },
      clipSeleccionado: copia.id,
      capaSeleccionada: null,
      regionSeleccionada: null,
    })
    return copia.id
  },

  moverClip: (id, nuevoInicio) =>
    set((s) => {
      const clip = s.pista.clips.find((c) => c.id === id)
      const inicio = Math.max(0, nuevoInicio)
      const delta = clip ? inicio - clip.inicio : 0
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => (c.id === id ? { ...c, inicio } : c)),
        },
        // el audio separado de este clip se desplaza lo mismo, para que no se
        // despegue del video con el que va acoplado
        audios: delta
          ? s.audios.map((a) =>
              a.vinculadoA === id ? { ...a, inicio: Math.max(0, a.inicio + delta) } : a,
            )
          : s.audios,
      }
    }),

  // cierra el hueco que empieza en `desde` dentro de un nivel concreto: lo que
  // venga después en esa misma pista se adelanta justo lo que medía el espacio
  // vacío. los demás niveles no se tocan, porque su sincronía con el video ya
  // colocado se perdería
  cerrarHueco: (desde, pista) =>
    set((s) => {
      const propios = s.pista.clips.filter((c) => c.pista === pista)
      const ordenados = [...propios].sort((a, b) => a.inicio - b.inicio)
      const siguiente = ordenados.find((c) => c.inicio >= desde - 0.0001)
      if (!siguiente) return {}
      const salto = siguiente.inicio - desde
      if (salto <= 0.0001) return {}
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) =>
            c.pista === pista && c.inicio >= desde - 0.0001
              ? { ...c, inicio: Math.max(0, c.inicio - salto) }
              : c,
          ),
        },
      }
    }),

  recortarClip: (id, lado, delta, base) =>
    set((s) => {
      const clips = s.pista.clips.map((c) => {
        if (c.id !== id) return c
        // el punto de partida es el estado del clip cuando arrancó el gesto; si
        // no llega (por ejemplo desde un atajo), se usa el estado actual. delta
        // es el desplazamiento total del cursor desde ese arranque, no un paso
        const b = base ?? c
        const v = b.velocidad
        if (lado === 'inicio') {
          // delta va en segundos de la pista; el punto de entrada en la fuente
          // avanza a razón de la velocidad. el borde derecho queda fijo
          const dMin = -b.recorteInicio / v
          const dMax = b.duracion - DURACION_MINIMA
          const d = Math.max(dMin, Math.min(delta, dMax))
          return {
            ...c,
            inicio: b.inicio + d,
            duracion: b.duracion - d,
            recorteInicio: b.recorteInicio + d * v,
          }
        }
        // borde derecho: no puede pasar del final del video fuente
        const dMin = DURACION_MINIMA - b.duracion
        const dMax = (b.duracionFuente - b.recorteInicio) / v - b.duracion
        const d = Math.max(dMin, Math.min(delta, dMax))
        return { ...c, duracion: b.duracion + d }
      })
      return { pista: { ...s.pista, clips }, playhead: Math.min(s.playhead, duracionTotal(clips)) }
    }),

  estirarVelocidad: (id, lado, delta, base) =>
    set((s) => {
      const clips = s.pista.clips.map((c) => {
        if (c.id !== id) return c
        // igual que en el recorte, se parte del estado que tenía el clip al
        // empezar el gesto y se aplica el desplazamiento total; así pasarse del
        // límite y volver no deja la velocidad descuadrada
        const b = base ?? c
        // los segundos reales de fuente que consume el clip no varían al estirar
        // con alt; lo que cambia es cuánto tiempo de pista ocupan, y de ahí sale
        // la nueva velocidad. estirar reparte el mismo trozo en más tiempo (más
        // lento) y encoger lo comprime en menos (más rápido)
        const consumidoFuente = b.duracion * b.velocidad
        if (lado === 'inicio') {
          // por el borde izquierdo el inicio se desplaza junto con la duración,
          // porque el final del clip permanece clavado en su sitio
          let duracionNueva = b.duracion - delta
          // la duración queda atada al rango de velocidad admitido (0.25 a 4x),
          // el mismo que ofrece el panel de velocidad
          const durMin = consumidoFuente / 4
          const durMax = consumidoFuente / 0.25
          duracionNueva = Math.max(durMin, Math.min(duracionNueva, durMax))
          let corrimiento = b.duracion - duracionNueva
          // el clip no puede empezar antes del cero de la línea de tiempo
          if (b.inicio + corrimiento < 0) {
            corrimiento = -b.inicio
            duracionNueva = b.duracion - corrimiento
          }
          return {
            ...c,
            inicio: b.inicio + corrimiento,
            duracion: duracionNueva,
            velocidad: consumidoFuente / duracionNueva,
          }
        }
        // borde derecho: el inicio no se mueve, solo se estira o encoge el final
        let duracionNueva = b.duracion + delta
        const durMin = consumidoFuente / 4
        const durMax = consumidoFuente / 0.25
        duracionNueva = Math.max(durMin, Math.min(duracionNueva, durMax))
        return { ...c, duracion: duracionNueva, velocidad: consumidoFuente / duracionNueva }
      })
      return { pista: { ...s.pista, clips }, playhead: Math.min(s.playhead, duracionTotal(clips)) }
    }),

  setVelocidadClip: (id, velocidad) =>
    set((s) => {
      const v = Math.max(0.25, Math.min(4, velocidad))
      const clips = s.pista.clips.map((c) => {
        if (c.id !== id) return c
        // se conserva el mismo trozo de fuente y se recalcula lo que ocupa en la
        // pista, igual que al cambiar la velocidad en un editor de escritorio
        const consumidoFuente = c.duracion * c.velocidad
        return { ...c, velocidad: v, duracion: consumidoFuente / v }
      })
      return { pista: { ...s.pista, clips }, playhead: Math.min(s.playhead, duracionTotal(clips)) }
    }),

  setTono: (id, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, tono: { ...c.tono, ...cambios } } : c,
        ),
      },
    })),

  resetTono: (id) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => (c.id === id ? { ...c, tono: { ...tonoNeutro } } : c)),
      },
    })),

  actualizarEncuadre: (id, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => {
          if (c.id !== id) return c
          // se parte del encuadre vigente, o del neutro si el clip aún no tenía
          const base = c.encuadre ?? { x: 0.5, y: 0.5, escala: 1 }
          return { ...c, encuadre: { ...base, ...cambios } }
        }),
      },
    })),

  resetEncuadre: (id) =>
    set((s) => ({
      pista: {
        ...s.pista,
        // quitar el encuadre por completo devuelve el clip al centrado natural
        clips: s.pista.clips.map((c) => (c.id === id ? { ...c, encuadre: undefined } : c)),
      },
    })),

  recortarClipImagen: (id, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => {
          if (c.id !== id) return c
          const base = c.recorte ?? { izq: 0, der: 0, arr: 0, aba: 0 }
          // cada lado se mantiene dentro de rango y sin cruzar al de enfrente, para
          // que el recuadro conserve al menos un mínimo de imagen visible
          const n = { ...base, ...cambios }
          const MIN = 0.05
          n.izq = Math.max(0, Math.min(1 - MIN - n.der, n.izq))
          n.der = Math.max(0, Math.min(1 - MIN - n.izq, n.der))
          n.arr = Math.max(0, Math.min(1 - MIN - n.aba, n.arr))
          n.aba = Math.max(0, Math.min(1 - MIN - n.arr, n.aba))
          return { ...c, recorte: n }
        }),
      },
    })),

  resetRecorteClipImagen: (id) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => (c.id === id ? { ...c, recorte: undefined } : c)),
      },
    })),

  agregarEfecto: (id, efecto) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, efectos: [...(c.efectos ?? []), efecto] } : c,
        ),
      },
    })),

  actualizarEfecto: (id, efectoId, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id
            ? {
                ...c,
                efectos: (c.efectos ?? []).map((e) =>
                  e.id === efectoId ? ({ ...e, ...cambios } as EfectoClip) : e,
                ),
              }
            : c,
        ),
      },
    })),

  quitarEfecto: (id, efectoId) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, efectos: (c.efectos ?? []).filter((e) => e.id !== efectoId) } : c,
        ),
      },
    })),

  setTransicion: (id, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, transicion: { ...c.transicion, ...cambios } } : c,
        ),
      },
    })),

  dividirEnCabezal: () =>
    set((s) => {
      const t = s.playhead
      const idx = s.pista.clips.findIndex(
        (c) => t > c.inicio + DURACION_MINIMA && t < c.inicio + c.duracion - DURACION_MINIMA,
      )
      if (idx === -1) return {}
      const c = s.pista.clips[idx]
      const offset = t - c.inicio
      const primera = { ...c, duracion: offset }
      const segunda = {
        ...c,
        id: crypto.randomUUID(),
        inicio: c.inicio + offset,
        recorteInicio: c.recorteInicio + offset * c.velocidad,
        duracion: c.duracion - offset,
      }
      const clips = [
        ...s.pista.clips.slice(0, idx),
        primera,
        segunda,
        ...s.pista.clips.slice(idx + 1),
      ]
      return { pista: { ...s.pista, clips }, clipSeleccionado: segunda.id }
    }),

  // seleccionar un clip ya no cambia la herramienta abierta: el panel del lado se
  // queda donde estaba, así elegir un video para reencuadrarlo o alinearlo no
  // arrastra al usuario fuera de donde estaba trabajando
  seleccionar: (id) =>
    set((s) => ({
      clipSeleccionado: id,
      capaSeleccionada: id ? null : s.capaSeleccionada,
      capasSeleccionadas: id ? [] : s.capasSeleccionadas,
      regionSeleccionada: id ? null : s.regionSeleccionada,
    })),

  limpiarSeleccion: () =>
    set({
      clipSeleccionado: null,
      capaSeleccionada: null,
      capasSeleccionadas: [],
      regionSeleccionada: null,
      bloquesSeleccionados: [],
    }),

  // el nivel nuevo aparece encima de los demás, vacío y con el alto estándar y
  // sus metadatos en reposo
  agregarPista: () =>
    set((s) => {
      if (s.numPistas >= MAX_PISTAS) return {}
      return {
        numPistas: s.numPistas + 1,
        altosPista: [...s.altosPista, ALTO_PISTA_BASE],
        pistasMeta: [...s.pistasMeta, metaPista(s.numPistas + 1)],
      }
    }),

  // abre un nivel intermedio en el índice pedido. todo lo que vivía en ese índice
  // o más arriba sube un puesto para dejarle sitio, y los tres arrays (clips por
  // su campo pista, altos y metadatos) se corren igual para no descuadrarse. si
  // llega un clip, se le muda al nivel recién nacido; así soltar entre dos pistas
  // crea la fila y deja el clip dentro de una sola pasada
  insertarPistaEn: (indice, clipId) =>
    set((s) => {
      if (s.numPistas >= MAX_PISTAS) return {}
      const k = Math.max(0, Math.min(s.numPistas, indice))
      const clips = s.pista.clips.map((c) => {
        if (clipId && c.id === clipId) return { ...c, pista: k }
        return c.pista >= k ? { ...c, pista: c.pista + 1 } : c
      })
      const altosPista = [...s.altosPista]
      altosPista.splice(k, 0, ALTO_PISTA_BASE)
      const pistasMeta = [...s.pistasMeta]
      pistasMeta.splice(k, 0, metaPista(s.numPistas + 1))
      return {
        numPistas: s.numPistas + 1,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips },
        clipSeleccionado: clipId ?? s.clipSeleccionado,
      }
    }),

  setInsercionPista: (indice) => set({ insercionPista: indice }),
  setGuiaImantado: (segundo) => set({ guiaImantado: segundo }),

  // al eliminar un nivel se van con él sus clips, y los que estaban por encima
  // bajan una posición para que no queden filas huecas en medio. su alto y sus
  // metadatos se retiran a la vez para que los tres arrays sigan cuadrando
  quitarPista: (indice) =>
    set((s) => {
      if (s.numPistas <= 1) return {}
      const clips = s.pista.clips
        .filter((c) => c.pista !== indice)
        .map((c) => (c.pista > indice ? { ...c, pista: c.pista - 1 } : c))
      const altosPista = s.altosPista.filter((_, i) => i !== indice)
      const pistasMeta = s.pistasMeta.filter((_, i) => i !== indice)
      const seguiaVivo = clips.some((c) => c.id === s.clipSeleccionado)
      return {
        numPistas: s.numPistas - 1,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips },
        clipSeleccionado: seguiaVivo ? s.clipSeleccionado : null,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
    }),

  alternarSilencioPista: (indice) =>
    set((s) => ({
      pistasMeta: s.pistasMeta.map((m, i) => (i === indice ? { ...m, silenciada: !m.silenciada } : m)),
    })),

  alternarOcultarPista: (indice) =>
    set((s) => ({
      pistasMeta: s.pistasMeta.map((m, i) => (i === indice ? { ...m, oculta: !m.oculta } : m)),
    })),

  alternarBloquearPista: (indice) =>
    set((s) => ({
      pistasMeta: s.pistasMeta.map((m, i) => (i === indice ? { ...m, bloqueada: !m.bloqueada } : m)),
    })),

  // intercambia un nivel con su vecino. los clips de ambos cambian su índice de
  // pista para viajar con la fila, y el alto y los metadatos se permutan igual,
  // de modo que lo que ves subir o bajar arrastra todo su contenido
  reordenarPista: (indice, direccion) =>
    set((s) => {
      const otro = direccion === 'arriba' ? indice + 1 : indice - 1
      if (otro < 0 || otro >= s.numPistas) return {}
      const clips = s.pista.clips.map((c) =>
        c.pista === indice
          ? { ...c, pista: otro }
          : c.pista === otro
            ? { ...c, pista: indice }
            : c,
      )
      const altosPista = [...s.altosPista]
      ;[altosPista[indice], altosPista[otro]] = [altosPista[otro], altosPista[indice]]
      const pistasMeta = [...s.pistasMeta]
      ;[pistasMeta[indice], pistasMeta[otro]] = [pistasMeta[otro], pistasMeta[indice]]
      return { pista: { ...s.pista, clips }, altosPista, pistasMeta }
    }),

  setAltoPista: (indice, alto) =>
    set((s) => ({
      altosPista: s.altosPista.map((a, i) =>
        i === indice ? Math.round(Math.min(ALTO_PISTA_MAX, Math.max(ALTO_PISTA_MIN, alto))) : a,
      ),
    })),

  moverClipAPista: (id, pista) =>
    set((s) => {
      const destino = Math.min(s.numPistas - 1, Math.max(0, pista))
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => (c.id === id ? { ...c, pista: destino } : c)),
        },
      }
    }),

  alternarSilencioClip: (id) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => {
          if (c.id !== id) return c
          const silenciado = !c.silenciado
          // al quitar el silencio de un clip que estaba a cero se le devuelve un
          // nivel audible; si no, el botón diría que suena y se seguiría sin oír
          const volumen = !silenciado && (c.volumen ?? 1) === 0 ? 1 : c.volumen
          return { ...c, silenciado, volumen }
        }),
      },
    })),

  setFundido: (id, lado, segundos) =>
    set((s) => {
      const campo = lado === 'entrada' ? 'fundidoEntrada' : 'fundidoSalida'
      const acotar = (x: { duracion: number }) => Math.max(0, Math.min(segundos, x.duracion / 2))
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => (c.id === id ? { ...c, [campo]: acotar(c) } : c)),
        },
        audios: s.audios.map((a) => (a.id === id ? { ...a, [campo]: acotar(a) } : a)),
      }
    }),

  setVolumenClip: (id, volumen) =>
    set((s) => {
      const v = Math.max(0, Math.min(2, volumen))
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) =>
            // bajar a cero es lo mismo que silenciar, y subir desde cero devuelve
            // el sonido: así el deslizador y el botón nunca se contradicen
            c.id === id ? { ...c, volumen: v, silenciado: v === 0 } : c,
          ),
        },
      }
    }),

  moverCarril: (carril, direccion) =>
    set((s) => {
      const orden = [...s.ordenCarriles]
      const i = orden.indexOf(carril)
      const j = i + direccion
      if (i < 0 || j < 0 || j >= orden.length) return {}
      ;[orden[i], orden[j]] = [orden[j], orden[i]]
      return { ordenCarriles: orden }
    }),

  agregarNivelTexto: () =>
    set((s) => (s.nivelesTexto >= MAX_NIVELES ? {} : { nivelesTexto: s.nivelesTexto + 1 })),

  agregarNivelAudio: () =>
    set((s) => (s.nivelesAudio >= MAX_NIVELES ? {} : { nivelesAudio: s.nivelesAudio + 1 })),

  moverCapaNivel: (id, nivel) =>
    set((s) => {
      const destino = Math.max(0, Math.min(MAX_NIVELES - 1, nivel))
      const capas = s.capas.map((c) => (c.id === id ? { ...c, nivel: destino } : c))
      // si el bloque sube a la última fila libre, el carril crece para que siempre
      // quede una vacía encima donde seguir separando
      const nivelesTexto = Math.max(s.nivelesTexto, Math.min(MAX_NIVELES, destino + 1))
      return { capas, nivelesTexto }
    }),

  moverAudioNivel: (id, nivel) =>
    set((s) => {
      const destino = Math.max(0, Math.min(MAX_NIVELES - 1, nivel))
      // el carril de audio comparte filas entre audios importados y regiones de
      // ganancia, así que se busca el id en ambas listas y se reubica donde toque
      const audios = s.audios.map((a) => (a.id === id ? { ...a, nivel: destino } : a))
      const audioRegiones = s.audioRegiones.map((r) => (r.id === id ? { ...r, nivel: destino } : r))
      const nivelesAudio = Math.max(s.nivelesAudio, Math.min(MAX_NIVELES, destino + 1))
      return { audios, audioRegiones, nivelesAudio }
    }),

  agregarTexto: () =>
    set((s) => {
      const capa = crearCapaTexto(s.playhead, s.resolucion.alto)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        capasSeleccionadas: [capa.id],
        clipSeleccionado: null,
        herramienta: 'texto',
      }
    }),

  agregarImagen: (src, anchoNatural, altoNatural) =>
    set((s) => {
      const capa = crearCapaImagen(s.playhead, src, anchoNatural, altoNatural)
      // una imagen recién puesta ocupa unos pocos segundos, no todo el proyecto:
      // arranca con una duración corta y, si el video ya colocado termina antes,
      // se ajusta hasta ese final para no sobrar por el borde derecho
      const DUR_IMAGEN = 5
      const finProyecto = duracionTotal(s.pista.clips)
      const disponible = finProyecto > s.playhead ? finProyecto - s.playhead : DUR_IMAGEN
      capa.duracion = Math.max(1, Math.min(DUR_IMAGEN, disponible))
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        capasSeleccionadas: [capa.id],
        clipSeleccionado: null,
        // sus opciones generales viven en Transformar; el color va a Tono y el
        // recorte a Recortar, ya que la imagen dejó de tener panel propio
        herramienta: 'transformar',
      }
    }),

  agregarCensura: () =>
    set((s) => {
      const capa = crearCapaCensura(s.playhead)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        capasSeleccionadas: [capa.id],
        clipSeleccionado: null,
        herramienta: 'censura',
      }
    }),

  agregarFigura: (forma, x, y) =>
    set((s) => {
      const capa = crearCapaFigura(s.playhead, forma, x, y)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        capasSeleccionadas: [capa.id],
        clipSeleccionado: null,
        herramienta: 'figura',
      }
    }),

  agregarTrazo: () => {
    const s = get()
    const capa = crearCapaTrazo(s.playhead)
    set({
      capas: [...s.capas, capa],
      capaSeleccionada: capa.id,
      capasSeleccionadas: [capa.id],
      clipSeleccionado: null,
      herramienta: 'dibujar',
    })
    return capa.id
  },

  actualizarCapa: (id, cambios) =>
    set((s) => ({
      capas: s.capas.map((c) => (c.id === id ? ({ ...c, ...cambios } as Capa) : c)),
    })),

  quitarCapa: (id) =>
    set((s) => ({
      capas: s.capas.filter((c) => c.id !== id),
      capaSeleccionada: s.capaSeleccionada === id ? null : s.capaSeleccionada,
    })),

  duplicarCapa: (id) => {
    const s = get()
    const orig = s.capas.find((c) => c.id === id)
    if (!orig) return null
    // el clon copia todo tal cual, incluidos keyframes del recorrido y trazos de
    // pincel, sin compartir arrays con la capa original
    const copia = structuredClone(orig)
    copia.id = crypto.randomUUID()
    set({
      capas: [...s.capas, copia],
      capaSeleccionada: copia.id,
      capasSeleccionadas: [copia.id],
      clipSeleccionado: null,
      regionSeleccionada: null,
    })
    return copia.id
  },

  duplicarAudio: (id) => {
    const s = get()
    const orig = s.audios.find((a) => a.id === id)
    if (!orig) return null
    // la copia es un audio independiente: estrena id y suelta el vínculo con el
    // video del que pudiera haber salido, para que se mueva por su cuenta
    const copia = { ...structuredClone(orig), id: crypto.randomUUID(), vinculadoA: undefined }
    set({
      audios: [...s.audios, copia],
      regionSeleccionada: copia.id,
      clipSeleccionado: null,
      capaSeleccionada: null,
    })
    return copia.id
  },

  traerAlFrente: (id) =>
    set((s) => {
      const capa = s.capas.find((c) => c.id === id)
      if (!capa) return {}
      // sacamos la capa de su sitio y la volvemos a poner al final: como el
      // dibujado recorre el array en orden, quedar de última la deja encima
      const resto = s.capas.filter((c) => c.id !== id)
      return { capas: [...resto, capa] }
    }),

  enviarAtras: (id) =>
    set((s) => {
      const capa = s.capas.find((c) => c.id === id)
      if (!capa) return {}
      // el movimiento inverso: al principio del array se dibuja primero y todo
      // lo demás le pasa por encima
      const resto = s.capas.filter((c) => c.id !== id)
      return { capas: [capa, ...resto] }
    }),

  seleccionarCapa: (id, aditivo) =>
    set((s) => {
      if (!id) {
        return { capaSeleccionada: null, capasSeleccionadas: [], clipSeleccionado: s.clipSeleccionado }
      }
      const capa = s.capas.find((c) => c.id === id)
      // con aditivo (shift) la capa entra o sale del conjunto sin borrar el
      // resto; sin aditivo la selección se reduce a esta sola
      const conjunto = aditivo
        ? s.capasSeleccionadas.includes(id)
          ? s.capasSeleccionadas.filter((x) => x !== id)
          : [...s.capasSeleccionadas, id]
        : [id]
      // el tipo de capa coincide con el nombre de su herramienta salvo la imagen y
      // el dibujo, que abren 'transformar' (sus opciones generales). el dibujo no
      // puede abrir 'dibujar' al elegirlo: con esa herramienta activa el arrastre
      // pinta en vez de mover, así que elegir un trazo lo dejaba imposible de
      // agarrar. quien quiera seguir pintando entra a Dibujar a propósito
      const herrCapa: Herramienta = capa
        ? capa.tipo === 'trazo' || capa.tipo === 'imagen'
          ? 'transformar'
          : capa.tipo
        : s.herramienta
      return {
        capaSeleccionada: conjunto[conjunto.length - 1] ?? null,
        capasSeleccionadas: conjunto,
        clipSeleccionado: null,
        regionSeleccionada: null,
        // al elegir una sola capa se abre su herramienta; sumando al conjunto no
        // se cambia de panel, para no sacar al usuario de donde estaba
        herramienta: !aditivo && capa ? herrCapa : s.herramienta,
      }
    }),

  alinearCapas: (modo) =>
    set((s) => {
      const aspecto = s.resolucion.ancho / s.resolucion.alto
      const marcadas = new Set(s.capasSeleccionadas)
      const capas = s.capas.map((c) => {
        if (!marcadas.has(c.id)) return c
        const { w, h } = medidaCapa(c, aspecto)
        let { x, y } = c
        if (modo === 'izquierda') x = w / 2
        else if (modo === 'centro-h') x = 0.5
        else if (modo === 'derecha') x = 1 - w / 2
        else if (modo === 'arriba') y = h / 2
        else if (modo === 'centro-v') y = 0.5
        else if (modo === 'abajo') y = 1 - h / 2
        return { ...c, x, y }
      })
      return { capas }
    }),

  distribuirCapas: (eje) =>
    set((s) => {
      const marcadas = s.capas.filter((c) => s.capasSeleccionadas.includes(c.id))
      // repartir solo tiene sentido con tres o más: los extremos quedan fijos y
      // los de en medio se separan a distancias iguales
      if (marcadas.length < 3) return {}
      const clave = eje === 'horizontal' ? 'x' : 'y'
      const orden = [...marcadas].sort((a, b) => a[clave] - b[clave])
      const min = orden[0][clave]
      const max = orden[orden.length - 1][clave]
      const paso = (max - min) / (orden.length - 1)
      const destino = new Map(orden.map((c, i) => [c.id, min + paso * i]))
      const capas = s.capas.map((c) =>
        destino.has(c.id) ? { ...c, [clave]: destino.get(c.id)! } : c,
      )
      return { capas }
    }),

  moverCapaLienzo: (id, x, y) =>
    set((s) => ({
      capas: s.capas.map((c) => (c.id === id ? { ...c, x: entre01(x), y: entre01(y) } : c)),
    })),

  moverCapaTiempo: (id, nuevoInicio) =>
    set((s) => ({
      capas: s.capas.map((c) => (c.id === id ? { ...c, inicio: Math.max(0, nuevoInicio) } : c)),
    })),

  recortarCapaTiempo: (id, lado, delta) =>
    set((s) => ({
      capas: s.capas.map((c) => {
        if (c.id !== id) return c
        if (lado === 'inicio') {
          const fin = c.inicio + c.duracion
          const nuevoInicio = Math.max(0, Math.min(c.inicio + delta, fin - DURACION_MINIMA_CAPA))
          return { ...c, inicio: nuevoInicio, duracion: fin - nuevoInicio }
        }
        return { ...c, duracion: Math.max(DURACION_MINIMA_CAPA, c.duracion + delta) }
      }),
    })),

  setGrabandoMovimiento: (v) =>
    set((s) => {
      // al parar de grabar, el recorrido recién capturado se simplifica solo: se
      // graba a pulso y quedan cientos de puntos que hay que reducir para poder
      // editarlos. al arrancar se guarda el instante, para el cronómetro
      if (!v && s.grabandoMovimiento) {
        const id = s.capaSeleccionada
        return {
          grabandoMovimiento: false,
          inicioGrabacion: null,
          capas: s.capas.map((c) =>
            c.id === id && c.keyframes.length > 2
              ? { ...c, keyframes: simplificarRecorrido(c.keyframes) }
              : c,
          ),
        }
      }
      return {
        grabandoMovimiento: v,
        inicioGrabacion: v ? performance.now() : null,
      }
    }),

  simplificarCapa: (id) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id && c.keyframes.length > 2
          ? { ...c, keyframes: simplificarRecorrido(c.keyframes) }
          : c,
      ),
    })),

  cuentaActiva: true,
  setCuentaActiva: (v) => set({ cuentaActiva: v }),
  segundosCuenta: 3,
  setSegundosCuenta: (n) => set({ segundosCuenta: Math.max(1, Math.min(10, Math.round(n))) }),
  cuentaEnCurso: null,
  setCuentaEnCurso: (n) => set({ cuentaEnCurso: n }),
  inicioGrabacion: null,

  // desplaza una capa completa: mueve su posición fija y, si tiene recorrido,
  // arrastra todos sus puntos a la vez para conservar la forma del movimiento
  desplazarCapa: (id, dx, dy) =>
    set((s) => ({
      capas: s.capas.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          x: entre01(c.x + dx),
          y: entre01(c.y + dy),
          keyframes: c.keyframes.map((k) => ({ ...k, x: entre01(k.x + dx), y: entre01(k.y + dy) })),
        }
      }),
    })),

  // registra un punto del recorrido en el instante actual. si ya hay uno muy
  // cerca en el tiempo, lo reemplaza; si no, lo inserta en orden
  registrarPunto: (id, playhead, x, y) =>
    set((s) => ({
      capas: s.capas.map((c) => {
        if (c.id !== id) return c
        const t = Math.max(0, Math.min(playhead - c.inicio, c.duracion))
        const punto = { t, x: entre01(x), y: entre01(y) }
        const otros = c.keyframes.filter((k) => Math.abs(k.t - t) > 0.03)
        const keyframes = [...otros, punto].sort((a, b) => a.t - b.t)
        return { ...c, keyframes }
      }),
    })),

  quitarMovimiento: (id) =>
    set((s) => ({
      capas: s.capas.map((c) => (c.id === id ? { ...c, keyframes: [] } : c)),
    })),

  moverKeyframe: (id, indice, x, y) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id
          ? {
              ...c,
              // solo cambia dónde pasa la capa, no cuándo: el instante de cada
              // nodo se respeta para no descuadrar el recorrido con el video
              keyframes: c.keyframes.map((k, i) =>
                i === indice
                  ? { ...k, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) }
                  : k,
              ),
            }
          : c,
      ),
    })),

  quitarKeyframe: (id, indice) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id ? { ...c, keyframes: c.keyframes.filter((_, i) => i !== indice) } : c,
      ),
    })),

  setTiradorNodo: (id, indice, hx, hy) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id
          ? {
              ...c,
              // igual que al mover un nodo, el instante no cambia: solo se ajusta
              // la tangente. escribir hx/hy hace que posicionCapa deje de inferir
              // la pendiente y respete la curvatura que el usuario acaba de dar
              keyframes: c.keyframes.map((k, i) =>
                i === indice ? { ...k, hx, hy } : k,
              ),
            }
          : c,
      ),
    })),

  velocidadGrabacion: 0.5,
  setVelocidadGrabacion: (v) => set({ velocidadGrabacion: v }),

  setDibujandoMascara: (v) => set({ dibujandoMascara: v }),

  anadirTrazo: (id, puntos) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id && c.tipo === 'censura' ? { ...c, trazos: [...c.trazos, puntos] } : c,
      ),
    })),

  limpiarTrazos: (id) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id && c.tipo === 'censura' ? { ...c, trazos: [] } : c,
      ),
    })),

  anadirTrazoDibujo: (id, puntos) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id && c.tipo === 'trazo' ? { ...c, trazos: [...c.trazos, puntos] } : c,
      ),
    })),

  deshacerTrazoDibujo: (id) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id && c.tipo === 'trazo' ? { ...c, trazos: c.trazos.slice(0, -1) } : c,
      ),
    })),

  limpiarDibujo: (id) =>
    set((s) => ({
      capas: s.capas.map((c) =>
        c.id === id && c.tipo === 'trazo' ? { ...c, trazos: [] } : c,
      ),
    })),

  setVolumenGlobal: (v) => set({ volumenGlobal: Math.max(0, Math.min(2, v)) }),

  agregarRegionAudio: () =>
    set((s) => {
      const region = {
        id: crypto.randomUUID(),
        inicio: s.playhead,
        duracion: 2,
        ganancia: s.volumenGlobal,
      }
      return {
        audioRegiones: [...s.audioRegiones, region],
        regionSeleccionada: region.id,
        clipSeleccionado: null,
        capaSeleccionada: null,
        herramienta: 'audio',
      }
    }),

  actualizarRegionAudio: (id, cambios) =>
    set((s) => ({
      audioRegiones: s.audioRegiones.map((r) => (r.id === id ? { ...r, ...cambios } : r)),
    })),

  quitarRegionAudio: (id) =>
    set((s) => ({
      audioRegiones: s.audioRegiones.filter((r) => r.id !== id),
      regionSeleccionada: s.regionSeleccionada === id ? null : s.regionSeleccionada,
    })),

  duplicarRegionAudio: (id) => {
    const s = get()
    const orig = s.audioRegiones.find((r) => r.id === id)
    if (!orig) return null
    const copia = { ...orig, id: crypto.randomUUID() }
    set({
      audioRegiones: [...s.audioRegiones, copia],
      regionSeleccionada: copia.id,
      clipSeleccionado: null,
      capaSeleccionada: null,
    })
    return copia.id
  },

  seleccionarRegion: (id) =>
    set((s) => ({
      regionSeleccionada: id,
      clipSeleccionado: null,
      capaSeleccionada: null,
      herramienta: id ? 'audio' : s.herramienta,
    })),

  moverRegionAudio: (id, nuevoInicio) =>
    set((s) => ({
      audioRegiones: s.audioRegiones.map((r) =>
        r.id === id ? { ...r, inicio: Math.max(0, nuevoInicio) } : r,
      ),
    })),

  recortarRegionAudio: (id, lado, delta) =>
    set((s) => ({
      audioRegiones: s.audioRegiones.map((r) => {
        if (r.id !== id) return r
        if (lado === 'inicio') {
          const fin = r.inicio + r.duracion
          const nuevoInicio = Math.max(0, Math.min(r.inicio + delta, fin - DURACION_MINIMA_CAPA))
          return { ...r, inicio: nuevoInicio, duracion: fin - nuevoInicio }
        }
        return { ...r, duracion: Math.max(DURACION_MINIMA_CAPA, r.duracion + delta) }
      }),
    })),

  moverAudio: (id, nuevoInicio) =>
    set((s) => ({
      audios: s.audios.map((a) => (a.id === id ? { ...a, inicio: Math.max(0, nuevoInicio) } : a)),
    })),

  // recortar un audio por sus bordes. el borde de inicio mueve además el punto de
  // entrada en la fuente, y ninguno de los dos puede pasar de lo que dura el
  // material original ni bajar de la duración mínima
  recortarAudio: (id, lado, delta) =>
    set((s) => ({
      audios: s.audios.map((a) => {
        if (a.id !== id) return a
        if (lado === 'inicio') {
          const fin = a.inicio + a.duracion
          const dMin = -a.recorteInicio
          const dMax = a.duracion - DURACION_MINIMA_CAPA
          const d = Math.max(dMin, Math.min(delta, dMax))
          return { ...a, inicio: Math.max(0, a.inicio + d), duracion: fin - Math.max(0, a.inicio + d), recorteInicio: a.recorteInicio + d }
        }
        const tope = a.duracionFuente - a.recorteInicio
        return { ...a, duracion: Math.max(DURACION_MINIMA_CAPA, Math.min(tope, a.duracion + delta)) }
      }),
    })),

  quitarAudio: (id) =>
    set((s) => ({
      audios: s.audios.filter((a) => a.id !== id),
      regionSeleccionada: s.regionSeleccionada === id ? null : s.regionSeleccionada,
    })),

  setVolumenAudio: (id, volumen) =>
    set((s) => ({
      audios: s.audios.map((a) => (a.id === id ? { ...a, volumen: Math.max(0, Math.min(2, volumen)) } : a)),
    })),

  quitarUsosDeAsset: (assetId, url) =>
    set((s) => {
      // se van todos los rastros del medio en la línea de tiempo: los clips que
      // lo reproducen, los audios importados desde él y las capas de imagen que
      // apuntan a su url
      const clips = s.pista.clips.filter((c) => c.assetId !== assetId)
      const audios = s.audios.filter((a) => a.assetId !== assetId)
      const capas = s.capas.filter((c) => !(c.tipo === 'imagen' && c.src === url))
      // si lo que estaba seleccionado desapareció, esa marca queda huérfana y hay
      // que soltarla. la selección de audio comparte campo con las regiones de
      // ganancia, por eso se acepta como válida si sigue habiendo cualquiera de
      // las dos con ese id
      const clipSeleccionado = clips.some((c) => c.id === s.clipSeleccionado)
        ? s.clipSeleccionado
        : null
      const capaSeleccionada = capas.some((c) => c.id === s.capaSeleccionada)
        ? s.capaSeleccionada
        : null
      const regionSeleccionada =
        s.regionSeleccionada &&
        (s.audioRegiones.some((r) => r.id === s.regionSeleccionada) ||
          audios.some((a) => a.id === s.regionSeleccionada))
          ? s.regionSeleccionada
          : null
      return {
        pista: { ...s.pista, clips },
        audios,
        capas,
        clipSeleccionado,
        capaSeleccionada,
        regionSeleccionada,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
    }),

  setHerramienta: (h) => set({ herramienta: h }),

  setLienzo: (ancho, alto) => set({ resolucion: { ancho, alto }, lienzoManual: true }),

  setLienzoAuto: () => set((s) => ({ resolucion: { ...s.resolucionAuto }, lienzoManual: false })),

  setColorFondo: (color) => set({ colorFondo: color }),
  setFondo: (f) => set({ fondo: f }),
  setDesenfoqueFondo: (v) => set({ desenfoqueFondo: Math.max(1, Math.min(100, v)) }),

  setMarco: (cambios) => set((s) => ({ marco: { ...s.marco, ...cambios } })),

  irA: (t) =>
    // el cabezal se mueve libremente por el tiempo, incluso más allá del último
    // clip o con la pista vacía: hace falta para posicionarse antes de soltar un
    // medio o para dejar el cabezal donde empezará el siguiente. antes se topaba
    // con la duración total, que en una pista sin clips vale cero y dejaba el
    // cabezal clavado en el origen sin poder arrastrarlo
    set(() => ({ playhead: Math.max(0, t) })),

  reproducir: () =>
    set((s) => {
      const total = duracionTotal(s.pista.clips)
      if (total === 0) return {}
      const playhead = s.playhead >= total ? 0 : s.playhead
      return { reproduciendo: true, playhead }
    }),

  pausar: () => set({ reproduciendo: false }),

  alternarReproduccion: () => (get().reproduciendo ? get().pausar() : get().reproducir()),

  aplicarZoom: (factor) =>
    set((s) => ({
      pxPorSegundo: Math.max(PX_MIN, Math.min(PX_MAX, s.pxPorSegundo * factor)),
    })),

    pasado: [],
    futuro: [],
    capturar: preparar,
    finGesto,
    abrirGesto,
    deshacer,
    rehacer,
  }

  // cada acción que toca el documento se envuelve para que tome la foto justo
  // antes de mutar. así el historial se llena solo, sin salpicar de llamadas a
  // capturar() por toda la interfaz, y la lógica de coalescencia decide si el
  // gesto merece un paso nuevo o se funde con el anterior
  const tabla = acciones as unknown as Record<string, (...args: unknown[]) => unknown>
  for (const nombre of ACCIONES_DOCUMENTO) {
    const original = tabla[nombre]
    tabla[nombre] = (...args: unknown[]) => {
      preparar()
      return original(...args)
    }
  }

  return acciones
})
