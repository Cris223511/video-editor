import { create } from 'zustand'
import { Track, Clip, AjusteTono, Transicion, PistaMeta, EfectoClip, Encuadre } from '../types/timeline'
import { claveEfecto } from '../lib/efectos/catalogo'
import { MediaAsset } from '../types/media'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTexto, CapaTrazo, KeyframePos } from '../types/layers'
import { Impacto, TipoImpacto } from '../types/impacto'
import { colorPorDefectoImpacto, DUR_IMPACTO_DEF, FUERZA_IMPACTO_DEF } from '../lib/impactos/catalogo'
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
import { duracionTotal, duracionProyecto, clipEnTiempo } from '../lib/timeline/clips'
import { giradoUnCuarto } from '../lib/timeline/encuadre'

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

// a qué clips aplica un cambio de un clip. si hay VARIOS clips seleccionados en conjunto
// (bloquesSeleccionados) y el que se edita es uno de ellos, el cambio se aplica a TODO el
// conjunto, no solo al líder: así, con varios clips marcados, un efecto o una corrección de color
// caen sobre todos a la vez. si no hay conjunto de clips, o el editado no forma parte, es solo ese
function clipsObjetivo(
  s: { pista: { clips: { id: string }[] }; bloquesSeleccionados: string[] },
  id: string,
): Set<string> {
  const enClips = new Set(s.pista.clips.map((c) => c.id))
  const conjunto = s.bloquesSeleccionados.filter((x) => enClips.has(x))
  if (conjunto.length > 1 && conjunto.includes(id)) return new Set(conjunto)
  return new Set([id])
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
  | 'borrador'

// las tres secciones que conviven en la línea de tiempo, cada una con sus filas.
// las figuras y las imágenes dejaron de tener carril propio: ahora viven dentro
// de las pistas de video, como un clip más, y su campo nivel apunta a esa pista
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
  // cuántas filas muestra el carril de texto y cuántas el de audio. arrancan en 1
  // y crecen cuando el usuario añade una, para repartir en varias alturas los
  // bloques que se pisan en el tiempo. cada capa, región o audio guarda en su
  // campo nivel en qué fila cae. las figuras y las imágenes ya no cuentan aquí:
  // su nivel apunta a una pista de video
  nivelesTexto: number
  nivelesAudio: number
  // nombres de los carriles de texto y audio, editables como el de una pista de
  // video. viven en el documento para guardarse y entrar en el historial
  nombreCarrilTexto: string
  nombreCarrilAudio: string
  renombrarCarril: (carril: 'texto' | 'audio', nombre: string) => void
  // alto de cada fila de los carriles de audio y texto, ajustable por el usuario
  // igual que el de una pista de video. cada carril lleva el suyo, así que estirar
  // uno no toca al otro
  altoFilaAudio: number
  altoFilaTexto: number
  setAltoCarril: (carril: 'audio' | 'texto', alto: number) => void
  // ancho de la columna de cabeceras de la línea de tiempo, ajustable arrastrando
  // su borde. es una preferencia de vista, no del documento, así que no entra en el
  // historial ni se guarda por proyecto
  anchoCabeceras: number
  setAnchoCabeceras: (ancho: number) => void
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
  // lado de la transición que el panel de transiciones muestra activo (inicio o final del clip). se
  // sincroniza al agarrar una cuña en la línea de tiempo, para que se resalte la que de verdad se tocó
  ladoTransicion: 'inicio' | 'final'
  herramienta: Herramienta
  // categoría abierta del panel contextual de la derecha. es de vista, no del
  // documento, pero vive en el store para que los overlays del visor (el recuadro
  // de recorte, por ejemplo) sepan cuándo aparecer al abrirla desde ahí
  categoriaClip: string | null
  setCategoriaClip: (c: string | null) => void
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
  // giro del relleno borroso, en pasos de 90° (0/90/180/270). solo orienta el fondo,
  // no el video de delante
  fondoGiro: number
  marco: Marco
  volumenGlobal: number
  // volumen de monitorización de la vista previa, de 0 a 1. es solo para escuchar el
  // montaje mientras se edita: no se guarda en el proyecto ni entra en la exportación,
  // por eso vive aparte del volumen general. arranca al máximo en cada sesión
  volumenPreview: number
  audioRegiones: RegionAudio[]

  // trae un medio a la línea de tiempo. sin destino aterriza al final de la pista
  // base, como siempre; con destino se puede pedir un nivel concreto (pista) o
  // abrir uno nuevo en una separación (insertarEn), que es lo que necesita el
  // arrastre desde el panel para soltar justo donde la guía prometió
  agregarDesdeAsset: (
    asset: MediaAsset,
    destino?: { pista?: number; insertarEn?: number; audioNivel?: number; insertarAudioEn?: number },
  ) => void
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
  // gira el clip un cuarto de vuelta y, de paso, adapta el lienzo a la orientación
  // del video ya girado, para que lo llene limpio en lugar de quedarse echado con
  // bandas. delta es el giro en grados (normalmente ±90)
  girarClip: (id: string, delta: number) => void
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
  reordenarEfecto: (id: string, efectoId: string, dir: -1 | 1) => void
  moverEfectoA: (id: string, efectoId: string, indice: number) => void
  reemplazarEfecto: (id: string, efectoId: string, nuevo: EfectoClip) => void
  ponerEfectoEncima: (id: string, efecto: EfectoClip) => void
  setTransicion: (id: string, cambios: Partial<Transicion>) => void
  // duración de aparición del color y los efectos del clip; 0 la apaga
  setTransicionEfecto: (id: string, duracion: number) => void
  // la transición con la que el clip se va. arranca en fundido a negro medio
  // segundo la primera vez que se toca, para no obligar a elegir dos cosas
  setTransicionSalida: (id: string, cambios: Partial<Transicion>) => void
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
  // marca de golpe un conjunto de bloques, reemplazando lo que hubiera. la usa el
  // recuadro de arrastre de la línea de tiempo al soltar
  marcarBloques: (ids: string[]) => void
  // grupos fijos: unen varios bloques para moverlos juntos con un solo arrastre y verlos con un
  // color común. sobreviven al guardado. agrupar arma uno con lo que esté marcado; grupoDe dice a
  // qué grupo pertenece un bloque (o null); el color se puede cambiar
  grupos: import('../types/timeline').Grupo[]
  grupoDe: (id: string) => import('../types/timeline').Grupo | null
  agrupar: () => void
  desagrupar: (grupoId: string) => void
  setColorGrupo: (grupoId: string, color: string) => void
  // menú que sale al pulsar con el botón derecho sobre un bloque de la línea de
  // tiempo. guarda dónde se pulsó y sobre qué, y de ahí sale lo que se ofrece
  menuContextual: { x: number; y: number; tipo: 'clip' | 'capa' | 'audio' | 'region' | 'pista' | 'carril-audio' | 'carril-texto'; id: string } | null
  abrirMenuContextual: (m: { x: number; y: number; tipo: 'clip' | 'capa' | 'audio' | 'region' | 'pista' | 'carril-audio' | 'carril-texto'; id: string }) => void
  cerrarMenuContextual: () => void
  // ventana de confirmación global: cualquier sitio pide un aviso con su texto y su
  // acción, y se pinta con el mismo modal bonito de siempre en vez del feo del
  // navegador. es de vista, no entra al historial
  confirmacion: { titulo: string; mensaje: string; aceptar?: string; onAceptar: () => void } | null
  pedirConfirmacion: (c: { titulo: string; mensaje: string; aceptar?: string; onAceptar: () => void }) => void
  cerrarConfirmacion: () => void
  // borra de una vez todos los bloques marcados, sea cual sea su tipo
  quitarBloques: (ids: string[]) => void

  // impactos: efectos momentáneos que viven encima de un clip (un rebote, un
  // flash, una sacudida). se arrastran desde el panel derecho a un clip y afectan
  // a todo lo que se ve en ese instante. su bolita se selecciona aparte de los
  // clips y capas, y al elegirla se abre su editor en el panel de la derecha
  impactos: Impacto[]
  impactoSeleccionado: string | null
  // crea un impacto en el segundo t con el tipo indicado (rebote por defecto). el
  // t sale de dónde se soltó la bolita sobre el clip
  agregarImpacto: (t: number, tipo?: TipoImpacto) => void
  moverImpacto: (id: string, t: number) => void
  // cambia cuánto dura, arrastrando la rayita de debajo de la bolita
  recortarImpacto: (id: string, duracion: number) => void
  actualizarImpacto: (id: string, cambios: Partial<Impacto>) => void
  quitarImpacto: (id: string) => void
  // clona un impacto en otro instante, conservando todo lo demás (tipo, color,
  // fuerza, dirección). devuelve el id de la copia para poder arrastrarla al vuelo
  // con Alt, o null si el original ya no existe
  duplicarImpacto: (id: string, t: number) => string | null
  seleccionarImpacto: (id: string | null) => void
  // desplaza en el tiempo todos los bloques marcados a la vez, sumando el mismo
  // salto a cada uno. ninguno baja de cero, y si uno topa con el arranque el resto
  // se frena con él para no descuadrar el conjunto
  moverBloques: (ids: string[], delta: number) => void
  // mueve un conjunto de bloques a partir de sus posiciones ORIGINALES (capturadas al empezar el
  // gesto): cada uno queda en origen + delta. es idempotente por fotograma (no acumula), así el
  // grupo sigue al cursor a la par en vez de acelerarse
  moverBloquesDesde: (ids: string[], delta: number, origenes: Record<string, number>) => void

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
  // duplica una pista de video entera con sus clips, figuras e imágenes, en una
  // pista nueva justo encima
  duplicarPista: (indice: number) => void
  // quita las pistas de video que quedaron vacías (sin clips ni figuras ni
  // imágenes), conservando siempre al menos una. se llama al soltar un clip tras
  // moverlo, para que una fila que quedó sin nada desaparezca sola
  podarPistasVacias: () => void
  // la misma idea que podarPistasVacias pero para los carriles de audio y de texto:
  // al soltar un bloque tras moverlo, la fila que dejó sin nada se cierra sola. se
  // conserva siempre al menos una fila en cada carril
  podarNivelesAudioVacios: () => void
  podarNivelesTextoVacios: () => void
  // quita una fila del carril de texto o de audio con lo que contenga, y baja las
  // de encima. no se puede quedar el carril sin ninguna fila
  quitarNivelTexto: (nivel: number) => void
  quitarNivelAudio: (nivel: number) => void
  // permuta dos filas del carril de audio: todo lo que vive en una pasa a la otra
  // y viceversa. sirve para arrastrar un nivel entero arriba o abajo y decidir cuál
  // va primero, sin tener que mover sus bloques uno por uno
  intercambiarNivelAudio: (a: number, b: number) => void
  // lleva una capa a otra fila del carril de texto, o un audio o región a otra del
  // de audio. si la capa es figura o imagen, el nivel apunta a una pista de video
  // y se lleva ahí. si la fila destino es la última vacía, el carril crece solo
  // para dejar de nuevo una libre encima
  moverCapaNivel: (id: string, nivel: number) => void
  // abre una fila nueva encima de la indicada y muda ahí el bloque. las filas por
  // encima suben un puesto, igual que hace la inserción de niveles de video
  insertarNivelTexto: (nivel: number, id: string) => void
  insertarNivelAudio: (nivel: number, id: string) => void
  moverAudioNivel: (id: string, nivel: number) => void
  // guía celeste que aparece mientras se arrastra un clip sobre la separación
  // entre dos niveles: guarda el índice donde nacería la pista nueva, o null si
  // ahora mismo no se está apuntando a ninguna separación
  insercionPista: number | null
  // lo mismo pero para los carriles de audio y de texto: la fila nueva que nacería
  // al soltar un bloque de audio o de texto sobre una separación. cada uno lleva la
  // suya para poder dibujar su guía celeste, igual que la de las pistas de video
  insercionAudio: number | null
  insercionTexto: number | null
  setInsercionAudio: (nivel: number | null) => void
  setInsercionTexto: (nivel: number | null) => void
  // fila de audio o de texto que queda iluminada cuando el cursor pasa por encima
  // de una fila existente al mover un bloque. es el aviso de "aquí cae", el mismo
  // gesto que hace la pista de video con el clip. va aparte de la guía de fila
  // nueva: o se pinta la separación con la línea, o se sombrea la fila entera
  filaAudioResaltada: number | null
  filaTextoResaltada: number | null
  setFilaAudioResaltada: (nivel: number | null) => void
  setFilaTextoResaltada: (nivel: number | null) => void
  // lo que se está arrastrando ahora mismo por la línea de tiempo, para dibujar la
  // etiqueta que acompaña al cursor. null cuando no hay ningún gesto en marcha
  arrastreVivo: { etiqueta: string; x: number; y: number } | null
  setArrastreVivo: (a: { etiqueta: string; x: number; y: number } | null) => void
  // mientras se arrastra el separador que ancha o achica la columna de cabeceras, se
  // congelan las animaciones de posición de los bloques: si no, cada bloque se desliza
  // con suavizado detrás del cursor en vez de pegarse al ancho nuevo al instante
  congelarLayout: boolean
  setCongelarLayout: (v: boolean) => void
  // se enciende mientras se arrastra un CONJUNTO de bloques a la vez: durante ese gesto todos
  // los bloques seleccionados apagan su suavizado de posición, para que sigan al cursor a la par
  // y no parezca que se separan y se vuelven a juntar (solo el que iniciaba el gesto lo apagaba)
  arrastreBloques: boolean
  setArrastreBloques: (v: boolean) => void
  // instante que el visor muestra por encima del cabezal mientras se recorta un clip: así se ve
  // el fotograma del borde que se está arrastrando (con toda su edición) para saber desde dónde se
  // recorta. null cuando no se está recortando, y entonces manda el cabezal como siempre
  previsualizacion: number | null
  setPrevisualizacion: (t: number | null) => void
  // silueta fantasma de la copia mientras se arrastra un clip con Alt: dónde caería
  // (pista y segundo), cuánto mide y si el sitio está libre. la copia no se crea hasta
  // soltar en un hueco válido, así que hasta entonces esto es solo una vista previa
  fantasmaDup: { inicio: number; pista: number; duracion: number; valido: boolean } | null
  setFantasmaDup: (f: { inicio: number; pista: number; duracion: number; valido: boolean } | null) => void
  // crea una copia del clip en un sitio concreto (segundo y pista) solo si el tramo
  // está libre; devuelve el id de la copia o null si ahí no cabía
  duplicarClipEn: (id: string, inicio: number, pista: number) => string | null
  setInsercionPista: (indice: number | null) => void
  // instante (en segundos) donde se dibuja la línea guía del imantado mientras se
  // mueve o recorta un bloque. queda en null cuando no hay ningún enganche activo
  guiaImantado: number | null
  setGuiaImantado: (segundo: number | null) => void
  // true mientras se arrastra, redimensiona o recorta un elemento en el visor. el
  // visor lo usa para quitar el suavizado del transform durante el gesto, para que
  // la imagen siga al cursor uno a uno en vez de ir con retraso
  moviendoVisor: boolean
  setMoviendoVisor: (v: boolean) => void
  // recorte rápido: se enciende al hacer doble clic sobre un clip que ya tiene un
  // recorte, para editarlo en el visor sin abrir el panel de la derecha. un clic
  // simple no lo activa (solo selecciona), y se apaga al soltar la selección
  recorteRapido: boolean
  setRecorteRapido: (v: boolean) => void
  alternarSilencioPista: (indice: number) => void
  alternarOcultarPista: (indice: number) => void
  alternarBloquearPista: (indice: number) => void
  // sube o baja un nivel un puesto, llevándose consigo sus clips, su alto y sus
  // metadatos. 'arriba' lo acerca a la cima (índice mayor), 'abajo' al suelo
  reordenarPista: (indice: number, direccion: 'arriba' | 'abajo') => void
  renombrarPista: (indice: number, nombre: string) => void

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
  // qué se lleva por delante el borrador. 'todo' borra cualquier capa que toque;
  // el resto lo limita a un tipo, para poder limpiar los trazos sin arriesgar los
  // textos que hay al lado
  borradorFiltro: 'todo' | 'trazo' | 'figura' | 'texto' | 'imagen'
  setBorradorFiltro: (f: 'todo' | 'trazo' | 'figura' | 'texto' | 'imagen') => void
  borradorGrosor: number
  setBorradorGrosor: (v: number) => void
  // borra lo que el borrador toque en un punto del lienzo. de un dibujo se lleva
  // solo los trazos alcanzados, y si se queda sin ninguno desaparece la capa
  // entera; del resto de capas se lleva la capa completa
  borrarEn: (x: number, y: number, radio: number) => void
  traerAlFrente: (id: string) => void
  enviarAtras: (id: string) => void
  // portapapeles del editor: guarda una copia de lo que se copió con Ctrl+C, para
  // pegarlo con Ctrl+V. es transitorio, no entra en el guardado ni en el historial
  portapapeles:
    | { tipo: 'clip'; dato: Clip }
    | { tipo: 'capa'; dato: Capa }
    | { tipo: 'audio'; dato: ClipAudio }
    | { tipo: 'impacto'; dato: Impacto }
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
  // escala un dibujo alrededor del centro de lo trazado, para poder redimensionarlo
  // por sus tiradores como una imagen. mueve los puntos, así el exportador queda al día
  escalarTrazo: (id: string, factor: number) => void
  // el recorrido grabado se puede retocar después: mover un nodo o borrarlo
  moverKeyframe: (id: string, indice: number, x: number, y: number) => void
  quitarKeyframe: (id: string, indice: number) => void
  // añade un nodo en el instante t (relativo al arranque de la capa) con su posición,
  // para el pincel que mete puntos pulsando sobre la línea del recorrido
  insertarKeyframe: (id: string, t: number, x: number, y: number) => void
  // ablanda el recorrido llevando cada nodo hacia el promedio de sus vecinos
  suavizarCapa: (id: string) => void
  // modo pincel de nodos: con él activo, pulsar sobre la línea añade un punto y
  // pulsar sobre un nodo lo borra, con el cursor en forma de mira
  editandoNodos: boolean
  setEditandoNodos: (v: boolean) => void
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
  // qué capa se está grabando ahora mismo. sirve para que la reproducción ensanche
  // su bloque cuadro a cuadro mientras dura la toma, aunque el cursor no se mueva
  capaGrabando: string | null
  // una sesión de grabación está abierta desde que se pulsa grabar hasta que se
  // guarda o se cancela. dentro de ella se puede pausar y reanudar cuantas veces
  // haga falta, moviendo o cambiando el elemento entre medias
  grabacionActiva: boolean
  // copia del recorrido y del sitio del elemento al abrir la toma, por si se
  // cancela: así descartar deja la capa tal como estaba antes de grabar
  respaldoGrabacion: { id: string; keyframes: KeyframePos[]; duracion: number; x: number; y: number } | null
  // abre la toma sobre una capa: guarda el respaldo y deja todo listo para que la
  // cuenta regresiva y la reproducción arranquen la captura
  iniciarGrabacion: (id: string) => void
  // suelta el cursor o el espacio pausan la captura sin cerrar la toma
  pausarGrabacion: () => void
  reanudarGrabacion: () => void
  // cierra la toma quedándose con lo grabado, o descartándolo y volviendo al respaldo
  guardarGrabacion: () => void
  cancelarGrabacion: () => void
  // estira el bloque de la capa que se graba hasta el cabezal, para que no se corte
  // ni el elemento desaparezca mientras la toma avanza
  crecerCapaGrabando: (playhead: number) => void

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
  setVolumenPreview: (v: number) => void
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
  setFundidoAudio: (id: string, cambios: { fundidoEntrada?: number; fundidoSalida?: number }) => void
  // borra en cascada todo lo que use un medio que se quita del proyecto: sus
  // clips de video, los audios importados desde él y las capas de imagen creadas
  // a partir de su object url. la url hace falta porque las capas de imagen no
  // guardan el id del asset, solo el src con el que se pintan
  quitarUsosDeAsset: (assetId: string, url: string) => void

  setHerramienta: (h: Herramienta) => void
  setLadoTransicion: (lado: 'inicio' | 'final') => void
  setLienzo: (ancho: number, alto: number) => void
  setLienzoAuto: () => void
  setColorFondo: (color: string) => void
  setFondo: (f: 'color' | 'desenfoque') => void
  setDesenfoqueFondo: (v: number) => void
  setFondoGiro: (v: number) => void
  setMarco: (cambios: Partial<Marco>) => void
  irA: (t: number) => void
  reproducir: () => void
  pausar: () => void
  alternarReproduccion: () => void
  aplicarZoom: (factor: number) => void
  // ajusta el zoom para que todo el proyecto quepa en el ancho visible de la línea de tiempo
  ajustarZoomAlAncho: () => void

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
  | 'nombreCarrilTexto'
  | 'nombreCarrilAudio'
  | 'altoFilaAudio'
  | 'altoFilaTexto'
  | 'ordenCarriles'
  | 'capas'
  | 'impactos'
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
  | 'fondoGiro'
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
    nombreCarrilTexto: s.nombreCarrilTexto,
    nombreCarrilAudio: s.nombreCarrilAudio,
    altoFilaAudio: s.altoFilaAudio,
    altoFilaTexto: s.altoFilaTexto,
    ordenCarriles: s.ordenCarriles,
    audios: s.audios,
    capas: s.capas,
    impactos: s.impactos,
    marco: s.marco,
    volumenGlobal: s.volumenGlobal,
    audioRegiones: s.audioRegiones,
    resolucion: s.resolucion,
    resolucionAuto: s.resolucionAuto,
    lienzoManual: s.lienzoManual,
    colorFondo: s.colorFondo,
    fondo: s.fondo,
    desenfoqueFondo: s.desenfoqueFondo,
    fondoGiro: s.fondoGiro,
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
  'girarClip',
  'resetEncuadre',
  'recortarClipImagen',
  'resetRecorteClipImagen',
  'agregarEfecto',
  'actualizarEfecto',
  'quitarEfecto',
  'reordenarEfecto',
  'moverEfectoA',
  'reemplazarEfecto',
  'ponerEfectoEncima',
  'setTransicion',
  'setTransicionEfecto',
  'setTransicionSalida',
  'agregarImpacto',
  'moverImpacto',
  'recortarImpacto',
  'actualizarImpacto',
  'quitarImpacto',
  'duplicarImpacto',
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
  'moverBloquesDesde',
  'moverCarril',
  'agregarNivelTexto',
  'agregarNivelAudio',
  'duplicarPista',
  'podarPistasVacias',
  'podarNivelesAudioVacios',
  'podarNivelesTextoVacios',
  'quitarNivelTexto',
  'quitarNivelAudio',
  'intercambiarNivelAudio',
  'moverCapaNivel',
  'insertarNivelTexto',
  'insertarNivelAudio',
  'moverAudioNivel',
  'alternarSilencioPista',
  'alternarOcultarPista',
  'alternarBloquearPista',
  'reordenarPista',
  'renombrarPista',
  'renombrarCarril',
  'setAltoCarril',
  'agregarTexto',
  'agregarImagen',
  'agregarCensura',
  'agregarFigura',
  'agregarTrazo',
  'actualizarCapa',
  'quitarCapa',
  'duplicarCapa',
  'duplicarAudio',
  'borrarEn',
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
  'guardarGrabacion',
  'cancelarGrabacion',
  'quitarMovimiento',
  'escalarTrazo',
  'moverKeyframe',
  'quitarKeyframe',
  'insertarKeyframe',
  'suavizarCapa',
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
  'setFundidoAudio',
  'quitarUsosDeAsset',
  'setLienzo',
  'setLienzoAuto',
  'setColorFondo',
  'setFondo',
  'setDesenfoqueFondo',
  'setFondoGiro',
  'setMarco',
]

