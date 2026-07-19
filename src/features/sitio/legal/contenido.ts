// el texto legal vive aquí como datos y no dentro del componente. así el índice
// lateral se genera solo a partir de las secciones y nunca se queda desfasado
// respecto a lo que hay escrito debajo.
//
// dentro de los textos se admiten dos marcas: lo que va entre asteriscos dobles
// sale resaltado, y el nombre del producto se pinta con los colores del logotipo
// allí donde aparezca. de eso se encarga el componente Enriquecido

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
  actualizado: '19 de julio de 2026',
  secciones: [
    {
      id: 'introduccion',
      titulo: 'Introducción',
      parrafos: [
        'Estos términos regulan el uso de Video Editor, una herramienta gratuita de edición de video que funciona por completo dentro del navegador. No se trata de un servicio alojado al que envías tu material, sino de un programa que se descarga a tu equipo la primera vez que abres la página y se ejecuta allí. Esa diferencia explica casi todo lo que viene después, incluidas las garantías que se pueden ofrecer y las que no.',
        'La aplicación se publica con **licencia MIT** y su código está disponible de forma pública, así que cualquiera puede leerlo, comprobar lo que hace, copiarlo o modificarlo. Si algo de lo que se afirma aquí no te cuadra, el código es la fuente de verdad y está a tu disposición para contrastarlo.',
        'Al utilizar la aplicación aceptas lo que se describe a continuación. Si algún punto no te parece aceptable, no la utilices. No hay ningún trámite intermedio: basta con cerrar la página.',
        'El documento está escrito para que se entienda leyéndolo una vez. Donde ha habido que elegir entre precisión jurídica y claridad, se ha optado por la claridad, porque un texto que nadie lee no protege a nadie.',
      ],
    },
    {
      id: 'que-es',
      titulo: 'Qué ofrece la aplicación',
      parrafos: [
        'Video Editor permite montar una línea de tiempo con **hasta seis niveles de video**, recortar y dividir clips, ajustar su velocidad, corregir el color con ruedas por zona tonal y curvas por canal, aplicar veintiuna transiciones distintas, añadir texto, imágenes y figuras geométricas, censurar zonas con pixelado o desenfoque incluso en movimiento, y exportar el resultado a un archivo de video.',
        'También permite guardar proyectos con sus archivos incluidos, descargarlos para llevarlos a otro equipo y volver a importarlos más tarde. **No hay funciones reservadas, versiones de pago ni límites de duración o de exportación.** Lo que ves es todo lo que hay, y está disponible desde el primer momento.',
        'Todo el procesamiento ocurre en tu equipo. No existe ningún servidor que reciba, almacene ni transforme tus archivos en ningún momento, ni siquiera de forma temporal mientras dura la edición.',
        'La aplicación se encuentra en desarrollo activo y sus funciones pueden cambiar. Las que ya existen se mantienen salvo que un cambio resulte inevitable, en cuyo caso se documenta en el repositorio.',
      ],
    },
    {
      id: 'requisitos',
      titulo: 'Qué necesitas para usarla',
      parrafos: [
        'Hace falta un navegador reciente basado en Chromium o Firefox, con soporte para las capacidades de video y grabación que utiliza la aplicación. No se requiere instalar nada, ni conceder permisos especiales, ni disponer de conexión permanente una vez cargada la página.',
        'La aplicación no comprueba tu equipo antes de dejarte trabajar. Si tu navegador no admite alguna de las capacidades necesarias, lo notarás al exportar, que es cuando entran en juego.',
      ],
      lista: [
        'Un navegador actualizado, en su versión de escritorio.',
        'Espacio libre en disco si vas a guardar proyectos, porque incluyen los videos completos.',
        'Memoria suficiente para el material con el que trabajes, sobre todo en alta resolución.',
      ],
    },
    {
      id: 'sin-cuenta',
      titulo: 'Uso sin cuenta',
      parrafos: [
        '**No hay registro ni inicio de sesión.** No se solicita correo, nombre ni ningún otro dato personal para utilizar la aplicación, y no existe ninguna base de datos donde pudieran almacenarse. Esto no es una promesa de discreción, es una consecuencia de cómo está construida: sin servidor propio, no hay dónde guardar nada.',
        'Los proyectos que guardas quedan almacenados en el navegador de este equipo. Si borras los datos del navegador o utilizas otro dispositivo, esos proyectos no estarán disponibles salvo que los hayas descargado antes como archivo.',
        'Tampoco existe recuperación de proyectos perdidos. No hay copia remota desde la que restaurarlos ni nadie a quien reclamarlos, así que **la copia de seguridad depende de ti**. Descargar el proyecto de vez en cuando es la única red de seguridad que existe.',
      ],
    },
    {
      id: 'responsabilidad-contenido',
      titulo: 'Contenido con el que trabajas',
      parrafos: [
        'Eres responsable del material que editas. Debes contar con los derechos necesarios sobre los videos, imágenes, música y demás elementos que utilices, y con el consentimiento de las personas que aparezcan cuando la ley de tu país lo exija.',
        'La aplicación no revisa ni tiene forma de revisar ese contenido, porque nunca sale de tu equipo. No hay moderación, ni filtros, ni registro de lo que se edita, y esa ausencia es deliberada.',
        'Las funciones de censura sirven para ocultar rostros, matrículas o datos visibles en pantalla, pero **no garantizan el anonimato**. Un pixelado insuficiente puede revertirse, y una zona tapada durante parte del video puede quedar al descubierto en otro momento. Revisa siempre el resultado exportado antes de publicarlo.',
      ],
    },
    {
      id: 'limitaciones',
      titulo: 'Limitaciones técnicas',
      parrafos: [
        'El rendimiento depende por completo de tu equipo y de tu navegador. Un proyecto largo o en alta resolución puede resultar lento en un ordenador modesto, y no hay forma de trasladar ese trabajo a otra parte porque no existe otra parte.',
        'La exportación se realiza en tiempo real, por lo que **tarda aproximadamente lo que dura el video final**. Un montaje de diez minutos necesita unos diez minutos de espera. Conviene tener presentes estos puntos:',
      ],
      lista: [
        'La pestaña debe permanecer activa mientras dura la exportación.',
        'El formato del archivo final depende de lo que admita tu navegador.',
        'Los proyectos guardados ocupan espacio real en el disco, ya que incluyen los videos.',
        'Un equipo muy justo puede perder fotogramas al exportar, lo que se nota como tirones en el resultado.',
        'Si el navegador se queda sin memoria durante la exportación, el proceso se interrumpe y hay que repetirlo.',
      ],
    },
    {
      id: 'garantia',
      titulo: 'Ausencia de garantía',
      parrafos: [
        'La aplicación se ofrece **tal cual, sin garantía de ningún tipo**, tal como establece la licencia MIT. No se garantiza que esté libre de errores, que resulte apta para un fin concreto ni que su funcionamiento sea ininterrumpido.',
        'Guarda tu trabajo con regularidad y conserva copias de los archivos originales. La responsabilidad por la pérdida de datos no puede recaer en una herramienta gratuita que se ejecuta en tu propio equipo y sobre la que quien la escribió no tiene ningún control una vez cargada.',
        'En la medida en que la ley aplicable lo permita, queda excluida cualquier responsabilidad por daños derivados del uso de la aplicación, incluidos la pérdida de material, el tiempo empleado o el lucro cesante.',
      ],
    },
    {
      id: 'errores',
      titulo: 'Fallos y sugerencias',
      parrafos: [
        'Los fallos se comunican en el repositorio público del proyecto. No existe soporte por correo ni canal privado de atención, y tampoco un compromiso de plazo para resolverlos.',
        'Al tratarse de un proyecto abierto, cualquiera puede proponer correcciones. Eso no obliga a incorporarlas, pero sí garantiza que nadie dependa de una sola persona para arreglar lo que le afecta.',
      ],
    },
    {
      id: 'cambios',
      titulo: 'Cambios en estos términos',
      parrafos: [
        'Estos términos pueden actualizarse cuando la aplicación incorpore funciones nuevas o cambie su forma de trabajar. La fecha de la última revisión aparece al principio del documento.',
        'No se avisa de los cambios por ningún medio, porque no hay direcciones de contacto a las que escribir. El historial completo de modificaciones queda registrado en el repositorio, que es donde puede consultarse qué cambió y cuándo.',
      ],
    },
  ],
}

