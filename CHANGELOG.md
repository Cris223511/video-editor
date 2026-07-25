# Historial de cambios

Este documento recoge los cambios importantes de Video Editor, de la versión más reciente a la más antigua. Cada versión publicada tiene además su entrada en las [releases del repositorio](https://github.com/Cris223511/video-editor/releases).

El formato sigue la convención de [Keep a Changelog](https://keepachangelog.com/es/) y el versionado es [semántico](https://semver.org/lang/es/). El primer número marca los cambios mayores, el segundo las funciones nuevas y el tercero las correcciones.

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
