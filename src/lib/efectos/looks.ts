import { AjusteTono, EfectoClip } from '../../types/timeline'
import { tonoNeutro } from '../color/tono'
import { crearEfecto } from './catalogo'

// un "look" es una receta completa de aspecto: un baño de color más varios efectos
// encendidos de una sola vez, para clavar una estética reconocible sin ir pieza por
// pieza. no necesita ningún motor nuevo: aplicarlo es rellenar el tono del clip y
// sumarle los efectos que ya existen, así que después cada parte (el tinte, el brillo,
// los bordes, el grano) se sigue afinando a mano como cualquier otra
export interface Look {
  id: string
  nombre: string
  // frase corta de qué evoca, para el subtítulo de la tarjeta
  descripcion: string
  // dos colores de acento para pintar la muestra de la tarjeta (un degradado)
  colorA: string
  colorB: string
  // el baño de color que deja en el clip
  tono: AjusteTono
  // fábrica de los efectos que enciende. es una función y no un arreglo fijo para que
  // cada aplicación nazca con ids frescos, y así reaplicar o llevarlo a varios clips no
  // arrastre el mismo identificador
  efectos: () => EfectoClip[]
}

// atajo para escribir el tono sin repetir todos los campos neutros cada vez
const t = (v: Partial<AjusteTono>): AjusteTono => ({ ...tonoNeutro, ...v })

// arma un efecto del catálogo y le pisa un par de valores de arranque, para que el
// look nazca con la dosis justa de cada cosa en vez de la de por defecto
const ef = (id: string, cambios: Partial<EfectoClip>): EfectoClip =>
  ({ ...crearEfecto(id), ...cambios } as EfectoClip)

export const LOOKS: Look[] = [
  {
    id: 'nocturno-purpura',
    nombre: 'Nocturno púrpura',
    descripcion: 'Noche de coches: baño violeta, luces que brillan, bordes cromáticos y grano.',
    colorA: '#7c3aed',
    colorB: '#2563eb',
    // violeta con algo de fuerza sobre un cuadro contrastado y un punto más oscuro, con
    // la nitidez arriba para que los reflejos y los bordes queden marcados. el color es
    // el mismo "Violeta" de la paleta del tinte rápido, así queda marcado como activo en
    // Ajustar colores y se cambia por otro (rosa, azul, rojo...) con un clic
    tono: t({
      tinteColor: '#9b6bff',
      tinteFuerza: 46,
      contraste: 26,
      exposicion: -8,
      saturacion: 14,
      temperatura: -6,
      nitidez: 40,
    }),
    // el brillo (bloom) envuelve las luces, el cromático corre los canales en los bordes
    // (ese aire de edit) y el grano le pone la textura analógica
    efectos: () => [ef('resplandor', { brillo: 66 }), ef('cromatico', { intensidad: 34 }), ef('grano', { intensidad: 30 })],
  },
]

export function buscarLook(id: string): Look | undefined {
  return LOOKS.find((l) => l.id === id)
}
