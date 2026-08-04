# Historial de cambios

Este documento recoge los cambios importantes de Video Editor, de la versión más reciente a la más antigua. Cada versión publicada tiene además su entrada en las [releases del repositorio](https://github.com/Cris223511/video-editor/releases).

El formato sigue la convención de [Keep a Changelog](https://keepachangelog.com/es/) y el versionado es [semántico](https://semver.org/lang/es/). El primer número marca los cambios mayores, el segundo las funciones nuevas y el tercero las correcciones.

## 2.35.1 (2026-08-04)

- **La transición que se resalta es la que agarras.** Al tomar la transición del inicio de un clip, el
  panel de la derecha marca "Al inicio", y al tomar la del final marca "Al final". Antes podía quedar
  resaltado el lado contrario, el que se hubiera usado la última vez.

## 2.35.0 (2026-08-04)

Una renovación completa de la ventana de exportación, con formatos y códecs nuevos, mejoras de imagen y
de sonido, y varios detalles del editor.

### Exportación

- **La ventana de exportar se rediseñó, más ordenada y con más control.** La vista sencilla mantiene lo de
  siempre (calidad y fotografías por segundo) y ahora hay un apartado plegable de ajustes avanzados para
  quien quiera afinar el resultado, sin estorbar a quien solo busca exportar rápido.
- **Las resoluciones se ofrecen según tu material.** En lugar de mostrar siempre las mismas opciones, solo
  aparecen las que tu video de verdad puede dar, desde 144p hasta su tamaño original, con un tope en 1080p.
  Así no se elige una resolución mayor que la del video, que no lo mejoraría.
- **Nivel de compresión con tasa de bits y peso en vivo.** Un control regula el equilibrio entre la calidad
  y el tamaño del archivo, y al moverlo se ven al instante la tasa de bits y el peso estimado. En el nivel
  Original el video conserva la misma calidad que tu material.
- **Una ayuda en cada opción.** Cada ajuste lleva un signo de interrogación que, al pasar el cursor,
  explica en pocas palabras para qué sirve.

### Formatos y códecs

- **WebM y MKV además de MP4.** Ya se puede elegir entre tres envases, cada uno con sus ventajas, y todos
  se generan dentro del navegador.
- **Elección de códec H.264 o H.265.** H.264 es el más compatible y H.265 pesa bastante menos con la misma
  calidad. La opción de H.265 aparece cuando el equipo puede generarlo.
- **Más formatos: MOV, AVI, WMV, FLV y 3GP.** Para casos concretos o equipos y programas más antiguos.
  Estos se preparan a partir del MP4, así que la primera vez se descarga una herramienta de conversión y el
  proceso tarda un poco más.

### Mejoras de imagen y de sonido

- **Nitidez, reducir ruido, grano de película y suavizar movimiento.** Ajustes graduables para dar más
  definición a la imagen, limpiar el granulado de las grabaciones con poca luz, añadir una textura tipo
  cine o hacer el movimiento más continuo.
- **Desentrelazar y mejorar webcam.** El primero corrige el material antiguo que muestra líneas al moverse;
  el segundo aplica de una sola vez una limpieza pensada para las grabaciones de cámara web.
- **Reducir ruido de audio.** Limpia el sonido y elimina zumbidos y ruidos de fondo para que la voz se
  escuche más clara.
- **Aplicar solo a un tramo.** Permite aplicar las mejoras de imagen únicamente a la parte del video que
  elijas, en lugar de a toda su duración.

### Editor y proyectos

- **El clip seleccionado se resalta en la biblioteca de medios.** Al seleccionar un clip en la línea de
  tiempo, su archivo se resalta en el panel de medios y la lista se desplaza suavemente hasta él, para
  saber de un vistazo de dónde salió.
- **Doble clic para salir del zoom del visor.** Estando acercado, un doble clic devuelve la imagen al
  tamaño que encaja, igual que la lupa.
- **La resolución aparece en las fichas.** Tanto en el detalle de un archivo como en el de un proyecto se
  muestra la resolución en su forma reconocible (720p, 1080p), además de las medidas en píxeles.
- **El detalle de un archivo se abre sobre el del proyecto.** Al pulsar un archivo dentro de un proyecto se
  abre su ficha completa, con vista previa incluida, por encima del proyecto y sin cerrarlo.

### Sitio

- **Textos de la portada y de las preguntas frecuentes revisados.** Se reescribieron para que expliquen
  mejor cada sección, de forma más clara y directa, y las preguntas frecuentes quedaron más completas.

## 2.34.5 (2026-07-31)

- **El progreso de exportación dice qué paso va.** En lugar de un genérico "Exportando", el título
  muestra el paso en curso (Leyendo el video, Decodificando y codificando, Añadiendo el audio,
  Empaquetando) con su porcentaje, y la barra avanza con el total. Así se ve en todo momento qué está
  haciendo y cuánto falta.

## 2.34.4 (2026-07-31)

Arreglo del que colgaba la exportación, un diálogo de exportación mucho más claro con el paso a paso,
un impacto de barrido de cámara, más audio a mano y un visor con lupa.

### Exportación

- **Ya no se cuelga al exportar.** Con algunos proyectos la exportación se quedaba clavada en 0% o
  caía al motor lento. La causa era una dirección interna del video que caducaba; ahora se lee el
  archivo directo y arranca siempre. Se probó con proyectos que antes se pegaban y exportan en
  segundos.
- **Diálogo de exportación renovado.** Mientras exporta se ve, a un lado, la vista previa y la barra,
  y al otro el proceso paso a paso (leyendo, decodificando y codificando, añadiendo el audio,
  empaquetando) marcando con un check lo hecho y un girito lo que va, con el segundo y el cuadro en
  curso, además de una ficha con la resolución, la calidad, el ritmo, el formato y por qué fotograma
  va. Si algo no responde, cae solo al motor de respaldo en vez de quedarse esperando.
- **Confirmación al cancelar.** Cancelar mientras exporta pregunta antes, para no perder el avance sin
  querer.

### Impactos

- **Movimiento ahora es un barrido de cámara.** Deja estelas en el sentido del movimiento (como cuando
  mueves la cámara rápido), en lugar de un desenfoque redondo. La dirección se elige.
- **Se retiró el impacto Manchas.**

### Línea de tiempo y visor

- **Audio del clip a un clic.** Al elegir un video, entre sus opciones aparece Audio, con volumen,
  fundidos y silencio; y con varios clips marcados, el volumen y el silencio caen sobre todos.
- **Zoom del visor con lupa.** La rueda del ratón acerca la imagen sobre el punto donde apuntas (sin
  teclas), y en móvil se acerca con dos dedos. Una lupa muestra el nivel y, al pulsarla, vuelve al
  tamaño que encaja. No se puede alejar más allá de lo que ya se ve entero.

## 2.34.3 (2026-07-31)

Una tanda de arreglos de la línea de tiempo, del visor y del sonido, el impacto de Manchas rehecho,
el selector de color ahora editable por RGB/HSL/CMYK, y un par de decisiones de diseño (sin scroll
con inercia y bordes de selección iguales para todos).

### Línea de tiempo

- **Selección con recuadro más lista.** Un recuadro que atrapa un solo elemento se comporta como un
  clic normal (ofrece todas sus opciones); con dos o más sí es un conjunto. Clicar fuera del conjunto
  (otro clip, un impacto, un tirador de recorte) deshace la selección múltiple; arrastrar el grupo por
  el cuerpo lo mueve entero y lo mantiene marcado.
- **Clips que ya no se separan al hacer zoom.** Alejando y acercando rápido, los clips pegados dejaban
  un hueco un instante; ahora saltan a su sitio nuevo sin despegarse.
- **Bordes de selección iguales para todos.** El clip llevaba un aro extra que lo hacía verse distinto
  a las capas, audios y franjas; ahora los cuatro muestran el mismo borde sólido al seleccionarlos.
- **El borrado múltiple usa el aviso de la app.** Al borrar varios elementos con Suprimir ya no sale
  el cuadro del navegador, sino el modal de confirmación de siempre.
- **Panel de la derecha en selección múltiple.** Con varios clips marcados aparecen Ajustar colores,
  Efectos y Audio, que se aplican a todo el conjunto; sin nada elegido el panel queda vacío.

### Visor

- **Sin frame negro en el corte entre clips.** Al pausar en una junta o arrastrar el cabezal, el clip
  que entra podía asomar en negro un instante mientras cargaba; ahora se mantiene el cuadro anterior
  hasta que el nuevo está listo. La reproducción sigue fluida, sin frenar en las juntas.

### Sonido

- **La franja de volumen dibuja el sonido real.** Donde hay clip con audio pinta su onda; donde no
  suena nada (un hueco o silencio) queda una línea plana, en vez de una onda inventada.
- **Volumen y silencio de varios clips a la vez** desde el nuevo apartado Audio de la selección
  múltiple.

### Impactos

- **Manchas rehecho.** Deja de ser un montón de círculos: ahora es un revoltijo aleatorio de formas
  (manchas de tinta, triángulos, rombos, aros, brochazos rectos y salpicaduras de puntos) que
  aparecen y se van invirtiendo el color, como un collage en negativo. El color elige la tonalidad de
  la inversión y la fuerza cuánto se marca.

### Color

- **Selector de color editable y ordenado.** Los valores RGB, HSL y CMYK pasan a pestañas y cada canal
  se puede escribir a mano (además de la rueda y el hexadecimal). El desplegable ya no se corta contra
  el borde de la pantalla. Vale para todos los selectores de color de la app.

### Otros

- **Interfaz sin desplazamiento con inercia.** Se quitó el scroll suave del sitio, que se sentía
  demasiado resbaladizo; la rueda vuelve al comportamiento normal del navegador.
- **Los tooltips ya no se quedan pegados.** Al sacar el cursor del botón, la burbuja de ayuda se
  cierra de inmediato.
- **Volver desde el editor de un impacto** vuelve a dejar seleccionado su clip con la lista de
  impactos abierta, en vez de un panel vacío.
- **Exportación más robusta.** Si el motor rápido se queda clavado sin avanzar, ahora se pasa solo al
  motor clásico en lugar de quedarse esperando.

## 2.34.2 (2026-07-31)

Correcciones de la línea de tiempo y del sonido: la selección múltiple ahora se comporta como se
espera, el fundido de audio suena parejo y un efecto o un color caen sobre todos los clips marcados.

### Línea de tiempo

- **Arrastre en conjunto que seguía al cursor.** Con varios bloques seleccionados, moverlos se
  aceleraba y se despegaba del ratón cuanto más lejos llevabas el gesto. Ahora cada bloque se coloca
  a partir de su posición original más el desplazamiento real del cursor, así que el grupo va pegado
  al puntero de principio a fin. Vale para clips, capas, audios y franjas de volumen.
- **La selección con recuadro se ve mientras arrastras.** Antes no se sombreaba nada hasta soltar el
  clic; ahora, apenas el rectángulo toca un bloque, este queda marcado en vivo, y si lo sacas del
  recuadro se desmarca. Así sabes en todo momento qué vas a seleccionar.
- **El resaltado de recorte sale solo en el bloque señalado.** Al pasar el cursor por una fila
  aparecían los tiradores gruesos en todos sus bloques a la vez; ahora solo se encienden en el que
  está bajo el puntero.

### Color y efectos

- **Se aplican a todos los clips seleccionados.** Con varios clips marcados, un efecto o una
  corrección de color caen sobre todos, no solo sobre el primero. Los paneles avisan a cuántos clips
  se está aplicando.

### Sonido

- **Fundido de audio más natural.** El fundido de entrada y salida usaba una rampa lineal que sonaba
  callada al principio y de golpe después, porque el oído no percibe el volumen de forma lineal.
  Ahora sigue una curva de igual potencia: aparece de menos a más de forma pareja y se asienta
  suave. A más duración, más lento, igual que antes.

### Correcciones

- **Fundido a negro que oscurecía antes de tiempo.** Entre dos clips, el plano de salida empezaba a
  apagarse antes de entrar en la transición. Ahora el oscurecido lo lleva entero el cruce centrado
  en el corte.

## 2.34.1 (2026-07-31)

- **La bocina del visor silencia con un clic.** Pulsar el icono de volumen corta o devuelve el
  sonido de la vista previa, recordando el nivel para restaurarlo. El deslizador sigue apareciendo
  al pasar el cursor por encima.

## 2.34.0 (2026-07-30)

Una tanda grande centrada en las transiciones, un catálogo de efectos mucho más amplio, tres
impactos nuevos y varios arreglos de la reproducción y de la edición en la línea de tiempo.

### Transiciones

- **Cruce centrado para todas.** Cuando dos clips están pegados, cualquier transición (no solo el
  fundido) se resuelve como un cruce centrado en el corte, usando las colas del material, igual que
  en un editor de escritorio.
- **Respetan la edición del clip.** Durante la transición, cada plano se ve con su color y sus
  efectos aplicados, no con la imagen original. Antes se veía el material sin editar y saltaba de
  golpe a como estaba corregido al terminar el cruce.
- **Nueva transición «Desenfoque de movimiento».** Un barrido de cámara direccional: la imagen se
  estira en un sentido y de esa estela pasa al siguiente plano. La dirección (izquierda, derecha,
  arriba o abajo) se elige en los ajustes.
- **Sin parpadeos en los bordes.** Se quitaron los destellos de un fotograma (negro al empezar,
  blanco al terminar) que asomaban al entrar y salir de la ventana de la transición.
- **Galería con marca de puesta.** Un clic aplica la transición y volver a pulsarla la quita, con
  su check, igual que en los efectos. Separar dos clips borra la transición que tenían en la junta.

### Efectos

- **Panel reorganizado.** El panel de Efectos enseña solo lo que mueve o texturiza el cuadro; el
  color vive en Ajustar colores.
- **Diecisiete texturas animadas** que se pintan por fotograma y se hornean igual en el visor y en
  el archivo: grano de película, cine viejo, cine mudo, proyector viejo, polvo y arañazos, VHS,
  monitor CRT, Cámara 2000, estática de TV, glitch digital, interferencia, neón 80, destellos de
  luz, fugas de color, luces bokeh, nieve y lluvia. Cada una con su intensidad.
- **Nuevo efecto «Cromático»** (aberración cromática): separa los canales de color para el aire
  «3D» de lente barata, con el corrimiento regulable.
- **Cámara de acción con la curvatura corregida:** ahora la imagen se dobla como una lente de
  verdad (barril radial), arqueando las líneas hacia el medio en lugar de subir el borde de arriba.
- **Imagen de arrastre más pequeña** al soltar un efecto, una transición o un impacto desde su
  galería, para que no tape media pantalla.

### Ajustar colores

- **Nitidez** como un ajuste más del tono, de -100 (más suave) a 100 (más nítida), que se ve igual
  en el visor y en la exportación.
- **Panel ordenado:** tinte rápido, estilos de color, ruedas, los deslizadores y las curvas.
- El tinte rápido ya no se pierde al bajar su fuerza a cero: el color se conserva y solo el botón
  «Quitar» lo saca.

### Impactos

- **«Flash» unificado.** Antes había flash a negro y flash a blanco por separado; ahora es un solo
  Flash con el color a elegir, negro por defecto.
- **Impacto «Movimiento»:** un golpe de sacudida de cámara con desenfoque, con su dirección y su
  fuerza.
- **Impacto «Manchas»:** unos blobs que vagan por el cuadro e invierten el color de lo que tapan
  (modo diferencia), con el color y la fuerza que decidas. Como todos los impactos, se puede
  estirar de un clip al siguiente.

### Línea de tiempo y reproducción

- **Selección múltiple más fluida:** al arrastrar varios bloques a la vez ya no van con retraso ni
  parecen separarse; siguen al cursor a la par y conservan su distancia. Los bloques marcados
  llevan además un borde bien visible.
- **Vista previa al recortar:** mientras se arrastra el borde de un clip, el visor muestra el
  fotograma exacto desde donde se recorta (con toda su edición), y al soltar vuelve al cabezal.
- **Cortes fluidos:** se corrigió el tirón que a veces repetía el último fotograma al pasar de un
  clip al siguiente.

### Audio

- **Audio por clip de video** en el panel de Audio: volumen, fundido de entrada, fundido de salida
  y silencio del propio clip, no solo de los audios sueltos.

### Correcciones de interfaz

- Se arreglaron controles que quedaban invisibles (tiradores, aros y cabeceras que usaban un color
  de tema inexistente), el segundo del cursor sobre la regla en modo claro y el cierre de algunos
  menús al pulsar fuera. Los textos de los paneles se pueden seleccionar con el cursor.

## 2.33.1 (2026-07-30)

- Cuando el archivo de un medio ya no está en el equipo, el clip avisa «no encontrado» en el visor
  en lugar de dejar el lienzo en negro y llenar la consola de errores de red.

## 2.33.0 (2026-07-30)

- Exportación rápida con WebCodecs, impactos que se pegan al objeto y una tanda de arreglos.

## 2.32.0 (2026-07-28)

- Muchas mejoras del editor: transiciones, censura, duplicado de clips y efectos.

## 2.31.0 (2026-07-26)

- Ronda de pulidos del editor y correcciones (las muestras de color y de efectos parten del
  fotograma que se ve en el visor, arreglo del cierre del panel de color, y varios detalles del
  volumen de la vista previa).

## 2.30.0 (2026-07-25)

Esta versión hace el editor manejable con el dedo, pule la disposición de los
paneles y suma un menú de fila, además de varios detalles de los impactos.

### Táctil

- Todos los arrastres del editor funcionan ahora con el dedo, no solo con el ratón:
  mover clips, textos, figuras, imágenes y audios en la línea de tiempo, moverlos y
  redimensionarlos en el visor, arrastrar el cabezal, reordenar filas y estirar los
  paneles. Por dentro los gestos pasaron a eventos de puntero, que valen igual para
  ratón y para dedo, y las zonas que se agarran ya no desplazan la página al tocarlas.

### Paneles

- Al abrir los controles de la derecha, el que cede espacio es el visor y no el
  panel de la izquierda, que se queda quieto y alineado con el de medios.
- Los paneles de la izquierda se pueden estrechar más, y su ficha de proyecto ya no
  corta el texto cuando el panel queda angosto: los valores se acomodan debajo de su
  etiqueta en lugar de recortarse.

### Línea de tiempo

- Clic derecho sobre una fila para insertar otra encima o debajo, duplicar la pista
  de video o eliminarla con aviso. Funciona en las pistas de video y en las filas de
  audio y de texto, y no deja borrar la última fila que quede.
- La guía de «nueva pista» al arrastrar un medio solo aparece pegada a las pistas de
  video, no paseando por la zona de audio y texto.

### Impactos

- Cada efecto de la paleta se muestra con una vista previa animada que lo reproduce
  en bucle y en cascada, para verlo antes de usarlo.
- La duración se pone libre, con el valor que se quiera, y un doble clic la
  restablece. Al arrastrar un impacto por la línea de tiempo aparece una guía que
  marca dónde va a caer.

## 2.29.0 (2026-07-25)

Esta versión reordena la línea de tiempo alrededor de un modelo más simple, estrena
los impactos (efectos momentáneos dentro de un clip) y pule varios detalles de la
edición y de la presentación.

### Línea de tiempo

- Las figuras y las imágenes dejaron de tener carriles propios: ahora viven dentro
  de las pistas de video, como un bloque más, y se arrastran de una pista a otra con
  el mismo gesto que los clips. La línea de tiempo queda con tres secciones claras,
  video, audio y texto.
- Selección múltiple con un recuadro: se arrastra desde una zona vacía y, al soltar,
  quedan marcados todos los bloques que toca, sea cual sea su tipo. Con el clic
  derecho sobre la selección se pueden borrar todos de una vez.
- La tira de fotogramas de cada clip es más densa y se ancla al tiempo real: al
  recortar, los fotogramas no se desplazan, así sirven de guía para saber por dónde
  se está cortando.
- Se retiró el agarre de reordenar filas de audio, que aparecía al pasar el cursor y
  confundía.

### Impactos

- Una función nueva: efectos momentáneos que se ponen sobre un clip, como una
  transición pero dentro del propio plano. Afectan a todo lo que se ve en ese
  instante, incluidas las imágenes y los textos que tenga delante.
- Se arrastran desde el panel de la derecha hasta el punto del clip donde se quieren,
  se ven como una bolita con una rayita que marca su duración, y se mueven o se
  editan con un clic. Al arrastrarlos sale una guía que marca dónde caerán.
- Nueve efectos: rebote, acercamiento, sacudida, latido, flash a negro, flash a
  blanco, destello, parpadeo y flash de color. Cada uno con su color, su duración
  libre y su fuerza, y con una vista previa animada en la paleta.
- Se ven igual al editar y al exportar, porque el visor y el archivo final comparten
  el mismo motor.

### Figuras

- La estrella llena por completo su recuadro, así la caja de selección se ciñe a la
  forma en lugar de dejar aire alrededor.

### Sitio y textos

- La demostración de censura de la portada cambió su fondo por un paisaje de montañas
  con cielo, sol y dos cordilleras, en lugar del degradado anterior.
- Los rótulos del formulario de proyecto quedan limpios: solo el signo de dos puntos
  y el asterisco de obligatorio, sin las aclaraciones entre paréntesis.

## 2.0.0 (2026-07-19)

Segunda versión. La anterior permitía importar, editar y exportar; esta convierte la
herramienta en un editor con el que se puede montar un video de principio a fin, y
suma el sitio de presentación, que antes no existía.

### Línea de tiempo

- Varios niveles de video apilados, hasta seis, con altura ajustable. Un clip
  colocado arriba tapa a los de abajo, y se arrastra de un nivel a otro sin perder su
  posición en el tiempo.
- Veintiuna transiciones repartidas en cinco familias, con buscador y duración
  editable desde la propia pista.
- Guías de alineación que aparecen al arrastrar y encajan el clip con el borde o el
  centro de los que ya están puestos. Se desactivan manteniendo Alt.
- Los espacios vacíos entre planos se cierran con un botón.
- Zoom con la rueda manteniendo Ctrl, anclado al punto donde está el cursor, y tira
  de fotogramas dentro de cada clip.
- Velocidad del clip regulable entre 0,25x y 4x.

### Color

- Corrección por zonas tonales con tres ruedas para sombras, medios y luces.
- Cuatro curvas editables, una maestra y una por canal.
- Exposición, contraste, saturación, temperatura y tinte.
- Lo que se ve al corregir es lo que sale en el archivo, porque el visor y la
  exportación comparten el mismo camino de filtros.

### Proyectos

- Los proyectos se guardan dentro del navegador con sus videos incluidos, no con
  referencias al disco. Mover o borrar el archivo original no rompe el proyecto.
- Se descargan como archivo propio para llevarlos a otro equipo y volver a
  importarlos.
- Ficha de detalles con fechas, número de archivos, clips, niveles, resolución y
  espacio ocupado, y de cada archivo sus dimensiones, proporción, orientación,
  duración, peso, formato y megapíxeles.
- Buscador, ordenación, paginado y guardado automático.

### Sitio de presentación

- Portada con piezas interactivas que funcionan con el motor real del editor: las
  transiciones que se ven ahí son las mismas que se aplican al video.
- Una demostración animada por cada herramienta, que va pasando sola y se puede
  detener.
- Términos y condiciones y política de privacidad, con índice lateral y
  desplazamiento suave.

### Otros

- Exportación a 24, 30 o 60 imágenes por segundo, negociando MP4 o WebM según lo que
  admita el navegador.
- Censura en movimiento con grabación del recorrido, cámara lenta y pincel libre.
- Nueve atajos de teclado.
- Paneles redimensionables y plegables, con los tamaños recordados entre sesiones.
- Avisos apilados arriba a la derecha, hasta cinco a la vez y el resto en cola.
- Tema claro por defecto, con oscuro disponible en todo el sitio y el editor.

## 0.1.0 (2026-07-18)

Primera versión pública. El editor funciona por completo en el navegador y el flujo de importar, editar y exportar ya está operativo. El proyecto sigue en desarrollo activo y se pule poco a poco.

- Importación de videos e imágenes con validación de tipo, tamaño y firma real, y una biblioteca de medios para tenerlos a mano.
- Línea de tiempo con clips de video, que se recortan, unen, reordenan y dividen en el cabezal con la tecla S, además de transiciones entre clips y capas y audio en su propia pista con rangos de tiempo.
- Anotaciones sobre el video: texto con editor completo, imágenes y logos con opacidad, figuras, un marco decorativo y la edición del lienzo y el fondo.
- Censura en movimiento con fotogramas clave: pixelado, difuminado, transparencia y máscaras que siguen al objeto por la escena.
- Ajustes del video: velocidad del clip, corrección de tono (exposición, contraste, temperatura y saturación) y audio (silenciar y subir el volumen hasta el 200 %).
- Exportación dentro del navegador, sin perder la resolución ni los fotogramas y con el audio sincronizado.
- Tema claro y oscuro, panel de opciones a la izquierda y bordes redondeados en toda la interfaz. Todo el procesamiento ocurre en el equipo del usuario, sin subir nada a ningún servidor.
