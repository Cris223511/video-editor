import { AjusteTono, EfectoClip } from '../../types/timeline'
import { tonoNeutro } from '../color/tono'
import { PuntoRueda, RUEDAS_NEUTRAS } from '../color/ruedas'
import { crearEfecto } from './catalogo'

// una "combinación" (antes look) es una receta completa de aspecto: un baño de color con
// su corrección de tono y sus ruedas, más varios efectos encendidos de una sola vez, para
// clavar una estética reconocible sin ir pieza por pieza. no necesita ningún motor nuevo:
// aplicarla es rellenar el tono del clip y sumarle efectos que ya existen, así que después
// cada parte (el color, el brillo, los bordes, el grano) se sigue afinando a mano. solo
// puede haber una puesta a la vez: elegir otra reemplaza la anterior
export interface Look {
  id: string
  nombre: string
  // frase corta de qué evoca, para el subtítulo de la tarjeta
  descripcion: string
  // dos colores de acento para pintar la muestra de la tarjeta (un degradado)
  colorA: string
  colorB: string
  // el baño de color y la corrección de tono que deja en el clip
  tono: AjusteTono
  // fábrica de los efectos que enciende. es una función y no un arreglo fijo para que
  // cada aplicación nazca con ids frescos, y así llevarla a varios clips no arrastre el
  // mismo identificador
  efectos: () => EfectoClip[]
}

// atajo para escribir el tono sin repetir todos los campos neutros cada vez
const t = (v: Partial<AjusteTono>): AjusteTono => ({ ...tonoNeutro, ...v })

// tirador de una rueda de color a partir de un ángulo del círculo cromático (rojo 0°,
// verde 120°, azul 240°; violeta cae en 300°) y una fuerza de 0 a 1. sirve para teñir una
// zona tonal (sombras, medios o luces) hacia un color sin escribir a mano las coordenadas
const rueda = (grados: number, fuerza: number): PuntoRueda => {
  const a = (grados * Math.PI) / 180
  return { x: Math.cos(a) * fuerza, y: Math.sin(a) * fuerza }
}

// arma las tres ruedas de una vez; lo que no se pase queda en el centro (sin tocar)
const ruedas = (r: { sombras?: PuntoRueda; medios?: PuntoRueda; altas?: PuntoRueda }) => ({
  sombras: r.sombras ?? { ...RUEDAS_NEUTRAS.sombras },
  medios: r.medios ?? { ...RUEDAS_NEUTRAS.medios },
  altas: r.altas ?? { ...RUEDAS_NEUTRAS.altas },
})

// arma un efecto del catálogo y le pisa un par de valores de arranque, para que la
// combinación nazca con la dosis justa de cada cosa en vez de la de por defecto
const ef = (id: string, cambios: Partial<EfectoClip>): EfectoClip =>
  ({ ...crearEfecto(id), ...cambios } as EfectoClip)

// atajos para los efectos que más se repiten en las recetas
const resplandor = (brillo: number) => ef('resplandor', { brillo })
const cromatico = (intensidad: number) => ef('cromatico', { intensidad })
const grano = (intensidad: number) => ef('grano', { intensidad })
const zoom = (intensidad: number, forma: 'circular' | 'cuadrada' = 'circular') =>
  ef('zoomblur', { intensidad, forma })

