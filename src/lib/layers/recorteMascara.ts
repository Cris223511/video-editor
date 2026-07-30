import { RecorteRel } from '../../types/timeline'

// caja donde de verdad se pinta el elemento dentro de su recuadro, en fracciones
// (0 a 1) del propio recuadro. por defecto ocupa todo, pero un video con proporción
// distinta a la del lienzo se encaja con bandas (object-contain), así que su caja
// real es más chica y centrada. el recorte se mide sobre esa caja, no sobre el
// elemento entero, y por eso la máscara tiene que mapearse a ella
export type Caja = { x: number; y: number; w: number; h: number }
const CAJA_LLENA: Caja = { x: 0, y: 0, w: 1, h: 1 }

// geometría del óvalo inscrito en el recuadro de recorte, ya llevada a coordenadas
// del elemento: su centro y sus dos radios. las fracciones del recorte van sobre la
// caja del contenido, así que se trasladan y escalan a esa caja
export function geometriaRecorte(rec: RecorteRel, caja: Caja = CAJA_LLENA) {
  const cxr = (rec.izq + (1 - rec.der)) / 2
  const cyr = (rec.arr + (1 - rec.aba)) / 2
  const rxr = (1 - rec.der - rec.izq) / 2
  const ryr = (1 - rec.aba - rec.arr) / 2
  return {
    cx: caja.x + cxr * caja.w,
    cy: caja.y + cyr * caja.h,
    rx: rxr * caja.w,
    ry: ryr * caja.h,
  }
}

// ¿el recorte tiene algo que aplicar? cuenta tanto el recuadro como la forma de
// óvalo o el difuminado, que existen aunque no se haya movido el marco.
// el círculo comparte máscara con el óvalo; lo que lo hace redondo es que el
// recuadro se mantiene cuadrado, no una forma distinta
function esOvalo(rec: RecorteRel): boolean {
  return rec.forma === 'elipse' || rec.forma === 'circulo'
}

export function hayRecorte(rec?: RecorteRel): boolean {
  if (!rec) return false
  return !!(rec.izq || rec.der || rec.arr || rec.aba || esOvalo(rec) || rec.difuminado)
}

// gradiente radial del óvalo, con el borde sólido hasta cierto punto y luego
// difuminado a transparente. es la máscara con la que se recorta el video
function ovaloCss(rec: RecorteRel, difuminado: number, caja: Caja): string {
  const { cx, cy, rx, ry } = geometriaRecorte(rec, caja)
  const solido = Math.max(0, Math.min(100, 100 - difuminado))
  return `radial-gradient(ellipse ${(rx * 100).toFixed(2)}% ${(ry * 100).toFixed(2)}% at ${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%, #000 ${solido}%, transparent 100%)`
}

// estilo css del recorte del propio elemento. el rectángulo se resuelve con un
// clip-path duro, como siempre; el óvalo se resuelve con una máscara radial que,
// con difuminado, deja el borde suave y transparente para que se vea lo de debajo.
// la caja del contenido se pasa para que, cuando el video va con bandas, tanto el
// óvalo como el recuadro recaigan sobre el video real y no sobre el elemento entero
export function estiloRecorte(
  rec?: RecorteRel,
  caja: Caja = CAJA_LLENA,
): { clipPath?: string; maskImage?: string; WebkitMaskImage?: string } {
  if (!hayRecorte(rec) || !rec) return {}
  if (esOvalo(rec)) {
    const m = ovaloCss(rec, rec.difuminado ?? 0, caja)
    return { maskImage: m, WebkitMaskImage: m }
  }
  // el inset se mide desde cada borde del elemento hasta el lado del recorte, ya
  // trasladado a la caja del contenido
  const top = caja.y + rec.arr * caja.h
  const right = caja.x + rec.der * caja.w
  const bottom = caja.y + rec.aba * caja.h
  const left = caja.x + rec.izq * caja.w
  return {
    clipPath: `inset(${(top * 100).toFixed(3)}% ${(right * 100).toFixed(3)}% ${(bottom * 100).toFixed(3)}% ${(left * 100).toFixed(3)}%)`,
  }
}

// caja del contenido de un video encajado por "contener" en un lienzo, en
// fracciones del recuadro. si el video tiene la misma proporción que el lienzo
// ocupa todo; si no, queda centrado con bandas al lado o arriba y abajo
export function cajaContain(vw: number, vh: number, lienzoW: number, lienzoH: number): Caja {
  if (vw <= 0 || vh <= 0 || lienzoW <= 0 || lienzoH <= 0) return CAJA_LLENA
  const vidAsp = vw / vh
  const cajaAsp = lienzoW / lienzoH
  if (vidAsp > cajaAsp) {
    const h = cajaAsp / vidAsp
    return { x: 0, y: (1 - h) / 2, w: 1, h }
  }
  const w = vidAsp / cajaAsp
  return { x: (1 - w) / 2, y: 0, w, h: 1 }
}
