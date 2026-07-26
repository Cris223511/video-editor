// las direcciones viven en un módulo que no importa nada. si estuvieran en el
// mismo archivo que el enrutador se formaría un ciclo, porque ese archivo carga
// todas las vistas y las vistas necesitan las direcciones para sus enlaces. el
// ciclo compila sin quejarse y luego revienta al arrancar, dejando la página en
// blanco
export const RUTAS = {
  portada: '/',
  // el editor vive bajo un token por proyecto (/editor/<id>): cada montaje tiene su
  // propia dirección, guardable y recargable. 'editor' a secas es solo el prefijo,
  // que sirve para reconocer la sección; para navegar a un proyecto se usa editorProyecto
  editor: '/editor',
  editorProyecto: (id: string) => `/editor/${id}`,
  medios: '/medios',
  proyectos: '/proyectos',
  proyecto: (id: string) => `/proyectos/${id}`,
  instrucciones: '/como-funciona',
  terminos: '/terminos',
  privacidad: '/privacidad',
} as const
