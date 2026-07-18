import { useEffect, useRef, useState } from 'react'
import { Copy, Download, FolderOpen, Trash2, Upload } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/ToastProvider'
import { useNavigate, useParams } from 'react-router-dom'
import { RUTAS } from '../../rutas'
import { borrarProyecto, espacio, guardarProyecto, leerProyecto, listarProyectos } from '../../lib/proyecto/almacen'
import { desempaquetar, empaquetar, nombreArchivo } from '../../lib/proyecto/archivo'
import { abrirSesion, duplicarProyecto } from '../../lib/proyecto/sesion'
import { ResumenProyecto } from '../../lib/proyecto/formato'
import { formatearDuracion } from '../../lib/format/duracion'
import { formatearBytes } from '../../lib/format/bytes'

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

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
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
            className="interactivo inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[color:var(--muted)]"
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
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <Icon name="mas" size={16} /> Proyecto nuevo
          </button>
        </div>
      </div>

      {lista === null && (
        <p className="text-sm text-[color:var(--muted)]">Cargando tus proyectos...</p>
      )}

      {lista?.length === 0 && (
        <div
          className="rounded-2xl px-6 py-14 text-center"
          style={{ background: 'rgb(var(--border) / 0.05)' }}
        >
          <p className="text-sm font-medium">Todavía no has guardado ningún proyecto</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[color:var(--muted)]">
            Al guardar desde el editor, tu montaje aparecerá aquí con los videos incluidos y podrás
            retomarlo cuando quieras.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista?.map((p) => (
          <article
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-2xl transition-shadow duration-200 hover:shadow-lg"
            style={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.12)',
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
            </button>

            <div className="flex flex-1 flex-col gap-1 p-3">
              <h2 className="truncate font-display text-sm font-bold">{p.titulo}</h2>
              <p className="text-[11px] text-[color:var(--muted)]">
                {p.numMedios} {p.numMedios === 1 ? 'medio' : 'medios'} · {cuando(p.modificado)}
              </p>

              <div className="mt-2 flex gap-1">
                <button
                  onClick={() => abrir(p.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand/10 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/20"
                >
                  <FolderOpen size={13} /> Abrir
                </button>
                <Tooltip texto="Duplicar">
                  <button
                    onClick={() => duplicar(p.id)}
                    aria-label="Duplicar"
                    className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
                  >
                    <Copy size={14} />
                  </button>
                </Tooltip>
                <Tooltip texto="Descargar para otro equipo">
                  <button
                    onClick={() => exportar(p.id, p.titulo)}
                    aria-label="Descargar"
                    className="interactivo grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)]"
                  >
                    <Download size={14} />
                  </button>
                </Tooltip>
                <Tooltip texto="Eliminar">
                  <button
                    onClick={() => setConfirmar(p.id)}
                    aria-label="Eliminar"
                    className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
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

      {uso && uso.total > 0 && lista && lista.length > 0 && (
        <p className="mt-8 text-xs text-[color:var(--muted)]">
          Ocupas {formatearBytes(uso.usado)} de los {formatearBytes(uso.total)} que este navegador
          reserva para la aplicación.
        </p>
      )}
    </div>
  )
}
