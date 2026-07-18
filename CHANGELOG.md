# Historial de cambios

Este documento recoge los cambios importantes de Video Editor, de la versión más reciente a la más antigua. Cada versión publicada tiene además su entrada en las [releases del repositorio](https://github.com/Cris223511/video-editor/releases).

El formato sigue la convención de [Keep a Changelog](https://keepachangelog.com/es/) y el versionado es [semántico](https://semver.org/lang/es/). El primer número marca los cambios mayores, el segundo las funciones nuevas y el tercero las correcciones.

## 0.1.0 (2026-07-18)

Primera versión pública. El editor funciona por completo en el navegador y el flujo de importar, editar y exportar ya está operativo. El proyecto sigue en desarrollo activo y se pule poco a poco.

- Importación de videos e imágenes con validación de tipo, tamaño y firma real, y una biblioteca de medios para tenerlos a mano.
- Línea de tiempo con clips de video, que se recortan, unen, reordenan y dividen en el cabezal con la tecla S, además de transiciones entre clips y capas y audio en su propia pista con rangos de tiempo.
- Anotaciones sobre el video: texto con editor completo, imágenes y logos con opacidad, figuras, un marco decorativo y la edición del lienzo y el fondo.
- Censura en movimiento con fotogramas clave: pixelado, difuminado, transparencia y máscaras que siguen al objeto por la escena.
- Ajustes del video: velocidad del clip, corrección de tono (exposición, contraste, temperatura y saturación) y audio (silenciar y subir el volumen hasta el 200 %).
- Exportación dentro del navegador, sin perder la resolución ni los fotogramas y con el audio sincronizado.
- Tema claro y oscuro, panel de opciones a la izquierda y bordes redondeados en toda la interfaz. Todo el procesamiento ocurre en el equipo del usuario, sin subir nada a ningún servidor.
