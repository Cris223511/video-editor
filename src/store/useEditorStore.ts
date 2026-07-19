import { create } from 'zustand'
import { Track, AjusteTono, Transicion } from '../types/timeline'
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
import { duracionTotal } from '../lib/timeline/clips'

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
  | 'lienzo'
  | 'marco'
  | 'figura'

interface EstadoEditor {
  pista: Track
  // niveles de video visibles y el alto en píxeles de cada uno. los clips viven
  // todos en la misma lista y su campo pista dice en cuál se dibujan
  numPistas: number
  altosPista: number[]
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
  recortarClip: (id: string, lado: 'inicio' | 'fin', deltaSegundos: number) => void
  setVelocidadClip: (id: string, velocidad: number) => void
  setTono: (id: string, cambios: Partial<AjusteTono>) => void
  resetTono: (id: string) => void
  setTransicion: (id: string, cambios: Partial<Transicion>) => void
  dividirEnCabezal: () => void
  cerrarHueco: (desde: number, pista: number) => void
  seleccionar: (id: string | null) => void

  agregarPista: () => void
  quitarPista: (indice: number) => void
  setAltoPista: (indice: number, alto: number) => void
  moverClipAPista: (id: string, pista: number) => void

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
  // a qué ritmo corre el video mientras se graba un recorrido
  velocidadGrabacion: number
  setVelocidadGrabacion: (v: number) => void

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
}

const pistaVacia: Track = { id: 'video-1', tipo: 'video', clips: [] }

// límites de la multipista: cuántos niveles se permiten y hasta dónde puede
// crecer o encogerse cada uno al estirar su borde inferior
const MAX_PISTAS = 6
const ALTO_PISTA_BASE = 64
const ALTO_PISTA_MIN = 40
const ALTO_PISTA_MAX = 160
const entre01 = (v: number) => Math.max(0, Math.min(1, v))

// estado del editor: una pista de video con posiciones libres, las capas que se
// dibujan encima, el cabezal, la selección y el zoom. cada clip guarda la
// duración de su fuente para saber hasta dónde alargarse al recortar
export const useEditorStore = create<EstadoEditor>((set, get) => ({
  pista: pistaVacia,
  numPistas: 1,
  altosPista: [64],
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

  recortarClip: (id, lado, delta) =>
    set((s) => {
      const clips = s.pista.clips.map((c) => {
        if (c.id !== id) return c
        const v = c.velocidad
        if (lado === 'inicio') {
          // delta va en segundos de la pista; el punto de entrada en la fuente
          // avanza a razón de la velocidad. el borde derecho queda fijo
          const dMin = -c.recorteInicio / v
          const dMax = c.duracion - DURACION_MINIMA
          const d = Math.max(dMin, Math.min(delta, dMax))
          return {
            ...c,
            inicio: c.inicio + d,
            duracion: c.duracion - d,
            recorteInicio: c.recorteInicio + d * v,
          }
        }
        // borde derecho: no puede pasar del final del video fuente
        const dMin = DURACION_MINIMA - c.duracion
        const dMax = (c.duracionFuente - c.recorteInicio) / v - c.duracion
        const d = Math.max(dMin, Math.min(delta, dMax))
        return { ...c, duracion: c.duracion + d }
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

  // el nivel nuevo aparece encima de los demás, vacío y con el alto estándar
  agregarPista: () =>
    set((s) => ({
      numPistas: Math.min(s.numPistas + 1, MAX_PISTAS),
      altosPista:
        s.numPistas < MAX_PISTAS ? [...s.altosPista, ALTO_PISTA_BASE] : s.altosPista,
    })),

  // al eliminar un nivel se van con él sus clips, y los que estaban por encima
  // bajan una posición para que no queden filas huecas en medio
  quitarPista: (indice) =>
    set((s) => {
      if (s.numPistas <= 1) return {}
      const clips = s.pista.clips
        .filter((c) => c.pista !== indice)
        .map((c) => (c.pista > indice ? { ...c, pista: c.pista - 1 } : c))
      const altosPista = s.altosPista.filter((_, i) => i !== indice)
      const seguiaVivo = clips.some((c) => c.id === s.clipSeleccionado)
      return {
        numPistas: s.numPistas - 1,
        altosPista,
        pista: { ...s.pista, clips },
        clipSeleccionado: seguiaVivo ? s.clipSeleccionado : null,
        playhead: Math.min(s.playhead, duracionTotal(clips)),
      }
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

  setGrabandoMovimiento: (v) => set({ grabandoMovimiento: v }),

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
    set((s) => {
      const total = duracionTotal(s.pista.clips)
      return { playhead: Math.max(0, Math.min(t, total)) }
    }),

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
}))
