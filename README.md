<p align="center">
  <img src="public/logo.png" alt="logo de Video Editor" width="110">
</p>

<h1 align="center">Video Editor</h1>

<p align="center">
  Editor de video completo que corre entero en el navegador.<br>
  Sin instalar nada, sin cuentas y sin que tus archivos salgan de tu equipo.
</p>

<p align="center">
  <a href="README.md">Español</a> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/Cris223511/video-editor/releases/latest"><img src="https://img.shields.io/github/v/release/Cris223511/video-editor?label=versi%C3%B3n&color=1861ff" alt="última versión"></a>
  <img src="https://img.shields.io/badge/React-18-1861ff" alt="react 18">
  <img src="https://img.shields.io/badge/TypeScript-5-1861ff" alt="typescript 5">
  <img src="https://img.shields.io/badge/Vite-5-1861ff" alt="vite 5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-green" alt="licencia MIT"></a>
</p>

<p align="center">
  <b><a href="https://video-editor-plus.vercel.app">Abrir la aplicación</a></b>
</p>

---

## Qué es

Video Editor monta un video de principio a fin desde el navegador. Importas los archivos, cortas y ordenas los clips, corriges el color, censuras lo que se mueve, añades texto, imágenes, figuras y audio, y exportas el resultado. Todo el procesamiento ocurre en tu equipo: ningún fotograma se sube a ningún servidor.

Está pensado para resolver un video concreto el mismo día, un recorte con música, una pieza vertical para redes, un tutorial de pantalla o una entrevista en la que hay que tapar una cara. No reemplaza a una suite de escritorio; se ocupa del trabajo cotidiano y lo hace directo, sin instalaciones, sin cuentas, sin marcas de agua y sin funciones de pago.

## Funciones

**Importar.** Video en MP4, WebM, MOV, MKV, M4V y OGV hasta 1,5 GB, imágenes en PNG, JPG, WebP, GIF, AVIF y más, y audio en MP3, WAV, OGG, M4A, FLAC u OPUS. Antes de sumar un archivo se comprueba su tipo, su tamaño y su firma binaria real, no solo la extensión.

**Línea de tiempo.** Hasta seis niveles de video y carriles propios para texto y figuras, imágenes y audio. Cada carril lleva varias filas, alto ajustable tirando de su borde y nombre editable con un clic. El recorte no es destructivo, los clips se dividen por el cabezal, se imantan entre ellos, van de 0,25x a 4x y cierran los huecos que quedan al borrar.

**Transiciones.** Veintiuna repartidas en cinco familias: atenuaciones, barridos, formas, empujes y zooms. Sirven para los clips y también para cualquier elemento suelto, un texto, una figura, una imagen o un dibujo entran con la que elijas. La duración se ajusta desde la propia línea de tiempo tirando de la cuña de entrada.

**Color.** Tres ruedas por zona tonal para sombras, medios y luces, cuatro curvas por canal y los ajustes de exposición, contraste, saturación, temperatura y tinte. Funciona en los clips de video y en las imágenes, y la corrección puede aparecer poco a poco en vez de estar a pleno desde el primer fotograma.

**Censura en movimiento.** Círculo, rectángulo o pincel libre, con pixelado, difuminado o tapado completo. El recorrido se graba arrastrando el elemento sobre el video, con cámara lenta para seguir algo que se mueve rápido, y luego se corrige nodo a nodo. El mismo movimiento se aplica a textos, imágenes, figuras y dibujos.

**Capas.** Texto con tipografías propias, contorno, sombra, fondo y neón; imágenes con recorte y color; figuras geométricas; dibujo a mano alzada; y diez marcos decorativos alrededor del lienzo.

**Audio.** Volumen general del proyecto, franjas de volumen por tramos para bajar la música donde alguien habla, y separación del audio de un video a su propia pista.

**Lienzo y exportación.** Seis proporciones o ajuste automático al primer video, con relleno de bandas por color o por el propio video ampliado y desenfocado. La exportación ocurre en el navegador a 24, 30 o 60 fps, en MP4 con respaldo en WebM, con progreso y cancelación.

