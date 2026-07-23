import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BringToFront,
  Copy,
  ClipboardPaste,
  Crop,
  CopyPlus,
  Scissors,
  SendToBack,
  SlidersHorizontal,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'

// una entrada del menú. separadorAntes dibuja una raya encima para agrupar, y
// peligro pinta en rojo lo que destruye algo
interface Opcion {
  id: string
  etiqueta: string
  icono: ReactNode
  atajo?: string
  peligro?: boolean
  separadorAntes?: boolean
  desactivada?: boolean
  onElegir: () => void
}

// separación mínima con el borde de la ventana para que el menú nunca quede
// pegado ni cortado
const MARGEN = 8

// menú que sale con el botón derecho sobre un bloque de la línea de tiempo. no es
// un panel fijo: aparece donde se pulsó y ofrece solo lo que tiene sentido para
// ese elemento. si no cabe hacia abajo o hacia la derecha se voltea al otro lado,
// midiéndose ya montado, de modo que funcione en cualquier tamaño de ventana
export default function MenuContextual() {
  const menu = useEditorStore((s) => s.menuContextual)
  const cerrar = useEditorStore((s) => s.cerrarMenuContextual)
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const audios = useEditorStore((s) => s.audios)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)
  const portapapeles = useEditorStore((s) => s.portapapeles)

  const caja = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  // se coloca ya medido: hasta saber cuánto ocupa no se puede decidir si cabe
  useLayoutEffect(() => {
    if (!menu) {
      setPos(null)
      return
    }
    const el = caja.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const maxX = window.innerWidth - width - MARGEN
    const maxY = window.innerHeight - height - MARGEN
    setPos({
      x: Math.max(MARGEN, Math.min(menu.x, maxX)),
      y: Math.max(MARGEN, Math.min(menu.y, maxY)),
    })
  }, [menu])

  // se cierra al pulsar fuera, al girar la rueda o con escape, como cualquier
  // menú del sistema
  useEffect(() => {
    if (!menu) return
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) cerrar()
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('mousedown', fuera)
    window.addEventListener('keydown', tecla)
    window.addEventListener('wheel', cerrar, { passive: true })
    window.addEventListener('resize', cerrar)
    return () => {
      window.removeEventListener('mousedown', fuera)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('wheel', cerrar)
      window.removeEventListener('resize', cerrar)
    }
  }, [menu, cerrar])

  if (!menu) return null

  const st = useEditorStore.getState()
  const clip = menu.tipo === 'clip' ? clips.find((c) => c.id === menu.id) : undefined
  const capa = menu.tipo === 'capa' ? capas.find((c) => c.id === menu.id) : undefined
  const audio = menu.tipo === 'audio' ? audios.find((a) => a.id === menu.id) : undefined
  const region = menu.tipo === 'region' ? audioRegiones.find((r) => r.id === menu.id) : undefined
  if (!clip && !capa && !audio && !region) return null

  // ejecuta la acción y cierra, que es lo que se espera de un menú de este tipo
  const con = (fn: () => void) => () => {
    fn()
    cerrar()
  }
  const irAPanel = (h: Herramienta) => con(() => st.setHerramienta(h))

  const opciones: Opcion[] = []

  if (clip) {
    opciones.push(
      { id: 'dup', etiqueta: 'Duplicar', icono: <CopyPlus size={15} />, onElegir: con(() => st.duplicarClip(clip.id)) },
      { id: 'copiar', etiqueta: 'Copiar', icono: <Copy size={15} />, atajo: 'Ctrl+C', onElegir: con(() => { st.seleccionar(clip.id); st.copiar() }) },
      { id: 'pegar', etiqueta: 'Pegar', icono: <ClipboardPaste size={15} />, atajo: 'Ctrl+V', desactivada: !portapapeles, onElegir: con(() => st.pegar()) },
      { id: 'dividir', etiqueta: 'Dividir en el cabezal', icono: <Scissors size={15} />, atajo: 'S', separadorAntes: true, onElegir: con(() => { st.seleccionar(clip.id); st.dividirEnCabezal() }) },
      { id: 'recortar', etiqueta: 'Recortar la imagen', icono: <Crop size={15} />, atajo: 'C', onElegir: con(() => { st.seleccionar(clip.id); st.setHerramienta('recortar') }) },
      {
        id: 'silencio',
        etiqueta: clip.mudo ? 'Su audio está en la pista' : clip.silenciado ? 'Quitar el silencio' : 'Silenciar',
        icono: clip.mudo || clip.silenciado ? <VolumeX size={15} /> : <Volume2 size={15} />,
        separadorAntes: true,
        desactivada: !!clip.mudo,
        onElegir: con(() => st.alternarSilencioClip(clip.id)),
      },
      { id: 'separar', etiqueta: 'Separar el audio', icono: <Waves size={15} />, desactivada: !!clip.mudo, onElegir: con(() => { st.seleccionar(clip.id); st.setHerramienta('audio') }) },
      { id: 'borrar', etiqueta: 'Borrar', icono: <Trash2 size={15} />, atajo: 'Supr', peligro: true, separadorAntes: true, onElegir: con(() => st.quitarClip(clip.id)) },
    )
  }

  if (capa) {
    opciones.push(
      { id: 'dup', etiqueta: 'Duplicar', icono: <CopyPlus size={15} />, onElegir: con(() => st.duplicarCapa(capa.id)) },
      { id: 'copiar', etiqueta: 'Copiar', icono: <Copy size={15} />, atajo: 'Ctrl+C', onElegir: con(() => { st.seleccionarCapa(capa.id); st.copiar() }) },
      { id: 'pegar', etiqueta: 'Pegar', icono: <ClipboardPaste size={15} />, atajo: 'Ctrl+V', desactivada: !portapapeles, onElegir: con(() => st.pegar()) },
    )
    if (capa.tipo !== 'censura') {
      opciones.push(
        { id: 'frente', etiqueta: 'Traer al frente', icono: <BringToFront size={15} />, separadorAntes: true, onElegir: con(() => st.traerAlFrente(capa.id)) },
        { id: 'atras', etiqueta: 'Enviar atrás', icono: <SendToBack size={15} />, onElegir: con(() => st.enviarAtras(capa.id)) },
      )
    }
    if (capa.tipo === 'imagen') {
      opciones.push({ id: 'recortar', etiqueta: 'Recortar la imagen', icono: <Crop size={15} />, atajo: 'C', onElegir: con(() => { st.seleccionarCapa(capa.id); st.setHerramienta('recortar') }) })
    }
    opciones.push({ id: 'borrar', etiqueta: 'Borrar', icono: <Trash2 size={15} />, atajo: 'Supr', peligro: true, separadorAntes: true, onElegir: con(() => st.quitarCapa(capa.id)) })
  }

  if (audio) {
    opciones.push(
      { id: 'dup', etiqueta: 'Duplicar', icono: <CopyPlus size={15} />, onElegir: con(() => st.duplicarAudio(audio.id)) },
      { id: 'silencio', etiqueta: audio.volumen === 0 ? 'Quitar el silencio' : 'Silenciar', icono: audio.volumen === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />, separadorAntes: true, onElegir: con(() => st.setVolumenAudio(audio.id, audio.volumen === 0 ? 1 : 0)) },
      { id: 'borrar', etiqueta: 'Borrar', icono: <Trash2 size={15} />, atajo: 'Supr', peligro: true, separadorAntes: true, onElegir: con(() => st.quitarAudio(audio.id)) },
    )
  }

  if (region) {
    opciones.push(
      { id: 'dup', etiqueta: 'Duplicar', icono: <CopyPlus size={15} />, onElegir: con(() => st.duplicarRegionAudio(region.id)) },
      { id: 'borrar', etiqueta: 'Borrar', icono: <Trash2 size={15} />, atajo: 'Supr', peligro: true, separadorAntes: true, onElegir: con(() => st.quitarRegionAudio(region.id)) },
    )
  }

  // con varios bloques marcados se ofrece además borrarlos todos de golpe
  if (st.bloquesSeleccionados.length > 1) {
    const n = st.bloquesSeleccionados.length
    opciones.push({
      id: 'borrar-conjunto',
      etiqueta: `Borrar los ${n} marcados`,
      icono: <Trash2 size={15} />,
      peligro: true,
      separadorAntes: true,
      onElegir: con(() => {
        if (window.confirm(`¿Borrar estos ${n} elementos de la línea de tiempo?`)) {
          st.quitarBloques(st.bloquesSeleccionados)
        }
      }),
    })
  }

  opciones.push({
    id: 'mas',
    etiqueta: 'Más opciones',
    icono: <SlidersHorizontal size={15} />,
    separadorAntes: true,
    onElegir: irAPanel(
      clip
        ? 'transformar'
        : capa
          ? capa.tipo === 'trazo'
            ? 'dibujar'
            : capa.tipo === 'imagen'
              ? 'transformar'
              : capa.tipo
          : 'audio',
    ),
  })

  return createPortal(
    <div
      ref={caja}
      // mientras no se ha medido se dibuja donde se pulsó pero invisible, para no
      // enseñar un salto de posición al colocarse
      className="fixed z-[80] min-w-[13rem] rounded-xl py-1.5 shadow-xl"
      style={{
        left: pos ? pos.x : menu.x,
        top: pos ? pos.y : menu.y,
        opacity: pos ? 1 : 0,
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border) / 0.16)',
        boxShadow: '0 12px 32px rgb(6 12 24 / 0.22)',
        animation: pos ? 'modal-in 0.14s ease-out' : undefined,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {opciones.map((o) => (
        <div key={o.id}>
          {o.separadorAntes && (
            <div className="my-1.5 h-px" style={{ background: 'rgb(var(--border) / 0.12)' }} />
          )}
          <button
            type="button"
            disabled={o.desactivada}
            onClick={o.onElegir}
            className={[
              'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors',
              o.desactivada
                ? 'cursor-default opacity-40'
                : o.peligro
                  ? 'text-red-500 hover:bg-red-500/10'
                  : 'text-[color:var(--text)] hover:bg-brand/10 hover:text-brand',
            ].join(' ')}
          >
            <span className="shrink-0">{o.icono}</span>
            <span className="flex-1 truncate">{o.etiqueta}</span>
            {o.atajo && (
              <span className="shrink-0 text-[10px] tabular-nums text-[color:var(--muted)]">
                {o.atajo}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
