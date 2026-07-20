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
  actualizado: '20 de julio de 2026',
  secciones: [
    {
      id: 'introduccion',
      titulo: 'Introducción',
      parrafos: [
        'Estos términos regulan el uso de Video Editor, una herramienta gratuita de edición de video que funciona por completo dentro del navegador. No se trata de un servicio alojado al que envías tu material, sino de un programa que se descarga a tu equipo la primera vez que abres la página y se ejecuta allí, con los recursos de tu propio ordenador. Esa diferencia explica casi todo lo que viene después, incluidas las garantías que se pueden ofrecer y las que no.',
        'La aplicación se publica con **licencia MIT**, una de las licencias de software libre más permisivas que existen. En la práctica significa que puedes usarla para lo que quieras, leer su código, comprobar exactamente lo que hace, copiarlo, modificarlo e incluso redistribuirlo, siempre que conserves el aviso de licencia. El código completo se aloja en su repositorio de GitHub y puede consultarlo cualquiera, así que si algo de lo que se afirma aquí no te cuadra, ese código es la fuente de verdad y está a tu disposición para contrastarlo línea por línea.',
        'Al utilizar la aplicación aceptas lo que se describe a continuación. Si algún punto no te parece aceptable, no la utilices. No hay ningún trámite intermedio, ningún botón de aceptar ni ninguna casilla que marcar: basta con cerrar la página y no habrá quedado rastro de tu visita en ninguna parte.',
        'El documento está escrito para que se entienda leyéndolo una vez, sin necesidad de conocimientos jurídicos. Donde ha habido que elegir entre precisión legal y claridad, se ha optado por la claridad, porque un texto que nadie lee no protege a nadie. Aun así, cada afirmación se corresponde con cómo está construida realmente la herramienta, no con una intención genérica.',
      ],
    },
    {
      id: 'que-es',
      titulo: 'Qué ofrece la aplicación',
      parrafos: [
        'Video Editor permite montar una línea de tiempo con **hasta seis niveles de video**, recortar y dividir clips, ajustar su velocidad, corregir el color con ruedas por zona tonal y curvas por canal, aplicar veintiuna transiciones distintas, añadir texto con control de tipografía, interlineado y espaciado, incorporar imágenes y figuras geométricas, importar audio, censurar zonas con pixelado o desenfoque incluso cuando el objeto se mueve por la escena, y exportar el resultado a un archivo de video listo para compartir.',
        'También permite guardar proyectos con todos sus archivos incluidos, descargarlos como un único fichero para llevarlos a otro equipo y volver a importarlos más tarde tal como estaban. **No hay funciones reservadas, versiones de pago, marcas de agua forzadas ni límites de duración o de exportación.** Lo que ves es todo lo que hay, y está disponible desde el primer momento sin pedir nada a cambio.',
        'Todo el procesamiento ocurre en tu equipo. No existe ningún servidor que reciba, almacene ni transforme tus archivos en ningún momento, ni siquiera de forma temporal mientras dura la edición. La decodificación del video, el dibujo de cada fotograma y la generación del archivo final los realiza tu navegador con las mismas capacidades que usa para reproducir cualquier contenido.',
        'La aplicación se encuentra en desarrollo activo y sus funciones pueden cambiar, ampliarse o afinarse con el tiempo. Las que ya existen se mantienen salvo que un cambio resulte técnicamente inevitable, y en ese caso queda documentado en el historial del repositorio, que cualquiera puede revisar.',
      ],
    },
    {
      id: 'requisitos',
      titulo: 'Qué necesitas para usarla',
      parrafos: [
        'Hace falta un navegador de escritorio reciente basado en Chromium (como Chrome, Edge, Brave u Opera) o en Firefox, con soporte para las capacidades de video, lienzo y grabación que utiliza la aplicación. No se requiere instalar nada, ni crear una cuenta, ni conceder permisos especiales del sistema, ni mantener una conexión permanente una vez que la página ha terminado de cargar.',
        'La aplicación no comprueba tu equipo por adelantado ni te impide empezar a trabajar. Si tu navegador no admite alguna de las capacidades necesarias, lo notarás en el punto concreto donde entran en juego, sobre todo al exportar, que es la operación más exigente. Por eso conviene hacer una prueba corta antes de emprender un montaje largo.',
      ],
      lista: [
        'Un navegador actualizado, en su versión de escritorio; las versiones de móvil no están contempladas.',
        'Espacio libre en disco si vas a guardar proyectos, porque cada uno incluye los videos completos, no solo referencias a ellos.',
        'Memoria suficiente para el material con el que trabajes, algo que se nota especialmente en resoluciones altas o con varios niveles de video a la vez.',
      ],
    },
    {
      id: 'sin-cuenta',
      titulo: 'Uso sin cuenta',
      parrafos: [
        '**No hay registro ni inicio de sesión.** No se solicita correo, nombre ni ningún otro dato personal para utilizar la aplicación, y no existe ninguna base de datos remota donde pudieran almacenarse. Esto no es una promesa de discreción que dependa de la buena voluntad de nadie, es una consecuencia directa de cómo está construida: sin servidor propio, no hay dónde guardar nada aunque se quisiera.',
        'Los proyectos que guardas quedan almacenados en el propio navegador de este equipo, en su almacenamiento local. Si borras los datos de navegación, cambias de navegador o utilizas otro dispositivo, esos proyectos no estarán disponibles allí, salvo que los hayas descargado antes como archivo y los importes de nuevo.',
        'Tampoco existe recuperación de proyectos perdidos. No hay copia remota desde la que restaurarlos ni nadie a quien reclamarlos, así que **la copia de seguridad depende enteramente de ti**. Descargar el proyecto de vez en cuando y guardar aparte los archivos originales es la única red de seguridad que existe, y conviene tomárselo en serio con un trabajo importante.',
      ],
    },
    {
      id: 'responsabilidad-contenido',
      titulo: 'Contenido con el que trabajas',
      parrafos: [
        'Eres responsable del material que editas. Debes contar con los derechos necesarios sobre los videos, imágenes, música y demás elementos que utilices, y con el consentimiento de las personas que aparezcan cuando la ley de tu país lo exija. La herramienta te da los medios técnicos para editar, pero no te otorga ningún derecho sobre el contenido ajeno.',
        'La aplicación no revisa ni tiene forma de revisar ese contenido, porque nunca sale de tu equipo. No hay moderación, ni filtros automáticos, ni registro de lo que se edita, y esa ausencia es deliberada: el precio de que nada se suba a ningún sitio es que nadie más, tampoco quien la desarrolla, puede saber ni controlar lo que haces con ella.',
        'Las funciones de censura sirven para ocultar rostros, matrículas o datos visibles en pantalla, pero **no garantizan el anonimato**. Un pixelado insuficiente puede llegar a revertirse, y una zona tapada durante parte del video puede quedar al descubierto en otro momento si el seguimiento no la cubre por completo. Revisa siempre el resultado exportado, fotograma a fotograma en las partes sensibles, antes de publicarlo.',
      ],
    },
    {
      id: 'limitaciones',
      titulo: 'Limitaciones técnicas',
      parrafos: [
        'El rendimiento depende por completo de tu equipo y de tu navegador. Un proyecto largo o en alta resolución puede resultar lento en un ordenador modesto, y no hay forma de trasladar ese trabajo a un servicio más potente porque no existe ningún servicio detrás: todo el cálculo sale de tu propia máquina.',
        'La exportación se realiza reproduciendo el montaje y capturándolo, por lo que **tarda aproximadamente lo que dura el video final**. Un montaje de diez minutos necesita del orden de diez minutos de espera. Conviene tener presentes estos puntos antes de empezar una exportación larga:',
      ],
      lista: [
        'La pestaña debe permanecer activa y visible mientras dura la exportación; si la dejas en segundo plano, el navegador puede ralentizarla o detenerla.',
        'El formato y el códec del archivo final dependen de lo que admita tu navegador, no de una elección libre de la aplicación.',
        'Los proyectos guardados ocupan espacio real en el disco, ya que incluyen los videos completos y no simples enlaces a ellos.',
        'Un equipo muy justo de memoria o de procesador puede perder fotogramas al exportar, lo que se aprecia como pequeños tirones en el resultado.',
        'Si el navegador se queda sin memoria durante la exportación, el proceso se interrumpe y hay que repetirlo, por lo general con un montaje más ligero o una resolución menor.',
      ],
    },
    {
      id: 'garantia',
      titulo: 'Ausencia de garantía',
      parrafos: [
        'La aplicación se ofrece **tal cual, sin garantía de ningún tipo**, tal como establece la licencia MIT. No se garantiza que esté libre de errores, que resulte apta para un fin concreto ni que su funcionamiento sea ininterrumpido o compatible con todas las combinaciones posibles de equipo y navegador.',
        'Guarda tu trabajo con regularidad y conserva copias de los archivos originales. La responsabilidad por la pérdida de datos no puede recaer en una herramienta gratuita que se ejecuta en tu propio equipo y sobre la que quien la escribió no tiene ningún control una vez que la página se ha cargado en tu navegador.',
        'En la medida en que la ley aplicable lo permita, queda excluida cualquier responsabilidad por daños derivados del uso de la aplicación, incluidos la pérdida de material, el tiempo empleado, los perjuicios indirectos o el lucro cesante. Usarla es una decisión libre y, con ella, asumes también estas condiciones.',
      ],
    },
    {
      id: 'errores',
      titulo: 'Fallos y sugerencias',
      parrafos: [
        'Los fallos se comunican en el repositorio del proyecto en GitHub, mediante su sistema de incidencias. No existe soporte por correo ni canal privado de atención, y tampoco un compromiso de plazo para resolver lo que se reporte, porque detrás no hay una empresa con un equipo dedicado a ello.',
        'Al tratarse de un proyecto de código abierto, cualquiera con los conocimientos necesarios puede proponer correcciones o mejoras. Eso no obliga a incorporarlas, pero sí garantiza que nadie dependa de una sola persona para arreglar aquello que le afecta: quien lo necesite puede tomar el código y adaptarlo a su medida.',
      ],
    },
    {
      id: 'cambios',
      titulo: 'Cambios en estos términos',
      parrafos: [
        'Estos términos pueden actualizarse cuando la aplicación incorpore funciones nuevas o cambie su forma de trabajar. La fecha de la última revisión aparece al principio del documento, y sirve de referencia para saber si lo que estás leyendo sigue vigente.',
        'No se avisa de los cambios por ningún medio, porque no hay direcciones de contacto a las que escribir ni lista de usuarios a la que notificar. El historial completo de modificaciones queda registrado en el repositorio del proyecto, que es donde puede consultarse con exactitud qué cambió y cuándo.',
      ],
    },
  ],
}

