// convierte un tamaño en bytes a una cadena legible
export function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// pasa una duración en segundos a mm:ss, o a h:mm:ss cuando llega a la hora
export function formatearDuracion(segundos: number): string {
  if (!isFinite(segundos) || segundos < 0) segundos = 0
  const s = Math.floor(segundos % 60)
  const m = Math.floor((segundos / 60) % 60)
  const h = Math.floor(segundos / 3600)
  const dos = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`
}
