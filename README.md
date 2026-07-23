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

Video Editor monta un video de principio a fin desde el navegador. Importas, cortas, corriges el color, censuras lo que se mueve, añades texto, imágenes, figuras y audio, y exportas el archivo terminado. Todo el procesamiento ocurre en tu equipo.

| | |
| --- | --- |
| **Sin instalar** | Se abre en el navegador, sin descargas ni permisos. |
| **Privado** | Ningún fotograma se sube a ningún servidor. |
| **Gratis y abierto** | Licencia MIT, sin marcas de agua ni funciones de pago. |
| **Para el día a día** | Un recorte con música, una pieza vertical, un tutorial, tapar una cara o una matrícula. |

## Qué puedes hacer

| Área | Resumen |
| --- | --- |
| **Importar** | Video (MP4, WebM, MOV, MKV, M4V, OGV, hasta 1,5 GB), imágenes (PNG, JPG, WebP, GIF, AVIF y más) y audio (MP3, WAV, OGG, M4A, FLAC, OPUS…). Se valida tipo, tamaño y firma binaria real, no solo la extensión. |
| **Línea de tiempo** | Hasta seis niveles de video y carriles propios para texto y figuras, imágenes y audio. Cada carril con varias filas, alto ajustable y nombre editable. Recorte no destructivo, división en el cabezal, imantado, velocidad de 0,25x a 4x y cierre de huecos. |
| **Transiciones** | Veintiuna transiciones en cinco familias, para clips y para cualquier elemento (texto, figura, imagen, dibujo). Duración editable desde la propia línea de tiempo. |
| **Color** | Tres ruedas por zona tonal, cuatro curvas por canal y ajustes de exposición, contraste, saturación, temperatura y tinte. En clips e imágenes. |
| **Efectos** | Desenfoque de movimiento y una cadena de efectos por clip, con la opción de que el color y los efectos aparezcan de forma progresiva. |
| **Censura en movimiento** | Círculo, rectángulo o pincel libre; pixelar, difuminar o tapar; recorrido grabado con el cursor y editable nodo a nodo, con cámara lenta al grabar. |
| **Capas** | Texto con tipografía, contorno, sombra y neón; imágenes con recorte y color; figuras; dibujo a mano alzada; y diez marcos decorativos del lienzo. |
| **Audio** | Volumen general, franjas de volumen por tramos y separación del audio de un video a su propia pista. |
| **Lienzo** | Seis proporciones o ajuste automático, con relleno de bandas por color o por el propio video ampliado y desenfocado. |
| **Exportar** | Render en el navegador a 24, 30 o 60 fps, MP4 (H.264/AAC) con respaldo en WebM, con progreso y cancelación. |
| **Proyectos** | Guardado automático en el navegador con los videos incluidos, listado con buscador y paginación, y exportación a un archivo `.veproj`. |

### Detalles que marcan la diferencia

- **Lo que ves es lo que exportas.** El visor y el exportador comparten el mismo motor de color, transiciones y compositor, así que el archivo final coincide con lo que montaste.
- **Transiciones para cualquier elemento.** Un título o una imagen entran con la misma galería que los clips, con su duración propia y su cuña en la línea de tiempo.
- **Movimiento en cualquier capa.** El recorrido grabado con el cursor no es solo para la censura: textos, imágenes, figuras y dibujos se animan con los mismos controles.
- **Zoom en el visor.** Con Ctrl y la rueda del ratón te acercas sobre el punto del cursor para colocar una censura o un texto pequeño con precisión.
- **Guardado sin pensarlo.** Cualquier cambio se guarda solo alrededor de un segundo después, con los videos dentro y sin salir del equipo.

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

Requiere **Node.js 18** o superior.

```bash
npm install
npm run dev
```

Vite levanta la aplicación en `http://localhost:5173`.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Comprueba los tipos y genera la versión de producción en `dist`. |
| `npm run preview` | Sirve en local el resultado del build. |

## Tecnologías

| Componente | Herramienta |
| --- | --- |
| Interfaz | [React 18](https://react.dev/) y [TypeScript 5](https://www.typescriptlang.org/) |
| Empaquetado | [Vite 5](https://vite.dev/) |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) |
| Estado | [Zustand](https://zustand-demo.pmnd.rs/) |
| Navegación | [React Router](https://reactrouter.com/) |
| Animación | [Framer Motion](https://www.framer.com/motion/) y [Lenis](https://lenis.darkroom.engineering/) |
| Componentes | [Radix UI](https://www.radix-ui.com/), [Embla](https://www.embla-carousel.com/), [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) |
| Exportación | Canvas, Web Audio y MediaRecorder |
| Almacenamiento | IndexedDB |

El motor de edición (validación, medios, color, transiciones, compositor y exportación) vive en `src/lib`, separado de la interfaz, para que la lógica no dependa de React.

<details>
<summary><b>Estructura del proyecto</b></summary>

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
