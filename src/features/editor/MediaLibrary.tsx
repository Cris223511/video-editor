import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, Plus } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import Confirmar from '../../components/ui/Confirmar'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useImportarMedios } from '../import/useImportarMedios'
import { ACEPTA_MEDIOS } from '../../lib/validation/validateVideo'
import { formatearDuracion } from '../../lib/format/duracion'
import FichaMedio from './FichaMedio'
import { useCongelarAncho } from './useCongelarAncho'
import { MediaAsset } from '../../types/media'

// tipo de dato que viaja al arrastrar un medio hacia la línea de tiempo
export const TIPO_ARRASTRE = 'application/x-video-editor-asset'
// tipo extra que viaja en el arrastre solo para delatar la clase del medio durante
// el dragover, donde el navegador no deja leer el id. así la línea de tiempo sabe
// si sombrear las pistas de video o el carril de audio antes de soltar
export const tipoClaseArrastre = (clase: string) => `application/x-ve-clase-${clase}`

// preferencia de no volver a preguntar al quitar un medio suelto. vive en el navegador, es una
// comodidad por equipo y no hace falta llevarla dentro del proyecto
const CLAVE_NO_PREGUNTAR = 've.noPreguntarQuitarMedio'
function leerNoPreguntar(): boolean {
  try {
    return localStorage.getItem(CLAVE_NO_PREGUNTAR) === '1'
  } catch {
    return false
  }
}
function guardarNoPreguntar(v: boolean) {
  try {
    if (v) localStorage.setItem(CLAVE_NO_PREGUNTAR, '1')
    else localStorage.removeItem(CLAVE_NO_PREGUNTAR)
  } catch {
    // sin almacenamiento disponible, simplemente se seguirá preguntando
  }
}

