import { useEffect, useState } from 'react'
import { Tira, tiraDeFotogramas } from '../../../lib/media/fotogramas'

// pide la tira de fotogramas de un medio y avisa cuando esté lista. mientras
// tanto devuelve null, para que el clip muestre su color de fondo sin saltos
export function useTira(assetId?: string, url?: string, duracion?: number) {
  const [tira, setTira] = useState<Tira | null>(null)

  useEffect(() => {
    if (!assetId || !url) {
      setTira(null)
      return
    }
    let vigente = true
    tiraDeFotogramas(assetId, url, duracion ?? 0)
      .then((t) => {
        // si el clip cambió de medio mientras se extraía, se descarta
        if (vigente) setTira(t)
      })
      .catch(() => {
        if (vigente) setTira(null)
      })
    return () => {
      vigente = false
    }
  }, [assetId, url, duracion])

  return tira
}
