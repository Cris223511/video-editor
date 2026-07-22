import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownAZ,
  CalendarPlus,
  PencilLine,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpZA,
  Copy,
  Download,
  FolderOpen,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react'
import Vacio from '../../components/ui/Vacio'
import Paginador from '../../components/ui/Paginador'
import Selector from '../../components/ui/Selector'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/ToastProvider'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RUTAS } from '../../rutasDef'
import { borrarProyecto, espacio, guardarProyecto, leerProyecto, listarProyectos } from '../../lib/proyecto/almacen'
import { desempaquetar, empaquetar, nombreArchivo } from '../../lib/proyecto/archivo'
import { abrirSesion, duplicarProyecto, nuevoProyecto } from '../../lib/proyecto/sesion'
import { ResumenProyecto } from '../../lib/proyecto/formato'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'
import FichaProyecto from './FichaProyecto'
import Confirmar from '../../components/ui/Confirmar'
import Modal from '../../components/ui/Modal'

// fecha escrita en largo, la misma forma que usa la ficha de detalles. antes la
// tarjeta decía cosas como "hoy a las 2:22", que se lee rápido pero no sirve para
// distinguir un proyecto de otro cuando hay varios del mismo día
function fechaLarga(ms: number): string {
  const d = new Date(ms)
  const mes = d.toLocaleDateString('es', { month: 'long' })
  const conMayuscula = mes.charAt(0).toUpperCase() + mes.slice(1)
  const hora = d
    .toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(/\s?([ap])\.?\s?m\.?/i, (_, l) => ` ${l.toLowerCase()}.m.`)
  return `${d.getDate()} de ${conMayuscula} del ${d.getFullYear()}, a las ${hora}`
}

