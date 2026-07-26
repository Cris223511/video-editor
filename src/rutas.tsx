import { Navigate, createBrowserRouter, useParams } from 'react-router-dom'
import Marco from './components/layout/Marco'
import PortadaView from './features/sitio/PortadaView'
import LegalView from './features/sitio/legal/LegalView'
import ImportView from './features/import/ImportView'
import EditorView from './features/editor/EditorView'
import ProyectosView from './features/proyectos/ProyectosView'
import NoEncontrada from './features/sitio/NoEncontrada'
import InstruccionesView from './features/sitio/InstruccionesView'

export { RUTAS } from './rutasDef'
import { RUTAS } from './rutasDef'

// la vieja dirección para abrir un proyecto (/proyectos/<id>) se mantiene por si
// alguien la tiene guardada, pero ahora la identidad de cada proyecto vive bajo el
// editor, así que se reenvía a /editor/<token>. si el token no existe, el editor ya
// muestra la vista de página no encontrada, igual que cualquier dirección inventada
function RedirigirAEditor() {
  const { id } = useParams()
  return <Navigate to={id ? RUTAS.editorProyecto(id) : RUTAS.proyectos} replace />
}

export const router = createBrowserRouter([
  {
    element: <Marco />,
    children: [
      { path: RUTAS.portada, element: <PortadaView /> },
      { path: RUTAS.medios, element: <ImportView /> },
      // el editor siempre trabaja sobre un proyecto identificado por su token. entrar
      // a /editor a secas no tiene proyecto que abrir, así que lleva a la lista
      { path: RUTAS.editor, element: <Navigate to={RUTAS.proyectos} replace /> },
      { path: '/editor/:id', element: <EditorView /> },
      { path: RUTAS.proyectos, element: <ProyectosView /> },
      // deep-link viejo de un proyecto: se reenvía a su dirección actual bajo el editor
      { path: '/proyectos/:id', element: <RedirigirAEditor /> },
      { path: RUTAS.instrucciones, element: <InstruccionesView /> },
      { path: RUTAS.terminos, element: <LegalView documento="terminos" /> },
      { path: RUTAS.privacidad, element: <LegalView documento="privacidad" /> },
      // la dirección antigua de importar sigue funcionando y lleva a la nueva
      { path: '/import', element: <Navigate to={RUTAS.medios} replace /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