export const PRIVACIDAD: Documento = {
  clave: 'privacidad',
  titulo: 'Política de privacidad',
  actualizado: '19 de julio de 2026',
  secciones: [
    {
      id: 'resumen',
      titulo: 'En pocas palabras',
      parrafos: [
        'Esta aplicación **no recoge datos personales**. No hay servidor propio que reciba información, no hay cuentas de usuario, no se instalan cookies de seguimiento y no se emplean herramientas de medición, estadística ni publicidad de ningún tipo.',
        'Conviene entender por qué, porque no es una decisión que se pueda revertir sin reescribir la aplicación entera: todo el procesamiento ocurre en tu navegador y no existe ningún punto donde los datos pudieran recogerse aunque se quisiera.',
        'Es una política corta porque no hay mucho que contar, y eso es intencionado. Cuando un texto de privacidad se alarga, suele ser porque hay bastante que explicar.',
      ],
    },
    {
      id: 'archivos',
      titulo: 'Tus archivos de video',
      parrafos: [
        'Los videos, imágenes y audios que abres se procesan dentro de tu navegador, con las mismas capacidades que utiliza para reproducir cualquier contenido. **No se suben a ninguna parte**, ni al editarlos ni al exportar el resultado.',
        'Si quieres comprobarlo por ti mismo, abre las herramientas de desarrollo de tu navegador, entra en la pestaña de red y trabaja con normalidad: verás que no sale ninguna petición con tu material. Las únicas peticiones externas de todo el sitio son las fotografías y el video de la página de presentación.',
        'Cuando guardas un proyecto, sus archivos quedan almacenados en el propio navegador de este equipo, mediante el almacenamiento local que ofrece el sistema. Nadie más puede acceder a ellos, y tampoco quien desarrolla la aplicación.',
        'Al descargar un proyecto para llevarlo a otro equipo, el archivo resultante se genera en tu navegador y se guarda donde tú indiques. Ese archivo contiene tus videos, así que trátalo con el mismo cuidado que a los originales.',
      ],
    },
    {
      id: 'datos',
      titulo: 'Datos que se almacenan',
      parrafos: [
        'Lo único que queda guardado en tu navegador es esto, y todo ello permanece en tu equipo:',
      ],
      lista: [
        'Los proyectos que guardas de forma expresa, con sus videos incluidos.',
        'Tu preferencia de tema claro u oscuro.',
        'El tamaño al que dejas los paneles del editor.',
      ],
    },
    {
      id: 'no-recoge',
      titulo: 'Lo que no se recoge',
      parrafos: [
        'Resulta más útil enumerar lo que no ocurre, porque es lo que suele darse por supuesto al usar una aplicación web:',
      ],
      lista: [
        'No se registra tu dirección IP ni se asocia a ninguna actividad.',
        'No hay identificadores de sesión, huella del navegador ni cookies de análisis.',
        'No se guarda un historial de lo que editas, exportas o descargas.',
        'No se comparte información con anunciantes ni con terceros de ningún tipo.',
        'No se envían informes automáticos de errores.',
      ],
    },
    {
      id: 'terceros',
      titulo: 'Servicios de terceros',
      parrafos: [
        'La página de presentación muestra fotografías de Unsplash y videos de Pexels que se cargan desde sus servidores. Esas peticiones son visibles para dichos servicios, igual que ocurre con cualquier imagen alojada fuera de un sitio web, y quedan sujetas a sus propias políticas.',
        '**El editor en sí no realiza ninguna petición externa.** Las tipografías van incluidas dentro de la aplicación precisamente para evitarlo, ya que cargarlas desde un servicio externo revelaría cada visita a quien las sirviera.',
        'La comprobación de versiones nuevas consulta la interfaz pública del repositorio. Esa consulta no lleva ningún dato tuyo, solo pregunta cuál es la última versión publicada.',
      ],
    },
    {
      id: 'menores',
      titulo: 'Uso por parte de menores',
      parrafos: [
        'La aplicación no está dirigida a un público concreto por edad y no solicita ningún dato, de modo que no puede recoger información de menores ni de nadie. No existe verificación de edad porque no habría nada que proteger detrás de ella.',
      ],
    },
    {
      id: 'borrar',
      titulo: 'Cómo eliminar tus datos',
      parrafos: [
        'Puedes borrar cualquier proyecto desde la sección "Mis proyectos", con su confirmación previa. También puedes eliminar todos los datos del sitio desde la configuración de tu navegador, en el apartado de datos de sitios web, lo que retirará de una sola vez los proyectos, la preferencia de tema y el tamaño de los paneles.',
        '**No hace falta solicitarlo a nadie ni esperar confirmación**, porque los datos nunca han estado en manos ajenas. El borrado es inmediato y definitivo, sin copias intermedias ni periodo de retención.',
      ],
    },
    {
      id: 'cambios-privacidad',
      titulo: 'Cambios en esta política',
      parrafos: [
        'Esta política se revisará si la aplicación cambia su forma de trabajar. Mientras el procesamiento siga ocurriendo por completo en el navegador, no hay motivo para que cambie lo esencial.',
        'La fecha de la última revisión figura al principio, y el historial de cambios puede consultarse en el repositorio público.',
      ],
    },
  ],
}