const pistaVacia: Track = { id: 'video-1', tipo: 'video', clips: [] }

// límites de la multipista: cuántos niveles se permiten y hasta dónde puede
// crecer o encogerse cada uno al estirar su borde inferior
const MAX_PISTAS = 6
// tope de filas para los carriles de texto y de audio. seis basta de sobra para
// repartir bloques solapados sin que la línea de tiempo crezca de forma absurda
const MAX_NIVELES = 6

// colores para sombrear los grupos de bloques. al armar un grupo se toma el primero que no esté en
// uso, así dos grupos distintos no se confunden; el usuario luego lo puede cambiar por cualquiera
const COLORES_GRUPO = ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16', '#3b82f6']
const ALTO_PISTA_BASE = 64
const ALTO_FILA_MAX = 120
// altura con la que nace cada carril, que además es su mínimo: se puede agrandar
// arrastrando pero no achicar por debajo de esto, porque más pequeño el rótulo y
// la onda ya no se leen. cada tipo trae la suya
const ALTO_FILA_DEF: Record<'audio' | 'texto', number> = {
  audio: 32,
  texto: 36,
}

// primera fila del carril de texto que no tiene ninguna capa. solo cuentan las
// capas que de verdad viven en ese carril (texto, censura y dibujo): las figuras
// y las imágenes se fueron a las pistas de video. se usa al crear un texto para
// que se reparta por niveles en vez de amontonarse
// dice si el tramo [ini, ini+dur) pisa a alguno de los otros bloques de la lista
// (que ya vienen filtrados a la misma fila). con esto se impide que dos clips o dos
// audios queden uno encima de otro en un mismo nivel; los overlays (texto, figuras,
// imágenes, dibujos) sí pueden solaparse y no pasan por aquí
function pisaAlguno(otros: { inicio: number; duracion: number }[], ini: number, dur: number): boolean {
  return otros.some((o) => ini < o.inicio + o.duracion && ini + dur > o.inicio)
}

// duración mínima que le queda a una transición (o cero si no tiene ninguna puesta)
const DURACION_MINIMA_TRANS = 0.1
function tieneTransicion(c: {
  transicion?: { tipo: string } | null
  transicionSalida?: { tipo: string } | null
}): boolean {
  return (
    (!!c.transicion && c.transicion.tipo !== 'ninguna') ||
    (!!c.transicionSalida && c.transicionSalida.tipo !== 'ninguna')
  )
}

// la duración mínima a la que puede encoger un clip o capa: la normal, salvo que
// tenga transiciones, en cuyo caso debe quedar sitio para que la de entrada y la de
// salida quepan sin pisarse (cada una como mínimo un cachito, y nunca más de la mitad)
function duracionMinimaCon(
  c: { transicion?: { tipo: string } | null; transicionSalida?: { tipo: string } | null },
  minBase: number,
): number {
  return tieneTransicion(c) ? Math.max(minBase, 2 * DURACION_MINIMA_TRANS) : minBase
}

// achica las transiciones de entrada y salida para que quepan en la duración actual:
// cada una como mucho la mitad, así el inicio y el fin nunca se solapan en el medio.
// se usa al recortar, cuando el elemento queda más corto que su transición
function limitarTransiciones<
  T extends {
    duracion: number
    transicion?: { tipo: string; duracion: number } | null
    transicionSalida?: { tipo: string; duracion: number } | null
  },
>(c: T): T {
  const max = c.duracion / 2
  let out = c
  if (c.transicion && c.transicion.tipo !== 'ninguna' && c.transicion.duracion > max) {
    out = { ...out, transicion: { ...c.transicion, duracion: Math.max(DURACION_MINIMA_TRANS, max) } }
  }
  if (c.transicionSalida && c.transicionSalida.tipo !== 'ninguna' && c.transicionSalida.duracion > max) {
    out = { ...out, transicionSalida: { ...c.transicionSalida, duracion: Math.max(DURACION_MINIMA_TRANS, max) } }
  }
  return out
}

// recoloca un inicio para que su tramo no pise a los vecinos de su fila: si cae
// encima de uno, se pega a su borde por el lado desde el que llega, de modo que los
// bloques quedan juntos pero nunca superpuestos. si el hueco no da, devuelve null
function inicioSinSolape(
  otros: { inicio: number; duracion: number }[],
  deseado: number,
  dur: number,
  inicioActual: number,
): number | null {
  let ini = Math.max(0, deseado)
  if (!pisaAlguno(otros, ini, dur)) return ini
  const haciaDerecha = deseado >= inicioActual
  const vecino = otros.find((o) => ini < o.inicio + o.duracion && ini + dur > o.inicio)
  if (vecino) ini = Math.max(0, haciaDerecha ? vecino.inicio - dur : vecino.inicio + vecino.duracion)
  return pisaAlguno(otros, ini, dur) ? null : ini
}