export const LOOKS: Look[] = [
  {
    id: 'nocturno-purpura',
    nombre: 'Nocturno púrpura',
    descripcion: 'Noche de coches: violeta de neón, nítido y con las luces brillando.',
    colorA: '#7c3aed',
    colorB: '#3b2d8f',
    // el truco para que una escena de noche no se hunda en negro es BAJAR un poco el
    // contraste (levanta las sombras y deja ver) sin llegar a lavarla, en vez de subir la
    // exposición, que quemaría las luces. sobre eso, el violeta del tinte tiñe todo, las
    // sombras van a violeta y las luces a un azul frío, para ese aire de neón nocturno. la
    // nitidez alta lo deja marcado y brilloso, como las referencias; el grano queda fuera a
    // propósito, que la estética buscada es limpia, no de cinta sucia
    tono: t({
      tinteColor: '#9b6bff',
      tinteFuerza: 42,
      exposicion: 6,
      contraste: -4,
      saturacion: 16,
      temperatura: -10,
      tinte: 6,
      nitidez: 44,
      // las sombras van a violeta fuerte; las luces solo un pelín a azul, para que los faros
      // y los pilotos queden blancos y brillantes, no azulados como estaban
      ruedas: ruedas({ sombras: rueda(300, 0.72), altas: rueda(240, 0.2) }),
    }),
    // el resplandor envuelve las luces (faros, pilotos, farolas) para el brillo, y el
    // cromático corre los canales en los bordes, ese filo rojo/cian de las referencias
    efectos: () => [resplandor(62), cromatico(30)],
  },
  {
    id: 'atardecer-dorado',
    nombre: 'Atardecer dorado',
    descripcion: 'Luz cálida de la hora dorada, dorada en las luces y suave en la sombra.',
    colorA: '#f59e0b',
    colorB: '#b45309',
    tono: t({
      tinteColor: '#ffb64a',
      tinteFuerza: 26,
      exposicion: 6,
      contraste: 6,
      saturacion: 16,
      temperatura: 26,
      nitidez: 12,
      ruedas: ruedas({ altas: rueda(40, 0.5), sombras: rueda(220, 0.28) }),
    }),
    efectos: () => [resplandor(52)],
  },
  {
    id: 'cyber-neon',
    nombre: 'Neón ciber',
    descripcion: 'Sombras azul eléctrico y luces magenta, con brillo y bordes cromáticos.',
    colorA: '#22d3ee',
    colorB: '#e11d8f',
    tono: t({
      exposicion: 4,
      contraste: 10,
      saturacion: 28,
      temperatura: -8,
      nitidez: 20,
      ruedas: ruedas({ sombras: rueda(240, 0.6), altas: rueda(300, 0.5) }),
    }),
    efectos: () => [resplandor(70), cromatico(40)],
  },
  {
    id: 'cine-frio',
    nombre: 'Cine teal & naranja',
    descripcion: 'El contraste de cine: pieles cálidas contra sombras verde azuladas.',
    colorA: '#0d9488',
    colorB: '#ea580c',
    tono: t({
      exposicion: 2,
      contraste: 14,
      saturacion: 12,
      nitidez: 16,
      ruedas: ruedas({ sombras: rueda(180, 0.55), altas: rueda(30, 0.4) }),
    }),
    efectos: () => [resplandor(30)],
  },
  {
    id: 'verano-vivo',
    nombre: 'Verano vivo',
    descripcion: 'Día luminoso y saturado, colores vivos y aire limpio.',
    colorA: '#38bdf8',
    colorB: '#a3e635',
    tono: t({
      exposicion: 8,
      contraste: 10,
      saturacion: 30,
      temperatura: 8,
      nitidez: 22,
    }),
    efectos: () => [],
  },
  {
    id: 'vhs-retro',
    nombre: 'VHS retro',
    descripcion: 'Cinta gastada de los ochenta: color lavado, grano y canales corridos.',
    colorA: '#a78bfa',
    colorB: '#fb7185',
    tono: t({
      exposicion: 4,
      contraste: -18,
      saturacion: -8,
      temperatura: 10,
      tinte: 8,
      ruedas: ruedas({ sombras: rueda(210, 0.4), altas: rueda(50, 0.3) }),
    }),
    efectos: () => [cromatico(40), grano(20)],
  },
  {
    id: 'blanco-negro',
    nombre: 'Blanco y negro',
    descripcion: 'Sin color, con un punto de contraste y grano de película.',
    colorA: '#e5e7eb',
    colorB: '#4b5563',
    tono: t({
      contraste: 16,
      saturacion: -100,
      nitidez: 18,
    }),
    efectos: () => [grano(12)],
  },
  {
    id: 'noir',
    nombre: 'Noir dramático',
    descripcion: 'Blanco y negro duro, sombras profundas y luces marcadas.',
    colorA: '#f8fafc',
    colorB: '#020617',
    tono: t({
      exposicion: -4,
      contraste: 42,
      saturacion: -100,
      nitidez: 26,
    }),
    efectos: () => [resplandor(24), grano(10)],
  },
  {
    id: 'matrix-verde',
    nombre: 'Verde terminal',
    descripcion: 'Baño verde de pantalla vieja, con brillo en las luces.',
    colorA: '#22c55e',
    colorB: '#064e3b',
    tono: t({
      tinteColor: '#46c46a',
      tinteFuerza: 34,
      exposicion: 3,
      contraste: 8,
      saturacion: 6,
      temperatura: -6,
      nitidez: 16,
      ruedas: ruedas({ sombras: rueda(120, 0.5), altas: rueda(120, 0.3) }),
    }),
    efectos: () => [resplandor(48)],
  },
  {
    id: 'rosa-ensueno',
    nombre: 'Rosa de ensueño',
    descripcion: 'Pastel suave y soñador, rosado y con las luces flotando.',
    colorA: '#f9a8d4',
    colorB: '#c4b5fd',
    tono: t({
      tinteColor: '#ff9fd0',
      tinteFuerza: 24,
      exposicion: 10,
      contraste: -16,
      saturacion: 6,
      temperatura: 6,
      tinte: 10,
      ruedas: ruedas({ altas: rueda(320, 0.4), sombras: rueda(270, 0.3) }),
    }),
    efectos: () => [resplandor(64)],
  },
  {
    id: 'frio-invierno',
    nombre: 'Frío de invierno',
    descripcion: 'Azul sereno y frío, con un aire limpio y algo desaturado.',
    colorA: '#60a5fa',
    colorB: '#1e3a8a',
    tono: t({
      exposicion: 4,
      contraste: 8,
      saturacion: -6,
      temperatura: -24,
      nitidez: 14,
      ruedas: ruedas({ sombras: rueda(240, 0.45), altas: rueda(210, 0.3) }),
    }),
    efectos: () => [resplandor(28)],
  },
  {
    id: 'ambar-noche',
    nombre: 'Ámbar de noche',
    descripcion: 'Calor de farola en la oscuridad, luces ámbar que brillan.',
    colorA: '#f97316',
    colorB: '#7c2d12',
    tono: t({
      tinteColor: '#ff9f43',
      tinteFuerza: 22,
      exposicion: 5,
      contraste: -8,
      saturacion: 14,
      temperatura: 20,
      nitidez: 16,
      ruedas: ruedas({ sombras: rueda(30, 0.4), altas: rueda(30, 0.35) }),
    }),
    efectos: () => [resplandor(66), grano(9)],
  },
  {
    id: 'neon-nocturno',
    nombre: 'Vida nocturna',
    descripcion: 'Luces de ciudad de noche, saturado, con brillo y bordes de neón.',
    colorA: '#f43f5e',
    colorB: '#6366f1',
    tono: t({
      exposicion: 3,
      contraste: 18,
      saturacion: 34,
      temperatura: -6,
      nitidez: 20,
      ruedas: ruedas({ sombras: rueda(260, 0.5), altas: rueda(330, 0.45) }),
    }),
    efectos: () => [resplandor(74), cromatico(36)],
  },
  {
    id: 'sepia-antiguo',
    nombre: 'Sepia antiguo',
    descripcion: 'Foto vieja: tono sepia, color apagado y grano de época.',
    colorA: '#d6a760',
    colorB: '#5c4326',
    tono: t({
      tinteColor: '#c9a15a',
      tinteFuerza: 40,
      exposicion: 3,
      contraste: 6,
      saturacion: -34,
      temperatura: 18,
      ruedas: ruedas({ sombras: rueda(35, 0.4), medios: rueda(40, 0.3) }),
    }),
    efectos: () => [grano(16)],
  },
  {
    id: 'drama-alto',
    nombre: 'Drama intenso',
    descripcion: 'Contraste fuerte y color profundo, con las luces realzadas.',
    colorA: '#fbbf24',
    colorB: '#111827',
    tono: t({
      exposicion: -2,
      contraste: 40,
      saturacion: 18,
      nitidez: 28,
      ruedas: ruedas({ sombras: rueda(240, 0.3), altas: rueda(40, 0.3) }),
    }),
    efectos: () => [resplandor(40)],
  },
  {
    id: 'aftermovie',
    nombre: 'Aftermovie',
    descripcion: 'Festival de noche: color vivo, luces que estallan y el zoom hacia el centro.',
    colorA: '#22d3ee',
    colorB: '#a21caf',
    // el aire de vídeo de festival: colores subidos, algo de frío, brillo fuerte en las luces
    // del escenario y el desenfoque radial que empuja la mirada al centro, como la cámara que
    // se lanza hacia la tarima. sin grano, limpio
    tono: t({
      exposicion: 4,
      contraste: 12,
      saturacion: 34,
      temperatura: -6,
      nitidez: 24,
      ruedas: ruedas({ sombras: rueda(240, 0.4), altas: rueda(300, 0.3) }),
    }),
    efectos: () => [resplandor(72), zoom(48, 'circular')],
  },
  {
    id: 'adrenalina',
    nombre: 'Adrenalina',
    descripcion: 'Acción a tope: contraste duro, color intenso y el estirón de velocidad.',
    colorA: '#f97316',
    colorB: '#b91c1c',
    // el zoom más marcado y un color cálido y contrastado, ese pico de energía de un plano de
    // acción o un drop. el desenfoque radial da la sensación de embestida hacia adelante
    tono: t({
      exposicion: 2,
      contraste: 26,
      saturacion: 24,
      temperatura: 8,
      nitidez: 30,
      ruedas: ruedas({ sombras: rueda(20, 0.28), altas: rueda(40, 0.3) }),
    }),
    efectos: () => [zoom(66, 'circular'), resplandor(38)],
  },
  {
    id: 'ensueno-radial',
    nombre: 'Ensueño',
    descripcion: 'Suave y soñador, con las luces flotando y un desenfoque circular en los bordes.',
    colorA: '#c4b5fd',
    colorB: '#f9a8d4',
    // pastel lavado, brillo alto y un zoom suave de forma circular que deja el centro nítido y
    // difumina los bordes con dulzura, ese aire de recuerdo
    tono: t({
      tinteColor: '#d7b7ff',
      tinteFuerza: 20,
      exposicion: 9,
      contraste: -14,
      saturacion: 4,
      temperatura: 4,
      tinte: 8,
      ruedas: ruedas({ altas: rueda(320, 0.32) }),
    }),
    efectos: () => [resplandor(66), zoom(38, 'circular')],
  },
]

export function buscarLook(id: string): Look | undefined {
  return LOOKS.find((l) => l.id === id)
}
