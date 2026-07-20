import { create } from 'zustand'
import { Track, AjusteTono, Transicion, PistaMeta, EfectoClip } from '../types/timeline'
import { MediaAsset } from '../types/media'
import { Capa, CapaCensura, CapaFigura, CapaImagen, CapaTexto } from '../types/layers'
import { RegionAudio } from '../types/audio'
import { Marco } from '../types/marco'
import { tonoNeutro } from '../lib/color/tono'
import {
  crearCapaCensura,
  crearCapaFigura,
  crearCapaImagen,
  crearCapaTexto,
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
const PX_MIN = 12
const PX_MAX = 400
const DURACION_MINIMA = 0.1
const DURACION_MINIMA_CAPA = 0.2

export type Herramienta =
  | 'proyecto'
  | 'propiedades'
  | 'texto'
  | 'imagen'
  | 'audio'
  | 'censura'
  | 'velocidad'
  | 'tono'
  | 'efectos'
  | 'lienzo'
  | 'marco'
  | 'figura'

interface EstadoEditor {
  pista: Track
  // niveles de video visibles y el alto en píxeles de cada uno. los clips viven
  // todos en la misma lista y su campo pista dice en cuál se dibujan
  numPistas: number
  altosPista: number[]
  // metadatos de cada nivel, en el mismo orden que altosPista. lo que decide si
  // un nivel suena, se ve o se puede tocar vive aquí
  pistasMeta: PistaMeta[]
  capas: Capa[]
  playhead: number
  reproduciendo: boolean
  clipSeleccionado: string | null
  capaSeleccionada: string | null
  regionSeleccionada: string | null
  herramienta: Herramienta
  pxPorSegundo: number
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

  agregarDesdeAsset: (asset: MediaAsset) => void
  quitarClip: (id: string) => void
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
  // cadena de efectos del clip: se suman, se ajustan y se quitan por su id
  agregarEfecto: (id: string, efecto: EfectoClip) => void
  actualizarEfecto: (id: string, efectoId: string, cambios: Partial<EfectoClip>) => void
  quitarEfecto: (id: string, efectoId: string) => void
  setTransicion: (id: string, cambios: Partial<Transicion>) => void
  dividirEnCabezal: () => void
  cerrarHueco: (desde: number, pista: number) => void
  seleccionar: (id: string | null) => void

  agregarPista: () => void
  // crea un nivel nuevo en la posición indicada empujando hacia arriba los que ya
  // estaban en ese índice o por encima. si se pasa un clip, aterriza en el nivel
  // recién creado. es lo que permite soltar un clip entre dos pistas y abrir un
  // hueco propio para él
  insertarPistaEn: (indice: number, clipId?: string) => void
  quitarPista: (indice: number) => void
  setAltoPista: (indice: number, alto: number) => void
  moverClipAPista: (id: string, pista: number) => void
  // guía celeste que aparece mientras se arrastra un clip sobre la separación
  // entre dos niveles: guarda el índice donde nacería la pista nueva, o null si
  // ahora mismo no se está apuntando a ninguna separación
  insercionPista: number | null
  setInsercionPista: (indice: number | null) => void
  alternarSilencioPista: (indice: number) => void
  alternarOcultarPista: (indice: number) => void
  alternarBloquearPista: (indice: number) => void
  // sube o baja un nivel un puesto, llevándose consigo sus clips, su alto y sus
  // metadatos. 'arriba' lo acerca a la cima (índice mayor), 'abajo' al suelo
  reordenarPista: (indice: number, direccion: 'arriba' | 'abajo') => void

  agregarTexto: () => void
  agregarImagen: (src: string, anchoNatural: number, altoNatural: number) => void
  agregarCensura: () => void
  agregarFigura: () => void
  actualizarCapa: (
    id: string,
    cambios:
      | Partial<CapaTexto>
      | Partial<CapaImagen>
      | Partial<CapaCensura>
      | Partial<CapaFigura>,
  ) => void
  quitarCapa: (id: string) => void
  seleccionarCapa: (id: string | null) => void
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

  setVolumenGlobal: (v: number) => void
  agregarRegionAudio: () => void
  actualizarRegionAudio: (id: string, cambios: Partial<RegionAudio>) => void
  quitarRegionAudio: (id: string) => void
  seleccionarRegion: (id: string | null) => void
  moverRegionAudio: (id: string, nuevoInicio: number) => void
  recortarRegionAudio: (id: string, lado: 'inicio' | 'fin', deltaSegundos: number) => void

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
  | 'capas'
  | 'marco'
  | 'volumenGlobal'
  | 'audioRegiones'
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
  'moverClip',
  'recortarClip',
  'estirarVelocidad',
  'setVelocidadClip',
  'setTono',
  'resetTono',
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
  'alternarSilencioPista',
  'alternarOcultarPista',
  'alternarBloquearPista',
  'reordenarPista',
  'agregarTexto',
  'agregarImagen',
  'agregarCensura',
  'agregarFigura',
  'actualizarCapa',
  'quitarCapa',
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
  'setVolumenGlobal',
  'agregarRegionAudio',
  'actualizarRegionAudio',
  'quitarRegionAudio',
  'moverRegionAudio',
  'recortarRegionAudio',
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
const ALTO_PISTA_BASE = 64
const ALTO_PISTA_MIN = 40
const ALTO_PISTA_MAX = 160
const entre01 = (v: number) => Math.max(0, Math.min(1, v))

// metadatos de partida para un nivel recién nacido: rótulo con su número y los
// tres interruptores en reposo
const metaPista = (n: number): PistaMeta => ({
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

  // empuja la foto actual a la pila de pasado y borra el futuro, porque tras una
  // edición nueva ya no tiene sentido rehacer lo que se había deshecho
  const preparar = () => {
    const ahora = performance.now()
    if (capturado && ahora - ultimoSello < 500) {
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

  const finGesto = () => {
    capturado = false
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
  capas: [],
  playhead: 0,
  reproduciendo: false,
  clipSeleccionado: null,
  capaSeleccionada: null,
  regionSeleccionada: null,
  herramienta: 'propiedades',
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
  grabandoMovimiento: false,
  dibujandoMascara: false,
  insercionPista: null,

  agregarDesdeAsset: (asset) =>
    set((s) => {
      // el medio nuevo entra al final de la pista base, no del proyecto entero,
      // para que lo apilado en niveles superiores no lo empuje hacia adelante
      const inicio = duracionTotal(s.pista.clips.filter((c) => c.pista === 0))
      const clip = {
        id: crypto.randomUUID(),
        assetId: asset.id,
        inicio,
        pista: 0,
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
      return {
        pista: { ...s.pista, clips: [...s.pista.clips, clip] },
        clipSeleccionado: clip.id,
        capaSeleccionada: null,
        herramienta: 'propiedades',
        resolucion,
        resolucionAuto,
      }
    }),

  quitarClip: (id) =>
    set((s) => {
      const clips = s.pista.clips.filter((c) => c.id !== id)
      return {
        pista: { ...s.pista, clips },
        clipSeleccionado: s.clipSeleccionado === id ? null : s.clipSeleccionado,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
    }),

  moverClip: (id, nuevoInicio) =>
    set((s) => ({
      pista: {
        ...s.pista,
        clips: s.pista.clips.map((c) =>
          c.id === id ? { ...c, inicio: Math.max(0, nuevoInicio) } : c,
        ),
      },
    })),

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

  seleccionar: (id) =>
    set((s) => ({
      clipSeleccionado: id,
      capaSeleccionada: id ? null : s.capaSeleccionada,
      regionSeleccionada: id ? null : s.regionSeleccionada,
      herramienta: id ? 'propiedades' : s.herramienta,
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

  agregarTexto: () =>
    set((s) => {
      const capa = crearCapaTexto(s.playhead, s.resolucion.alto)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        clipSeleccionado: null,
        herramienta: 'texto',
      }
    }),

  agregarImagen: (src, anchoNatural, altoNatural) =>
    set((s) => {
      const capa = crearCapaImagen(s.playhead, src, anchoNatural, altoNatural)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        clipSeleccionado: null,
        herramienta: 'imagen',
      }
    }),

  agregarCensura: () =>
    set((s) => {
      const capa = crearCapaCensura(s.playhead)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        clipSeleccionado: null,
        herramienta: 'censura',
      }
    }),

  agregarFigura: () =>
    set((s) => {
      const capa = crearCapaFigura(s.playhead)
      return {
        capas: [...s.capas, capa],
        capaSeleccionada: capa.id,
        clipSeleccionado: null,
        herramienta: 'figura',
      }
    }),

  actualizarCapa: (id, cambios) =>
    set((s) => ({
      capas: s.capas.map((c) => (c.id === id ? ({ ...c, ...cambios } as Capa) : c)),
    })),

  quitarCapa: (id) =>
    set((s) => ({
      capas: s.capas.filter((c) => c.id !== id),
      capaSeleccionada: s.capaSeleccionada === id ? null : s.capaSeleccionada,
    })),

  seleccionarCapa: (id) =>
    set((s) => {
      const capa = id ? s.capas.find((c) => c.id === id) : null
      return {
        capaSeleccionada: id,
        clipSeleccionado: id ? null : s.clipSeleccionado,
        regionSeleccionada: id ? null : s.regionSeleccionada,
        // al seleccionar una capa se abre su herramienta según el tipo
        herramienta: capa ? capa.tipo : s.herramienta,
      }
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