// panel de medios, abajo a la izquierda y junto a la línea de tiempo. los
// medios se arrastran desde aquí hasta la pista, y se importan más soltando
// archivos del explorador sobre la zona punteada
export default function MediaLibrary({ plegando = false }: { plegando?: boolean }) {
  const medios = useProjectStore((s) => s.medios)
  const quitar = useProjectStore((s) => s.quitar)
  const quitarUsosDeAsset = useEditorStore((s) => s.quitarUsosDeAsset)

  // qué medio corresponde a lo que está seleccionado en la línea de tiempo, para resaltarlo aquí y saber
  // de un vistazo de dónde salió el clip. se leen primitivas de la selección (no el estado entero) para
  // no repintar en cada fotograma de la reproducción. con selección múltiple no se resalta nada
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const nBloques = useEditorStore((s) => s.bloquesSeleccionados.length)
  const nCapas = useEditorStore((s) => s.capasSeleccionadas.length)
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const audios = useEditorStore((s) => s.audios)
  const assetActivo = useMemo(() => {
    // varias cosas a la vez: no se resalta ningún medio
    if (nBloques > 1 || nCapas > 1) return null
    // un clip de video seleccionado apunta a su medio por assetId
    if (clipSeleccionado) return clips.find((c) => c.id === clipSeleccionado)?.assetId ?? null
    // los audios importados se seleccionan por regionSeleccionada y también llevan su assetId
    if (regionSeleccionada) return audios.find((a) => a.id === regionSeleccionada)?.assetId ?? null
    // una capa de imagen guarda la url del medio en src; se busca el medio con esa url
    if (capaSeleccionada) {
      const capa = capas.find((c) => c.id === capaSeleccionada)
      if (capa && capa.tipo === 'imagen') return medios.find((m) => m.url === capa.src)?.id ?? null
    }
    return null
  }, [clipSeleccionado, capaSeleccionada, regionSeleccionada, nBloques, nCapas, clips, capas, audios, medios])

  // qué medios ya están puestos en la línea de tiempo, para marcarlos y saber de un vistazo cuáles se
  // usaron y cuáles todavía no. un medio cuenta como usado si tiene un clip de video, un audio importado
  // desde él o una capa de imagen que apunta a su archivo
  const usados = useMemo(() => {
    const set = new Set<string>()
    clips.forEach((c) => set.add(c.assetId))
    audios.forEach((a) => set.add(a.assetId))
    capas.forEach((c) => {
      if (c.tipo === 'imagen') {
        const m = medios.find((mm) => mm.url === c.src)
        if (m) set.add(m.id)
      }
    })
    return set
  }, [clips, audios, capas, medios])

  // la tarjeta resaltada se lleva a la vista con un desplazamiento suave, para que no aparezca de golpe
  const activoRef = useRef<HTMLLIElement | null>(null)
  useEffect(() => {
    if (assetActivo && activoRef.current) {
      activoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [assetActivo])
  const { procesar, ocupado } = useImportarMedios()
  const [encima, setEncima] = useState(false)
  // igual que en el panel de opciones: el ancho se congela durante el plegado
  // para que el contenido no se reflowee mientras el panel se estrecha
  const { ref, estiloAncho } = useCongelarAncho(plegando)
  // qué medio tiene la ficha de detalles abierta
  const [detalle, setDetalle] = useState<MediaAsset | null>(null)
  // medio pendiente de confirmar antes de quitarlo. mientras no sea nulo, la
  // ventana de aviso queda abierta preguntando por él
  const [porQuitar, setPorQuitar] = useState<MediaAsset[] | null>(null)
  // medios marcados en el panel, por id. se marcan con clic, con Ctrl o Shift y clic, o arrastrando
  // un recuadro sobre el fondo de la lista. la tecla Suprimir los quita (pidiendo confirmación)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const ultimoMarcado = useRef<string | null>(null)
  // si el usuario pidió no volver a ver el aviso al quitar UN medio suelto
  const [noPreguntar, setNoPreguntar] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)
  const [recuadro, setRecuadro] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  // entrada de archivos oculta, disparada por el botón "+" de la cabecera para
  // elegir por el explorador. arrastrar sobre el panel es la otra vía
  const inputRef = useRef<HTMLInputElement>(null)
  // dragenter y dragleave se disparan también al pasar por los hijos, así que se
  // cuentan las entradas y salidas para no apagar el aviso a mitad del panel
  const arrastreRef = useRef(0)
  // solo interesa el arrastre de archivos del explorador, no el de un medio que se saca del propio
  // panel. al arrastrar una tarjeta, el navegador cuela su miniatura como si fuera un archivo, así
  // que además de pedir 'Files' se descarta cualquier arrastre que traiga nuestro tipo interno: sin
  // esto, soltar un medio sobre el panel lo volvía a importar y quedaba duplicado
  const esArrastreInterno = (e: React.DragEvent) => e.dataTransfer.types.includes(TIPO_ARRASTRE)
  const esArchivos = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes('Files') && !esArrastreInterno(e)

  // quita de verdad el medio una vez confirmado: primero se llevan sus usos de la
  // línea de tiempo (clips, audios y capas de imagen) y luego se borra el asset
  // del proyecto, así no queda nada apuntando a un medio que ya no existe
  const confirmarQuitar = () => {
    if (!porQuitar) return
    // marcar "no volver a preguntar" solo vale para quitar un medio suelto. con varios a la vez el
    // aviso sale siempre
    if (porQuitar.length === 1 && noPreguntar) guardarNoPreguntar(true)
    porQuitar.forEach((m) => {
      quitarUsosDeAsset(m.id, m.url)
      quitar(m.id)
    })
    setSeleccion((prev) => prev.filter((id) => !porQuitar.some((m) => m.id === id)))
    setNoPreguntar(false)
    setPorQuitar(null)
  }

  // quitar uno o varios medios. un medio suelto se quita directo si el usuario ya pidió no volver a
  // preguntar. con varios, el aviso siempre sale
  const pedirQuitar = (lista: MediaAsset[]) => {
    if (lista.length === 0) return
    if (lista.length === 1 && leerNoPreguntar()) {
      quitarUsosDeAsset(lista[0].id, lista[0].url)
      quitar(lista[0].id)
      setSeleccion((prev) => prev.filter((id) => id !== lista[0].id))
      return
    }
    setPorQuitar(lista)
  }
  const mediosSeleccionados = medios.filter((m) => seleccion.includes(m.id))

  // clic sobre una tarjeta. con Ctrl o Cmd suma o quita esa tarjeta, con Shift marca todo el tramo
  // desde la última, y sin nada deja marcada solo esa
  const marcar = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    } else if (e.shiftKey && ultimoMarcado.current) {
      const a = medios.findIndex((m) => m.id === ultimoMarcado.current)
      const b = medios.findIndex((m) => m.id === id)
      if (a >= 0 && b >= 0) {
        const [d, h] = a < b ? [a, b] : [b, a]
        setSeleccion(medios.slice(d, h + 1).map((m) => m.id))
      }
    } else {
      setSeleccion([id])
    }
    ultimoMarcado.current = id
  }

  // Suprimir quita lo marcado en el panel. se atiende en la fase de captura para ganarle al atajo
  // global que borra lo seleccionado en la línea de tiempo: si hay medios marcados aquí, es esto lo
  // que se quiere borrar. fuera de un campo de texto, y solo mientras haya algo marcado
  useEffect(() => {
    if (seleccion.length === 0) return
    const alTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return
      const el = document.activeElement as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      pedirQuitar(medios.filter((m) => seleccion.includes(m.id)))
    }
    window.addEventListener('keydown', alTeclar, true)
    return () => window.removeEventListener('keydown', alTeclar, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion, medios])

  // un clic fuera del panel suelta la selección de medios, para que Suprimir vuelva a actuar sobre la
  // línea de tiempo
  useEffect(() => {
    if (seleccion.length === 0) return
    const alPulsar = (e: MouseEvent) => {
      const dentro = (e.target as HTMLElement | null)?.closest?.('[data-panel-medios]')
      const enModal = (e.target as HTMLElement | null)?.closest?.('[role="dialog"]')
      if (!dentro && !enModal) setSeleccion([])
    }
    window.addEventListener('mousedown', alPulsar)
    return () => window.removeEventListener('mousedown', alPulsar)
  }, [seleccion.length])

  // recuadro elástico sobre el fondo de la lista: lo que toque queda marcado
  const iniciarRecuadro = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const destino = e.target as HTMLElement
    if (destino.closest('[data-medio-id]') || destino.closest('button')) return
    const cont = listaRef.current
    if (!cont) return
    const base = cont.getBoundingClientRect()
    const x0 = e.clientX - base.left + cont.scrollLeft
    const y0 = e.clientY - base.top + cont.scrollTop
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) setSeleccion([])
    const previa = e.ctrlKey || e.metaKey || e.shiftKey ? seleccion : []
    const mover = (ev: MouseEvent) => {
      const x1 = ev.clientX - base.left + cont.scrollLeft
      const y1 = ev.clientY - base.top + cont.scrollTop
      const r = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }
      setRecuadro(r)
      const tocados: string[] = []
      cont.querySelectorAll<HTMLElement>('[data-medio-id]').forEach((el) => {
        const b = el.getBoundingClientRect()
        const bx = b.left - base.left + cont.scrollLeft
        const by = b.top - base.top + cont.scrollTop
        if (bx < r.x + r.w && bx + b.width > r.x && by < r.y + r.h && by + b.height > r.y) {
          tocados.push(el.getAttribute('data-medio-id') as string)
        }
      })
      setSeleccion(Array.from(new Set([...previa, ...tocados])))
    }
    const soltar = () => {
      setRecuadro(null)
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
    }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
  }

  const soltarArchivos = (e: React.DragEvent) => {
    e.preventDefault()
    arrastreRef.current = 0
    setEncima(false)
    // un medio arrastrado desde el propio panel no se reimporta: solo cuentan los archivos que
    // llegan del explorador. sin esta guarda, soltar un medio sobre el panel lo duplicaba
    if (esArrastreInterno(e)) return
    if (e.dataTransfer.files?.length) procesar(e.dataTransfer.files)
  }

  return (
    <aside
      ref={ref}
      onDragEnter={(e) => {
        if (!esArchivos(e)) return
        arrastreRef.current += 1
        setEncima(true)
      }}
      onDragOver={(e) => {
        if (esArchivos(e)) e.preventDefault()
      }}
      onDragLeave={(e) => {
        if (!esArchivos(e)) return
        arrastreRef.current = Math.max(0, arrastreRef.current - 1)
        if (arrastreRef.current === 0) setEncima(false)
      }}
      onDrop={soltarArchivos}
      data-panel-medios
      className="panel relative flex-1 overflow-hidden rounded-xl"
    >
      {/* bloque en absoluto con ancho controlado para que, al plegar o desplegar,
          las miniaturas y textos no se estiren: solo se descubren o se recortan */}
      <div className="absolute inset-y-0 left-0 flex flex-col" style={{ width: estiloAncho }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon name="pelicula" size={15} className="text-[color:var(--muted)]" />
        <span className="text-[13px] font-semibold">Medios</span>
        {/* el recuento iba suelto como un número a secas, sin decir de qué. ahora
            se acompaña de la palabra para que se lea «1 medio» y quede claro que
            cuenta los archivos importados */}
        <span
          className="ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-[color:var(--muted)]"
          style={{ background: 'rgb(var(--border) / 0.08)' }}
        >
          {medios.length} {medios.length === 1 ? 'medio' : 'medios'}
        </span>
        {seleccion.length > 0 && (
          <Tooltip texto={`Quitar ${seleccion.length === 1 ? 'el medio marcado' : `los ${seleccion.length} medios marcados`}`}>
            <button
              onClick={() => pedirQuitar(mediosSeleccionados)}
              aria-label="Quitar los medios marcados"
              className="grid h-6 w-6 place-items-center rounded-md text-[color:var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Icon name="papelera" size={14} />
            </button>
          </Tooltip>
        )}
        {/* elegir archivos por el explorador, sin ocupar sitio con un cartel; el
            arrastre sobre el panel es la otra forma de traerlos */}
        <Tooltip texto="Agregar medios">
          <button
            onClick={() => inputRef.current?.click()}
            aria-label="Agregar medios"
            disabled={ocupado}
            className="grid h-6 w-6 place-items-center rounded-md text-[color:var(--muted)] transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-50"
          >
            <Plus size={15} />
          </button>
        </Tooltip>
      </div>

      <div
        ref={listaRef}
        onMouseDown={iniciarRecuadro}
        className="relative min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5"
      >
        {recuadro && (
          <div
            className="pointer-events-none absolute z-30 rounded-sm border border-brand bg-brand/15"
            style={{ left: recuadro.x, top: recuadro.y, width: recuadro.w, height: recuadro.h }}
          />
        )}
        {medios.length > 0 && (
          <ul className="mb-2.5 grid grid-cols-2 gap-2">
            {medios.map((m, i) => {
              const activo = assetActivo === m.id
              return (
              <li key={m.id} ref={activo ? activoRef : undefined}>
                <div
                  data-medio-id={m.id}
                  onClick={(e) => marcar(e, m.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TIPO_ARRASTRE, m.id)
                    // la clase va en su propio tipo (sin valor) para poder leerla en
                    // el dragover, donde getData del id no está disponible
                    e.dataTransfer.setData(tipoClaseArrastre(m.clase), '')
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  // solo en los videos, al posar el cursor se reproduce la vista
                  // previa en silencio desde el principio; al retirarlo se para y
                  // rebobina para volver a mostrar la portada. las imágenes y el
                  // audio se quedan como estaban
                  onMouseEnter={
                    m.clase === 'video'
                      ? (e) => {
                          const v = e.currentTarget.querySelector('video')
                          if (v) {
                            v.currentTime = 0
                            void v.play().catch(() => {})
                          }
                        }
                      : undefined
                  }
                  onMouseLeave={
                    m.clase === 'video'
                      ? (e) => {
                          const v = e.currentTarget.querySelector('video')
                          if (v) {
                            v.pause()
                            v.currentTime = 0
                          }
                        }
                      : undefined
                  }
                  // la miniatura ocupa toda la proporción del video, así se ve el
                  // encuadre de verdad en lugar de una franja recortada
                  className="group relative w-full cursor-grab overflow-hidden rounded-lg bg-black/40 ring-1 ring-[rgb(var(--border)/0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:cursor-grabbing"
                >
                  {/* la portada depende de la clase: el audio no tiene imagen y
                      se pinta con su icono sobre un fondo verde; la imagen se ve
                      entera sin recortar; el video usa su fotograma de portada */}
                  {m.clase === 'audio' ? (
                    <div className="grid aspect-video w-full place-items-center bg-gradient-to-br from-emerald-500/25 to-emerald-800/10">
                      <Icon name="musica" size={26} className="text-emerald-400" />
                    </div>
                  ) : (
                    <img
                      src={m.miniatura}
                      alt=""
                      // sin arrastre propio: si no, al arrastrar la tarjeta el navegador colaba la
                      // miniatura como un archivo y el panel la tomaba por una importación
                      draggable={false}
                      className={[
                        'aspect-video w-full transition-transform duration-300 group-hover:scale-105',
                        m.clase === 'imagen' ? 'bg-black/40 object-contain' : 'object-cover',
                      ].join(' ')}
                    />
                  )}
                  {/* el video de vista previa se monta encima de la portada y
                      normalmente está invisible y parado; al pasar el cursor sube
                      su opacidad y se reproduce, así la transición entre foto y
                      video se ve suave. va sin arrastre propio para no estorbar al
                      draggable de la tarjeta */}
                  {m.clase === 'video' && !m.faltante && (
                    <video
                      src={m.url}
                      muted
                      playsInline
                      preload="metadata"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  )}
                  {/* el archivo ya no está en el equipo: se marca la portada como no
                      encontrada, en vez de intentar cargar un video roto */}
                  {m.faltante && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[rgb(9_14_24/0.72)] text-center">
                      <Icon name="alerta" size={20} className="text-amber-400" />
                      <span className="px-2 text-[11px] font-semibold leading-tight text-white/90">
                        No encontrado
                      </span>
                    </div>
                  )}
                  {/* número de orden en el que se importó, arriba a la izquierda, y a su lado un check
                      verde cuando el medio ya está puesto en la línea de tiempo, para distinguir de un
                      vistazo lo que ya se usó de lo que todavía no. el orden sigue la fila (izquierda a
                      derecha, de arriba abajo), el mismo en el que se subieron */}
                  <div className="pointer-events-none absolute left-1.5 top-1.5 z-10 flex items-center gap-1">
                    <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-md bg-black/65 px-1 text-[11px] font-semibold text-white backdrop-blur">
                      {i + 1}
                    </span>
                    {usados.has(m.id) && (
                      <Tooltip texto="Ya está en la línea de tiempo">
                        <span className="pointer-events-auto grid h-5 w-5 place-items-center rounded-md bg-emerald-500/90 text-white backdrop-blur">
                          <Icon name="check" size={12} />
                        </span>
                      </Tooltip>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5">
                    <p className="truncate text-[12px] font-medium text-white">{m.nombre}</p>
                    <p className="truncate text-[10px] text-white/70">
                      {m.clase === 'audio'
                        ? formatearDuracion(m.duracion)
                        : m.clase === 'imagen'
                          ? `${m.ancho}×${m.alto}`
                          : `${formatearDuracion(m.duracion)} · ${m.ancho}×${m.alto}`}
                    </p>
                  </div>
                  {/* los dos botones salen al pasar el cursor: ver la ficha del
                      medio o quitarlo del proyecto */}
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Tooltip texto="Ver detalles">
                      <button
                        onClick={() => setDetalle(m)}
                        aria-label="Ver detalles"
                        className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-brand"
                      >
                        <Info size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip texto="Quitar del proyecto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // si la tarjeta forma parte de una selección de varios, se quitan todos
                          pedirQuitar(seleccion.includes(m.id) && seleccion.length > 1 ? mediosSeleccionados : [m])
                        }}
                        aria-label="Quitar del proyecto"
                        className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500"
                      >
                        <Icon name="papelera" size={13} />
                      </button>
                    </Tooltip>
                  </div>

                  {seleccion.includes(m.id) && (
                    <div className="pointer-events-none absolute inset-0 z-20 rounded-lg bg-brand/20 ring-2 ring-inset ring-brand" />
                  )}
                  {/* sombreado azul de selección, el MISMO diseño que el del clip en la línea de tiempo
                      (fondo tenue de marca + borde interior). entra y sale con un fundido para que el
                      borde se dibuje suave, sin brusquedad */}
                  <AnimatePresence>
                    {activo && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="pointer-events-none absolute inset-0 z-20 rounded-lg bg-brand/15 ring-2 ring-inset ring-brand"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </li>
              )
            })}
          </ul>
        )}

        {/* sin ningún medio todavía, una zona amplia invita a traerlos. con medios ya
            cargados no hace falta cartel: se arrastra sobre el panel o se usa el "+"
            de la cabecera */}
        {medios.length === 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[rgb(var(--border)/0.22)] px-3 py-10 text-center transition-all duration-200 hover:border-brand/60 hover:bg-brand/5 disabled:pointer-events-none disabled:opacity-60"
          >
            <Icon name="subir" size={22} className="text-[color:var(--muted)]" />
            <span className="text-[13px] font-medium leading-tight text-[color:var(--muted)]">
              Arrastra videos, audio o imágenes
            </span>
            <span className="text-[10px] text-[color:var(--muted)]">o haz clic para elegirlos</span>
          </button>
        )}
      </div>
      </div>

      {/* entrada de archivos oculta, compartida por el botón "+" de la cabecera y la
          zona vacía */}
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA_MEDIOS}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) procesar(e.target.files)
          e.target.value = ''
        }}
      />

      {/* aviso que cubre todo el panel al arrastrar archivos encima, traslúcido y con
          desenfoque, al estilo de la pantalla de importar. entra y sale con un fundido
          y un leve acercamiento para que no aparezca de golpe */}
      <AnimatePresence>
        {encima && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand"
            style={{ background: 'rgb(var(--surface) / 0.55)', backdropFilter: 'blur(6px)' }}
          >
            <Icon name="subir" size={26} className="text-brand" />
            <span className="text-sm font-semibold text-brand">Suelta los archivos aquí</span>
          </motion.div>
        )}
      </AnimatePresence>

      <FichaMedio medio={detalle} onCerrar={() => setDetalle(null)} />

      {/* quitar un medio arrastra consigo todo lo que dependa de él en la línea
          de tiempo, así que conviene preguntar antes en lugar de borrarlo de
          golpe con un clic */}
      <Confirmar
        abierto={porQuitar !== null}
        titulo={porQuitar && porQuitar.length > 1 ? `¿Quitar estos ${porQuitar.length} medios?` : '¿Quitar este medio?'}
        mensaje={
          porQuitar && porQuitar.length > 1
            ? 'Se quitarán también de la línea de tiempo, con sus clips, los audios que sacaste de ellos y las capas de imagen que los usan.'
            : 'Se quitará también de la línea de tiempo, y con él sus clips, los audios que sacaste de este medio y las capas de imagen que lo usan.'
        }
        aceptar="Quitar"
        peligro
        casilla={
          porQuitar && porQuitar.length === 1
            ? { etiqueta: 'No volver a preguntar', marcada: noPreguntar, onCambiar: setNoPreguntar }
            : undefined
        }
        onAceptar={confirmarQuitar}
        onCancelar={() => {
          setNoPreguntar(false)
          setPorQuitar(null)
        }}
      />
    </aside>
  )
}