// busca el sitio libre más cercano a `deseado` donde un tramo de `dur` no pise a
// ninguno de `otros`. si el punto deseado ya está despejado se queda ahí; si no,
// prueba pegarse al borde de cada vecino (justo antes o justo después) y se queda
// con el hueco más próximo. como el carril no termina por la derecha siempre hay uno
// tras el último bloque, así que subir un bloque que asomaba por debajo de otro lo
// encaja al lado en lugar de dejarlo trabado
function huecoMasCercano(otros: { inicio: number; duracion: number }[], deseado: number, dur: number): number {
  const d = Math.max(0, deseado)
  if (!pisaAlguno(otros, d, dur)) return d
  const candidatos = [0]
  for (const o of otros) {
    candidatos.push(o.inicio + o.duracion)
    candidatos.push(o.inicio - dur)
  }
  let mejor = d
  let mejorDist = Infinity
  for (const c of candidatos) {
    const x = Math.max(0, c)
    if (!pisaAlguno(otros, x, dur)) {
      const dist = Math.abs(x - deseado)
      if (dist < mejorDist) {
        mejorDist = dist
        mejor = x
      }
    }
  }
  return mejor
}

// poda pura de las pistas de video sin contenido: recibe las listas y sus metadatos
// y devuelve los campos ya recolocados, o null si no sobra ninguna fila. la comparten
// la acción de podar y las de borrar, para que quitar el último bloque de una fila la
// cierre igual que sacarlo de ella arrastrando
function calcularPodaVideo(
  clips: Clip[],
  capas: Capa[],
  numPistas: number,
  altosPista: number[],
  pistasMeta: PistaMeta[],
): { numPistas: number; altosPista: number[]; pistasMeta: PistaMeta[]; clips: Clip[]; capas: Capa[] } | null {
  if (numPistas <= 1) return null
  const ocupadas = new Set<number>()
  clips.forEach((c) => ocupadas.add(c.pista))
  capas.forEach((c) => {
    if (c.tipo === 'figura' || c.tipo === 'imagen') ocupadas.add(c.nivel ?? 0)
  })
  const conservar = Array.from({ length: numPistas }, (_, i) => i).filter((i) => ocupadas.has(i))
  if (conservar.length === numPistas) return null
  if (conservar.length === 0) conservar.push(0)
  const mapa = new Map<number, number>()
  conservar.forEach((viejo, nuevo) => mapa.set(viejo, nuevo))
  return {
    numPistas: conservar.length,
    altosPista: conservar.map((i) => altosPista[i]),
    pistasMeta: conservar.map((i) => pistasMeta[i]),
    clips: clips.map((c) => ({ ...c, pista: mapa.get(c.pista) ?? 0 })),
    capas: capas.map((c) =>
      c.tipo === 'figura' || c.tipo === 'imagen' ? { ...c, nivel: mapa.get(c.nivel ?? 0) ?? 0 } : c,
    ),
  }
}

// poda pura de las filas de audio vacías (audios importados y franjas de ganancia)
function calcularPodaAudio(
  audios: ClipAudio[],
  audioRegiones: RegionAudio[],
  nivelesAudio: number,
): { nivelesAudio: number; audios: ClipAudio[]; audioRegiones: RegionAudio[] } | null {
  if (nivelesAudio <= 1) return null
  const ocupados = new Set<number>()
  audios.forEach((a) => ocupados.add(a.nivel ?? 0))
  audioRegiones.forEach((r) => ocupados.add(r.nivel ?? 0))
  const conservar = Array.from({ length: nivelesAudio }, (_, i) => i).filter((i) => ocupados.has(i))
  if (conservar.length === nivelesAudio) return null
  if (conservar.length === 0) conservar.push(0)
  const mapa = new Map<number, number>()
  conservar.forEach((viejo, nuevo) => mapa.set(viejo, nuevo))
  const recolocar = <T extends { nivel?: number }>(x: T): T => ({ ...x, nivel: mapa.get(x.nivel ?? 0) ?? 0 })
  return { nivelesAudio: conservar.length, audios: audios.map(recolocar), audioRegiones: audioRegiones.map(recolocar) }
}

// poda pura de las filas de texto vacías (solo cuentan texto, dibujo y censura; las
// figuras e imágenes viven en las pistas de video)
function calcularPodaTexto(capas: Capa[], nivelesTexto: number): { nivelesTexto: number; capas: Capa[] } | null {
  if (nivelesTexto <= 1) return null
  const esTexto = (t: string) => t !== 'imagen' && t !== 'figura'
  const ocupados = new Set<number>()
  capas.forEach((c) => {
    if (esTexto(c.tipo)) ocupados.add(c.nivel ?? 0)
  })
  const conservar = Array.from({ length: nivelesTexto }, (_, i) => i).filter((i) => ocupados.has(i))
  if (conservar.length === nivelesTexto) return null
  if (conservar.length === 0) conservar.push(0)
  const mapa = new Map<number, number>()
  conservar.forEach((viejo, nuevo) => mapa.set(viejo, nuevo))
  return {
    nivelesTexto: conservar.length,
    capas: capas.map((c) => (esTexto(c.tipo) ? { ...c, nivel: mapa.get(c.nivel ?? 0) ?? 0 } : c)),
  }
}