export const PRIVACIDAD: Documento = {
  clave: 'privacidad',
  titulo: 'Política de privacidad',
  actualizado: '20 de julio de 2026',
  secciones: [
    {
      id: 'resumen',
      titulo: 'Resumen',
      parrafos: [
        'Esta aplicación **no recoge datos personales**. No hay servidor propio que reciba información, no hay cuentas de usuario, no se instalan cookies de seguimiento y no se emplean herramientas de medición, estadística ni publicidad de ningún tipo. Ni una sola línea de código está dedicada a observar lo que haces.',
        'Conviene entender por qué, porque no es una decisión que se pueda revertir sin reescribir la aplicación entera: todo el procesamiento ocurre en tu navegador y no existe ningún punto intermedio donde los datos pudieran recogerse aunque alguien se lo propusiera. La privacidad aquí no es una política que promete comportarse bien, es una propiedad de la arquitectura.',
        'El resto del documento entra en detalle sobre cada aspecto, qué se guarda y dónde, qué no se recoge, qué papel juegan los servicios de terceros y cómo puedes borrarlo todo. Se ha preferido explicarlo con calma antes que resumirlo en dos líneas, para que puedas comprobar cada afirmación en lugar de tener que confiar en ella.',
      ],
    },
    {
      id: 'archivos',
      titulo: 'Tus archivos de video',
      parrafos: [
        'Los videos, imágenes y audios que abres se procesan dentro de tu navegador, con las mismas capacidades que utiliza para reproducir cualquier contenido de la web. **No se suben a ninguna parte**, ni al importarlos, ni al editarlos, ni al exportar el resultado. Cuando eliges un archivo, el navegador lo mantiene en memoria y crea una referencia interna a él que nunca abandona la pestaña.',
        'Si quieres comprobarlo por ti mismo, abre las herramientas de desarrollo de tu navegador, entra en la pestaña de red y trabaja con normalidad: verás que no sale ninguna petición con tu material mientras editas o exportas. Las únicas peticiones externas de todo el sitio son las fotografías y el video de la página de presentación, que nada tienen que ver con tus proyectos.',
        'Cuando guardas un proyecto, sus archivos quedan almacenados en el propio navegador de este equipo, mediante el almacenamiento local que ofrece el sistema para las páginas web. Ese espacio es privado de la aplicación y del navegador: ni otras páginas, ni otras personas que usen la misma herramienta en sus equipos, ni quien desarrolla la aplicación pueden acceder a él.',
        'Al descargar un proyecto para llevarlo a otro equipo, el archivo resultante se genera en tu navegador y se guarda donde tú indiques, en tu disco. Ese archivo contiene tus videos en su interior, así que a partir de ese momento su seguridad depende de dónde lo dejes y con quién lo compartas; trátalo con el mismo cuidado que a los originales.',
      ],
    },
    {
      id: 'datos',
      titulo: 'Datos que se almacenan',
      parrafos: [
        'Lo único que queda guardado en tu navegador es lo que se enumera a continuación, y todo ello permanece siempre en tu equipo, sin salir de él en ningún momento:',
      ],
      lista: [
        'Los proyectos que guardas de forma expresa, con sus videos, audios e imágenes incluidos.',
        'La referencia al último proyecto abierto, para poder devolverte a él si recargas la página.',
        'Tu preferencia de tema claro u oscuro.',
        'El tamaño y la disposición en que dejas los paneles del editor, junto con el nivel de acercamiento de la línea de tiempo.',
      ],
    },
    {
      id: 'no-recoge',
      titulo: 'Lo que no se recoge',
      parrafos: [
        'Resulta igual de útil enumerar lo que no ocurre, porque es justo lo que suele darse por supuesto al usar una aplicación web y aquí no sucede en ningún caso:',
      ],
      lista: [
        'No se registra tu dirección IP ni se asocia a ninguna actividad, porque no hay servidor que la reciba.',
        'No hay identificadores de sesión, huella del navegador ni cookies de análisis.',
        'No se guarda un historial de lo que editas, exportas o descargas.',
        'No se mide cuánto tiempo pasas en la aplicación ni qué funciones usas.',
        'No se comparte información con anunciantes ni con terceros de ningún tipo.',
        'No se envían informes automáticos de errores ni datos de diagnóstico.',
      ],
    },
    {
      id: 'terceros',
      titulo: 'Servicios de terceros',
      parrafos: [
        'La página de presentación muestra fotografías de Unsplash y videos de Pexels que se cargan desde sus servidores para ilustrar lo que hace la herramienta. Esas peticiones son visibles para dichos servicios, igual que ocurre con cualquier imagen alojada fuera de un sitio web, y quedan sujetas a las políticas de privacidad de cada uno. No llevan ningún dato tuyo más allá de lo que cualquier navegador envía al pedir una imagen.',
        '**El editor en sí no realiza ninguna petición externa.** Las tipografías van incluidas dentro de la propia aplicación precisamente para evitarlo, ya que cargarlas desde un servicio externo revelaría cada visita a quien las sirviera. Todo lo que el editor necesita para funcionar viaja contigo en la primera carga y después trabaja sin volver a pedir nada.',
        'La comprobación de si hay una versión nueva consulta la interfaz de programación del repositorio en GitHub. Esa consulta no lleva ningún dato tuyo: solo pregunta cuál es la última versión publicada y compara ese número con el que tienes. Es la única conexión que el editor establece por su cuenta, y puedes verla en la pestaña de red si quieres confirmarlo.',
      ],
    },
    {
      id: 'menores',
      titulo: 'Uso por parte de menores',
      parrafos: [
        'La aplicación no está pensada específicamente para menores, pero tampoco les está vedada, porque no hay nada en su funcionamiento que dependa de la edad de quien la usa. Al no pedir datos personales, no crear cuentas y no mostrar publicidad ni contenido recomendado de terceros, no existe ninguna información sobre un menor que la herramienta pudiera llegar a recoger, almacenar o tratar.',
        'Por ese mismo motivo no hay verificación de edad ni pantallas de consentimiento: no protegerían nada, ya que no se guarda ni se envía ningún dato sobre quien está delante de la pantalla. Poner una barrera de edad daría una falsa sensación de control sobre unos datos que sencillamente no existen.',
        'La responsabilidad sobre el material que se edita y sobre lo que se publique con él recae siempre en quien usa la aplicación y, cuando se trata de un menor, en los adultos que están a su cargo. La herramienta no ejerce ninguna supervisión sobre el contenido, como se explica en los términos de uso.',
      ],
    },
    {
      id: 'borrar',
      titulo: 'Cómo eliminar tus datos',
      parrafos: [
        'Puedes borrar cualquier proyecto desde la sección "Mis proyectos", con una confirmación previa para evitar sustos. Al eliminarlo se retiran también los videos que guardaba, sin dejar restos en el almacenamiento del navegador.',
        'Si prefieres eliminarlo todo de una sola vez, puedes borrar los datos del sitio desde la configuración de tu navegador, en el apartado de datos de sitios web o de almacenamiento. Eso retirará en un único paso los proyectos guardados, la preferencia de tema y la disposición de los paneles, dejando la aplicación como recién estrenada.',
        '**No hace falta solicitarlo a nadie ni esperar ninguna confirmación**, porque los datos nunca han estado en manos ajenas. El borrado es inmediato y definitivo, sin copias intermedias en otro lugar ni periodo de retención tras el cual algo quede pendiente de eliminar.',
      ],
    },
    {
      id: 'cambios-privacidad',
      titulo: 'Cambios en esta política',
      parrafos: [
        'Esta política se revisará si la aplicación cambia su forma de trabajar. Mientras el procesamiento siga ocurriendo por completo dentro del navegador, no hay motivo para que cambie lo esencial de lo que aquí se explica.',
        'La fecha de la última revisión figura al principio del documento, y el historial de cambios puede consultarse en el repositorio del proyecto, donde queda registrado con detalle qué se modificó en cada versión.',
      ],
    },
  ],
}
