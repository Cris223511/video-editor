import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react'
import { RegionAudio } from '../../../types/audio'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { amplitudEn, picosDeMedio, PerfilPicos } from '../../../lib/audio/picos'

interface Props {
  region: RegionAudio
  pxPorSegundo: number
  puntos: number[]
}

const UMBRAL_PX = 8

// alturas de las barras de una onda, entre 0 y 1, a partir de una semilla de
// texto. sin acceso garantizado a las muestras reales del audio, se sintetiza un
// perfil estable y repetible: la misma región dibuja siempre la misma onda, y no
// una fila plana. la mezcla de dos senoides desfasadas más un pellizco por barra
// da un contorno irregular parecido al de un sonido real
export function alturasOnda(semilla: string, n: number): number[] {
  let base = 0
  for (let i = 0; i < semilla.length; i++) base = (base * 31 + semilla.charCodeAt(i)) % 100000
  const alturas: number[] = []
  for (let i = 0; i < n; i++) {
    const onda = Math.sin(i * 0.5 + base) * 0.5 + Math.sin(i * 0.17 + base * 0.3) * 0.3
    const pellizco = ((base + i * 2654435761) % 1000) / 1000 - 0.5
    const v = 0.5 + onda * 0.5 + pellizco * 0.35
    alturas.push(Math.max(0.12, Math.min(1, Math.abs(v))))
  }
  return alturas
}

// barras verticales que representan la onda. se usan tanto dentro de una región
// de audio como, muy tenues, en el fondo del carril vacío
export function OndaAudio({
  semilla,
  color,
  opacidad = 1,
  barras = 64,
}: {
  semilla: string
  color: string
  opacidad?: number
  barras?: number
}) {
  const alturas = alturasOnda(semilla, barras)
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center gap-px overflow-hidden px-1"
      style={{ opacity: opacidad }}
    >
      {alturas.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{ height: `${Math.round(h * 100)}%`, background: color, minWidth: 1 }}
        />
      ))}
    </div>
  )
}

// barras finas dibujadas a partir de picos reales (0..1). se ven como líneas
// verticales conforme al sonido, más finas y nerviosas que la onda sintética
function OndaReal({ alturas, color }: { alturas: number[]; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center gap-[0.5px] overflow-hidden px-1">
      {alturas.map((h, i) => (
        <span
          key={i}
          className="flex-1"
          style={{ height: `${Math.round(h * 100)}%`, background: color, minWidth: 1 }}
        />
      ))}
    </div>
  )
}

// calcula la onda real de la franja a partir del audio de los clips que quedan
// bajo su tramo de tiempo. una región no lleva su propio audio: manda sobre la
// mezcla de la pista, así que se lee el sonido de los clips que solapa. decodifica
// cada medio implicado una sola vez (queda cacheado por su id) y luego, por cada
// barra, ubica el clip que hay debajo, traduce ese instante al segundo original
// del medio teniendo en cuenta su recorte y velocidad, y toma la amplitud de ahí.
// mientras decodifica, o si ningún clip aporta audio decodificable, devuelve null
// y el bloque cae a la onda sintética
function useOndaReal(region: RegionAudio, barras: number): number[] | null {
  const clips = useEditorStore((s) => s.pista.clips)
  const medios = useProjectStore((s) => s.medios)
  const [alturas, setAlturas] = useState<number[] | null>(null)

  useEffect(() => {
    let vigente = true
    const fin = region.inicio + region.duracion
    // qué clips caen bajo la franja, con su medio asociado; sin medio (archivo
    // perdido) no hay de dónde sacar la onda
    const bajoLaFranja = clips
      .filter((c) => c.inicio < fin && c.inicio + c.duracion > region.inicio)
      .map((c) => ({ clip: c, medio: medios.find((m) => m.id === c.assetId) }))
      .filter((x): x is { clip: (typeof clips)[number]; medio: (typeof medios)[number] } => !!x.medio)

    if (bajoLaFranja.length === 0) {
      setAlturas(null)
      return
    }

    Promise.all(
      bajoLaFranja.map((x) =>
        picosDeMedio(x.medio.id, x.medio.file).then((perfil) => ({ ...x, perfil })),
      ),
    ).then((resueltos) => {
      if (!vigente) return
      const conAudio = resueltos.filter(
        (r): r is typeof r & { perfil: PerfilPicos } => !!r.perfil,
      )
      if (conAudio.length === 0) {
        // ningún medio se pudo decodificar: que el respaldo sintético tome el relevo
        setAlturas(null)
        return
      }
      const crudas: number[] = []
      for (let i = 0; i < barras; i++) {
        // instante de la barra en el tiempo del proyecto
        const t = region.inicio + ((i + 0.5) / barras) * region.duracion
        // clip que manda en ese instante: el de pista mayor, igual que al mostrar
        let elegido: (typeof conAudio)[number] | null = null
        for (const r of conAudio) {
          if (t >= r.clip.inicio && t < r.clip.inicio + r.clip.duracion) {
            if (!elegido || r.clip.pista > elegido.clip.pista) elegido = r
          }
        }
        if (!elegido) {
          crudas.push(0)
          continue
        }
        // del tiempo del proyecto al segundo original del medio: se descuenta el
        // arranque del clip y se aplica su velocidad sobre el punto de entrada
        const segundoFuente = elegido.clip.recorteInicio + (t - elegido.clip.inicio) * elegido.clip.velocidad
        crudas.push(amplitudEn(elegido.perfil, segundoFuente))
      }
      // se normaliza contra el pico más alto de la franja para aprovechar el alto
      // del bloque; si todo es prácticamente silencio no hay onda que dibujar
      const max = crudas.reduce((m, v) => (v > m ? v : m), 0)
      if (max < 0.005) {
        setAlturas(null)
        return
      }
      const esc = crudas.map((v) => Math.max(0.06, Math.min(1, v / max)))
      setAlturas(esc)
    })

    return () => {
      vigente = false
    }
  }, [region.inicio, region.duracion, barras, clips, medios])

  return alturas
}