// lista de los proyectos guardados en este equipo. desde aquí se abren, se
// duplican y se borran. nada de esto sale del navegador
export default function ProyectosView() {
  const navegar = useNavigate()
  // si la dirección trae un identificador, ese proyecto se abre solo al entrar
  const { id: idEnRuta } = useParams()
  // crear uno nuevo estrena un proyecto en blanco antes de ir a importar: así no
  // se cuela nada del que estaba abierto (era el error de ver medios ajenos)
  const irAImportar = () => {
    nuevoProyecto()
    navegar(RUTAS.medios)
  }
  const { mostrar } = useToast()

  const [lista, setLista] = useState<ResumenProyecto[] | null>(null)
  const [uso, setUso] = useState<{ usado: number; total: number } | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  // proyecto que se está por duplicar, con el nombre propuesto para la copia. al
  // pulsar duplicar no se copia de una: primero se pregunta cómo llamarla
  const [duplicando, setDuplicando] = useState<{ id: string; nombre: string } | null>(null)
  // qué proyecto tiene la ficha abierta. null cuando no hay ninguna
  const [detalles, setDetalles] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [pagina, setPagina] = useState(1)

  async function refrescar() {
    try {
      setLista(await listarProyectos())
      setUso(await espacio())
    } catch {
      setLista([])
      mostrar('error', 'No se pudieron leer los proyectos guardados.')
    }
  }

  useEffect(() => {
    refrescar()
  }, [])

  // abrir por dirección: compartir el enlace de un proyecto lo deja listo para
  // seguir trabajando sin pasar por la lista
  useEffect(() => {
    if (idEnRuta) abrir(idEnRuta)
  }, [idEnRuta])

  async function abrir(id: string) {
    try {
      const ok = await abrirSesion(id)
      if (!ok) {
        mostrar('error', 'Ese proyecto ya no está disponible.')
        refrescar()
        return
      }
      navegar(RUTAS.editor)
    } catch {
      mostrar('error', 'No se pudo abrir el proyecto.')
    }
  }

  async function duplicar(id: string, nombre: string) {
    try {
      await duplicarProyecto(id, nombre)
      setDuplicando(null)
      mostrar('success', 'Proyecto duplicado.')
      refrescar()
    } catch {
      mostrar('error', 'No se pudo duplicar.')
    }
  }

  // descarga el proyecto entero, con sus videos dentro, para llevárselo a otro
  // equipo o guardarlo como respaldo
  async function exportar(id: string, titulo: string) {
    try {
      const p = await leerProyecto(id)
      if (!p) return
      const blob = await empaquetar(p)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo(titulo)
      a.click()
      URL.revokeObjectURL(url)
      mostrar('success', 'Proyecto descargado.')
    } catch {
      mostrar('error', 'No se pudo preparar el archivo.')
    }
  }

  async function importar(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    try {
      await guardarProyecto(await desempaquetar(f))
      mostrar('success', 'Proyecto importado.')
      refrescar()
    } catch (e) {
      mostrar('error', e instanceof Error ? e.message : 'No se pudo importar.')
    }
  }

  async function borrar(id: string) {
    try {
      await borrarProyecto(id)
      setConfirmar(null)
      mostrar('success', 'Proyecto eliminado.')
      refrescar()
    } catch {
      mostrar('error', 'No se pudo eliminar.')
    }
  }

  // el buscador ignora mayúsculas y acentos, que es como se escribe de verdad
  const limpia = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const filtrados = (lista ?? []).filter((p) => limpia(p.titulo).includes(limpia(busqueda.trim())))
  const ordenados = [...filtrados].sort((a, b) => {
    if (orden === 'az') return a.titulo.localeCompare(b.titulo)
    if (orden === 'za') return b.titulo.localeCompare(a.titulo)
    if (orden === 'antiguo') return a.creado - b.creado
    return b.modificado - a.modificado
  })

  const POR_PAGINA = 6
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA))
  // al filtrar, la página actual puede quedar fuera de rango
  const paginaSegura = Math.min(pagina, totalPaginas)
  const visibles = ordenados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA)

  return (
    <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO} py-10`}>
      <Link
        to={RUTAS.medios}
        className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft
          size={15}
          className="transition-transform duration-200 group-hover:-translate-x-1"
        />{' '}
        Volver a medios
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-titulo-lg">Mis proyectos</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Guardados en este navegador, en tu equipo. No se suben a ningún servidor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => entrada.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:text-brand hover:shadow-md"
            style={{ border: '1px dashed rgb(var(--border) / 0.3)' }}
          >
            <Upload size={16} /> Importar
          </button>
          <input
            ref={entrada}
            type="file"
            accept=".veproj"
            hidden
            onChange={(e) => {
              importar(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            onClick={irAImportar}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          >
            <Icon name="mas" size={16} /> Proyecto nuevo
          </button>
        </div>
      </div>

      {/* buscador y orden: solo aparecen cuando hay algo que buscar u ordenar */}
      {lista !== null && lista.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
            />
            <input
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
              placeholder="Buscar por nombre"
              spellCheck={false}
              className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand"
              style={{
                background: 'rgb(var(--surface))',
                border: '1px solid rgb(var(--border) / 0.1)',
              }}
            />
          </div>
          <div className="flex items-center gap-2 sm:w-64">
            <SlidersHorizontal size={15} className="shrink-0 text-[color:var(--muted)]" />
            <div className="flex-1">
              <Selector
                valor={orden}
                opciones={[
                  // el icono adelanta hacia dónde ordena cada opción, que con
                  // dos criterios de fecha y dos de nombre se agradece
                  { valor: 'reciente', etiqueta: 'Más reciente', icono: <ArrowDownWideNarrow size={14} /> },
                  { valor: 'antiguo', etiqueta: 'Más antiguo', icono: <ArrowUpNarrowWide size={14} /> },
                  { valor: 'az', etiqueta: 'Nombre de la A a la Z', icono: <ArrowDownAZ size={14} /> },
                  { valor: 'za', etiqueta: 'Nombre de la Z a la A', icono: <ArrowUpZA size={14} /> },
                ]}
                onChange={(v) => {
                  setOrden(v)
                  setPagina(1)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {lista === null && (
        <p className="text-sm text-[color:var(--muted)]">Cargando tus proyectos...</p>
      )}

      {lista?.length === 0 && (
        <Vacio
          icono={<FolderOpen size={30} />}
          titulo="Todavía no has guardado ningún proyecto"
          accion={
            <button
              onClick={irAImportar}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              <Icon name="mas" size={16} /> Crear el primero
            </button>
          }
        >
          Al guardar desde el editor, tu montaje aparecerá aquí con los videos incluidos y podrás
          retomarlo cuando quieras, exactamente donde lo dejaste.
        </Vacio>
      )}

      {/* nada coincide con la búsqueda, que no es lo mismo que no tener nada */}
      {lista !== null && lista.length > 0 && ordenados.length === 0 && (
        <Vacio compacto icono={<Search size={24} />} titulo="Ningún proyecto coincide">
          No hay resultados para <b>{busqueda}</b>. Prueba con otra palabra o borra la búsqueda.
        </Vacio>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {visibles.map((p) => (
          <article
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgb(21_52_102_/_0.14)]"
            style={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.1)',
            }}
          >
            {/* la miniatura pasa de ser un botón a un contenedor: dentro van dos
                acciones y un botón no puede llevar otros botones dentro */}
            <div className="relative block aspect-video w-full overflow-hidden">
              {p.portada ? (
                <img
                  src={p.portada}
                  alt=""
                  className="h-full w-full bg-black/70 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                // sin material del que sacar un fotograma, un rectángulo negro se
                // ve como un error. en su lugar va un marcador tranquilo: un
                // degradado suave con la marca y un icono de película centrado
                <div className="relative grid h-full w-full place-items-center overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgb(var(--brand) / 0.14), rgb(var(--surface)) 55%, rgb(var(--brand) / 0.08))',
                    }}
                  />
                  {/* una retícula tenue de puntos le quita la sensación de vacío
                      sin robar protagonismo al icono */}
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      backgroundImage:
                        'radial-gradient(rgb(var(--border) / 0.35) 1px, transparent 1px)',
                      backgroundSize: '14px 14px',
                    }}
                  />
                  <div className="relative flex flex-col items-center gap-1.5 text-[color:var(--muted)]">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/12 text-brand ring-1 ring-brand/20">
                      <Icon name="pelicula" size={20} />
                    </span>
                    <span className="text-[11px] font-medium">Proyecto sin medios</span>
                  </div>
                </div>
              )}
              <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[13px] font-medium text-white">
                {formatearDuracion(p.duracion)}
              </span>
              {/* al pasar el cursor la portada se oscurece y salen las dos
                  acciones, abrir el proyecto o mirar de qué está hecho */}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {/* los dos botones comparten ancho: uno más estrecho que el otro,
                    apilados y centrados, dejaba un escalón que se veía enseguida */}
                <button
                  onClick={() => abrir(p.id)}
                  className="inline-flex w-40 items-center justify-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#13233d] transition-transform duration-200 hover:scale-105"
                >
                  <FolderOpen size={13} /> Abrir proyecto
                </button>
                <button
                  onClick={() => setDetalles(p.id)}
                  className="inline-flex w-40 items-center justify-center gap-1.5 rounded-full border border-white/45 px-3.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-white/15"
                >
                  <SlidersHorizontal size={13} /> Ver detalles
                </button>
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-1 p-3.5">
              {/* el título no pasa de dos líneas y se corta con puntos suspensivos:
                  a una sola línea, cualquier nombre medianamente largo se perdía */}
              <h2 className="line-clamp-2 font-display text-[15px] font-bold leading-snug">
                {p.titulo}
              </h2>
              <p className="text-[13px] text-[color:var(--muted)]">
                {p.numMedios} {p.numMedios === 1 ? 'medio' : 'medios'}
              </p>

              {/* las dos fechas se ven aquí, sin tener que abrir la ficha, que es
                  lo que uno mira al buscar un proyecto entre varios */}
              <div className="mt-2 flex flex-col gap-1">
                <p className="flex items-center gap-1.5 text-[13px] text-[color:var(--muted)]">
                  <CalendarPlus size={13} className="shrink-0 text-brand" />
                  <span className="truncate">Creado el {fechaLarga(p.creado)}</span>
                </p>
                <p className="flex items-center gap-1.5 text-[13px] text-[color:var(--muted)]">
                  <PencilLine size={13} className="shrink-0 text-brand" />
                  <span className="truncate">Editado el {fechaLarga(p.modificado)}</span>
                </p>
              </div>

              {/* el botón de abrir que había aquí sobraba: la miniatura entera ya
                  ofrece abrir el proyecto al pasar el cursor por encima */}
              <div className="mt-3 flex justify-end gap-1">
                <Tooltip texto="Duplicar">
                  <button
                    onClick={() => setDuplicando({ id: p.id, nombre: `Copia de ${p.titulo}` })}
                    aria-label="Duplicar"
                    className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand/10 hover:text-brand"
                  >
                    <Copy size={14} />
                  </button>
                </Tooltip>
                <Tooltip texto="Descargar para otro equipo">
                  <button
                    onClick={() => exportar(p.id, p.titulo)}
                    aria-label="Descargar"
                    className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand/10 hover:text-brand"
                  >
                    <Download size={14} />
                  </button>
                </Tooltip>
                <Tooltip texto="Eliminar">
                  <button
                    onClick={() => setConfirmar(p.id)}
                    aria-label="Eliminar"
                    className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>

            </div>
          </article>
        ))}
      </div>

      <Paginador actual={paginaSegura} total={totalPaginas} onCambiar={setPagina} />

      {uso && uso.total > 0 && lista && lista.length > 0 && (
        // el texto anterior podía leerse como si la cuota fuera común a todo el
        // mundo. no lo es: cada equipo tiene la suya, calculada por el navegador
        // según el disco libre, y como no hay servidor no existe ningún sitio
        // donde pudiera acumularse el material de nadie más
        // sin ancho máximo, el aviso ocupa todo el ancho y cabe en una línea en
        // lugar de partirse. la cifra de espacio va resaltada, que es el dato
        <p className="mt-8 text-[13px] leading-relaxed text-[color:var(--muted)]">
          Tus proyectos ocupan{' '}
          <b className="font-semibold text-[color:var(--text)]">
            {formatearBytes(uso.usado)} de los {formatearBytes(uso.total)}
          </b>{' '}
          que tu navegador reserva en este equipo. Es un espacio tuyo y de nadie más, ya que cada
          persona que use la aplicación tiene el suyo propio en su propia máquina y nada se sube a
          ningún servidor.
        </p>
      )}

      <FichaProyecto id={detalles} onCerrar={() => setDetalles(null)} />

      {/* al duplicar se pregunta el nombre de la copia en la misma clase de
          ventana que el resto de la aplicación, con el campo ya enfocado */}
      <ModalDuplicar
        abierto={duplicando !== null}
        nombre={duplicando?.nombre ?? ''}
        onCancelar={() => setDuplicando(null)}
        onAceptar={(nombre) => duplicando && duplicar(duplicando.id, nombre)}
      />

      {/* borrar un proyecto se lleva también sus videos y no tiene vuelta atrás,
          así que la pregunta se hace en una ventana y no de lado en la tarjeta */}
      <Confirmar
        abierto={confirmar !== null}
        titulo="¿Eliminar este proyecto?"
        mensaje="Se borrarán también los videos guardados con él. Esta acción no se puede deshacer."
        aceptar="Eliminar"
        peligro
        onAceptar={() => confirmar && borrar(confirmar)}
        onCancelar={() => setConfirmar(null)}
      />
    </div>
  )
}

// ventana para nombrar la copia antes de duplicar. arranca con el nombre
// propuesto ("Copia de ...") ya seleccionado, así que se puede escribir encima o
// pulsar aceptar sin más. enter confirma y esc cierra, como en cualquier campo
function ModalDuplicar({
  abierto,
  nombre,
  onCancelar,
  onAceptar,
}: {
  abierto: boolean
  nombre: string
  onCancelar: () => void
  onAceptar: (nombre: string) => void
}) {
  const [valor, setValor] = useState(nombre)
  const campo = useRef<HTMLInputElement>(null)

  // cada vez que se abre con otro proyecto se recarga el nombre propuesto y, en
  // cuanto la ventana termina de aparecer, el campo recibe el foco con todo el
  // texto marcado para poder reemplazarlo de un tirón. el modal cancela el
  // enfoque automático de radix, de ahí que haya que pedirlo a mano
  useEffect(() => {
    if (!abierto) return
    setValor(nombre)
    const t = window.setTimeout(() => {
      campo.current?.focus()
      campo.current?.select()
    }, 80)
    return () => window.clearTimeout(t)
  }, [abierto, nombre])

  const confirmar = () => {
    if (!valor.trim()) return
    onAceptar(valor)
  }

  return (
    <Modal titulo="Duplicar proyecto" abierto={abierto} onCerrar={onCancelar} ancho="max-w-sm">
      <label className="mb-1.5 block text-[13px] font-medium text-[color:var(--muted)]">
        Nombre de la copia
      </label>
      <input
        ref={campo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirmar()
          }
        }}
        spellCheck={false}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-brand"
        style={{
          background: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border) / 0.16)',
        }}
      />

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancelar}
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-[color:var(--muted)] transition-colors duration-200 hover:text-[color:var(--text)]"
          style={{ border: '1px solid rgb(var(--border) / 0.16)' }}
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={!valor.trim()}
          className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
          style={{ background: 'rgb(var(--accent-boton))' }}
        >
          Duplicar
        </button>
      </div>
    </Modal>
  )
}
