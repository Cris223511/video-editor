<p align="center">
  <img src="public/logo.jpg" alt="logo de Video Editor" width="120">
</p>

<h1 align="center">Video Editor</h1>

<p align="center">
  <b>Editor de video que funciona por completo en el navegador.</b> Recorta y une clips, añade texto,
  imágenes, figuras y censura en movimiento, ajusta el tono y exporta sin perder calidad ni fotogramas.
  <i>Sin instalar nada y sin que tus videos salgan de tu equipo.</i>
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

---

## Demo en vivo

Video Editor se usa **directamente en el navegador**, sin instalar nada. La versión de producción, desplegada en Vercel, vive aquí:

| Versión | Enlace | Estado |
| ------- | ------ | ------ |
| 0.1.0 | _pendiente de despliegue_ | Próximamente |

> En cuanto esté en línea, el enlace aparecerá en esta tabla y podrás probarlo con un solo clic. Los cambios de cada versión están en el [historial de cambios](CHANGELOG.md).

## Por qué

Editar un video corto **no debería** obligarte a instalar un programa pesado, crear una cuenta ni subir tu material a la nube de alguien más. Las herramientas de escritorio son potentes, pero ocupan gigas y cuesta aprenderlas; las de la web suelen pedir suscripción, añadir una marca de agua o procesar los videos en sus servidores.

Video Editor hace **todo el trabajo dentro del navegador**: importas, editas y exportas sin que un solo fotograma salga de tu equipo. Es gratis, de código abierto y *sin funciones de pago escondidas*.

> Proyecto en desarrollo activo. El flujo completo de importar, editar y exportar ya funciona, y se pule poco a poco.

## Características

### Importación y medios

- **Importación con validación.** Arrastras o eliges videos e imágenes, y antes de sumarlos al proyecto se comprueba su *tipo, tamaño y firma real*, no solo la extensión.
- **Biblioteca de medios.** Los archivos importados quedan a un lado, listos para llevarlos a la línea de tiempo cuando los necesites.

### Línea de tiempo

- **Clips de video.** Recorta, une y reordena clips en la pista. La tecla `S` divide el clip por donde esté el cabezal.
- **Transiciones** entre clips, para que el corte no sea seco.
- **Capas y audio en su propia pista.** Cada elemento tiene su bloque y su *rango de tiempo*, así aparece y desaparece cuando corresponde.

### Capas y anotaciones

- **Texto** con un editor completo: tipografía, tamaño, color, alineación y más.
- **Imágenes y logos** superpuestos, con **opacidad** regulable.
- **Figuras** geométricas, con la opción de *bloques difuminados*.
- **Marco** decorativo alrededor del video.
- **Lienzo y fondo** editables cuando el video no llena todo el cuadro.

### Censura en movimiento

- **Censura que sigue al objeto.** Pixelado, difuminado, transparencia o máscaras que se mueven con **fotogramas clave**, para tapar una cara o una placa *aunque se desplacen por la escena*.

### Ajustes del video

- **Velocidad** del clip, para acelerarlo o ralentizarlo.
- **Tono** al estilo de una corrección de color: exposición, contraste, temperatura y saturación.
- **Audio.** Silencia una pista o sube el volumen *hasta el 200 %*.

### Exportación

- **Exportación dentro del navegador.** El proyecto se reproduce dibujando cada fotograma en un lienzo a la resolución elegida, se mezcla el audio y se graba todo junto a una tasa de bits alta. **No se pierde la resolución ni los FPS**, y el audio queda sincronizado. Al hacerse en tiempo real, un video de un minuto tarda alrededor de un minuto en exportarse.

### Interfaz

- **Tema claro y oscuro,** con el modo oscuro por defecto.
- **Panel de opciones contextual** a la izquierda: cada herramienta muestra solo sus controles.
- **Todo local:** *sin cuentas, sin marcas de agua, sin funciones de pago.*

## Atajos de teclado

| Acción | Atajo |
| ------ | ----- |
| Reproducir o pausar | `Barra espaciadora` |
| Dividir en el cabezal | `S` |
| Borrar lo seleccionado (clip, capa o región de audio) | `Supr` o `Retroceso` |

## Ejecutar en local

Solo hace falta **Node.js 18** o superior.

```
npm install
npm run dev
```

Vite levanta la aplicación en `http://localhost:5173`.

## Comandos

| Comando | Qué hace |
| ------- | -------- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Comprueba los tipos y genera la versión de producción en `dist`. |
| `npm run preview` | Sirve en local el resultado del build. |

## Tecnologías

| Componente | Herramienta | Para qué se usa |
| ---------- | ----------- | --------------- |
| Interfaz | [React 18](https://react.dev/) y [TypeScript](https://www.typescriptlang.org/) | La aplicación y sus componentes, con tipado estricto |
| Empaquetado | [Vite](https://vite.dev/) | Servidor de desarrollo y build de producción |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) | El diseño y el tema claro u oscuro |
| Estado | [Zustand](https://zustand-demo.pmnd.rs/) | El estado del proyecto, el editor y la vista |
| Exportación | Canvas, Web Audio y MediaRecorder | Render y grabación del video, todo en el navegador |

El motor de edición (validación, análisis de medios, render y exportación) vive en `src/lib`, **separado de la interfaz** de `src/components` y `src/features`, para que la lógica no dependa de React.

## Estructura del proyecto

```
video-editor/
├── index.html
├── vite.config.ts            cabeceras COOP/COEP por si más adelante se usa WebCodecs
├── vercel.json               las mismas cabeceras en producción
├── tailwind.config.js
└── src/
    ├── main.tsx              punto de entrada
    ├── App.tsx               raíz y decisión de vista (importar o editor)
    ├── index.css             tokens del tema y estilos base
    ├── config/               límites y formatos aceptados
    ├── types/                tipos del dominio (medios, capas, audio, marco, tiempo)
    ├── lib/                  motor sin dependencia de react
    │   ├── validation/       validación de archivos (tipo, tamaño, firma)
    │   ├── media/            análisis de video y miniatura
    │   ├── layers/           capas, movimiento y geometría
    │   ├── color/            corrección de tono
    │   ├── audio/            mezcla de audio
    │   ├── timeline/         cálculos de la línea de tiempo
    │   ├── export/           compositor y exportación
    │   └── format/           utilidades de formato
    ├── store/               estado global (tema, proyecto, editor, vista)
    ├── components/
    │   ├── ui/               iconos, avisos, controles, tema
    │   └── layout/           barra superior
    └── features/
        ├── import/           pantalla de importación
        └── editor/           visor, panel de opciones, línea de tiempo y exportación
```

## Privacidad

> **Tus videos se procesan por completo en tu equipo.** Nada se sube a ningún servidor, ni mientras editas ni al exportar. La aplicación **no recopila datos**.

## Contribuir

Los reportes de errores y las ideas son bienvenidos en los [issues](https://github.com/Cris223511/video-editor/issues). Para aportar código, abre un *pull request*. El proyecto se ejecuta con `npm install` y `npm run dev`, sin ninguna configuración adicional.

## Licencia

**MIT** © [Cris223511](https://github.com/Cris223511). Puedes usarlo, modificarlo y compartirlo con libertad. El texto completo está en el archivo [LICENSE](LICENSE).

*Si el proyecto te resulta útil, una estrella en el repositorio ayuda a que más personas lo encuentren.*
