import TopBar from './components/layout/TopBar'
import ImportView from './features/import/ImportView'
import EditorView from './features/editor/EditorView'
import { ToastProvider } from './components/ui/toast/ToastProvider'
import { useAppStore } from './store/useAppStore'

// raíz de la aplicación. según la vista activa muestra la pantalla de importar
// o el editor completo
export default function App() {
  const vista = useAppStore((s) => s.vista)

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-col">
        <TopBar />
        <main className="flex-1">{vista === 'import' ? <ImportView /> : <EditorView />}</main>
      </div>
    </ToastProvider>
  )
}
