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
        'Estos términos regulan el uso de Video Editor, una herramienta gratuita de edición de video que funciona por completo dentro del navegador. No se trata de un servicio alojado al que envías tu material, sino de un programa que se descarga a tu equipo la primera vez que abres la página y se ejecuta allí. Esa diferencia explica casi todo lo que viene después, incluidas las garantías que se pueden ofrecer y las que no.',
        'La aplicación se publica con licencia MIT y su código está disponible de forma pública, así que cualquiera puede leerlo, comprobar lo que hace, copiarlo o modificarlo. Si algo de lo que se afirma aquí no te cuadra, el código es la fuente de verdad y está a tu disposición.',
        'Al utilizar la aplicación aceptas lo que se describe a continuación. Si algún punto no te parece aceptable, no la utilices.',
      ],
    },
    {
      id: 'que-es',
      titulo: 'Qué ofrece la aplicación',
      parrafos: [
        'Video Editor permite montar una línea de tiempo con hasta seis niveles de video, recortar y dividir clips, ajustar su velocidad, corregir el color con ruedas por zona tonal y curvas por canal, aplicar veintiuna transiciones distintas, añadir texto, imágenes y figuras geométricas, censurar zonas con pixelado o desenfoque incluso en movimiento, y exportar el resultado a un archivo de video.',
        'También permite guardar proyectos con sus archivos incluidos, descargarlos para llevarlos a otro equipo y volver a importarlos. No hay funciones reservadas, versiones de pago ni límites de duración o de exportación.',
        'Todo el procesamiento ocurre en tu equipo. No existe ningún servidor que reciba, almacene ni transforme tus archivos en ningún momento.',
      ],
    },
    {
      id: 'sin-cuenta',
      titulo: 'Uso sin cuenta',
      parrafos: [
        'No hay registro ni inicio de sesión. No se solicita correo, nombre ni ningún otro dato personal para utilizar la aplicación, y no existe ninguna base de datos donde pudieran almacenarse. Esto no es una promesa de discreción, es una consecuencia de cómo está construida: sin servidor propio, no hay dónde guardar nada.',
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
        'Esta aplicación no recoge datos personales. No hay servidor propio que reciba información, no hay cuentas de usuario, no se instalan cookies de seguimiento y no se emplean herramientas de medición, estadística ni publicidad de ningún tipo.',
        'Conviene entender por qué, porque no es una decisión que se pueda revertir sin reescribir la aplicación: todo el procesamiento ocurre en tu navegador y no existe ningún punto donde los datos pudieran recogerse aunque se quisiera.',
        'Es una política corta porque no hay mucho que contar, y eso es intencionado.',
      ],
    },
    {
      id: 'archivos',
      titulo: 'Tus archivos de video',
      parrafos: [
        'Los videos, imágenes y audios que abres se procesan dentro de tu navegador, con las mismas capacidades que utiliza para reproducir cualquier contenido. No se suben a ninguna parte, ni al editarlos ni al exportar el resultado.',
        'Si quieres comprobarlo por ti mismo, abre las herramientas de desarrollo de tu navegador, entra en la pestaña de red y trabaja con normalidad: verás que no sale ninguna petición con tu material. Las únicas peticiones externas de todo el sitio son las fotografías y el video de la página de presentación.',
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
        'Puedes borrar cualquier proyecto desde la sección "Mis proyectos", con su confirmación previa. También puedes eliminar todos los datos del sitio desde la configuración de tu navegador, en el apartado de datos de sitios web, lo que retirará de una sola vez los proyectos, la preferencia de tema y el tamaño de los paneles.',
        'No hace falta solicitarlo a nadie ni esperar confirmación, porque los datos nunca han estado en manos ajenas.',
      ],
    },
  ],
}