// bloque de una franja de volumen en su pista de tiempo. define el tramo donde
// se aplica la ganancia; se mueve con imantado y se recorta por los bordes
export default function AudioBlock({ region, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.regionSeleccionada === region.id)
  const seleccionarRegion = useEditorStore((s) => s.seleccionarRegion)
  const moverRegionAudio = useEditorStore((s) => s.moverRegionAudio)
  const duplicarRegionAudio = useEditorStore((s) => s.duplicarRegionAudio)
  const recortarRegionAudio = useEditorStore((s) => s.recortarRegionAudio)

  function iniciarMover(e: ReactMouseEvent) {
    e.stopPropagation()
    // alt + arrastrar el cuerpo saca una copia de la franja y la lleva al soltar;
    // sin alt es el desplazamiento normal con imantado
    let idGesto = region.id
    if (e.altKey) {
      const nuevo = duplicarRegionAudio(region.id)
      if (nuevo) idGesto = nuevo
    } else {
      seleccionarRegion(region.id)
    }
    const startX = e.clientX
    const inicioOriginal = region.inicio
    const umbral = UMBRAL_PX / pxPorSegundo

    const mover = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / pxPorSegundo
      let candidato = Math.max(0, inicioOriginal + dx)
      for (const p of puntos) {
        if (Math.abs(candidato - p) < umbral) {
          candidato = p
          break
        }
        if (Math.abs(candidato + region.duracion - p) < umbral) {
          candidato = Math.max(0, p - region.duracion)
          break
        }
      }
      moverRegionAudio(idGesto, candidato)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  function iniciarRecorte(e: ReactMouseEvent, lado: 'inicio' | 'fin') {
    e.stopPropagation()
    e.preventDefault()
    seleccionarRegion(region.id)
    let lastX = e.clientX
    const mover = (ev: globalThis.MouseEvent) => {
      const delta = (ev.clientX - lastX) / pxPorSegundo
      lastX = ev.clientX
      recortarRegionAudio(region.id, lado, delta)
    }
    const soltar = () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const ancho = Math.max(region.duracion * pxPorSegundo, 8)
  // barras más finas que antes: una cada dos píxeles, acotadas para no disparar
  // el número en franjas muy anchas ni quedarse en cuatro cuando es estrecha
  const barras = Math.max(12, Math.min(600, Math.floor(ancho / 2)))
  // onda real leída del audio bajo la franja; si aún se decodifica o no hay fuente
  // decodificable, queda null y se dibuja la sintética de respaldo
  const ondaReal = useOndaReal(region, barras)

  return (
    <div
      onMouseDown={iniciarMover}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border-2 px-2 transition-[border-color]',
        seleccionado ? 'border-emerald-400' : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: region.inicio * pxPorSegundo,
        width: ancho,
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
      }}
    >
      {/* la onda ocupa el fondo del bloque; encima va el porcentaje de ganancia.
          si se logró leer el sonido real se pintan sus picos; si no, la sintética */}
      {ondaReal ? (
        <OndaReal alturas={ondaReal} color="rgba(16, 185, 129, 0.6)" />
      ) : (
        <OndaAudio semilla={region.id} color="rgba(16, 185, 129, 0.55)" barras={barras} />
      )}

      <span className="pointer-events-none relative truncate rounded bg-black/35 px-1 text-[10px] font-medium text-white">
        {Math.round(region.ganancia * 100)}%
      </span>

      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-emerald-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </div>
  )
}