const ANCHO_CABECERAS_MIN = 120
const ANCHO_CABECERAS_MAX = 360
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
  nombreCarrilTexto: 'Texto',
  nombreCarrilAudio: 'Audio',
  altoFilaAudio: 32,
  altoFilaTexto: 36,
  anchoCabeceras: 176,
  ordenCarriles: ['video', 'audio', 'texto'],
  capas: [],
  playhead: 0,
  reproduciendo: false,
  clipSeleccionado: null,
  capaSeleccionada: null,
  capasSeleccionadas: [],
  bloquesSeleccionados: [],
  grupos: [],
  borradorFiltro: 'todo',
  borradorGrosor: 24,
  menuContextual: null,
  confirmacion: null,
  insercionAudio: null,
  insercionTexto: null,
  filaAudioResaltada: null,
  filaTextoResaltada: null,
  regionSeleccionada: null,
  ladoTransicion: 'inicio',
  impactos: [],
  impactoSeleccionado: null,
  herramienta: 'proyecto',
  categoriaClip: null,
  pxPorSegundo: PX_POR_SEGUNDO_DEFECTO,
  anchoTimeline: 0,
  setAnchoTimeline: (px) => set({ anchoTimeline: px }),
  resolucion: { ancho: 1920, alto: 1080 },
  resolucionAuto: { ancho: 1920, alto: 1080 },
  lienzoManual: false,
  colorFondo: '#000000',
  fondo: 'color',
  desenfoqueFondo: 45,
  fondoGiro: 0,
  marco: { tipo: 'ninguno', color: '#ffffff', grosor: 30, radio: 40 },
  volumenGlobal: 1,
  volumenPreview: 1,
  audioRegiones: [],
  audios: [],
  grabandoMovimiento: false,
  dibujandoMascara: false,
  insercionPista: null,
  arrastreVivo: null,
  congelarLayout: false,
  arrastreBloques: false,
  previsualizacion: null,
  fantasmaDup: null,
  guiaImantado: null,
  portapapeles: null,

  // guarda una copia de lo seleccionado (clip, capa o audio) para pegarla luego
  copiar: () =>
    set((s) => {
      if (s.impactoSeleccionado) {
        const im = s.impactos.find((x) => x.id === s.impactoSeleccionado)
        return im ? { portapapeles: { tipo: 'impacto', dato: structuredClone(im) } } : {}
      }
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
      if (p.tipo === 'impacto') {
        // el impacto se pega justo al lado del que se copió, pegado a su final. no se
        // recorta contra el borde del clip: si se sale, se sale, tal como se pidió
        const im = structuredClone(p.dato)
        im.id = crypto.randomUUID()
        im.t = Math.max(0, p.dato.t + p.dato.duracion)
        return {
          impactos: [...s.impactos, im],
          impactoSeleccionado: im.id,
          clipSeleccionado: null,
          capaSeleccionada: null,
          capasSeleccionadas: [],
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
      altoFilaAudio: 32,
      altoFilaTexto: 36,
      nivelesAudio: 1,
      ordenCarriles: ['video', 'audio', 'texto'],
      capas: [],
      impactos: [],
      playhead: 0,
      reproduciendo: false,
      clipSeleccionado: null,
      capaSeleccionada: null,
      capasSeleccionadas: [],
      regionSeleccionada: null,
      impactoSeleccionado: null,
      pxPorSegundo: PX_POR_SEGUNDO_DEFECTO,
      resolucion: { ancho: 1920, alto: 1080 },
      resolucionAuto: { ancho: 1920, alto: 1080 },
      lienzoManual: false,
      colorFondo: '#000000',
      fondo: 'color',
      desenfoqueFondo: 45,
  fondoGiro: 0,
      marco: { tipo: 'ninguno', color: '#ffffff', grosor: 30, radio: 40 },
      volumenGlobal: 1,
      audioRegiones: [],
      audios: [],
      grabandoMovimiento: false,
      grabacionActiva: false,
      capaGrabando: null,
      respaldoGrabacion: null,
      dibujandoMascara: false,
      insercionPista: null,
      guiaImantado: null,
      moviendoVisor: false,
      recorteRapido: false,
      pasado: [],
      futuro: [],
    }),

  agregarDesdeAsset: (asset, destino) =>
    set((s) => {
      // un audio importado va a la pista de sonido como un clip propio. cae en la
      // fila que diga el destino (o se abre una nueva si se soltó en una separación),
      // pegado al final de lo que ya haya en esa fila para no solaparse con otro audio
      if (asset.clase === 'audio') {
        let audios = s.audios
        let audioRegiones = s.audioRegiones
        let nivel = destino?.audioNivel ?? 0
        let nivelesAudio = s.nivelesAudio
        if (destino?.insertarAudioEn != null && s.nivelesAudio < MAX_NIVELES) {
          const corte = Math.max(0, Math.min(s.nivelesAudio, destino.insertarAudioEn))
          const subir = <T extends { nivel?: number }>(x: T): T =>
            (x.nivel ?? 0) >= corte ? { ...x, nivel: (x.nivel ?? 0) + 1 } : x
          audios = audios.map(subir)
          audioRegiones = audioRegiones.map(subir)
          nivel = corte
          nivelesAudio = s.nivelesAudio + 1
        }
        const inicio = audios
          .filter((a) => (a.nivel ?? 0) === nivel)
          .reduce((t, a) => Math.max(t, a.inicio + a.duracion), 0)
        const audio: ClipAudio = {
          id: crypto.randomUUID(),
          assetId: asset.id,
          inicio,
          nivel,
          duracion: asset.duracion,
          recorteInicio: 0,
          duracionFuente: asset.duracion,
          volumen: 1,
        }
        return {
          audios: [...audios, audio],
          audioRegiones,
          nivelesAudio,
          regionSeleccionada: null,
          clipSeleccionado: null,
          capaSeleccionada: null,
        }
      }

      // por defecto los tres arrays de niveles se quedan como están; solo cambian
      // si el arrastre pidió abrir una pista nueva en una separación
      let numPistas = s.numPistas
      let altosPista = s.altosPista
      let pistasMeta = s.pistasMeta
      let clipsPrevios = s.pista.clips
      // las figuras e imágenes que ya viven en pistas de video se corren igual que
      // los clips cuando se abre una pista nueva por debajo de ellas
      let capasPrevias = s.capas
      let pistaDestino = destino?.pista ?? 0

      // cuando se suelta sobre una separación se abre allí un nivel, empujando
      // hacia arriba lo que ya vivía en ese índice o por encima, igual que hace
      // insertarPistaEn al soltar un clip. si no queda cupo, el medio cae en la
      // pista base y no se crea nada
      const quiereInsertar = destino?.insertarEn != null && s.numPistas < MAX_PISTAS
      if (quiereInsertar) {
        const k = Math.max(0, Math.min(s.numPistas, destino!.insertarEn!))
        clipsPrevios = clipsPrevios.map((c) => (c.pista >= k ? { ...c, pista: c.pista + 1 } : c))
        capasPrevias = capasPrevias.map((c) =>
          (c.tipo === 'figura' || c.tipo === 'imagen') && (c.nivel ?? 0) >= k
            ? { ...c, nivel: (c.nivel ?? 0) + 1 }
            : c,
        )
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

      // una imagen entra como capa que vive en la pista de video de destino: se
      // dibuja siempre encima del video, pero en la línea de tiempo ocupa esa
      // pista como un bloque más. dura unos pocos segundos, ajustándose si el
      // montaje termina antes
      if (asset.clase === 'imagen') {
        const capa = crearCapaImagen(s.playhead, asset.url, asset.ancho, asset.alto)
        capa.nivel = pistaDestino
        const DUR_IMAGEN = 5
        const fin = duracionTotal(clipsPrevios)
        const disponible = fin > s.playhead ? fin - s.playhead : DUR_IMAGEN
        capa.duracion = Math.max(4, Math.min(DUR_IMAGEN, disponible))
        return {
          numPistas,
          altosPista,
          pistasMeta,
          pista: { ...s.pista, clips: clipsPrevios },
          capas: [...capasPrevias, capa],
          capaSeleccionada: capa.id,
          capasSeleccionadas: [capa.id],
          clipSeleccionado: null,
        }
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
      // solo el PRIMER clip encuadra el zoom para que quepa entero en el ancho visible; a partir de
      // ahí se respeta el zoom en el que esté el usuario, porque reajustarlo en cada clip que se
      // agrega alejaba la línea de tiempo de golpe y sacaba de donde se estaba trabajando
      const nuevosClips = [...clipsPrevios, clip]
      const encaje = s.pista.clips.length === 0 ? zoomParaEncuadrar(duracionTotal(nuevosClips), s.anchoTimeline) : null
      return {
        numPistas,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips: nuevosClips },
        capas: capasPrevias,
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

  grupoDe: (id) => get().grupos.find((g) => g.miembros.includes(id)) ?? null,

  // arma un grupo con los bloques marcados (hacen falta al menos dos). los que ya estaban en otro
  // grupo se sacan de ahí para no quedar en dos a la vez; un grupo que quede con menos de dos se
  // disuelve. se le da el primer color libre para distinguirlo de los demás
  agrupar: () =>
    set((s) => {
      const miembros = [...new Set(s.bloquesSeleccionados)]
      if (miembros.length < 2) return {}
      const grupos = s.grupos
        .map((g) => ({ ...g, miembros: g.miembros.filter((m) => !miembros.includes(m)) }))
        .filter((g) => g.miembros.length >= 2)
      const usados = new Set(grupos.map((g) => g.color))
      const color = COLORES_GRUPO.find((c) => !usados.has(c)) ?? COLORES_GRUPO[grupos.length % COLORES_GRUPO.length]
      return { grupos: [...grupos, { id: crypto.randomUUID(), miembros, color }] }
    }),

  desagrupar: (grupoId) => set((s) => ({ grupos: s.grupos.filter((g) => g.id !== grupoId) })),

  setColorGrupo: (grupoId, color) =>
    set((s) => ({ grupos: s.grupos.map((g) => (g.id === grupoId ? { ...g, color } : g)) })),

  marcarBloques: (ids) =>
    set((s) => {
      // un recuadro que atrapa un solo elemento no es una selección múltiple: equivale a
      // elegirlo con un clic, así que se trata como selección suelta y ofrece TODAS sus
      // opciones (no solo las dos del conjunto). se detecta su tipo para elegir el campo
      const limpio = {
        bloquesSeleccionados: [] as string[],
        clipSeleccionado: null as string | null,
        capaSeleccionada: null as string | null,
        capasSeleccionadas: [] as string[],
        regionSeleccionada: null as string | null,
        impactoSeleccionado: null as string | null,
      }
      if (ids.length === 1) {
        const id = ids[0]
        if (s.pista.clips.some((c) => c.id === id)) return { ...limpio, clipSeleccionado: id }
        if (s.capas.some((c) => c.id === id)) return { ...limpio, capaSeleccionada: id, capasSeleccionadas: [id] }
        if (s.audios.some((a) => a.id === id) || s.audioRegiones.some((r) => r.id === id))
          return { ...limpio, regionSeleccionada: id }
      }
      // varios (o ninguno): el recuadro reemplaza cualquier selección suelta de antes,
      // para que el menú y los atajos operen sobre el conjunto
      return { ...limpio, bloquesSeleccionados: ids }
    }),

  agregarImpacto: (t, tipo = 'rebote') =>
    set((s) => {
      const impacto: Impacto = {
        id: crypto.randomUUID(),
        t: Math.max(0, t),
        duracion: DUR_IMPACTO_DEF,
        tipo,
        intensidad: FUERZA_IMPACTO_DEF,
        color: colorPorDefectoImpacto(tipo),
      }
      return {
        impactos: [...s.impactos, impacto],
        impactoSeleccionado: impacto.id,
        // al soltar una bolita se suelta cualquier otra selección, para que el panel
        // derecho pase a mostrar el editor del impacto
        clipSeleccionado: null,
        capaSeleccionada: null,
        capasSeleccionadas: [],
        regionSeleccionada: null,
      }
    }),

  moverImpacto: (id, t) =>
    set((s) => ({ impactos: s.impactos.map((im) => (im.id === id ? { ...im, t: Math.max(0, t) } : im)) })),

  recortarImpacto: (id, duracion) =>
    set((s) => ({
      // nunca por debajo de una décima: menos que eso no se ve ni se puede agarrar
      impactos: s.impactos.map((im) => (im.id === id ? { ...im, duracion: Math.max(0.1, duracion) } : im)),
    })),

  actualizarImpacto: (id, cambios) =>
    set((s) => ({ impactos: s.impactos.map((im) => (im.id === id ? { ...im, ...cambios } : im)) })),

  quitarImpacto: (id) =>
    set((s) => {
      // antes de soltarlo, se mira sobre qué clip vivía la bolita (por su instante en
      // la línea de tiempo). así, al borrarla, se deja seleccionado ese clip con su
      // lista de impactos abierta en el panel derecho, como si se le hubiera dado clic:
      // el usuario sigue en el mismo sitio y puede agregar otro sin buscar nada
      const borrado = s.impactos.find((im) => im.id === id)
      const clip = borrado ? clipEnTiempo(s.pista.clips, borrado.t) : null
      return {
        impactos: s.impactos.filter((im) => im.id !== id),
        impactoSeleccionado: null,
        clipSeleccionado: clip ? clip.id : s.clipSeleccionado,
        // se abre la lista de impactos de ese clip. si no se halló clip debajo (raro),
        // se conserva lo que hubiera para no dejar el panel en un estado incoherente
        categoriaClip: clip ? 'impactos' : s.categoriaClip,
        capaSeleccionada: clip ? null : s.capaSeleccionada,
        capasSeleccionadas: clip ? [] : s.capasSeleccionadas,
        regionSeleccionada: clip ? null : s.regionSeleccionada,
      }
    }),

  duplicarImpacto: (id, t) => {
    const s = get()
    const orig = s.impactos.find((im) => im.id === id)
    if (!orig) return null
    const copia: Impacto = { ...orig, id: crypto.randomUUID(), t: Math.max(0, t) }
    set({ impactos: [...s.impactos, copia], impactoSeleccionado: copia.id })
    return copia.id
  },

  seleccionarImpacto: (id) =>
    set((s) => ({
      impactoSeleccionado: id,
      // elegir una bolita suelta el resto de selecciones
      clipSeleccionado: id ? null : s.clipSeleccionado,
      capaSeleccionada: id ? null : s.capaSeleccionada,
      capasSeleccionadas: id ? [] : s.capasSeleccionadas,
      regionSeleccionada: id ? null : s.regionSeleccionada,
      // una bolita nunca forma parte del conjunto marcado, así que elegirla siempre
      // deshace la selección múltiple
      bloquesSeleccionados: id ? [] : s.bloquesSeleccionados,
    })),

  abrirMenuContextual: (m) => set({ menuContextual: m }),
  cerrarMenuContextual: () => set({ menuContextual: null }),

  pedirConfirmacion: (c) => set({ confirmacion: c }),
  cerrarConfirmacion: () => set({ confirmacion: null }),

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

  moverBloquesDesde: (ids, delta, origenes) =>
    set((s) => {
      const dentro = new Set(ids)
      // el desplazamiento se acota para que el bloque cuyo ORIGEN estaba más a la izquierda no
      // cruce el cero. como el grupo se mueve rígido, basta el mínimo de los orígenes
      let minOrigen = Infinity
      for (const id of ids) {
        const o = origenes[id]
        if (o !== undefined) minOrigen = Math.min(minOrigen, o)
      }
      if (!Number.isFinite(minOrigen)) return {}

      // cada bloque, en su carril, tiene un intervalo [inicio, inicio+duracion]. el grupo NO puede
      // pisar un bloque AJENO en el mismo carril, así que el desplazamiento se acota por el hueco
      // libre a cada lado. los clips comparten carril por pista; las capas, los audios y las
      // regiones, por su nivel. dos listas distintas no se estorban (una figura no bloquea un clip)
      const carril = (pref: string, n: number) => `${pref}${n}`
      const todos = [
        ...s.pista.clips.map((x) => ({ x, carril: carril('v', x.pista) })),
        ...s.capas.map((x) => ({ x, carril: carril('c', x.nivel ?? 0) })),
        ...s.audios.map((x) => ({ x, carril: carril('a', x.nivel ?? 0) })),
        ...s.audioRegiones.map((x) => ({ x, carril: carril('a', x.nivel ?? 0) })),
      ]
      const ajenosPorCarril = new Map<string, { inicio: number; duracion: number }[]>()
      for (const t of todos) {
        if (dentro.has(t.x.id)) continue
        const lista = ajenosPorCarril.get(t.carril) ?? []
        lista.push({ inicio: t.x.inicio, duracion: t.x.duracion })
        ajenosPorCarril.set(t.carril, lista)
      }
      // margen que deja libre cada bloque del grupo: hacia la derecha, hasta el ajeno más cercano por
      // delante; hacia la izquierda, hasta el de atrás. el tope del grupo es el más ajustado de todos
      let dMin = -minOrigen
      let dMax = Infinity
      for (const t of todos) {
        if (!dentro.has(t.x.id)) continue
        const o = origenes[t.x.id]
        if (o === undefined) continue
        const fin = o + t.x.duracion
        for (const a of ajenosPorCarril.get(t.carril) ?? []) {
          if (a.inicio >= fin - 0.001) dMax = Math.min(dMax, a.inicio - fin)
          else if (a.inicio + a.duracion <= o + 0.001) dMin = Math.max(dMin, a.inicio + a.duracion - o)
        }
      }
      // el origen (d = 0) siempre es válido, así que [dMin, dMax] contiene el 0 y acotar ahí impide
      // cruzar sin trabar el grupo
      const d = Math.max(dMin, Math.min(dMax, delta))

      // cada bloque se coloca en su ORIGEN + d (posición absoluta), no sumando sobre la actual. así
      // no se acumula fotograma a fotograma y el grupo sigue al cursor exactamente
      const correr = <T extends { id: string; inicio: number }>(x: T): T =>
        dentro.has(x.id) && origenes[x.id] !== undefined ? { ...x, inicio: origenes[x.id] + d } : x
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
      let clips = s.pista.clips.filter((c) => !fuera.has(c.id))
      let capas = s.capas.filter((c) => !fuera.has(c.id))
      let audios = s.audios.filter(
        (a) => !fuera.has(a.id) && !(a.vinculadoA && clipsFuera.includes(a.vinculadoA)),
      )
      let audioRegiones = s.audioRegiones.filter((r) => !fuera.has(r.id))
      let { numPistas, altosPista, pistasMeta, nivelesAudio, nivelesTexto } = s
      // cada carril cierra las filas que el borrado dejó vacías. la poda de video se
      // aplica antes que la de texto porque ambas tocan las capas
      const pv = calcularPodaVideo(clips, capas, numPistas, altosPista, pistasMeta)
      if (pv) {
        clips = pv.clips
        capas = pv.capas
        numPistas = pv.numPistas
        altosPista = pv.altosPista
        pistasMeta = pv.pistasMeta
      }
      const pa = calcularPodaAudio(audios, audioRegiones, nivelesAudio)
      if (pa) {
        audios = pa.audios
        audioRegiones = pa.audioRegiones
        nivelesAudio = pa.nivelesAudio
      }
      const pt = calcularPodaTexto(capas, nivelesTexto)
      if (pt) {
        capas = pt.capas
        nivelesTexto = pt.nivelesTexto
      }
      return {
        pista: { ...s.pista, clips },
        capas,
        audios,
        audioRegiones,
        numPistas,
        altosPista,
        pistasMeta,
        nivelesAudio,
        nivelesTexto,
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
      const base = {
        // borrar el video se lleva también el audio que se había separado de él
        audios: s.audios.filter((a) => a.vinculadoA !== id),
        clipSeleccionado: s.clipSeleccionado === id ? null : s.clipSeleccionado,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
      // si al quitar el clip su pista se queda sin nada, esa fila se cierra sola, lo
      // mismo que al sacar el clip arrastrando
      const poda = calcularPodaVideo(clips, s.capas, s.numPistas, s.altosPista, s.pistasMeta)
      if (poda) {
        return {
          ...base,
          numPistas: poda.numPistas,
          altosPista: poda.altosPista,
          pistasMeta: poda.pistasMeta,
          pista: { ...s.pista, clips: poda.clips },
          capas: poda.capas,
        }
      }
      return { ...base, pista: { ...s.pista, clips } }
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

    // la copia busca sitio, y solo en dos direcciones: a la derecha del original,
    // en su misma fila, y si ahí no cabe, encima. nunca a la izquierda ni abajo
    const finOrig = orig.inicio + orig.duracion
    const chocaDerecha = s.pista.clips.some(
      (c) =>
        c.id !== orig.id &&
        c.pista === orig.pista &&
        // hay estorbo si algún clip pisa el tramo que ocuparía la copia
        c.inicio < finOrig + orig.duracion - 0.001 &&
        c.inicio + c.duracion > finOrig + 0.001,
    )

    if (!chocaDerecha) {
      copia.inicio = finOrig
      set({
        pista: { ...s.pista, clips: [...s.pista.clips, copia] },
        clipSeleccionado: copia.id,
        capaSeleccionada: null,
        regionSeleccionada: null,
      })
      return copia.id
    }

    // a la derecha hay algo, así que la copia sube: se abre un nivel encima del
    // original y aterriza ahí, arrancando en el mismo segundo que él
    if (s.numPistas >= MAX_PISTAS) {
      // sin sitio para otro nivel, se deja donde quepa en la misma fila
      copia.inicio = finOrig
      set({
        pista: { ...s.pista, clips: [...s.pista.clips, copia] },
        clipSeleccionado: copia.id,
        capaSeleccionada: null,
        regionSeleccionada: null,
      })
      return copia.id
    }
    const corte = orig.pista + 1
    copia.pista = corte
    copia.inicio = orig.inicio
    const altosPista = [...s.altosPista]
    altosPista.splice(corte, 0, s.altosPista[orig.pista] ?? ALTO_PISTA_BASE)
    const pistasMeta = [...s.pistasMeta]
    pistasMeta.splice(corte, 0, metaPista(s.numPistas + 1))
    set({
      numPistas: s.numPistas + 1,
      altosPista,
      pistasMeta,
      pista: {
        ...s.pista,
        // los que estaban en el nivel del corte o por encima suben un puesto
        clips: [...s.pista.clips.map((c) => (c.pista >= corte ? { ...c, pista: c.pista + 1 } : c)), copia],
      },
      clipSeleccionado: copia.id,
      capaSeleccionada: null,
      regionSeleccionada: null,
    })
    return copia.id
  },

  moverClip: (id, nuevoInicio) =>
    set((s) => {
      const clip = s.pista.clips.find((c) => c.id === id)
      if (!clip) return {}
      // los clips no se solapan en una misma pista: el inicio se topa con el vecino
      const otros = s.pista.clips.filter((c) => c.id !== id && c.pista === clip.pista)
      const ajustado = inicioSinSolape(otros, Math.max(0, nuevoInicio), clip.duracion, clip.inicio)
      if (ajustado === null) return {}
      const inicio = ajustado
      const delta = inicio - clip.inicio
      // al pegar este clip contra un vecino que antes estaba separado se forma una junta
      // nueva. las transiciones que había en esos bordes eran contra el fondo (fundido de
      // salida del de la izquierda o de entrada del de la derecha), y al juntarse ya no
      // aplican, así que se borran las dos: queda un corte limpio y desde ahí se puede
      // poner un cruce si se quiere
      const iniViejo = clip.inicio
      const finViejo = clip.inicio + clip.duracion
      const fin = inicio + clip.duracion
      const pegado = (a: number, b: number) => Math.abs(a - b) < 0.05
      // vecinos pegados en la posición NUEVA
      const izq = otros.find((c) => pegado(c.inicio + c.duracion, inicio))
      const der = otros.find((c) => pegado(c.inicio, fin))
      // junta NUEVA: antes este clip no estaba pegado a ese vecino
      const juntaIzq = izq && !pegado(izq.inicio + izq.duracion, iniViejo) ? izq.id : null
      const juntaDer = der && !pegado(der.inicio, finViejo) ? der.id : null
      // vecinos que estaban pegados en la posición VIEJA. si tras mover ya NO quedan pegados a
      // este clip, la junta se ROMPIÓ y su cruce (guardado en la entrada del que relevaba) deja
      // de tener sentido: se borra. la junta de la izquierda era la ENTRADA de este clip; la de
      // la derecha, la entrada del vecino de la derecha
      const izqViejo = otros.find((c) => pegado(c.inicio + c.duracion, iniViejo))
      const derViejo = otros.find((c) => pegado(c.inicio, finViejo))
      const rotaIzq = !!izqViejo && !pegado(izqViejo.inicio + izqViejo.duracion, inicio)
      const rotaDer = !!derViejo && !pegado(derViejo.inicio, fin)
      const hayTr = (tr?: { tipo: string }) => !!tr && tr.tipo !== 'ninguna' && tr.tipo !== 'corte'
      // el cruce que se CONSERVA al formar una junta L -> R: manda la SALIDA del clip de la izquierda
      // (la transición que tenía al final); si no había, se respeta la ENTRADA del de la derecha; y si
      // ninguno traía nada, queda un corte limpio. el cruce vive en la entrada del clip de la derecha.
      // así, pegar un clip que tiene transición al final la convierte en el cruce entre los dos, en vez
      // de borrarla, y editar cualquiera de los dos lados toca ese mismo cruce
      const cruceDe = (salidaL?: typeof clip.transicionSalida, entradaR?: typeof clip.transicion) =>
        hayTr(salidaL) ? salidaL! : hayTr(entradaR) ? entradaR! : { tipo: 'ninguna' as const, duracion: entradaR?.duracion ?? 0.5 }
      const sinEntrada = (c: typeof clip) => ({ ...c, transicion: { tipo: 'ninguna' as const, duracion: c.transicion.duracion } })
      const sinSalida = (c: typeof clip) => ({ ...c, transicionSalida: undefined })
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            let nc = c
            if (c.id === id) {
              nc = { ...nc, inicio }
              // junta NUEVA por la izquierda: la salida del vecino de la izquierda (o la propia entrada)
              // se convierte en el cruce, que se guarda en la entrada de este clip. si la junta se
              // ROMPIÓ, ese cruce ya no tiene sentido y se borra
              if (juntaIzq && izq) nc = { ...nc, transicion: cruceDe(izq.transicionSalida, clip.transicion) }
              else if (rotaIzq) nc = sinEntrada(nc)
              // junta NUEVA por la derecha: la salida de este clip se muda a la entrada del vecino derecho
              if (juntaDer) nc = sinSalida(nc)
            }
            // el vecino de la izquierda cede su salida (ya quedó guardada como la entrada de este clip)
            if (juntaIzq && c.id === juntaIzq) nc = sinSalida(nc)
            // el vecino de la derecha recibe el cruce en su entrada: la salida de este clip, o su propia
            // entrada si este no traía salida
            if (juntaDer && der && c.id === juntaDer) nc = { ...nc, transicion: cruceDe(clip.transicionSalida, der.transicion) }
            // junta ROTA por la derecha: el vecino viejo de la derecha pierde su entrada (era el cruce)
            if (rotaDer && derViejo && c.id === derViejo.id) nc = sinEntrada(nc)
            return nc
          }),
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
        // si el clip tiene transiciones, no se le deja encoger tanto como para que la de
        // entrada y la de salida se pisen: se reserva sitio para las dos
        const minDur = duracionMinimaCon(c, DURACION_MINIMA)
        if (lado === 'inicio') {
          // delta va en segundos de la pista; el punto de entrada en la fuente
          // avanza a razón de la velocidad. el borde derecho queda fijo
          const dMin = -b.recorteInicio / v
          const dMax = b.duracion - minDur
          const d = Math.max(dMin, Math.min(delta, dMax))
          const inicio = b.inicio + d
          if (inicio >= 0) {
            return limitarTransiciones({
              ...c,
              inicio,
              duracion: b.duracion - d,
              recorteInicio: b.recorteInicio + d * v,
            })
          }
          // el borde izquierdo llegó al arranque de la pista. en lugar de dejar
          // que el clip se salga por la izquierda, se clava en cero y lo que
          // quedaba de gesto se gasta alargándolo por el borde derecho, mientras
          // haya fuente. como todo se calcula desde el estado inicial y el
          // desplazamiento total, volver atrás sin soltar lo encoge otra vez
          const dTope = -b.inicio
          const sobra = dTope - d
          const entrada = b.recorteInicio + dTope * v
          const duracionTope = b.duracion - dTope
          // cuánto puede crecer por la derecha sin pasarse del final del material
          const margen = Math.max(0, (b.duracionFuente - entrada) / v - duracionTope)
          return limitarTransiciones({
            ...c,
            inicio: 0,
            duracion: duracionTope + Math.min(sobra, margen),
            recorteInicio: entrada,
          })
        }
        // borde derecho: no puede pasar del final del video fuente
        const dMin = minDur - b.duracion
        const dMax = (b.duracionFuente - b.recorteInicio) / v - b.duracion
        const d = Math.max(dMin, Math.min(delta, dMax))
        return limitarTransiciones({ ...c, duracion: b.duracion + d })
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
          return limitarTransiciones({
            ...c,
            inicio: b.inicio + corrimiento,
            duracion: duracionNueva,
            velocidad: consumidoFuente / duracionNueva,
          })
        }
        // borde derecho: el inicio no se mueve, solo se estira o encoge el final
        let duracionNueva = b.duracion + delta
        const durMin = consumidoFuente / 4
        const durMax = consumidoFuente / 0.25
        duracionNueva = Math.max(durMin, Math.min(duracionNueva, durMax))
        return limitarTransiciones({ ...c, duracion: duracionNueva, velocidad: consumidoFuente / duracionNueva })
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
        return limitarTransiciones({ ...c, velocidad: v, duracion: consumidoFuente / v })
      })
      return { pista: { ...s.pista, clips }, playhead: Math.min(s.playhead, duracionTotal(clips)) }
    }),

  setTono: (id, cambios) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) =>
            dest.has(c.id) ? { ...c, tono: { ...c.tono, ...cambios } } : c,
          ),
        },
      }
    }),

  resetTono: (id) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => (dest.has(c.id) ? { ...c, tono: { ...tonoNeutro } } : c)),
        },
      }
    }),

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

  girarClip: (id, delta) =>
    set((s) => {
      const clip = s.pista.clips.find((c) => c.id === id)
      if (!clip) return {}
      const prev = clip.encuadre ?? { x: 0.5, y: 0.5, escala: 1 }
      const rotacion = (prev.rotacion ?? 0) + delta
      // el clip se recentra y vuelve a escala 1 al girar (conservando su volteo), para
      // que encaje limpio en el lienzo nuevo sin arrastrar un reencuadre anterior
      const nuevoEnc = { x: 0.5, y: 0.5, escala: 1, rotacion, espejoH: prev.espejoH, espejoV: prev.espejoV }
      const clips = s.pista.clips.map((c) => (c.id === id ? { ...c, encuadre: nuevoEnc } : c))

      // el lienzo adopta la orientación del video ya girado: se parte de las medidas
      // nativas del proyecto y, si el video queda de lado, se intercambian ancho y alto
      const auto = s.resolucionAuto
      const res = giradoUnCuarto(rotacion) ? { ancho: auto.alto, alto: auto.ancho } : { ...auto }

      // las capas no deben deformarse con el cambio de proporción: el ancho va en
      // fracción del ancho y el alto en fracción del alto, así que se compensan por el
      // factor inverso para conservar sus píxeles, igual que hace setLienzo
      const fx = s.resolucion.ancho / res.ancho
      const fy = s.resolucion.alto / res.alto
      const capas =
        fx === 1 && fy === 1
          ? s.capas
          : s.capas.map((c) => {
              if (c.tipo === 'figura' || c.tipo === 'censura') {
                return { ...c, anchoRel: c.anchoRel * fx, altoRel: c.altoRel * fy }
              }
              if (c.tipo === 'imagen') {
                return { ...c, anchoRel: c.anchoRel * fx, altoRel: c.altoRel !== undefined ? c.altoRel * fy : c.altoRel }
              }
              if (c.tipo === 'trazo') {
                return { ...c, trazos: c.trazos.map((t) => t.map((p) => ({ x: p.x * fx, y: p.y * fy }))) }
              }
              return c
            })

      return { pista: { ...s.pista, clips }, resolucion: res, capas }
    }),

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
    set((s) => {
      const dest = clipsObjetivo(s, id)
      const clave = claveEfecto(efecto)
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            if (!dest.has(c.id)) return c
            const efs = c.efectos ?? []
            // no se duplica el mismo efecto en un clip que ya lo tiene
            if (efs.some((e) => claveEfecto(e) === clave)) return c
            // el líder guarda el efecto tal cual (su id es el que el panel selecciona); los demás
            // clips del conjunto reciben una copia con su propio id
            const nuevo = c.id === id ? efecto : ({ ...efecto, id: crypto.randomUUID() } as EfectoClip)
            return { ...c, efectos: [...efs, nuevo] }
          }),
        },
      }
    }),

  // el cambio de un ajuste del efecto (nivel, dirección, etc.) se refleja en el efecto equivalente
  // de todos los clips del conjunto: se busca por su clave (el mismo tipo de efecto), ya que cada
  // clip tiene su propia copia con distinto id
  actualizarEfecto: (id, efectoId, cambios) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      const lider = s.pista.clips.find((c) => c.id === id)
      const objetivo = (lider?.efectos ?? []).find((e) => e.id === efectoId)
      const clave = objetivo ? claveEfecto(objetivo) : null
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            if (!dest.has(c.id)) return c
            return {
              ...c,
              efectos: (c.efectos ?? []).map((e) => {
                const coincide = c.id === id ? e.id === efectoId : clave !== null && claveEfecto(e) === clave
                return coincide ? ({ ...e, ...cambios } as EfectoClip) : e
              }),
            }
          }),
        },
      }
    }),

  quitarEfecto: (id, efectoId) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      const lider = s.pista.clips.find((c) => c.id === id)
      const objetivo = (lider?.efectos ?? []).find((e) => e.id === efectoId)
      const clave = objetivo ? claveEfecto(objetivo) : null
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            if (!dest.has(c.id)) return c
            return {
              ...c,
              efectos: (c.efectos ?? []).filter((e) =>
                c.id === id ? e.id !== efectoId : !(clave !== null && claveEfecto(e) === clave),
              ),
            }
          }),
        },
      }
    }),

  // sube o baja un efecto una posición en la lista. el orden importa porque los
  // efectos se aplican en cadena, uno sobre el resultado del anterior, igual que
  // capas apiladas
  reordenarEfecto: (id, efectoId, dir) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => {
          if (c.id !== id) return c
          const efs = [...(c.efectos ?? [])]
          const i = efs.findIndex((e) => e.id === efectoId)
          const j = i + dir
          if (i < 0 || j < 0 || j >= efs.length) return c
          ;[efs[i], efs[j]] = [efs[j], efs[i]]
          return { ...c, efectos: efs }
        }),
      },
    })),

  // mueve un efecto a una posición concreta de la pila. lo usa el arrastre de
  // reordenar: se saca de donde está y se inserta en el índice destino, corriendo
  // el resto. el índice ya viene ajustado por quien llama
  moverEfectoA: (id, efectoId, indice) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) => {
          if (c.id !== id) return c
          const efs = [...(c.efectos ?? [])]
          const desde = efs.findIndex((e) => e.id === efectoId)
          if (desde < 0) return c
          const [mov] = efs.splice(desde, 1)
          const destino = Math.max(0, Math.min(efs.length, indice))
          efs.splice(destino, 0, mov)
          return { ...c, efectos: efs }
        }),
      },
    })),

  // cambia un efecto por otro sin moverlo de sitio: el nuevo ocupa la misma
  // posición que el viejo, que es lo que se espera al reemplazar una capa
  reemplazarEfecto: (id, efectoId, nuevo) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      const lider = s.pista.clips.find((c) => c.id === id)
      const viejo = (lider?.efectos ?? []).find((e) => e.id === efectoId)
      const claveVieja = viejo ? claveEfecto(viejo) : null
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            if (!dest.has(c.id)) return c
            return {
              ...c,
              efectos: (c.efectos ?? []).map((e) => {
                const coincide = c.id === id ? e.id === efectoId : claveVieja !== null && claveEfecto(e) === claveVieja
                if (!coincide) return e
                return c.id === id ? nuevo : ({ ...nuevo, id: crypto.randomUUID() } as EfectoClip)
              }),
            }
          }),
        },
      }
    }),

  // deja un efecto en el primer lugar de la pila (nivel 1, por encima de todos). se
  // usa al arrastrar una muestra sobre el clip: si ese efecto ya estaba se sube al
  // tope conservando sus ajustes, si no estaba entra nuevo como primero, y si ya era
  // el primero no cambia nada
  ponerEfectoEncima: (id, efecto) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      const clave = claveEfecto(efecto)
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            if (!dest.has(c.id)) return c
            const efs = c.efectos ?? []
            const existente = efs.find((e) => claveEfecto(e) === clave)
            if (existente) {
              if (efs[0]?.id === existente.id) return c
              return { ...c, efectos: [existente, ...efs.filter((e) => e.id !== existente.id)] }
            }
            // el líder guarda el efecto tal cual; los demás clips reciben una copia con su id
            const nuevo = c.id === id ? efecto : ({ ...efecto, id: crypto.randomUUID() } as EfectoClip)
            return { ...c, efectos: [nuevo, ...efs] }
          }),
        },
      }
    }),

  setTransicion: (id, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, transicion: { ...c.transicion, ...cambios } } : c,
        ),
      },
    })),

  setTransicionEfecto: (id, duracion) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, transicionEfecto: duracion > 0 ? duracion : undefined } : c,
        ),
      },
    })),

  setTransicionSalida: (id, cambios) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id
            ? {
                ...c,
                transicionSalida: {
                  ...(c.transicionSalida ?? { tipo: 'fundido', duracion: 0.5 }),
                  ...cambios,
                },
              }
            : c,
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
      // el corte no debe inventar transiciones en el punto donde se parte. la de ENTRADA vive al
      // arranque del clip, así que se queda con la primera mitad; la de SALIDA vive al final, así que
      // pasa a la segunda. la primera pierde su salida y la segunda su entrada, para que el nuevo
      // borde entre las dos mitades quede como un corte seco y no como un cruce que nadie pidió
      const primera = { ...c, duracion: offset, transicionSalida: undefined }
      const segunda = {
        ...c,
        id: crypto.randomUUID(),
        inicio: c.inicio + offset,
        recorteInicio: c.recorteInicio + offset * c.velocidad,
        duracion: c.duracion - offset,
        transicion: { tipo: 'ninguna' as const, duracion: c.transicion.duracion },
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
      impactoSeleccionado: id ? null : s.impactoSeleccionado,
      // elegir un clip suelto deshace la selección múltiple. el arrastre de un grupo NO
      // pasa por aquí (el bloque omite esta llamada cuando el clic cae en un elemento ya
      // marcado), así que arrastrar el conjunto no lo desmarca; cualquier otro clic sí
      bloquesSeleccionados: id ? [] : s.bloquesSeleccionados,
      // un clic normal sobre un clip solo lo selecciona: si se venía del modo recorte
      // (abierto con el menú, la tecla C o el doble clic) se sale de él, para que
      // volver a pulsar el clip no lo reabra. entrar al recorte es siempre un gesto
      // explícito, así que apagarlo aquí no estorba: el menú vuelve a encenderlo justo
      // después de llamar a seleccionar. mismo criterio que ya usaba Escape
      herramienta: s.herramienta === 'recortar' ? 'proyecto' : s.herramienta,
      categoriaClip: s.categoriaClip === 'recortar' ? null : s.categoriaClip,
      recorteRapido: false,
    })),

  limpiarSeleccion: () =>
    set((s) => ({
      clipSeleccionado: null,
      capaSeleccionada: null,
      capasSeleccionadas: [],
      regionSeleccionada: null,
      impactoSeleccionado: null,
      bloquesSeleccionados: [],
      // soltar la selección cierra también el modo recorte del visor (rápido, por
      // herramienta o por categoría), para que no quede colgado y se reabra al volver
      // a pulsar un clip
      recorteRapido: false,
      herramienta: s.herramienta === 'recortar' ? 'proyecto' : s.herramienta,
      categoriaClip: s.categoriaClip === 'recortar' ? null : s.categoriaClip,
    })),

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
  insertarPistaEn: (indice, id) =>
    set((s) => {
      if (s.numPistas >= MAX_PISTAS) return {}
      const k = Math.max(0, Math.min(s.numPistas, indice))
      // el id que llega puede ser de un clip o de una figura o imagen (que ahora
      // viven en pistas de video). se muda ese elemento a la pista recién nacida y
      // todo lo que estaba en ese índice o por encima sube un puesto
      const clips = s.pista.clips.map((c) => {
        if (id && c.id === id) return { ...c, pista: k }
        return c.pista >= k ? { ...c, pista: c.pista + 1 } : c
      })
      const capas = s.capas.map((c) => {
        if (c.tipo !== 'figura' && c.tipo !== 'imagen') return c
        if (id && c.id === id) return { ...c, nivel: k }
        return (c.nivel ?? 0) >= k ? { ...c, nivel: (c.nivel ?? 0) + 1 } : c
      })
      const altosPista = [...s.altosPista]
      altosPista.splice(k, 0, ALTO_PISTA_BASE)
      const pistasMeta = [...s.pistasMeta]
      pistasMeta.splice(k, 0, metaPista(s.numPistas + 1))
      const esCapa = s.capas.some((c) => c.id === id)
      return {
        numPistas: s.numPistas + 1,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips },
        capas,
        clipSeleccionado: esCapa ? s.clipSeleccionado : (id ?? s.clipSeleccionado),
      }
    }),

  setInsercionPista: (indice) => set({ insercionPista: indice }),
  setInsercionAudio: (nivel) => set({ insercionAudio: nivel }),
  setInsercionTexto: (nivel) => set({ insercionTexto: nivel }),
  setFilaAudioResaltada: (nivel) => set({ filaAudioResaltada: nivel }),
  setFilaTextoResaltada: (nivel) => set({ filaTextoResaltada: nivel }),

  setArrastreVivo: (a) => set({ arrastreVivo: a }),
  setCongelarLayout: (v) => set({ congelarLayout: v }),
  setArrastreBloques: (v) => set({ arrastreBloques: v }),
  setPrevisualizacion: (t) => set({ previsualizacion: t }),
  setFantasmaDup: (f) => set({ fantasmaDup: f }),

  duplicarClipEn: (id, inicio, pista) => {
    const s = get()
    const orig = s.pista.clips.find((c) => c.id === id)
    if (!orig) return null
    // el destino tiene que ser una pista real y su tramo estar despejado; si no, no se
    // duplica nada y el gesto se cancela sin más
    if (pista < 0 || pista >= s.numPistas) return null
    const ini = Math.max(0, inicio)
    const otros = s.pista.clips.filter((c) => c.pista === pista)
    if (pisaAlguno(otros, ini, orig.duracion)) return null
    // la copia lleva su tono y efectos sin referencias compartidas, y cada efecto
    // estrena id para que los dos clips se editen por separado
    const copia = structuredClone(orig)
    copia.id = crypto.randomUUID()
    copia.efectos = copia.efectos.map((e) => ({ ...e, id: crypto.randomUUID() }))
    copia.inicio = ini
    copia.pista = pista
    set({
      pista: { ...s.pista, clips: [...s.pista.clips, copia] },
      clipSeleccionado: copia.id,
      capaSeleccionada: null,
      regionSeleccionada: null,
      fantasmaDup: null,
    })
    return copia.id
  },
  setGuiaImantado: (segundo) => set({ guiaImantado: segundo }),

  moviendoVisor: false,
  setMoviendoVisor: (v) => set({ moviendoVisor: v }),

  recorteRapido: false,
  setRecorteRapido: (v) => set({ recorteRapido: v }),

  // al eliminar un nivel se van con él sus clips, y los que estaban por encima
  // bajan una posición para que no queden filas huecas en medio. su alto y sus
  // metadatos se retiran a la vez para que los tres arrays sigan cuadrando
  quitarPista: (indice) =>
    set((s) => {
      if (s.numPistas <= 1) return {}
      const clips = s.pista.clips
        .filter((c) => c.pista !== indice)
        .map((c) => (c.pista > indice ? { ...c, pista: c.pista - 1 } : c))
      // las figuras e imágenes de esa pista se van con ella, igual que los clips;
      // las de pistas superiores bajan un puesto para no quedar descolgadas
      const capas = s.capas
        .filter((c) => !((c.tipo === 'figura' || c.tipo === 'imagen') && (c.nivel ?? 0) === indice))
        .map((c) =>
          (c.tipo === 'figura' || c.tipo === 'imagen') && (c.nivel ?? 0) > indice
            ? { ...c, nivel: (c.nivel ?? 0) - 1 }
            : c,
        )
      const altosPista = s.altosPista.filter((_, i) => i !== indice)
      const pistasMeta = s.pistasMeta.filter((_, i) => i !== indice)
      const seguiaVivo = clips.some((c) => c.id === s.clipSeleccionado)
      const capaViva = capas.some((c) => c.id === s.capaSeleccionada)
      return {
        numPistas: s.numPistas - 1,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips },
        capas,
        clipSeleccionado: seguiaVivo ? s.clipSeleccionado : null,
        capaSeleccionada: capaViva ? s.capaSeleccionada : null,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
    }),

  // duplica una pista entera: sus clips, figuras e imágenes se copian a una pista
  // nueva que nace justo encima. todo lo que estaba en ese índice o más arriba sube
  // un puesto para dejarle sitio, igual que al insertar
  duplicarPista: (indice) =>
    set((s) => {
      if (s.numPistas >= MAX_PISTAS) return {}
      const destino = indice + 1
      const clipsCorridos = s.pista.clips.map((c) => (c.pista >= destino ? { ...c, pista: c.pista + 1 } : c))
      const copiasClips = s.pista.clips
        .filter((c) => c.pista === indice)
        .map((c) => ({ ...c, id: crypto.randomUUID(), pista: destino, tono: { ...c.tono }, efectos: c.efectos.map((e) => ({ ...e })) }))
      const capasCorridas = s.capas.map((c) =>
        (c.tipo === 'figura' || c.tipo === 'imagen') && (c.nivel ?? 0) >= destino
          ? { ...c, nivel: (c.nivel ?? 0) + 1 }
          : c,
      )
      const copiasCapas = s.capas
        .filter((c) => (c.tipo === 'figura' || c.tipo === 'imagen') && (c.nivel ?? 0) === indice)
        .map((c) => ({ ...c, id: crypto.randomUUID(), nivel: destino }))
      const altosPista = [...s.altosPista]
      altosPista.splice(destino, 0, s.altosPista[indice] ?? ALTO_PISTA_BASE)
      const pistasMeta = [...s.pistasMeta]
      pistasMeta.splice(destino, 0, { ...metaPista(s.numPistas + 1), nombre: `${s.pistasMeta[indice]?.nombre ?? 'Video'} (copia)` })
      return {
        numPistas: s.numPistas + 1,
        altosPista,
        pistasMeta,
        pista: { ...s.pista, clips: [...clipsCorridos, ...copiasClips] },
        capas: [...capasCorridas, ...copiasCapas],
      }
    }),

  quitarNivelTexto: (nivel) =>
    set((s) => {
      if (s.nivelesTexto <= 1) return {}
      // se van las capas de texto de esa fila; las de arriba bajan un puesto. las
      // figuras e imágenes no cuentan aquí, viven en las pistas de video
      const esTexto = (t: string) => t !== 'imagen' && t !== 'figura'
      const capas = s.capas
        .filter((c) => !(esTexto(c.tipo) && (c.nivel ?? 0) === nivel))
        .map((c) => (esTexto(c.tipo) && (c.nivel ?? 0) > nivel ? { ...c, nivel: (c.nivel ?? 0) - 1 } : c))
      return { capas, nivelesTexto: s.nivelesTexto - 1 }
    }),

  quitarNivelAudio: (nivel) =>
    set((s) => {
      if (s.nivelesAudio <= 1) return {}
      const bajar = <T extends { nivel?: number }>(x: T): T =>
        (x.nivel ?? 0) > nivel ? { ...x, nivel: (x.nivel ?? 0) - 1 } : x
      return {
        nivelesAudio: s.nivelesAudio - 1,
        audios: s.audios.filter((a) => (a.nivel ?? 0) !== nivel).map(bajar),
        audioRegiones: s.audioRegiones.filter((r) => (r.nivel ?? 0) !== nivel).map(bajar),
      }
    }),

  podarPistasVacias: () =>
    set((s) => {
      const poda = calcularPodaVideo(s.pista.clips, s.capas, s.numPistas, s.altosPista, s.pistasMeta)
      if (!poda) return {}
      return {
        numPistas: poda.numPistas,
        altosPista: poda.altosPista,
        pistasMeta: poda.pistasMeta,
        pista: { ...s.pista, clips: poda.clips },
        capas: poda.capas,
      }
    }),

  podarNivelesAudioVacios: () => set((s) => calcularPodaAudio(s.audios, s.audioRegiones, s.nivelesAudio) ?? {}),

  podarNivelesTextoVacios: () => set((s) => calcularPodaTexto(s.capas, s.nivelesTexto) ?? {}),

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
      // las figuras e imágenes viajan con su pista igual que los clips: si estaban
      // en una de las dos filas que se permutan, cambian de nivel para seguirla
      const capas = s.capas.map((c) => {
        if (c.tipo !== 'figura' && c.tipo !== 'imagen') return c
        const n = c.nivel ?? 0
        if (n === indice) return { ...c, nivel: otro }
        if (n === otro) return { ...c, nivel: indice }
        return c
      })
      const altosPista = [...s.altosPista]
      ;[altosPista[indice], altosPista[otro]] = [altosPista[otro], altosPista[indice]]
      const pistasMeta = [...s.pistasMeta]
      ;[pistasMeta[indice], pistasMeta[otro]] = [pistasMeta[otro], pistasMeta[indice]]
      return { pista: { ...s.pista, clips }, capas, altosPista, pistasMeta }
    }),

  renombrarCarril: (carril, nombre) =>
    set(() => {
      const limpio = nombre.slice(0, 40)
      if (carril === 'texto') return { nombreCarrilTexto: limpio }
      return { nombreCarrilAudio: limpio }
    }),

  setAltoCarril: (carril, alto) =>
    set(() => {
      // el suelo es la altura por defecto de ese carril: no se puede achicar por
      // debajo de como nace, solo agrandar hasta el tope
      const a = Math.round(Math.min(ALTO_FILA_MAX, Math.max(ALTO_FILA_DEF[carril], alto)))
      if (carril === 'audio') return { altoFilaAudio: a }
      return { altoFilaTexto: a }
    }),

  setAnchoCabeceras: (ancho) =>
    set({ anchoCabeceras: Math.round(Math.min(ANCHO_CABECERAS_MAX, Math.max(ANCHO_CABECERAS_MIN, ancho))) }),

  renombrarPista: (indice, nombre) =>
    set((s) => {
      // un nombre en blanco no se guarda, el nivel se queda con el que tenía. así
      // el usuario puede borrar y desistir sin dejar la fila sin rótulo
      const limpio = nombre.slice(0, 40)
      const pistasMeta = s.pistasMeta.map((m, i) => (i === indice ? { ...m, nombre: limpio } : m))
      return { pistasMeta }
    }),

  setAltoPista: (indice, alto) =>
    set((s) => ({
      altosPista: s.altosPista.map((a, i) =>
        i === indice ? Math.round(Math.min(ALTO_PISTA_MAX, Math.max(ALTO_PISTA_MIN, alto))) : a,
      ),
    })),

  moverClipAPista: (id, pista) =>
    set((s) => {
      const clip = s.pista.clips.find((c) => c.id === id)
      if (!clip) return {}
      const destino = Math.min(s.numPistas - 1, Math.max(0, pista))
      if (destino === clip.pista) return {}
      // dos clips no se solapan en un mismo nivel. si la pista destino está ocupada en
      // el tramo del clip, en vez de trabarse se desliza al hueco libre más cercano de
      // esa pista, de modo que arrastrar hacia arriba un clip que asomaba por debajo de
      // otro lo encaja a su lado al momento
      const otros = s.pista.clips.filter((c) => c.id !== id && c.pista === destino)
      const inicio = huecoMasCercano(otros, clip.inicio, clip.duracion)
      const delta = inicio - clip.inicio
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => (c.id === id ? { ...c, pista: destino, inicio } : c)),
        },
        // el audio separado de este clip lo sigue si el encaje cambió su inicio
        audios: delta
          ? s.audios.map((a) => (a.vinculadoA === id ? { ...a, inicio: Math.max(0, a.inicio + delta) } : a))
          : s.audios,
      }
    }),

  alternarSilencioClip: (id) =>
    set((s) => {
      const dest = clipsObjetivo(s, id)
      // el nuevo estado lo marca el clip que se pulsó y se copia igual a todo el conjunto,
      // para que "silenciar" deje a TODOS en silencio (y no cada uno alternando su propio
      // estado, que dejaría unos con sonido y otros sin él)
      const objetivo = s.pista.clips.find((c) => c.id === id)
      const silenciado = !objetivo?.silenciado
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) => {
            if (!dest.has(c.id)) return c
            // al quitar el silencio de un clip que estaba a cero se le devuelve un
            // nivel audible; si no, el botón diría que suena y se seguiría sin oír
            const volumen = !silenciado && (c.volumen ?? 1) === 0 ? 1 : c.volumen
            return { ...c, silenciado, volumen }
          }),
        },
      }
    }),

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
      const dest = clipsObjetivo(s, id)
      return {
        pista: {
          ...s.pista,
          clips: s.pista.clips.map((c) =>
            // bajar a cero es lo mismo que silenciar, y subir desde cero devuelve
            // el sonido: así el deslizador y el botón nunca se contradicen. con varios
            // clips marcados el mismo volumen cae sobre todo el conjunto
            dest.has(c.id) ? { ...c, volumen: v, silenciado: v === 0 } : c,
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

  intercambiarNivelAudio: (a, b) =>
    set((s) => {
      if (a === b) return {}
      // cada audio o región que esté en una de las dos filas se manda a la otra;
      // el resto se queda quieto. como es una permuta, mover arriba y luego abajo
      // deja todo como estaba
      const permutar = <T extends { nivel?: number }>(x: T): T => {
        const n = x.nivel ?? 0
        if (n === a) return { ...x, nivel: b }
        if (n === b) return { ...x, nivel: a }
        return x
      }
      return {
        audios: s.audios.map(permutar),
        audioRegiones: s.audioRegiones.map(permutar),
      }
    }),

  moverCapaNivel: (id, nivel) =>
    set((s) => {
      const capa = s.capas.find((c) => c.id === id)
      if (!capa) return {}
      // una figura o imagen se mueve entre pistas de video: su nivel apunta a una
      // de ellas y se sujeta al rango existente, sin abrir filas de texto
      if (capa.tipo === 'figura' || capa.tipo === 'imagen') {
        const destino = Math.max(0, Math.min(s.numPistas - 1, nivel))
        return { capas: s.capas.map((c) => (c.id === id ? { ...c, nivel: destino } : c)) }
      }
      // texto, dibujo y censura se reparten por las filas del carril de texto; al
      // caer en la última vacía, el carril crece para dejar otra libre encima
      const destino = Math.max(0, Math.min(MAX_NIVELES - 1, nivel))
      const capas = s.capas.map((c) => (c.id === id ? { ...c, nivel: destino } : c))
      return { capas, nivelesTexto: Math.max(s.nivelesTexto, Math.min(MAX_NIVELES, destino + 1)) }
    }),

  insertarNivelTexto: (nivel, id) =>
    set((s) => {
      if (s.nivelesTexto >= MAX_NIVELES) return {}
      const corte = Math.max(0, Math.min(s.nivelesTexto, nivel))
      return {
        nivelesTexto: s.nivelesTexto + 1,
        // solo se recolocan las capas del carril de texto; las figuras y las
        // imágenes viven en las pistas de video y no deben moverse al abrir una
        // fila aquí
        capas: s.capas.map((c) => {
          if (c.tipo === 'imagen' || c.tipo === 'figura') return c
          if (c.id === id) return { ...c, nivel: corte }
          const n = c.nivel ?? 0
          return n >= corte ? { ...c, nivel: n + 1 } : c
        }),
      }
    }),

  insertarNivelAudio: (nivel, id) =>
    set((s) => {
      if (s.nivelesAudio >= MAX_NIVELES) return {}
      const corte = Math.max(0, Math.min(s.nivelesAudio, nivel))
      const subir = <T extends { id: string; nivel?: number }>(x: T): T => {
        if (x.id === id) return { ...x, nivel: corte }
        const n = x.nivel ?? 0
        return n >= corte ? { ...x, nivel: n + 1 } : x
      }
      return {
        nivelesAudio: s.nivelesAudio + 1,
        audios: s.audios.map(subir),
        audioRegiones: s.audioRegiones.map(subir),
      }
    }),

  moverAudioNivel: (id, nivel) =>
    set((s) => {
      const destino = Math.max(0, Math.min(MAX_NIVELES - 1, nivel))
      // un audio importado no se solapa con otro en su fila; las franjas de ganancia
      // sí pueden. igual que los clips, si la fila destino está ocupada en el tramo del
      // audio este se encaja al hueco libre más cercano en vez de trabarse
      const audio = s.audios.find((a) => a.id === id)
      let audios = s.audios
      if (audio && destino !== (audio.nivel ?? 0)) {
        const otros = s.audios.filter((a) => a.id !== id && (a.nivel ?? 0) === destino)
        const inicio = huecoMasCercano(otros, audio.inicio, audio.duracion)
        audios = s.audios.map((a) => (a.id === id ? { ...a, nivel: destino, inicio } : a))
      } else {
        audios = s.audios.map((a) => (a.id === id ? { ...a, nivel: destino } : a))
      }
      // el carril de audio comparte filas entre audios importados y regiones de
      // ganancia, así que la región (que sí puede solapar) solo cambia de fila
      const audioRegiones = s.audioRegiones.map((r) => (r.id === id ? { ...r, nivel: destino } : r))
      const nivelesAudio = Math.max(s.nivelesAudio, Math.min(MAX_NIVELES, destino + 1))
      return { audios, audioRegiones, nivelesAudio }
    }),

  agregarTexto: () =>
    set((s) => {
      // los textos se apilan en la misma fila del carril (la de abajo) uno al lado del
      // otro en el tiempo, porque como overlays sí pueden convivir en un mismo nivel.
      // añadir otro texto no debe abrir una fila nueva: nace en la fila 0, en el
      // cabezal, junto a los que ya haya
      const capa = { ...crearCapaTexto(s.playhead, s.resolucion.alto), nivel: 0 }
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        capasSeleccionadas: [capa.id],
        clipSeleccionado: null,
        herramienta: 'texto',
        nivelesTexto: Math.max(s.nivelesTexto, 1),
      }
    }),

  agregarImagen: (src, anchoNatural, altoNatural) =>
    set((s) => {
      const capa = crearCapaImagen(s.playhead, src, anchoNatural, altoNatural)
      // la imagen vive en una pista de video: nace en la de más arriba, que es la
      // que queda encima de todo en el visor
      capa.nivel = s.numPistas - 1
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
      const capa = crearCapaCensura(s.playhead, s.resolucion.ancho / s.resolucion.alto)
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
      // la figura vive en una pista de video: nace en la de más arriba, que es la
      // que queda encima de todo en el visor
      const capa = { ...crearCapaFigura(s.playhead, forma, x, y), nivel: s.numPistas - 1 }
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
    set((s) => {
      const capas = s.capas.filter((c) => c.id !== id)
      const base = { capaSeleccionada: s.capaSeleccionada === id ? null : s.capaSeleccionada }
      // una capa de texto, dibujo o censura puede dejar vacía su fila de texto; una
      // figura o imagen, su pista de video. se comprueban ambos carriles
      const pt = calcularPodaTexto(capas, s.nivelesTexto)
      const pv = calcularPodaVideo(s.pista.clips, pt ? pt.capas : capas, s.numPistas, s.altosPista, s.pistasMeta)
      if (pv) {
        return {
          ...base,
          nivelesTexto: pt ? pt.nivelesTexto : s.nivelesTexto,
          capas: pv.capas,
          numPistas: pv.numPistas,
          altosPista: pv.altosPista,
          pistasMeta: pv.pistasMeta,
          pista: { ...s.pista, clips: pv.clips },
        }
      }
      if (pt) return { ...base, capas: pt.capas, nivelesTexto: pt.nivelesTexto }
      return { ...base, capas }
    }),

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

  setBorradorFiltro: (f) => set({ borradorFiltro: f }),
  setBorradorGrosor: (v) => set({ borradorGrosor: Math.max(4, Math.min(200, v)) }),

  borrarEn: (x, y, radio) =>
    set((s) => {
      const t = s.playhead
      const filtro = s.borradorFiltro
      // solo entra lo que está en pantalla ahora mismo y encaja con el filtro
      const alcanza = (c: Capa) =>
        t >= c.inicio && t < c.inicio + c.duracion && (filtro === 'todo' || c.tipo === filtro)
      const fuera: string[] = []
      const capas = s.capas.map((c) => {
        if (!alcanza(c)) return c
        if (c.tipo === 'trazo') {
          // de un dibujo se quitan únicamente los trazos que el borrador roza, no
          // la capa entera: es lo que se espera de un borrador de verdad
          const quedan = c.trazos.filter(
            (tr) => !tr.some((p) => Math.hypot(c.x + p.x - x, c.y + p.y - y) <= radio),
          )
          if (quedan.length === c.trazos.length) return c
          if (quedan.length === 0) {
            fuera.push(c.id)
            return c
          }
          return { ...c, trazos: quedan }
        }
        // las demás capas se borran enteras cuando el borrador cae sobre ellas
        const media = 'anchoRel' in c ? (c as { anchoRel: number }).anchoRel / 2 : 0.06
        const mediaAlto = 'altoRel' in c && (c as { altoRel?: number }).altoRel
          ? ((c as { altoRel: number }).altoRel) / 2
          : media
        if (Math.abs(c.x - x) <= media + radio && Math.abs(c.y - y) <= mediaAlto + radio) {
          fuera.push(c.id)
        }
        return c
      })
      if (!fuera.length && capas.every((c, i) => c === s.capas[i])) return {}
      return { capas: capas.filter((c) => !fuera.includes(c.id)) }
    }),

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
        impactoSeleccionado: null,
        // al elegir una sola capa se abre su herramienta; sumando al conjunto no
        // se cambia de panel, para no sacar al usuario de donde estaba
        herramienta: !aditivo && capa ? herrCapa : s.herramienta,
        // elegir una capa suelta deshace la selección múltiple de la línea de tiempo. el
        // arrastre del grupo no llama aquí, así que moverlo no lo desmarca
        bloquesSeleccionados: id ? [] : s.bloquesSeleccionados,
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
        // con transiciones, la capa no encoge tanto como para que la de entrada y la de
        // salida se pisen; y lo que quede de transición se achica para caber
        const minDur = duracionMinimaCon(c, DURACION_MINIMA_CAPA)
        if (lado === 'inicio') {
          const fin = c.inicio + c.duracion
          const nuevoInicio = Math.max(0, Math.min(c.inicio + delta, fin - minDur))
          return limitarTransiciones({ ...c, inicio: nuevoInicio, duracion: fin - nuevoInicio })
        }
        return limitarTransiciones({ ...c, duracion: Math.max(minDur, c.duracion + delta) })
      }),
    })),

  setGrabandoMovimiento: (v) =>
    // interruptor crudo de captura. la simplificación del recorrido ya no ocurre
    // aquí: una toma se pausa y se reanuda varias veces, y reducir los puntos en
    // cada pausa perdería resolución. eso se hace una sola vez, al guardar la toma
    set({ grabandoMovimiento: v, inicioGrabacion: v ? performance.now() : null }),

  capaGrabando: null,
  grabacionActiva: false,
  respaldoGrabacion: null,

  iniciarGrabacion: (id) =>
    set((s) => {
      const capa = s.capas.find((c) => c.id === id)
      if (!capa) return {}
      return {
        grabacionActiva: true,
        capaGrabando: id,
        capaSeleccionada: id,
        // se guarda cómo estaba la capa para poder descartar la toma entera
        respaldoGrabacion: {
          id,
          keyframes: capa.keyframes.map((k) => ({ ...k })),
          duracion: capa.duracion,
          x: capa.x,
          y: capa.y,
        },
      }
    }),

  pausarGrabacion: () => {
    set({ grabandoMovimiento: false, inicioGrabacion: null })
    get().pausar()
  },

  reanudarGrabacion: () => {
    set({ grabandoMovimiento: true, inicioGrabacion: performance.now() })
    get().reproducir()
  },

  guardarGrabacion: () => {
    get().pausar()
    set((s) => {
      const id = s.capaGrabando
      return {
        grabandoMovimiento: false,
        grabacionActiva: false,
        capaGrabando: null,
        respaldoGrabacion: null,
        inicioGrabacion: null,
        // ya cerrada la toma se reduce el recorrido grabado a pulso a los puntos que
        // definen su forma, para poder editarlo nodo a nodo
        capas: s.capas.map((c) =>
          c.id === id && c.keyframes.length > 2
            ? { ...c, keyframes: simplificarRecorrido(c.keyframes) }
            : c,
        ),
      }
    })
  },

  cancelarGrabacion: () => {
    get().pausar()
    set((s) => {
      const r = s.respaldoGrabacion
      return {
        grabandoMovimiento: false,
        grabacionActiva: false,
        capaGrabando: null,
        respaldoGrabacion: null,
        inicioGrabacion: null,
        // se devuelve la capa a como estaba antes de abrir la toma
        capas: r
          ? s.capas.map((c) =>
              c.id === r.id ? { ...c, keyframes: r.keyframes, duracion: r.duracion, x: r.x, y: r.y } : c,
            )
          : s.capas,
      }
    })
  },

  crecerCapaGrabando: (playhead) =>
    set((s) => {
      const id = s.capaGrabando
      if (!id) return {}
      let cambio = false
      const capas = s.capas.map((c) => {
        if (c.id !== id) return c
        // se estira un pelín por delante del cabezal (no justo hasta él), para que el
        // elemento no parpadee en el borde: el cabezal avanza un cuadro cada vez y si
        // el bloque acabara exactamente en él, quedaría un instante fuera de rango
        const dentro = Math.max(0, playhead - c.inicio) + 0.2
        if (dentro <= c.duracion) return c
        cambio = true
        return { ...c, duracion: dentro }
      })
      return cambio ? { capas } : {}
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
        // el punto va en el instante del cabezal, medido desde el arranque de la
        // capa. si el movimiento dura más que el bloque, el bloque se estira para
        // abarcarlo (el recorrido manda), en vez de recortar los puntos al final
        const dentro = Math.max(0, playhead - c.inicio)
        const duracion = Math.max(c.duracion, dentro)
        const t = dentro
        const punto = { t, x: entre01(x), y: entre01(y) }
        const otros = c.keyframes.filter((k) => Math.abs(k.t - t) > 0.03)
        const keyframes = [...otros, punto].sort((a, b) => a.t - b.t)
        return { ...c, duracion, keyframes }
      }),
    })),

  quitarMovimiento: (id) =>
    set((s) => ({
      capas: s.capas.map((c) => (c.id === id ? { ...c, keyframes: [] } : c)),
    })),

  escalarTrazo: (id, factor) =>
    set((s) => ({
      capas: s.capas.map((c) => {
        if (c.id !== id || c.tipo !== 'trazo') return c
        let minx = Infinity
        let miny = Infinity
        let maxx = -Infinity
        let maxy = -Infinity
        for (const tr of c.trazos)
          for (const p of tr) {
            if (p.x < minx) minx = p.x
            if (p.y < miny) miny = p.y
            if (p.x > maxx) maxx = p.x
            if (p.y > maxy) maxy = p.y
          }
        if (!isFinite(minx)) return c
        const cx = (minx + maxx) / 2
        const cy = (miny + maxy) / 2
        const f = Math.max(0.05, factor)
        const trazos = c.trazos.map((tr) => tr.map((p) => ({ x: cx + (p.x - cx) * f, y: cy + (p.y - cy) * f })))
        return { ...c, trazos }
      }),
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

  // mete un nodo nuevo en el recorrido en el instante t (relativo al arranque de la
  // capa) con la posición dada. sirve para el pincel de nodos: pulsar sobre la línea
  // añade un punto por donde pasar, y la curva se reacomoda para respetarlo
  insertarKeyframe: (id, t, x, y) =>
    set((s) => ({
      capas: s.capas.map((c) => {
        if (c.id !== id) return c
        const punto = { t: Math.max(0, t), x: entre01(x), y: entre01(y) }
        // si cae casi encima de otro, se sustituye en vez de amontonar dos nodos
        const otros = c.keyframes.filter((k) => Math.abs(k.t - punto.t) > 0.02)
        const keyframes = [...otros, punto].sort((a, b) => a.t - b.t)
        return { ...c, keyframes }
      }),
    })),

  // suaviza el recorrido redondeando la posición de cada nodo hacia el promedio de
  // sus vecinos. es el equivalente rápido a repasar la línea a mano para quitarle
  // los temblores, sin tener que tocar los tiradores uno por uno. los extremos se
  // quedan donde están para no acortar ni alargar el trazo
  suavizarCapa: (id) =>
    set((s) => ({
      capas: s.capas.map((c) => {
        if (c.id !== id || c.keyframes.length < 3) return c
        const k = c.keyframes
        const keyframes = k.map((p, i) => {
          if (i === 0 || i === k.length - 1) return { ...p, hx: undefined, hy: undefined }
          const a = k[i - 1]
          const b = k[i + 1]
          // media ponderada: el propio nodo pesa la mitad y cada vecino un cuarto,
          // así se ablanda el pico sin que el trazo se despegue de por donde iba
          return {
            ...p,
            x: entre01(p.x * 0.5 + a.x * 0.25 + b.x * 0.25),
            y: entre01(p.y * 0.5 + a.y * 0.25 + b.y * 0.25),
            hx: undefined,
            hy: undefined,
          }
        })
        return { ...c, keyframes }
      }),
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

  editandoNodos: false,
  setEditandoNodos: (v) => set({ editandoNodos: v }),

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
  // el de la vista previa va de 0 a 1 (0 a 100 %): es un mando para escuchar, no
  // multiplica el sonido más allá del original
  setVolumenPreview: (v) => set({ volumenPreview: Math.max(0, Math.min(1, v)) }),

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
    set((s) => {
      const audioRegiones = s.audioRegiones.filter((r) => r.id !== id)
      const base = { regionSeleccionada: s.regionSeleccionada === id ? null : s.regionSeleccionada }
      const pa = calcularPodaAudio(s.audios, audioRegiones, s.nivelesAudio)
      return pa ? { ...base, ...pa } : { ...base, audioRegiones }
    }),

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
      impactoSeleccionado: id ? null : s.impactoSeleccionado,
      herramienta: id ? 'audio' : s.herramienta,
      // igual que con los clips: elegir un audio o franja suelto deshace el conjunto. el
      // arrastre del grupo no llama aquí, así que no se desmarca al moverlo
      bloquesSeleccionados: id ? [] : s.bloquesSeleccionados,
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
    set((s) => {
      const audio = s.audios.find((a) => a.id === id)
      if (!audio) return {}
      // los audios tampoco se solapan entre sí en una misma fila
      const otros = s.audios.filter((a) => a.id !== id && (a.nivel ?? 0) === (audio.nivel ?? 0))
      const ajustado = inicioSinSolape(otros, Math.max(0, nuevoInicio), audio.duracion, audio.inicio)
      if (ajustado === null) return {}
      return { audios: s.audios.map((a) => (a.id === id ? { ...a, inicio: ajustado } : a)) }
    }),

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
          // a dónde llevaría el borde izquierdo. si cae antes del cero (el audio ya
          // está pegado a la izquierda) no se puede correr más para allá, así que ese
          // sobrante se convierte en crecer por la derecha: se recupera el principio
          // recortado empujando el resto del audio hacia adelante, en vez de que no
          // pase nada. la posición en la fuente por la derecha no cambia
          const inicioIdeal = a.inicio + d
          const nuevoInicio = Math.max(0, inicioIdeal)
          const sobranteIzq = nuevoInicio - inicioIdeal // >= 0 solo cuando toca el cero
          const nuevoFin = fin + sobranteIzq
          return { ...a, inicio: nuevoInicio, duracion: nuevoFin - nuevoInicio, recorteInicio: a.recorteInicio + d }
        }
        const tope = a.duracionFuente - a.recorteInicio
        return { ...a, duracion: Math.max(DURACION_MINIMA_CAPA, Math.min(tope, a.duracion + delta)) }
      }),
    })),

  quitarAudio: (id) =>
    set((s) => {
      const audios = s.audios.filter((a) => a.id !== id)
      const base = { regionSeleccionada: s.regionSeleccionada === id ? null : s.regionSeleccionada }
      const pa = calcularPodaAudio(audios, s.audioRegiones, s.nivelesAudio)
      return pa ? { ...base, ...pa } : { ...base, audios }
    }),

  setVolumenAudio: (id, volumen) =>
    set((s) => ({
      audios: s.audios.map((a) => (a.id === id ? { ...a, volumen: Math.max(0, Math.min(2, volumen)) } : a)),
    })),

  setFundidoAudio: (id, cambios) =>
    set((s) => ({
      audios: s.audios.map((a) => (a.id === id ? { ...a, ...cambios } : a)),
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
      // si al retirar el medio ya no queda ningún clip de video, la fila de video
      // vuelve a una sola: los niveles extra que se hubieran abierto se quedaban
      // vacíos y sin sentido. solo se toca la pista de video; los carriles de
      // texto, audio e imagen conservan lo suyo. si todavía queda algún clip, no se
      // reordena nada, para respetar los niveles que el usuario montó a mano
      const sinClips = clips.length === 0
      const pistasBase = sinClips
        ? { numPistas: 1, altosPista: [64], pistasMeta: [metaPista(1)] }
        : {}
      return {
        pista: { ...s.pista, clips },
        audios,
        capas,
        clipSeleccionado,
        capaSeleccionada,
        regionSeleccionada,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
        ...pistasBase,
      }
    }),

  setCategoriaClip: (c) => set({ categoriaClip: c }),

  setHerramienta: (h) =>
    set((s) => ({
      herramienta: h,
      // cambiar de herramienta corta cualquier grabación de recorrido que
      // estuviera en marcha. si no, la grabación abierta para una censura seguía
      // viva al pasar a dibujar, y el panel aparecía en rojo diciendo que estaba
      // grabando algo que nadie había empezado ahí
      grabandoMovimiento: false,
      dibujandoMascara: h === 'censura' ? s.dibujandoMascara : false,
      // abrir cualquier herramienta cierra el recorte rápido; el recorte pasa a
      // gobernarse por la herramienta o la categoría elegida
      recorteRapido: false,
    })),

  setLadoTransicion: (lado) => set({ ladoTransicion: lado }),

  setLienzo: (ancho, alto) =>
    set((s) => {
      // cuando hay un solo clip, al cambiar la proporción del lienzo el video se
      // reacomoda solo (centrado, a escala 1) para acoplarse al nuevo cuadro, aunque
      // estuviera reencuadrado. pero se conserva su giro y su volteo: cambiar la
      // proporción no debe deshacer la rotación que el usuario aplicó al video. con
      // varios clips no se toca nada, porque cada uno pudo colocarse a mano
      const clips = s.pista.clips
      const reacomodar = (c: typeof clips[number]) => {
        const gira = c.encuadre?.rotacion || c.encuadre?.espejoH || c.encuadre?.espejoV
        if (!gira) return { ...c, encuadre: undefined }
        return {
          ...c,
          encuadre: {
            x: 0.5,
            y: 0.5,
            escala: 1,
            rotacion: c.encuadre?.rotacion,
            espejoH: c.encuadre?.espejoH,
            espejoV: c.encuadre?.espejoV,
          },
        }
      }
      const pista =
        clips.length === 1 ? { ...s.pista, clips: clips.map(reacomodar) } : s.pista

      // los elementos (figuras, imágenes, censuras, dibujos) no deben cambiar de
      // tamaño ni deformarse al cambiar la proporción. como el ancho se guarda en
      // fracción del ancho del lienzo y el alto en fracción del alto, un cambio de
      // proporción distorsionaría la figura; para evitarlo se reescalan sus medidas
      // por el factor inverso, de modo que conserven sus píxeles exactos. el grosor y
      // el tamaño de letra van en píxeles del lienzo y la posición en fracción, así
      // que se dejan como están (una figura centrada sigue centrada)
      const fx = s.resolucion.ancho / ancho
      const fy = s.resolucion.alto / alto
      const capas =
        fx === 1 && fy === 1
          ? s.capas
          : s.capas.map((c) => {
              if (c.tipo === 'figura' || c.tipo === 'censura') {
                return { ...c, anchoRel: c.anchoRel * fx, altoRel: c.altoRel * fy }
              }
              if (c.tipo === 'imagen') {
                return {
                  ...c,
                  anchoRel: c.anchoRel * fx,
                  altoRel: c.altoRel !== undefined ? c.altoRel * fy : c.altoRel,
                }
              }
              if (c.tipo === 'trazo') {
                return {
                  ...c,
                  trazos: c.trazos.map((t) => t.map((p) => ({ x: p.x * fx, y: p.y * fy }))),
                }
              }
              return c
            })

      return { resolucion: { ancho, alto }, lienzoManual: true, pista, capas }
    }),

  setLienzoAuto: () =>
    set((s) => {
      // "ajustar al primer video" toma su tamaño. si ese video está girado un cuarto
      // (90° o 270°), lo que se ve tiene el ancho y el alto intercambiados, así que el
      // lienzo debe tomar esas medidas ya volteadas para calzar su proporción real
      const auto = s.resolucionAuto
      const primero = [...s.pista.clips].sort((a, b) => a.inicio - b.inicio)[0]
      const rot = primero?.encuadre?.rotacion ?? 0
      const cuarto = Math.abs(Math.round(rot / 90)) % 2 === 1
      const res = cuarto ? { ancho: auto.alto, alto: auto.ancho } : { ...auto }
      return { resolucion: res, lienzoManual: false }
    }),

  setColorFondo: (color) => set({ colorFondo: color }),
  setFondo: (f) => set({ fondo: f }),
  setDesenfoqueFondo: (v) => set({ desenfoqueFondo: Math.max(1, Math.min(100, v)) }),

  // el giro del fondo se guarda normalizado a 0/90/180/270
  setFondoGiro: (v) => set({ fondoGiro: ((Math.round(v / 90) * 90) % 360 + 360) % 360 }),

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
      // la duración cuenta también las capas y los audios, así que un montaje sin
      // ningún video (solo un texto o un dibujo) también se puede reproducir
      const total = duracionProyecto(s.pista.clips, s.capas, s.audios, s.audioRegiones)
      if (total === 0) return {}
      // si el cabezal está en el final (o a un pelo de él), se reinicia al inicio para
      // volver a reproducir el montaje entero. la reproducción real no siempre deja el
      // cabezal clavado en el total exacto: por el redondeo de los tiempos del video
      // se queda unas centésimas antes, y sin este margen darle play no reiniciaba
      const playhead = s.playhead >= total - 0.08 ? 0 : s.playhead
      return { reproduciendo: true, playhead }
    }),

  pausar: () => set({ reproduciendo: false }),

  alternarReproduccion: () => (get().reproduciendo ? get().pausar() : get().reproducir()),

  aplicarZoom: (factor) =>
    set((s) => ({
      pxPorSegundo: Math.max(PX_MIN, Math.min(PX_MAX, s.pxPorSegundo * factor)),
    })),

  // pone el zoom para que TODO el proyecto quepa en el ancho visible de la línea de tiempo, de una
  // vez, sin tener que alejar a mano. es el botón de "ajustar al ancho"
  ajustarZoomAlAncho: () =>
    set((s) => {
      const total = duracionProyecto(s.pista.clips, s.capas, s.audios, s.audioRegiones)
      const px = zoomParaEncuadrar(total, s.anchoTimeline)
      return px ? { pxPorSegundo: px } : {}
    }),

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
      // tocar el clip mientras corre (ponerle un efecto, cambiarle el color, moverlo,
      // lo que sea) detiene la reproducción: uno quiere ver el cambio quieto, no que
      // siga pasando el video por debajo. la grabación de movimiento se queda fuera a
      // propósito, porque ahí sí se edita a la vez que se reproduce
      const st = get()
      if (st.reproduciendo && !st.grabandoMovimiento && !st.grabacionActiva) {
        set({ reproduciendo: false })
      }
      preparar()
      return original(...args)
    }
  }

  return acciones
})
