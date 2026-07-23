import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react'
import { RegionAudio } from '../../../types/audio'
import { useEditorStore } from '../../../store/useEditorStore'
import { useProjectStore } from '../../../store/useProjectStore'
import { amplitudEn, picosDeMedio, PerfilPicos } from '../../../lib/audio/picos'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'
import { nivelBajoCursor, separacionBajoCursor, porDebajoDelUltimo } from './nivelCursor'

interface Props {
  region: RegionAudio
  pxPorSegundo: number
  puntos: number[]
}

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

// dibuja una lista de alturas (0..1) como líneas verticales finas pegadas al
// borde de arriba. cada línea mide un píxel y va a paso fijo desde la izquierda,
// sin estirarse para llenar el ancho: si sobra sitio, el patrón simplemente se
// repite. antes iban centradas y repartidas con justify-between, que al ensanchar
// el bloque separaba las líneas y deformaba la onda
function LineasOnda({ alturas, color }: { alturas: number[]; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start gap-px overflow-hidden px-1">
      {alturas.map((h, i) => (
        <span
          key={i}
          style={{
            width: 1,
            flex: '0 0 1px',
            height: `${Math.round(h * 100)}%`,
            background: color,
          }}
        />
      ))}
    </div>
  )
}

// barras verticales que representan la onda. se usan tanto dentro de una región
// de audio como, muy tenues, en el fondo del carril vacío. el trazo es de un píxel
// y va bien apretado para leerse como una forma de onda real, no como píldoras
// gordas; por eso el valor por defecto de barras es alto y así el respaldo
// sintético queda tan detallado como la onda de picos reales
export function OndaAudio({
  semilla,
  color,
  opacidad = 1,
  barras = 200,
}: {
  semilla: string
  color: string
  opacidad?: number
  barras?: number
}) {
  const alturas = alturasOnda(semilla, barras)
  return (
    <div className="pointer-events-none absolute inset-0" style={{ opacity: opacidad }}>
      <LineasOnda alturas={alturas} color={color} />
    </div>
  )
}

