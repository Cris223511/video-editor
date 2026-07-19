# Historial de cambios

Este documento recoge los cambios importantes de Video Editor, de la versión más reciente a la más antigua. Cada versión publicada tiene además su entrada en las [releases del repositorio](https://github.com/Cris223511/video-editor/releases).

El formato sigue la convención de [Keep a Changelog](https://keepachangelog.com/es/) y el versionado es [semántico](https://semver.org/lang/es/). El primer número marca los cambios mayores, el segundo las funciones nuevas y el tercero las correcciones.

## 2.0.0 (2026-07-19)

Segunda version. La anterior permitia importar, editar y exportar; esta convierte la
herramienta en un editor con el que se puede montar un video de principio a fin, y
suma el sitio de presentacion, que antes no existia.

### Linea de tiempo

- Varios niveles de video apilados, hasta seis, con altura ajustable. Un clip
  colocado arriba tapa a los de abajo, y se arrastra de un nivel a otro sin perder su
  posicion en el tiempo.
- Veintiuna transiciones repartidas en cinco familias, con buscador y duracion
  editable desde la propia pista.
- Guias de alineacion que aparecen al arrastrar y encajan el clip con el borde o el
  centro de los que ya estan puestos. Se desactivan manteniendo Alt.
- Los espacios vacios entre planos se cierran con un boton.
- Zoom con la rueda manteniendo Ctrl, anclado al punto donde esta el cursor, y tira
  de fotogramas dentro de cada clip.
- Velocidad del clip regulable entre 0,25x y 4x.

### Color

- Correccion por zonas tonales con tres ruedas para sombras, medios y luces.
- Cuatro curvas editables, una maestra y una por canal.
- Exposicion, contraste, saturacion, temperatura y tinte.
- Lo que se ve al corregir es lo que sale en el archivo, porque el visor y la
  exportacion comparten el mismo camino de filtros.

### Proyectos

- Los proyectos se guardan dentro del navegador con sus videos incluidos, no con
  referencias al disco. Mover o borrar el archivo original no rompe el proyecto.
- Se descargan como archivo propio para llevarlos a otro equipo y volver a
  importarlos.
- Ficha de detalles con fechas, numero de archivos, clips, niveles, resolucion y
  espacio ocupado, y de cada archivo sus dimensiones, proporcion, orientacion,
  duracion, peso, formato y megapixeles.
- Buscador, ordenacion, paginado y guardado automatico.

### Sitio de presentacion

- Portada con piezas interactivas que funcionan con el motor real del editor: las
  transiciones que se ven ahi son las mismas que se aplican al video.
- Una demostracion animada por cada herramienta, que va pasando sola y se puede
  detener.
- Terminos y condiciones y politica de privacidad, con indice lateral y
  desplazamiento suave.

### Otros

- Exportacion a 24, 30 o 60 imagenes por segundo, negociando MP4 o WebM segun lo que
  admita el navegador.
- Censura en movimiento con grabacion del recorrido, camara lenta y pincel libre.
- Nueve atajos de teclado.
- Paneles redimensionables y plegables, con los tamanos recordados entre sesiones.
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
