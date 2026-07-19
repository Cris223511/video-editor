import { useEffect, useRef, useState } from 'react'
import { Copy, Download, FolderOpen, Search, SlidersHorizontal, Trash2, Upload } from 'lucide-react'
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
import { abrirSesion, duplicarProyecto } from '../../lib/proyecto/sesion'
import { ResumenProyecto } from '../../lib/proyecto/formato'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'

// fecha en palabras corrientes, que se lee mejor que una marca de tiempo
function cuando(ms: number): string {
  const d = new Date(ms)
  const dias = Math.floor((Date.now() - ms) / 86_400_000)
  if (dias === 0) return `hoy a las ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  return d.toLocaleDateString()
}

// lista de los proyectos guardados en este equipo. desde aquí se abren, se
// duplican y se borran. nada de esto sale del navegador
export default function ProyectosView() {
  const navegar = useNavigate()
  // si la dirección trae un identificador, ese proyecto se abre solo al entrar
  const { id: idEnRuta } = useParams()
  const irAImportar = () => navegar(RUTAS.medios)
  const { mostrar } = useToast()

  const [lista, setLista] = useState<ResumenProyecto[] | null>(null)
  const [uso, setUso] = useState<{ usado: number; total: number } | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
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

  async function duplicar(id: string) {
    try {
      await duplicarProyecto(id)
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

  const POR_PAGINA = 9
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
        Volver a subir un video
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
                  { valor: 'reciente', etiqueta: 'Modificado hace poco' },
                  { valor: 'antiguo', etiqueta: 'Creado hace más tiempo' },
                  { valor: 'az', etiqueta: 'Nombre de la A a la Z' },
                  { valor: 'za', etiqueta: 'Nombre de la Z a la A' },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((p) => (
          <article
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgb(21_52_102_/_0.14)]"
            style={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.1)',
            }}
          >
            <button
              onClick={() => abrir(p.id)}
              className="relative block aspect-video w-full overflow-hidden bg-black/70"
            >
              {p.portada ? (
                <img
                  src={p.portada}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-[color:var(--muted)]">
                  <Icon name="pelicula" size={26} />
                </span>
              )}
              <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {formatearDuracion(p.duracion)}
              </span>
              {/* al pasar el cursor la portada se oscurece y aparece la acción,
                  que deja claro que la miniatura entera se puede pulsar */}
              <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#13233d]">
                  <FolderOpen size={13} /> Abrir proyecto
                </span>
              </span>
            </button>

            <div className="flex flex-1 flex-col gap-1 p-3">
              <h2 className="truncate font-display text-sm font-bold">{p.titulo}</h2>
              <p className="text-[11px] text-[color:var(--muted)]">
                {p.numMedios} {p.numMedios === 1 ? 'medio' : 'medios'} · {cuando(p.modificado)}
              </p>

              <div className="mt-2 flex gap-1">
                <button
                  onClick={() => abrir(p.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-2 text-xs font-semibold text-brand transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand/20 hover:shadow-sm"
                >
                  <FolderOpen size={13} /> Abrir
                </button>
                <Tooltip texto="Duplicar">
                  <button
                    onClick={() => duplicar(p.id)}
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

              {/* la confirmación se abre dentro de la propia tarjeta: para un
                  borrado de una sola cosa, una ventana aparte sobra */}
              {confirmar === p.id && (
                <div className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/5 p-2">
                  <p className="text-[11px] leading-snug">
                    Se borrarán también los videos guardados con él. No se puede deshacer.
                  </p>
                  <div className="mt-2 flex gap-1">
                    <button
                      onClick={() => borrar(p.id)}
                      className="flex-1 rounded-md bg-rose-500 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-rose-600"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setConfirmar(null)}
                      className="interactivo flex-1 rounded-md py-1.5 text-[11px] font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <Paginador actual={paginaSegura} total={totalPaginas} onCambiar={setPagina} />

      {uso && uso.total > 0 && lista && lista.length > 0 && (
        <p className="mt-8 text-xs text-[color:var(--muted)]">
          Ocupas {formatearBytes(uso.usado)} de los {formatearBytes(uso.total)} que este navegador
          reserva para la aplicación.
        </p>
      )}
    </div>
  )
}