// líneas finas dibujadas a partir de picos reales (0..1). siguen el sonido de
// verdad, con un trazo aún más nervioso que el de la onda sintética
function OndaReal({ alturas, color }: { alturas: number[]; color: string }) {
  return <LineasOnda alturas={alturas} color={color} />
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
  const moverAudioNivel = useEditorStore((s) => s.moverAudioNivel)
  const duplicarRegionAudio = useEditorStore((s) => s.duplicarRegionAudio)
  const recortarRegionAudio = useEditorStore((s) => s.recortarRegionAudio)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)
  const alternarBloque = useEditorStore((s) => s.alternarBloque)
  const insertarNivelAudio = useEditorStore((s) => s.insertarNivelAudio)
  const abrirMenuContextual = useEditorStore((s) => s.abrirMenuContextual)
  const moverBloques = useEditorStore((s) => s.moverBloques)
  const enConjunto = useEditorStore((s) => s.bloquesSeleccionados.includes(region.id))

  // mientras dura un gesto propio el bloque sigue al cursor sin suavizado; en
  // reposo se anima su posición para que se deslice al acomodarse en vez de saltar
  const [interactuando, setInteractuando] = useState(false)

  function iniciarMover(e: ReactMouseEvent) {
    // solo el botón izquierdo arrastra. el derecho abre el menú, y si de paso
    // arrancaba un gesto de movimiento el bloque se iba con el cursor
    if (e.button !== 0) return
    e.stopPropagation()
    setInteractuando(true)
    // alt + arrastrar el cuerpo saca una copia de la franja y la lleva al soltar;
    // sin alt es el desplazamiento normal con imantado
    // shift suma o quita el bloque del conjunto marcado, sin arrastrar nada
    if (e.shiftKey) {
      alternarBloque(region.id)
      setInteractuando(false)
      return
    }
    const st = useEditorStore.getState()
    const enGrupo = st.bloquesSeleccionados.includes(region.id) && st.bloquesSeleccionados.length > 1
    const grupo = enGrupo ? [...st.bloquesSeleccionados] : []
    // con alt la copia nace al empezar a mover, no al pulsar: así alt y clic seco
    // sirve para sumar el bloque al conjunto sin duplicar nada
    const conAlt = e.altKey
    let idGesto = region.id
    let movido = false
    if (!conAlt) seleccionarRegion(region.id)
    const startX = e.clientX
    const inicioOriginal = region.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioOriginal, inicioOriginal + region.duracion]
    // se guarda la última posición del cursor para soltar la franja en la fila del
    // carril de audio sobre la que quede
    let ultimoX = e.clientX
    let ultimoY = e.clientY

    const mover = (ev: globalThis.MouseEvent) => {
      // la etiqueta sigue al cursor durante todo el gesto, así se ve en qué punto
      // de la línea de tiempo va a caer lo que se lleva en la mano
      useEditorStore.getState().setArrastreVivo({ etiqueta: 'Audio', x: ev.clientX, y: ev.clientY })

      ultimoX = ev.clientX
      ultimoY = ev.clientY
      if (!movido) {
        if (Math.abs(ev.clientX - startX) < 3) return
        movido = true
        if (conAlt) {
          const nuevo = duplicarRegionAudio(region.id)
          if (nuevo) idGesto = nuevo
        }
      }
      // con varios bloques marcados se desplazan todos a la vez
      if (grupo.length) {
        moverBloques(grupo, inicioOriginal + (ev.clientX - startX) / pxPorSegundo - region.inicio)
        return
      }
      const dx = (ev.clientX - startX) / pxPorSegundo
      const bruto = Math.max(0, inicioOriginal + dx)
      const { inicio, guia } = imantarMover(bruto, region.duracion, puntos, umbral, propios)
      setGuiaImantado(guia)
      moverRegionAudio(idGesto, inicio)
    }
    const soltar = () => {
      useEditorStore.getState().setArrastreVivo(null)
      // alt y clic seco: el bloque entra o sale del conjunto
      if (!movido && conAlt) alternarBloque(region.id)
      setGuiaImantado(null)
      setInteractuando(false)
      // si se soltó sobre la juntura entre dos filas se abre una nueva ahí y el
      // bloque estrena ese carril; si cayó dentro de una fila, se muda a ella
      const junta = separacionBajoCursor(ultimoX, ultimoY, 'nivelAudio')
      if (junta !== null) {
        insertarNivelAudio(junta, idGesto)
      } else if (porDebajoDelUltimo(ultimoX, ultimoY, 'nivelAudio')) {
        insertarNivelAudio(0, idGesto)
      } else {
        const destino = nivelBajoCursor(ultimoX, ultimoY, 'nivelAudio')
        if (destino !== null) moverAudioNivel(idGesto, destino)
      }
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
    setInteractuando(true)
    const startX = e.clientX
    const inicioBase = region.inicio
    const finBase = region.inicio + region.duracion
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioBase, finBase]
    // el borde de la franja también se imanta al cabezal, al cero y a los bordes
    // de los demás, con su guía; se aplica en incrementos hacia el borde enganchado
    let ultimoBorde = lado === 'inicio' ? inicioBase : finBase
    const mover = (ev: globalThis.MouseEvent) => {
      const bordeBruto = (lado === 'inicio' ? inicioBase : finBase) + (ev.clientX - startX) / pxPorSegundo
      const enganche = imantarBorde(bordeBruto, puntos, umbral, propios)
      const bordeFinal = enganche ? enganche.punto : bordeBruto
      setGuiaImantado(enganche ? enganche.guia : null)
      recortarRegionAudio(region.id, lado, bordeFinal - ultimoBorde)
      ultimoBorde = bordeFinal
    }
    const soltar = () => {
      setGuiaImantado(null)
      setInteractuando(false)
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
      // el botón derecho abre el menú de este bloque en el punto donde se pulsó
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'region', id: region.id })
      }}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border px-2 transition-[border-color]',
        seleccionado
          ? 'border-emerald-400'
          : enConjunto
            ? 'border-brand/70'
            : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: region.inicio * pxPorSegundo,
        width: ancho,
        backgroundColor: 'rgba(16, 185, 129, 0.25)',
        // suavizado de la posición en reposo; se apaga durante el arrastre para
        // seguir al cursor sin retraso
        transition: interactuando ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
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
