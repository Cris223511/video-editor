// el texto legal vive aquí como datos y no dentro del componente. así el índice
// lateral se genera solo a partir de las secciones y nunca se queda desfasado
// respecto a lo que hay escrito debajo

export interface Seccion {
  id: string
  titulo: string
  parrafos: string[]
  lista?: string[]
}

export interface Documento {
  clave: 'terminos' | 'privacidad'
  titulo: string
  actualizado: string
  secciones: Seccion[]
}

export const TERMINOS: Documento = {
  clave: 'terminos',
  titulo: 'Términos y condiciones',
  actualizado: '18 de julio de 2026',
  secciones: [
    {
      id: 'introduccion',
      titulo: 'Introducción',
      parrafos: [
        'Estos términos regulan el uso de Video Editor, una herramienta gratuita de edición de video que funciona por completo dentro del navegador. La aplicación se publica con licencia MIT y su código está disponible de forma pública.',
        'Al utilizar la aplicación aceptas lo que se describe a continuación. Si algún punto no te parece aceptable, no la utilices.',
      ],
    },
    {
      id: 'que-es',
      titulo: 'Qué ofrece la aplicación',
      parrafos: [
        'Video Editor permite montar una línea de tiempo con varios niveles, recortar y dividir clips, corregir el color, añadir texto, imágenes y figuras, censurar zonas del video y exportar el resultado a un archivo.',
        'Todo el procesamiento ocurre en tu equipo. No existe ningún servidor que reciba, almacene ni transforme tus archivos en ningún momento.',
      ],
    },
    {
      id: 'sin-cuenta',
      titulo: 'Uso sin cuenta',
      parrafos: [
        'No hay registro ni inicio de sesión. No se solicita correo, nombre ni ningún otro dato personal para utilizar la aplicación.',
        'Los proyectos que guardas quedan almacenados en el navegador de este equipo. Si borras los datos del navegador o utilizas otro dispositivo, esos proyectos no estarán disponibles salvo que los hayas descargado antes como archivo.',
      ],
    },
    {
      id: 'responsabilidad-contenido',
      titulo: 'Contenido con el que trabajas',
      parrafos: [
        'Eres responsable del material que editas. Debes contar con los derechos necesarios sobre los videos, imágenes, música y demás elementos que utilices.',
        'La aplicación no revisa ni tiene forma de revisar ese contenido, porque nunca sale de tu equipo.',
      ],
    },
    {
      id: 'limitaciones',
      titulo: 'Limitaciones técnicas',
      parrafos: [
        'El rendimiento depende por completo de tu equipo y de tu navegador. Un proyecto largo o en alta resolución puede resultar lento en un ordenador modesto.',
        'La exportación se realiza en tiempo real, por lo que tarda aproximadamente lo que dura el video final. Conviene tener presentes estos puntos:',
      ],
      lista: [
        'La pestaña debe permanecer activa mientras dura la exportación.',
        'El formato del archivo final depende de lo que admita tu navegador.',
        'Los proyectos guardados ocupan espacio real en el disco, ya que incluyen los videos.',
      ],
    },
    {
      id: 'garantia',
      titulo: 'Ausencia de garantía',
      parrafos: [
        'La aplicación se ofrece tal cual, sin garantía de ningún tipo, tal como establece la licencia MIT. No se garantiza que esté libre de errores ni que resulte apta para un fin concreto.',
        'Guarda tu trabajo con regularidad y conserva copias de los archivos originales. La responsabilidad por la pérdida de datos no puede recaer en una herramienta gratuita que se ejecuta en tu propio equipo.',
      ],
    },
    {
      id: 'cambios',
      titulo: 'Cambios en estos términos',
      parrafos: [
        'Estos términos pueden actualizarse cuando la aplicación incorpore funciones nuevas. La fecha de la última revisión aparece al principio del documento.',
      ],
    },
  ],
}

export const PRIVACIDAD: Documento = {
  clave: 'privacidad',
  titulo: 'Política de privacidad',
  actualizado: '18 de julio de 2026',
  secciones: [
    {
      id: 'resumen',
      titulo: 'En pocas palabras',
      parrafos: [
        'Esta aplicación no recoge datos personales. No hay servidor propio que reciba información, no hay cuentas de usuario y no se emplean herramientas de medición ni de publicidad.',
        'Es una política corta porque no hay mucho que contar, y eso es intencionado.',
      ],
    },
    {
      id: 'archivos',
      titulo: 'Tus archivos de video',
      parrafos: [
        'Los videos, imágenes y audios que abres se procesan dentro de tu navegador. No se suben a ninguna parte, ni al editarlos ni al exportar el resultado.',
        'Cuando guardas un proyecto, sus archivos quedan almacenados en el propio navegador de este equipo, mediante el almacenamiento local que ofrece el sistema. Nadie más puede acceder a ellos.',
      ],
    },
    {
      id: 'datos',
      titulo: 'Datos que se almacenan',
      parrafos: ['Lo único que queda guardado en tu navegador es esto:'],
      lista: [
        'Los proyectos que guardas de forma expresa, con sus videos incluidos.',
        'Tu preferencia de tema claro u oscuro.',
        'El tamaño al que dejas los paneles del editor.',
      ],
    },
    {
      id: 'terceros',
      titulo: 'Servicios de terceros',
      parrafos: [
        'La página de presentación muestra fotografías de Unsplash y videos de Pexels que se cargan desde sus servidores. Esas peticiones son visibles para dichos servicios, igual que ocurre con cualquier imagen alojada fuera de un sitio web.',
        'El editor en sí no realiza ninguna petición externa. Las tipografías van incluidas dentro de la aplicación precisamente para evitarlo.',
      ],
    },
    {
      id: 'borrar',
      titulo: 'Cómo eliminar tus datos',
      parrafos: [
        'Puedes borrar cualquier proyecto desde la sección "Mis proyectos". También puedes eliminar los datos del sitio desde la configuración de tu navegador, lo que retirará todo de una sola vez.',
        'No hace falta solicitarlo a nadie ni esperar confirmación, porque los datos nunca han estado en manos ajenas.',
      ],
    },
  ],
}
