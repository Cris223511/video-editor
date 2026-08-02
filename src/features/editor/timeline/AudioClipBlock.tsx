import { motion } from 'framer-motion'
import { PointerEvent as ReactPointerEvent, useEffect, useState } from 'react'
import { ClipAudio } from '../../../types/audio'
import { MediaAsset } from '../../../types/media'
import { useEditorStore } from '../../../store/useEditorStore'
import { amplitudEn, picosDeMedio } from '../../../lib/audio/picos'
import { alturasOnda } from './AudioBlock'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'
import { origenesDe } from '../../../lib/timeline/bloques'
import { nivelBajoCursor, separacionBajoCursor, porDebajoDelUltimo } from './nivelCursor'
import MedioNoDisponible from '../../../components/ui/MedioNoDisponible'

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
  const congelarLayout = useEditorStore((s) => s.congelarLayout)
  const reproduciendo = useEditorStore((s) => s.reproduciendo)
  const arrastreBloques = useEditorStore((s) => s.arrastreBloques)
  const seleccionarRegion = useEditorStore((s) => s.seleccionarRegion)
  const moverAudio = useEditorStore((s) => s.moverAudio)
  const moverAudioNivel = useEditorStore((s) => s.moverAudioNivel)
  const recortarAudio = useEditorStore((s) => s.recortarAudio)
  const duplicarAudio = useEditorStore((s) => s.duplicarAudio)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)
  const alternarBloque = useEditorStore((s) => s.alternarBloque)
  const insertarNivelAudio = useEditorStore((s) => s.insertarNivelAudio)
  const abrirMenuContextual = useEditorStore((s) => s.abrirMenuContextual)
  const moverBloquesDesde = useEditorStore((s) => s.moverBloquesDesde)
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
    // sin asset, o con el archivo ya borrado del equipo, no se intenta leer la onda:
    // leerlo fallaría, así que se deja la onda sintética y el bloque avisa aparte
    if (!asset || asset.faltante) return
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

  function iniciarMover(e: ReactPointerEvent) {
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
    const origenesGrupo = origenesDe(st, grupo)
    if (enGrupo) st.setArrastreBloques(true)
    // con alt la copia nace al empezar a mover, no al pulsar: así alt y clic seco
    // sirve para sumar el bloque al conjunto sin duplicar nada
    const conAlt = e.altKey
    let idGesto = audio.id
    let movido = false
    // arrastrando un conjunto no se reduce la selección a este audio (seleccionar
    // limpiaría el grupo). suelto, el clic sí lo selecciona
    if (!conAlt && !enGrupo) seleccionarRegion(audio.id)
    const startX = e.clientX
    const inicioOriginal = audio.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioOriginal, inicioOriginal + audio.duracion]
    // última posición del cursor, para reubicar el audio en la fila del carril
    // sobre la que se suelte
    let ultimoX = e.clientX
    let ultimoY = e.clientY
    const startY = e.clientY
    const UMBRAL_VERT = 14
    const mover = (ev: globalThis.PointerEvent) => {
      // la etiqueta que sigue al cursor solo asoma en un gesto vertical (cambiar de
      // nivel o abrir uno nuevo); moviendo a los lados estorbaba
      if (Math.abs(ev.clientY - startY) > UMBRAL_VERT) {
        useEditorStore.getState().setArrastreVivo({ etiqueta: asset?.nombre ?? 'Audio', x: ev.clientX, y: ev.clientY })
        // guía celeste de fila nueva mientras el gesto es vertical, igual que la de
        // los clips: se enciende al apuntar a una separación o al fondo del carril
        const junta = separacionBajoCursor(ev.clientX, ev.clientY, 'nivelAudio')
        const debajo = porDebajoDelUltimo(ev.clientX, ev.clientY, 'nivelAudio')
        const st = useEditorStore.getState()
        if (junta !== null || debajo) {
          // apuntando a una separación o al fondo: se promete fila nueva con la línea
          // y no se sombrea ninguna fila existente
          st.setInsercionAudio(junta !== null ? junta : 0)
          st.setFilaAudioResaltada(null)
        } else {
          // encima de una fila que ya existe: se ilumina esa fila para avisar dónde
          // caerá el bloque, tal como hace la pista de video con el clip. aunque la
          // fila tenga otro audio en ese tramo sigue siendo destino válido, porque al
          // soltar el bloque se encaja solo al hueco libre más cercano de esa fila
          st.setInsercionAudio(null)
          st.setFilaAudioResaltada(nivelBajoCursor(ev.clientX, ev.clientY, 'nivelAudio'))
        }
      } else {
        const st = useEditorStore.getState()
        st.setArrastreVivo(null)
        st.setInsercionAudio(null)
        st.setFilaAudioResaltada(null)
      }

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
        moverBloquesDesde(grupo, (ev.clientX - startX) / pxPorSegundo, origenesGrupo)
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
      useEditorStore.getState().setInsercionAudio(null)
      useEditorStore.getState().setFilaAudioResaltada(null)
      if (enGrupo) useEditorStore.getState().setArrastreBloques(false)
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
      // si mover el bloque dejó su fila de origen sin nada, esa fila se cierra sola,
      // igual que las pistas de video con los clips
      if (movido) useEditorStore.getState().podarNivelesAudioVacios()
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  function iniciarRecorte(e: ReactPointerEvent, lado: 'inicio' | 'fin') {
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
    const mover = (ev: globalThis.PointerEvent) => {
      const bordeBruto = (lado === 'inicio' ? inicioBase : finBase) + (ev.clientX - startX) / pxPorSegundo
      const enganche = imantarBorde(bordeBruto, puntos, umbral, propios)
      const bordeFinal = enganche ? enganche.punto : bordeBruto
      setGuiaImantado(enganche ? enganche.guia : null)
      recortarAudio(audio.id, lado, bordeFinal - ultimoBorde)
      // se toma el borde REAL tras aplicar el recorte, no el que pedía el cursor. si
      // el arrastre se pasó del tope, el borde se quedó donde topó; al retroceder, el
      // recorte no arranca a achicar hasta que el cursor vuelve a ese borde real, sin
      // la zona muerta de antes
      const real = useEditorStore.getState().audios.find((x) => x.id === audio.id)
      ultimoBorde = real ? (lado === 'inicio' ? real.inicio : real.inicio + real.duracion) : bordeFinal
    }
    const soltar = () => {
      setGuiaImantado(null)
      setInteractuando(false)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const onda = alturas ?? alturasOnda(audio.id, barras)

  return (
    <motion.div
      layout={interactuando || (arrastreBloques && enConjunto) || congelarLayout || reproduciendo ? false : 'position'}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      layoutDependency={audio.nivel ?? 0}
      data-bloque-id={audio.id}
      onPointerDown={iniciarMover}
      // el botón derecho abre el menú de este bloque en el punto donde se pulsó
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'audio', id: audio.id })
      }}
      className={[
        'group/bloque absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-lg border px-2 transition-[border-color]',
        seleccionado
          ? 'border-sky-400 ring-2 ring-inset ring-sky-400/80'
          : enConjunto
            ? 'border-brand ring-2 ring-inset ring-brand/80'
            : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: audio.inicio * pxPorSegundo,
        width: ancho,
        backgroundColor: 'rgba(56, 189, 248, 0.22)',
        transition: interactuando || (arrastreBloques && enConjunto) || congelarLayout ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {asset?.faltante ? (
        // el archivo del audio ya no está: se avisa en el propio bloque en vez de dejar
        // una onda sintética que no explica nada
        <div className="absolute inset-0 z-10 p-1">
          <MedioNoDisponible nombre={asset?.nombre ?? 'audio'} etiqueta="Audio no encontrado" compacto />
        </div>
      ) : (
        <Lineas alturas={onda} color="rgba(56, 189, 248, 0.7)" />
      )}
      {/* el nombre solo asoma al pasar el cursor o con el audio elegido: fijo todo
          el tiempo tapaba la onda y molestaba */}
      <span
        className={[
          'pointer-events-none relative truncate rounded bg-black/35 px-1 text-[10px] font-medium text-white transition-opacity duration-150',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover/bloque:opacity-100',
        ].join(' ')}
      >
        {asset?.nombre ?? 'audio'}
      </span>
      <div
        onPointerDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-sky-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover/bloque:opacity-100',
        ].join(' ')}
      />
      <div
        onPointerDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-sky-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover/bloque:opacity-100',
        ].join(' ')}
      />
    </motion.div>
  )
}
