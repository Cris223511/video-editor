import { Navigate, createBrowserRouter } from 'react-router-dom'
import Marco from './components/layout/Marco'
import PortadaView from './features/sitio/PortadaView'
import LegalView from './features/sitio/legal/LegalView'
import ImportView from './features/import/ImportView'
import EditorView from './features/editor/EditorView'
import ProyectosView from './features/proyectos/ProyectosView'
import NoEncontrada from './features/sitio/NoEncontrada'

// direcciones de la aplicación en un solo sitio. tenerlas aquí en lugar de
// escritas a mano por los componentes evita que un enlace apunte a una ruta que
// ya no existe
export const RUTAS = {
  portada: '/',
  editor: '/editor',
  medios: '/medios',
  proyectos: '/proyectos',
  proyecto: (id: string) => `/proyectos/${id}`,
  terminos: '/terminos',
  privacidad: '/privacidad',
} as const

export const router = createBrowserRouter([
  {
    element: <Marco />,
    children: [
      { path: RUTAS.portada, element: <PortadaView /> },
      { path: RUTAS.medios, element: <ImportView /> },
      { path: RUTAS.editor, element: <EditorView /> },
      { path: RUTAS.proyectos, element: <ProyectosView /> },
      // abrir un proyecto concreto por su identificador, para poder guardar el
      // enlace o recargar sin perder en cuál se estaba trabajando
      { path: '/proyectos/:id', element: <ProyectosView /> },
      { path: RUTAS.terminos, element: <LegalView documento="terminos" /> },
      { path: RUTAS.privacidad, element: <LegalView documento="privacidad" /> },
      // la dirección antigua de importar sigue funcionando y lleva a la nueva
      { path: '/import', element: <Navigate to={RUTAS.medios} replace /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
