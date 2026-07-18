import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import Icon from '../ui/Icon'
import Tooltip from '../ui/Tooltip'
import Modal from '../ui/Modal'
import { Interruptor } from '../ui/Controls'
import { useAppStore } from '../../store/useAppStore'
import { useProjectStore } from '../../store/useProjectStore'
import { useThemeStore } from '../../store/useThemeStore'
import { VERSION } from '../../config/constants'

// barra superior. lleva el logo, el nombre del proyecto editable, cuántos
// medios hay cargados, el cambio rápido de tema, los ajustes y la exportación
export default function TopBar() {
  const vista = useAppStore((s) => s.vista)
  const irAImportar = useAppStore((s) => s.irAImportar)
  const abrirExport = useAppStore((s) => s.abrirExport)
  const titulo = useProjectStore((s) => s.titulo)
  const renombrar = useProjectStore((s) => s.renombrar)
  const medios = useProjectStore((s) => s.medios)
  const tema = useThemeStore((s) => s.tema)
  const alternar = useThemeStore((s) => s.alternar)
  const [ajustes, setAjustes] = useState(false)
  const enEditor = vista === 'editor'

  return (
    <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {enEditor && (
          <Tooltip texto="Volver a los medios" lado="abajo">
            <button
              onClick={irAImportar}
              className="interactivo grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)]"
            >
              <Icon name="atras" size={18} />
            </button>
          </Tooltip>
        )}

        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/logo-circle.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
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
              <span className="text-[15px] font-semibold tracking-tight">Video Editor</span>
              <span className="hidden text-[11px] text-[color:var(--muted)] sm:inline">
                Edición en tu navegador
              </span>
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
            className="interactivo grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)]"
          >
            {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </Tooltip>

        <Tooltip texto="Ajustes de la aplicación" lado="abajo">
          <button
            onClick={() => setAjustes(true)}
            aria-label="Ajustes"
            className="interactivo grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)]"
          >
            <Icon name="ajustes" size={18} />
          </button>
        </Tooltip>

        {enEditor && (
          <Tooltip texto="Exportar el video" lado="abajo">
            <button
              onClick={abrirExport}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand-dark active:scale-95"
            >
              <Icon name="exportar" size={17} />
              Exportar
            </button>
          </Tooltip>
        )}
      </div>

      <ModalAjustes abierto={ajustes} onCerrar={() => setAjustes(false)} />
    </header>
  )
}

// ajustes generales de la aplicación. por ahora el tema, y más adelante el
// resto de preferencias
function ModalAjustes({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const tema = useThemeStore((s) => s.tema)
  const fijar = useThemeStore((s) => s.fijar)

  return (
    <Modal
      titulo="Ajustes"
      descripcion="Preferencias generales del editor"
      abierto={abierto}
      onCerrar={onCerrar}
    >
      <div className="flex flex-col gap-4">
        <div className="bloque flex flex-col gap-3 p-3">
          <Interruptor
            etiqueta="Modo oscuro"
            ayuda="Cambia toda la interfaz a la paleta oscura. Tu elección se recuerda para la próxima vez."
            activo={tema === 'dark'}
            onChange={(v) => fijar(v ? 'dark' : 'light')}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
          <span>Versión {VERSION}</span>
          <a
            href="https://github.com/Cris223511/video-editor"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand transition-opacity hover:opacity-75"
          >
            Ver el código
          </a>
        </div>

        <p className="text-xs leading-relaxed text-[color:var(--muted)]">
          Los videos se procesan en tu equipo. Nada se sube a ningún servidor mientras editas ni al
          exportar.
        </p>
      </div>
    </Modal>
  )
}
