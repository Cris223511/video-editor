import { motion } from 'framer-motion'
import { MouseEvent as ReactMouseEvent, useState } from 'react'
import { Capa } from '../../../types/layers'
import Tooltip from '../../../components/ui/Tooltip'
import Icon from '../../../components/ui/Icon'
import { TIPO_TRANSICION } from '../GaleriaTransiciones'
import TransicionCapaBlock from './TransicionCapaBlock'
import { useEditorStore } from '../../../store/useEditorStore'
import { imantarMover, imantarBorde, UMBRAL_IMAN_PX } from '../../../lib/timeline/imantar'
import { nivelBajoCursor, separacionBajoCursor, porDebajoDelUltimo } from './nivelCursor'

interface Props {
  capa: Capa
  pxPorSegundo: number
  puntos: number[]
}

// bloque de una capa en su pista de tiempo. define de qué segundo a qué segundo
// aparece; se mueve con imantado y se recorta por los bordes
export default function CapaBlock({ capa, pxPorSegundo, puntos }: Props) {
  const seleccionado = useEditorStore((s) => s.capaSeleccionada === capa.id)
  const seleccionarCapa = useEditorStore((s) => s.seleccionarCapa)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const moverCapaTiempo = useEditorStore((s) => s.moverCapaTiempo)
  const moverCapaNivel = useEditorStore((s) => s.moverCapaNivel)
  const duplicarCapa = useEditorStore((s) => s.duplicarCapa)
  const recortarCapaTiempo = useEditorStore((s) => s.recortarCapaTiempo)
  const setGuiaImantado = useEditorStore((s) => s.setGuiaImantado)
  const alternarBloque = useEditorStore((s) => s.alternarBloque)
  const insertarNivelTexto = useEditorStore((s) => s.insertarNivelTexto)
  const insertarNivelImagen = useEditorStore((s) => s.insertarNivelImagen)
  const abrirMenuContextual = useEditorStore((s) => s.abrirMenuContextual)
  const moverBloques = useEditorStore((s) => s.moverBloques)
  const enConjunto = useEditorStore((s) => s.bloquesSeleccionados.includes(capa.id))

  // durante un gesto propio (mover o recortar) el bloque sigue al cursor sin
  // suavizado, para no ir por detrás del ratón; en reposo se anima su posición
  // para que, al cerrar un hueco o acomodarse, se deslice en vez de saltar
  const [interactuando, setInteractuando] = useState(false)
  // arrastrar una transición de la galería y soltarla aquí se la pone a este
  // elemento, igual que a un clip de video. el audio es la excepción y no llega
  // por este bloque, así que cualquier capa la acepta
  const [transEncima, setTransEncima] = useState(false)
  function alSoltarTransicion(e: React.DragEvent) {
    const tipo = e.dataTransfer.getData(TIPO_TRANSICION)
    if (!tipo) return
    e.preventDefault()
    e.stopPropagation()
    setTransEncima(false)
    const dur = capa.transicion?.duracion ?? 0.5
    actualizarCapa(capa.id, { transicion: { tipo, duracion: dur } })
    seleccionarCapa(capa.id)
  }

  function iniciarMover(e: ReactMouseEvent) {
    // solo el botón izquierdo arrastra. el derecho abre el menú, y si de paso
    // arrancaba un gesto de movimiento el bloque se iba con el cursor
    if (e.button !== 0) return
    e.stopPropagation()
    setInteractuando(true)
    // con alt pulsado el arrastre no mueve la capa sino que suelta una copia que
    // sigue al cursor, con la original intacta. sin alt es el movimiento de siempre
    // shift suma o quita el bloque del conjunto marcado, sin arrastrar nada
    if (e.shiftKey) {
      alternarBloque(capa.id)
      setInteractuando(false)
      return
    }
    const st = useEditorStore.getState()
    const enGrupo = st.bloquesSeleccionados.includes(capa.id) && st.bloquesSeleccionados.length > 1
    const grupo = enGrupo ? [...st.bloquesSeleccionados] : []
    // con alt la copia nace al empezar a mover, no al pulsar: así alt y clic seco
    // sirve para sumar el bloque al conjunto sin duplicar nada
    const conAlt = e.altKey
    let idGesto = capa.id
    let movido = false
    if (!conAlt) seleccionarCapa(capa.id)
    const startX = e.clientX
    const inicioOriginal = capa.inicio
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioOriginal, inicioOriginal + capa.duracion]
    // se recuerda la última posición del cursor para, al soltar, saber sobre qué
    // fila del carril de texto cayó y reubicar la capa en ese nivel
    let ultimoX = e.clientX
    let ultimoY = e.clientY

    const mover = (ev: globalThis.MouseEvent) => {
      // la etiqueta sigue al cursor durante todo el gesto, así se ve en qué punto
      // de la línea de tiempo va a caer lo que se lleva en la mano
      useEditorStore.getState().setArrastreVivo({ etiqueta:
          capa.tipo === 'texto'
            ? capa.texto || 'Texto'
            : capa.tipo === 'imagen'
              ? 'Imagen'
              : capa.tipo === 'censura'
                ? 'Censura'
                : capa.tipo === 'trazo'
                  ? 'Dibujo'
                  : 'Figura', x: ev.clientX, y: ev.clientY })

      ultimoX = ev.clientX
      ultimoY = ev.clientY
      if (!movido) {
        if (Math.abs(ev.clientX - startX) < 3) return
        movido = true
        if (conAlt) {
          const nuevo = duplicarCapa(capa.id)
          if (nuevo) idGesto = nuevo
        }
      }
      // con varios bloques marcados se desplazan todos a la vez
      if (grupo.length) {
        moverBloques(grupo, inicioOriginal + (ev.clientX - startX) / pxPorSegundo - capa.inicio)
        return
      }
      const dx = (ev.clientX - startX) / pxPorSegundo
      const bruto = Math.max(0, inicioOriginal + dx)
      const { inicio, guia } = imantarMover(bruto, capa.duracion, puntos, umbral, propios)
      setGuiaImantado(guia)
      moverCapaTiempo(idGesto, inicio)
    }
    const soltar = () => {
      useEditorStore.getState().setArrastreVivo(null)
      // alt y clic seco: el bloque entra o sale del conjunto
      if (!movido && conAlt) alternarBloque(capa.id)
      setGuiaImantado(null)
      setInteractuando(false)
      // si se soltó sobre la juntura entre dos filas se abre una nueva ahí y el
      // bloque estrena ese carril; si cayó dentro de una fila, se muda a ella
      // una imagen se mueve por su propio carril; el resto (texto, figura, dibujo,
      // censura) por el de texto. cada uno lee su atributo de fila
      const attr = capa.tipo === 'imagen' ? 'nivelImagen' : 'nivelTexto'
      const insertar = capa.tipo === 'imagen' ? insertarNivelImagen : insertarNivelTexto
      const junta = separacionBajoCursor(ultimoX, ultimoY, attr)
      if (junta !== null) {
        insertar(junta, idGesto)
      } else if (porDebajoDelUltimo(ultimoX, ultimoY, attr)) {
        // soltado bajo la última fila: nace un nivel nuevo en el fondo y el bloque
        // se queda en él
        insertar(0, idGesto)
      } else {
        const destino = nivelBajoCursor(ultimoX, ultimoY, attr)
        if (destino !== null) moverCapaNivel(idGesto, destino)
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
    seleccionarCapa(capa.id)
    setInteractuando(true)
    const startX = e.clientX
    const inicioBase = capa.inicio
    const finBase = capa.inicio + capa.duracion
    const umbral = UMBRAL_IMAN_PX / pxPorSegundo
    const propios = [inicioBase, finBase]
    // el borde se lleva a donde diga el cursor, pero si roza el cabezal, el cero o
    // el borde de otro elemento se pega a él y sale la guía. el desplazamiento se
    // aplica en incrementos hacia el borde ya imantado, para no descuadrarse
    let ultimoBorde = lado === 'inicio' ? inicioBase : finBase
    const mover = (ev: globalThis.MouseEvent) => {
      const bordeBruto = (lado === 'inicio' ? inicioBase : finBase) + (ev.clientX - startX) / pxPorSegundo
      const enganche = imantarBorde(bordeBruto, puntos, umbral, propios)
      const bordeFinal = enganche ? enganche.punto : bordeBruto
      setGuiaImantado(enganche ? enganche.guia : null)
      recortarCapaTiempo(capa.id, lado, bordeFinal - ultimoBorde)
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

  const etiqueta =
    capa.tipo === 'texto'
      ? capa.texto || 'Texto'
      : capa.tipo === 'imagen'
        ? 'Imagen'
        : capa.tipo === 'censura'
          ? 'Censura'
          : capa.tipo === 'trazo'
            ? 'Dibujo'
            : 'Figura'

  // la imagen se dibuja como un clip aparte: su miniatura se repite a lo ancho
  // (sin estirarse) y encima lleva un velo celeste con su rótulo, para que se
  // distinga de un texto o una figura de un vistazo
  const esImagen = capa.tipo === 'imagen'
  const aspectoImg = esImagen && capa.altoNatural > 0 ? capa.anchoNatural / capa.altoNatural : 1

  return (
    <Tooltip texto={etiqueta} retardo={2000} lado="arriba">
    <motion.div
      layout={interactuando ? false : 'position'}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      layoutDependency={capa.nivel ?? 0}
      onMouseDown={iniciarMover}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(TIPO_TRANSICION)) {
          e.preventDefault()
          if (!transEncima) setTransEncima(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setTransEncima(false)
      }}
      onDrop={alSoltarTransicion}
      // el botón derecho abre el menú de este bloque en el punto donde se pulsó
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        abrirMenuContextual({ x: e.clientX, y: e.clientY, tipo: 'capa', id: capa.id })
      }}
      className={[
        'group absolute top-0 flex h-full cursor-grab items-center overflow-hidden rounded-md border px-2 transition-[border-color]',
        seleccionado
          ? esImagen ? 'border-sky-400' : 'border-amber-400'
          : enConjunto
            ? 'border-brand/70'
            : 'border-transparent hover:border-white/30',
      ].join(' ')}
      style={{
        left: capa.inicio * pxPorSegundo,
        width: Math.max(capa.duracion * pxPorSegundo, 8),
        backgroundColor: esImagen ? 'rgba(56, 189, 248, 0.28)' : 'rgba(245, 158, 11, 0.25)',
        // en reposo la posición se anima con una curva suave; durante el arrastre
        // el suavizado se apaga para que el bloque no vaya por detrás del cursor
        transition: interactuando ? 'none' : 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {esImagen ? (
        <>
          {/* la miniatura se repite a lo ancho a su proporción real, nunca estirada */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${capa.src})`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: `${aspectoImg * 100}% 100%`,
              opacity: 0.5,
            }}
          />
          {/* velo celeste encima, la señal de que es una imagen */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(56, 189, 248, 0.32)' }} />
          <span className="pointer-events-none relative flex items-center gap-1 truncate text-[10px] font-medium text-white">
            <Icon name="imagen" size={11} /> Imagen
          </span>
        </>
      ) : (
        <>
          {/* trama de líneas diagonales sobre el ámbar, para que el bloque de un
              texto, figura o dibujo no sea un rectángulo plano y se distinga de un
              vistazo */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(180,120,10,0.25) 0 1px, transparent 1px 7px)',
            }}
          />
          {/* el rótulo va en el color del tema (oscuro en claro, claro en oscuro),
              porque en blanco no se leía sobre el ámbar claro */}
          <span className="pointer-events-none relative truncate text-[10px] font-medium text-[color:var(--text)]">
            {etiqueta}
          </span>
        </>
      )}

      {/* cuña de la transición de entrada, si la tiene */}
      <TransicionCapaBlock capa={capa} pxPorSegundo={pxPorSegundo} />

      {/* resalte al arrastrar una transición encima, en el borde de entrada */}
      {transEncima && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-md ring-2 ring-inset ring-brand">
          <div
            className="absolute left-0 top-0 h-full w-6"
            style={{
              background:
                'linear-gradient(105deg, rgb(24 97 255 / 0.75) 0%, rgb(24 97 255 / 0.25) 60%, transparent 100%)',
            }}
          />
        </div>
      )}

      <div
        onMouseDown={(e) => iniciarRecorte(e, 'inicio')}
        className={[
          'absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-amber-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
      <div
        onMouseDown={(e) => iniciarRecorte(e, 'fin')}
        className={[
          'absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-amber-400/80 transition-opacity',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        ].join(' ')}
      />
    </motion.div>
    </Tooltip>
  )
}
