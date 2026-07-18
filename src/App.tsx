import TopBar from './components/layout/TopBar'
import ImportView from './features/import/ImportView'
import EditorView from './features/editor/EditorView'
import { ToastProvider } from './components/ui/ToastProvider'
import { TooltipProvider } from './components/ui/Tooltip'
import { useAppStore } from './store/useAppStore'

// raíz de la aplicación. según la vista activa muestra la pantalla de importar
// o el editor completo. los proveedores de tooltips y de avisos envuelven todo
export default function App() {
  const vista = useAppStore((s) => s.vista)

  return (
    <TooltipProvider>
      <ToastProvider>
        <div className="flex min-h-full flex-col">
          <TopBar />
          <main className="flex-1">{vista === 'import' ? <ImportView /> : <EditorView />}</main>
        </div>
      </ToastProvider>
    </TooltipProvider>
  )
}
