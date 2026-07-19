import { useEffect, useState } from 'react'
import { FolderOpen, Moon, Save, Sun } from 'lucide-react'
import Icon from '../ui/Icon'
import Tooltip from '../ui/Tooltip'
import { useToast } from '../ui/ToastProvider'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { RUTAS } from '../../rutasDef'
import { useProjectStore } from '../../store/useProjectStore'
import { useThemeStore } from '../../store/useThemeStore'
import { guardarSesion } from '../../lib/proyecto/sesion'
import { VERSION } from '../../config/constants'

// barra superior. lleva el logo, el nombre del proyecto editable, cuántos
// medios hay cargados, el cambio de tema, el acceso a los proyectos guardados y
// las acciones de guardar y exportar
export default function TopBar() {
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const abrirExport = useAppStore((s) => s.abrirExport)
  const titulo = useProjectStore((s) => s.titulo)
  const renombrar = useProjectStore((s) => s.renombrar)
  const medios = useProjectStore((s) => s.medios)
  const sinGuardar = useProjectStore((s) => s.sinGuardar)
  const guardadoEn = useProjectStore((s) => s.guardadoEn)
  const tema = useThemeStore((s) => s.tema)
  const alternar = useThemeStore((s) => s.alternar)
  const { mostrar } = useToast()
  const [guardando, setGuardando] = useState(false)
  const enEditor = pathname === RUTAS.editor

  async function guardar() {
    if (guardando) return
    setGuardando(true)
    try {
      // el proyecto conserva su identidad entre guardados, así que volver a
      // guardar actualiza el mismo en lugar de llenar la lista de copias
      const st = useProjectStore.getState()
      await guardarSesion(st.idProyecto, st.creado)
      useProjectStore.setState({ sinGuardar: false, guardadoEn: Date.now() })
      mostrar('success', 'Proyecto guardado en este equipo.')
    } catch {
      mostrar('error', 'No se pudo guardar. Puede que no quede espacio libre.')
    } finally {
      setGuardando(false)
    }
  }

  // Ctrl+S guarda, que es lo que espera cualquiera al pulsarlo
  useEffect(() => {
    if (!enEditor) return
    const alPulsar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        guardar()
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  })

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 px-4 sm:px-6"
      style={{
        // mismo cristal que la barra del sitio, para que pasar de una a otra no
        // se sienta como entrar en otra aplicación
        background: 'rgb(var(--surface) / 0.72)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        borderBottom: '1px solid rgb(var(--border) / 0.1)',
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {enEditor && (
          <Tooltip texto="Volver a los medios" lado="abajo">
            <button
              onClick={() => navegar(RUTAS.medios)}
              className="interactivo grid h-9 w-9 place-items-center rounded-full text-[color:var(--muted)]"
            >
              <Icon name="atras" size={18} />
            </button>
          </Tooltip>
        )}

        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to={RUTAS.portada}
            aria-label="Ir a la portada"
            className="shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <img src="/logo-circle.png" alt="" className="h-7 w-7 object-contain" />
          </Link>
          {enEditor ? (
            <Tooltip texto="Escribe para renombrar el proyecto" lado="abajo">
              <input
                value={titulo}
                onChange={(e) => renombrar(e.target.value)}
                spellCheck={false}
                className="w-40 truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold tracking-tight outline-none transition-colors hover:border-[rgb(var(--border)/0.18)] focus:border-brand sm:w-56"
              />
            </Tooltip>
          ) : (
            <div className="flex items-baseline gap-2">
              <Link to={RUTAS.portada} className="font-display text-[15px] font-extrabold tracking-tight">
                Video <span className="text-brand">Editor</span>
              </Link>

            </div>
          )}
        </div>

        {enEditor && medios.length > 0 && (
          <span
            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-[color:var(--muted)] md:inline-flex"
            style={{ background: 'rgb(var(--border) / 0.07)' }}
          >
            <Icon name="pelicula" size={12} />
            {medios.length} {medios.length === 1 ? 'medio' : 'medios'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] font-medium text-[color:var(--muted)] sm:inline">
          v{VERSION}
        </span>

        <Tooltip texto={tema === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'} lado="abajo">
          <button
            onClick={alternar}
            aria-label="Cambiar tema"
            className="interactivo grid h-9 w-9 place-items-center rounded-full text-[color:var(--muted)]"
          >
            {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </Tooltip>

        <Tooltip texto="Ver los proyectos guardados en este equipo" lado="abajo">
          <Link
            to={RUTAS.proyectos}
            aria-label="Mis proyectos"
            className={[
              'interactivo grid h-9 w-9 place-items-center rounded-lg',
              pathname.startsWith(RUTAS.proyectos) ? 'text-brand' : 'text-[color:var(--muted)]',
            ].join(' ')}
          >
            <FolderOpen size={18} />
          </Link>
        </Tooltip>

        {enEditor && (
          <>
            <Tooltip texto="Guardar el proyecto en este equipo" atajo="Ctrl+S" lado="abajo">
              <button
                onClick={guardar}
                disabled={guardando}
                className="interactivo inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-[color:var(--muted)] disabled:opacity-50"
              >
                <Save size={16} />
                <span className="hidden sm:inline">
                  {guardando ? 'Guardando...' : sinGuardar ? 'Guardar' : guardadoEn ? 'Guardado' : 'Guardar'}
                </span>
                {/* el punto avisa de que hay trabajo aún no guardado, sin robar
                    atención con un mensaje cada vez que se toca algo */}
                {sinGuardar && !guardando && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            </Tooltip>

            <Tooltip texto="Exportar el video" lado="abajo">
              <button
                onClick={abrirExport}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
              >
                <Icon name="exportar" size={17} />
                Exportar
              </button>
            </Tooltip>
          </>
        )}
      </div>
    </header>
  )
}
