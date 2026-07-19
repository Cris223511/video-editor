// las direcciones viven en un módulo que no importa nada. si estuvieran en el
// mismo archivo que el enrutador se formaría un ciclo, porque ese archivo carga
// todas las vistas y las vistas necesitan las direcciones para sus enlaces. el
// ciclo compila sin quejarse y luego revienta al arrancar, dejando la página en
// blanco
export const RUTAS = {
  portada: '/',
  editor: '/editor',
  medios: '/medios',
  proyectos: '/proyectos',
  proyecto: (id: string) => `/proyectos/${id}`,
  instrucciones: '/como-funciona',
  terminos: '/terminos',
  privacidad: '/privacidad',
} as const
