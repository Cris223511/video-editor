import { motion } from 'framer-motion'
import { MouseEvent as ReactMouseEvent, useEffect, useState } from 'react'
import { ClipAudio } from '../../../types/audio'
import { MediaAsset } from '../../../types/media'
import Tooltip from '../../../components/ui/Tooltip'
import { useEditorStore } from '../../../store/useEditorStore'
import { amplitudEn, picosDeMedio } from '../../../lib/audio/picos'
import { alturasOnda } from './AudioBlock'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'
import { nivelBajoCursor, separacionBajoCursor, porDebajoDelUltimo } from './nivelCursor'

interface Props {
  audio: ClipAudio
  asset: MediaAsset | undefined
  pxPorSegundo: number
  puntos: number[]
}

// líneas verticales finas de la onda, centradas, del mismo trazo que el resto de
// la línea de tiempo. cada línea mide un píxel y crece de forma simétrica
function Lineas({ alturas, color }: { alturas: number[]; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-between overflow-hidden px-1">
      {alturas.map((h, i) => (
        <span key={i} style={{ width: 1, flex: '0 0 1px', height: `${Math.round(h * 100)}%`, background: color }} />
      ))}
    </div>
  )
}

// bloque de un audio importado sobre la pista de sonido. lleva su propio material,
// así que dibuja la onda real del archivo; se mueve con imantado y se recorta por
// los bordes, y su borde de inicio también desplaza el punto de entrada en la
// fuente. al no tener imagen, el nombre basta para reconocerlo
export default function AudioClipBlock({ audio, asset, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.regionSeleccionada === audio.id)
  const seleccionarRegion = useEditorStore((s) => s.seleccionarRegion)
  const moverAudio = useEditorStore((s) => s.moverAudio)
  const moverAudioNivel = useEditorStore((s) => s.moverAudioNivel)
  const recortarAudio = useEditorStore((s) => s.recortarAudio)
  const duplicarAudio = useEditorStore((s) => s.duplicarAudio)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)
  const alternarBloque = useEditorStore((s) => s.alternarBloque)
  const insertarNivelAudio = useEditorStore((s) => s.insertarNivelAudio)
  const abrirMenuContextual = useEditorStore((s) => s.abrirMenuContextual)
  const moverBloques = useEditorStore((s) => s.moverBloques)
  const enConjunto = useEditorStore((s) => s.bloquesSeleccionados.includes(audio.id))

  const ancho = Math.max(audio.duracion * pxPorSegundo, 8)
  const barras = Math.max(12, Math.min(600, Math.floor(ancho / 2)))
  const [alturas, setAlturas] = useState<number[] | null>(null)
  // en reposo la posición se anima con una curva suave; durante el arrastre el
  // suavizado se apaga para que el bloque no vaya por detrás del cursor
  const [interactuando, setInteractuando] = useState(false)

  // onda real leída del propio archivo. mientras se decodifica, o si no se puede,
  // queda null y se cae a una onda sintética estable a partir del id
  useEffect(() => {
    if (!asset) return
    let vivo = true
    picosDeMedio(asset.id, asset.file).then((perfil) => {
      if (!vivo) return
      if (!perfil) {
        setAlturas(null)
        return
      }
      const crudas: number[] = []
      for (let i = 0; i < barras; i++) {
        const seg = audio.recorteInicio + ((i + 0.5) / barras) * audio.duracion
        crudas.push(amplitudEn(perfil, seg))
      }
      const max = crudas.reduce((m, v) => (v > m ? v : m), 0)
      if (max < 0.005) {
        setAlturas(null)
        return
      }
      setAlturas(crudas.map((v) => Math.max(0.06, Math.min(1, v / max))))
    })
    return () => {
      vivo = false
    }
  }, [asset, audio.recorteInicio, audio.duracion, barras])

  function iniciarMover(e: ReactMouseEvent) {
    // solo el botón izquierdo arrastra. el derecho abre el menú, y si de paso
    // arrancaba un gesto de movimiento el bloque se iba con el cursor
    if (e.button !== 0) return
    e.stopPropagation()
    setInteractuando(true)
    // con alt pulsado el arrastre suelta una copia que sigue al cursor y deja el
    // audio original quieto, igual que con los clips de video y las capas
    // shift suma o quita el bloque del conjunto marcado, sin arrastrar nada
    if (e.shiftKey) {
      alternarBloque(audio.id)
      setInteractuando(false)
      return
    }
    const st = useEditorStore.getState()
    const enGrupo = st.bloquesSeleccionados.includes(audio.id) && st.bloquesSeleccionados.length > 1
    const grupo = enGrupo ? [...st.bloquesSeleccionados] : []
    // con alt la copia nace al empezar a mover, no al pulsar: así alt y clic seco
    // sirve para sumar el bloque al conjunto sin duplicar nada
    const conAlt = e.altKey
    let idGesto = audio.id
    let movido = false
    if (!conAlt) seleccionarRegion(audio.id)
    const startX = e.clientX
    const inicioOriginal = audio.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioOriginal, inicioOriginal + audio.duracion]
    // última posición del cursor, para reubicar el audio en la fila del carril
    // sobre la que se suelte
    let ultimoX = e.clientX
    let ultimoY = e.clientY
    const mover = (ev: globalThis.MouseEvent) => {
      // la etiqueta sigue al cursor durante todo el gesto, así se ve en qué punto
      // de la línea de tiempo va a caer lo que se lleva en la mano
      useEditorStore.getState().setArrastreVivo({ etiqueta: asset?.nombre ?? 'Audio', x: ev.clientX, y: ev.clientY })

      ultimoX = ev.clientX
      ultimoY = ev.clientY
      if (!movido) {
        if (Math.abs(ev.clientX - startX) < 3) return
        movido = true
        if (conAlt) {
          const nuevo = duplicarAudio(audio.id)
          if (nuevo) idGesto = nuevo
        }
      }
      // con varios bloques marcados se desplazan todos a la vez
      if (grupo.length) {
        moverBloques(grupo, inicioOriginal + (ev.clientX - startX) / pxPorSegundo - audio.inicio)
        return
      }
      const dx = (ev.clientX - startX) / pxPorSegundo
      const bruto = Math.max(0, inicioOriginal + dx)
      const { inicio, guia } = imantarMover(bruto, audio.duracion, puntos, umbral, propios)
      setGuiaImantado(guia)
      moverAudio(idGesto, inicio)
    }
    const soltar = () => {
      useEditorStore.getState().setArrastreVivo(null)
      // alt y clic seco: el bloque entra o sale del conjunto
      if (!movido && conAlt) alternarBloque(audio.id)
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
    seleccionarRegion(audio.id)
    setInteractuando(true)
    const startX = e.clientX
    const inicioBase = audio.inicio
    const finBase = audio.inicio + audio.duracion
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioBase, finBase]
    // el borde se imanta al cabezal, al cero o al borde de otro bloque, con su
    // guía; el cambio se aplica en incrementos hacia el borde ya enganchado
    let ultimoBorde = lado === 'inicio' ? inicioBase : finBase
    const mover = (ev: globalThis.MouseEvent) => {
      const bordeBruto = (lado === 'inicio' ? inicioBase : finBase) + (ev.clientX - startX) / pxPorSegundo
      const enganche = imantarBorde(bordeBruto, puntos, umbral, propios)
      const bordeFinal = enganche ? enganche.punto : bordeBruto
      setGuiaImantado(enganche ? enganche.guia : null)
      recortarAudio(audio.id, lado, bordeFinal - ultimoBorde)
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

  const onda = alturas ?? alturasOnda(audio.id, barras)

  return (
    <Tooltip texto={asset?.nombre ?? 'Audio'} retardo={2000} lado="arriba">
    <motion.div
      layout={interactuando ? false : 'position'}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      layoutDependency={audio.nivel ?? 0}
      onMouseDown={iniciarMover}
      // el botón derecho abre el menú de este bloque en el punto donde se pulsó
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'audio', id: audio.id })
      }}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border px-2 transition-[border-color]',
        seleccionado
          ? 'border-sky-400'
          : enConjunto
            ? 'border-brand/70'
            : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: audio.inicio * pxPorSegundo,
        width: ancho,
        backgroundColor: 'rgba(56, 189, 248, 0.22)',
        transition: interactuando ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Lineas alturas={onda} color="rgba(56, 189, 248, 0.7)" />
      <span className="pointer-events-none relative truncate rounded bg-black/35 px-1 text-[10px] font-medium text-white">
        {asset?.nombre ?? 'audio'}
      </span>
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-sky-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-sky-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </motion.div>
    </Tooltip>
  )
}
