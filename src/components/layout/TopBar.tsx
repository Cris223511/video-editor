import Icon from '../ui/Icon'
import ThemeToggle from '../ui/ThemeToggle'
import { useAppStore } from '../../store/useAppStore'

// barra superior. en el editor aparecen el botón de volver y el de exportar.
// el logo circular es el que se usa en toda la aplicación; el completo queda
// solo para la portada del readme
export default function TopBar() {
  const vista = useAppStore((s) => s.vista)
  const irAImportar = useAppStore((s) => s.irAImportar)
  const abrirExport = useAppStore((s) => s.abrirExport)
  const enEditor = vista === 'editor'

  return (
    <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {enEditor && (
          <button
            onClick={irAImportar}
            title="Volver"
            className="grid h-9 w-9 place-items-center rounded-lg text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
          >
            <Icon name="atras" size={18} />
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <img src="/logo-circle.png" alt="" className="h-7 w-7 object-contain" />
          <span className="text-[15px] font-semibold tracking-tight">Video Editor</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {enEditor && (
          <button
            onClick={abrirExport}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            <Icon name="exportar" size={17} />
            Exportar
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