**Proyectos.** Se guardan solos en el navegador con los videos dentro, se listan con buscador y paginación, y se pueden empaquetar en un archivo `.veproj` para llevarlos a otro equipo.

Una idea recorre todo el editor: lo que ves es lo que exportas. El visor y el compositor comparten el mismo motor de color, transiciones y render, así que el archivo final coincide con lo que montaste. Y con Control y la rueda del ratón te acercas sobre el visor, anclado al cursor, para colocar una censura o un texto pequeño con precisión.

## Atajos de teclado

| Acción | Atajo |
| --- | --- |
| Reproducir o pausar | `Barra espaciadora` |
| Dividir en el cabezal | `S` |
| Borrar lo seleccionado | `Supr` o `Retroceso` |
| Copiar y pegar | `Ctrl+C` y `Ctrl+V` |
| Deshacer y rehacer | `Ctrl+Z` y `Ctrl+Y` |
| Mover el cabezal un fotograma | `←` y `→` |
| Mover el cabezal un segundo | `Shift` + `←` o `→` |
| Ir al principio o al final | `Inicio` y `Fin` |
| Acercar o alejar la línea de tiempo | `+` y `-` |
| Zoom del visor sobre el cursor | `Ctrl` + rueda |
| Soltar la selección | `Esc` |

No hay atajo para guardar porque el proyecto se guarda solo. Mientras escribes en un campo, los atajos no se disparan. Con una censura seleccionada, las flechas ajustan su caja en vez de mover el cabezal.

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

Vite levanta la aplicación en `http://localhost:5173`. Para generar la versión de producción en `dist` se usa `npm run build`, que además comprueba los tipos, y `npm run preview` sirve ese resultado en local.

## Cómo está hecho

La interfaz es React 18 con TypeScript, empaquetada con Vite y estilada con Tailwind. El estado vive en Zustand y la navegación en React Router, con Framer Motion y Lenis para el movimiento. Los diálogos, menús y paneles ajustables se apoyan en Radix, Embla y react-resizable-panels.

El render y la grabación del video usan Canvas, Web Audio y MediaRecorder, y los proyectos guardados van a IndexedDB. Todo el motor de edición (validación, análisis de medios, color, transiciones, compositor y exportación) vive en `src/lib`, separado de la interfaz, para que la lógica no dependa de React.

<details>
<summary>Estructura del proyecto</summary>

```
video-editor/
├── index.html
├── vite.config.ts            cabeceras COOP/COEP por si más adelante se usa WebCodecs
├── vercel.json               las mismas cabeceras en producción
└── src/
    ├── main.tsx              punto de entrada
    ├── rutasDef.ts           las direcciones en un solo sitio
    ├── config/               versión, límites y formatos aceptados
    ├── types/                tipos del dominio
    ├── lib/                  motor sin dependencia de react
    │   ├── validation/       validación de archivos (tipo, tamaño, firma)
    │   ├── media/            análisis de video y miniaturas
    │   ├── layers/           capas, movimiento y geometría
    │   ├── color/            ruedas, curvas y ajustes de tono
    │   ├── transiciones/     catálogo, motor y entrada de elementos
    │   ├── audio/            ganancia por franjas
    │   ├── timeline/         cálculos de la línea de tiempo
    │   ├── proyecto/         almacén, empaquetado y sesión
    │   └── export/           compositor y exportación
    ├── store/                estado global
    ├── components/           iconos, controles, piezas del sitio y layout
    └── features/             sitio, importación, proyectos y editor
```

</details>

## Privacidad

> Tus videos se procesan por completo en tu equipo. Nada se sube a ningún servidor, ni mientras editas ni al exportar. No hay cuentas, ni seguimiento, ni analítica. Los proyectos que guardas viven en el almacenamiento de tu navegador, y borrarlos desde la aplicación los elimina de verdad.

## Contribuir

Los reportes de errores y las ideas son bienvenidos en los [issues](https://github.com/Cris223511/video-editor/issues). Para aportar código, abre un *pull request*. El proyecto se ejecuta con `npm install` y `npm run dev`, sin configuración adicional.

## Licencia

**MIT** © [Cris223511](https://github.com/Cris223511). El texto completo está en [LICENSE](LICENSE).
