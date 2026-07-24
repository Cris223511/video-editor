import { RecorteRel } from '../../types/timeline'

// geometría del óvalo inscrito en el recuadro de recorte, en fracciones del
// elemento (0 a 1): su centro y sus dos radios
export function geometriaRecorte(rec: RecorteRel) {
  const cx = (rec.izq + (1 - rec.der)) / 2
  const cy = (rec.arr + (1 - rec.aba)) / 2
  const rx = (1 - rec.der - rec.izq) / 2
  const ry = (1 - rec.aba - rec.arr) / 2
  return { cx, cy, rx, ry }
}

// ¿el recorte tiene algo que aplicar? cuenta tanto el recuadro como la forma de
// óvalo, el difuminado o la viñeta, que existen aunque no se haya movido el marco
export function hayRecorte(rec?: RecorteRel): boolean {
  if (!rec) return false
  return !!(
    rec.izq ||
    rec.der ||
    rec.arr ||
    rec.aba ||
    rec.forma === 'elipse' ||
    rec.difuminado ||
    rec.vinetaBlanca
  )
}

// gradiente radial del óvalo, con el borde sólido hasta cierto punto y luego
// difuminado a transparente. lo usan tanto la máscara del video como la de la
// viñeta para recortarse por la misma silueta
function ovaloCss(rec: RecorteRel, difuminado: number): string {
  const { cx, cy, rx, ry } = geometriaRecorte(rec)
  const solido = Math.max(0, Math.min(100, 100 - difuminado))
  return `radial-gradient(ellipse ${(rx * 100).toFixed(2)}% ${(ry * 100).toFixed(2)}% at ${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%, #000 ${solido}%, transparent 100%)`
}

// estilo css del recorte del propio elemento. el rectángulo se resuelve con un
// clip-path duro, como siempre; el óvalo se resuelve con una máscara radial que,
// con difuminado, deja el borde suave y transparente para que se vea lo de debajo
export function estiloRecorte(rec?: RecorteRel): { clipPath?: string; maskImage?: string; WebkitMaskImage?: string } {
  if (!hayRecorte(rec) || !rec) return {}
  if (rec.forma === 'elipse') {
    const m = ovaloCss(rec, rec.difuminado ?? 0)
    return { maskImage: m, WebkitMaskImage: m }
  }
  return { clipPath: `inset(${rec.arr * 100}% ${rec.der * 100}% ${rec.aba * 100}% ${rec.izq * 100}%)` }
}

// fondo y máscara de la viñeta blanca interior, cuando la lleva. el blanco va del
// centro transparente al borde del óvalo, con la intensidad como opacidad, y se
// recorta por la misma silueta para no salirse
export function vinetaRecorte(rec?: RecorteRel): { background: string; maskImage: string; WebkitMaskImage: string } | null {
  if (!rec || !rec.vinetaBlanca || rec.forma !== 'elipse') return null
  const { cx, cy, rx, ry } = geometriaRecorte(rec)
  const a = (rec.vinetaBlanca / 100).toFixed(3)
  const bg = `radial-gradient(ellipse ${(rx * 100).toFixed(2)}% ${(ry * 100).toFixed(2)}% at ${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%, rgba(255,255,255,0) 42%, rgba(255,255,255,${a}) 100%)`
  const m = ovaloCss(rec, rec.difuminado ?? 0)
  return { background: bg, maskImage: m, WebkitMaskImage: m }
}
