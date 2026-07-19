<p align="center">
  <img src="public/logo.png" alt="logo de Video Editor" width="120">
</p>

<h1 align="center">Video Editor</h1>

<p align="center">
  <b>Editor de video que funciona por completo en el navegador.</b> Monta la línea de tiempo con
  varios niveles, corrige el color con ruedas y curvas, censura lo que se mueve, añade texto,
  imágenes y figuras, y exporta el archivo terminado.
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

Video Editor se usa **directamente en el navegador**, sin instalar nada:

| Versión | Enlace | Estado |
| ------- | ------ | ------ |
| 2.0.0 | **[video-editor-plus.vercel.app](https://video-editor-plus.vercel.app)** | Disponible |

> Ábrelo y empieza a editar, no hace falta cuenta ni descarga. Los cambios de cada versión están en el [historial de cambios](CHANGELOG.md).

## Por qué

Editar un video corto **no debería** obligarte a instalar un programa pesado, crear una cuenta ni subir tu material a la nube de alguien más. Las herramientas de escritorio son potentes, pero ocupan gigas y cuesta aprenderlas; las de la web suelen pedir suscripción, añadir una marca de agua o procesar los videos en sus servidores.

Video Editor hace **todo el trabajo dentro del navegador**: importas, editas y exportas sin que un solo fotograma salga de tu equipo. Es gratis, de código abierto y *sin funciones de pago escondidas*.

### Para quién es

Para quien necesita resolver un video concreto y quiere terminarlo hoy: un recorte con música, una pieza vertical para redes, un tutorial grabado de pantalla, una entrevista donde hay que tapar una cara o una matrícula. No sustituye a una suite profesional de escritorio, y tampoco lo pretende. Cubre el trabajo corriente sin pedir nada a cambio.

## Características

### Importación y medios

- **Importación con validación:** arrastras o eliges videos e imágenes, y antes de sumarlos al proyecto se comprueba su tipo, su tamaño y su *firma binaria real*, no solo la extensión. Los formatos aceptados son MP4, WebM, MOV, MKV, AVI, M4V y OGV, con un tope de 1,5 GB por archivo.
- **Biblioteca de medios:** los archivos importados quedan a un lado con su miniatura, su resolución, su duración y su peso, listos para llevarlos a la línea de tiempo cuando los necesites.
- **Sin límite de cantidad:** el proyecto admite tantos medios como aguante tu equipo, igual que un editor de escritorio.

### Línea de tiempo

- **Hasta seis niveles de video:** los clips se apilan en pistas independientes y se arrastran de una a otra sin perder su sitio en el tiempo. El nivel de arriba es el que se ve, y cada uno ajusta su altura tirando de su borde inferior.
- **Recorte y división:** ajusta la entrada y la salida de cada clip tirando de sus bordes, o parte el clip por donde esté el cabezal. El recorte no es destructivo, así que el material que dejaste fuera sigue disponible si cambias de idea.
- **Imantado al arrastrar:** los clips se pegan al inicio, al cabezal y a los bordes de los demás clips, capas y franjas de audio, así encajan sin dejar milésimas de hueco.
- **Velocidad por clip:** de 0,25x a 4x, con ajustes rápidos para los valores de siempre. El clip conserva el mismo trozo de video y lo que ocupa en la pista se recalcula solo.
- **Cierre de espacios vacíos:** cuando queda un hueco entre dos clips se marca con borde discontinuo, y al cerrarlo todo lo que venía detrás en ese nivel se adelanta justo lo que medía. Los demás niveles no se tocan, para no romper la sincronía.
- **Guías de alineación:** al mover una capa sobre el visor aparecen guías que la imantan al centro y a los bordes del lienzo, y también a los de las demás capas. Con **Alt** el imantado se desactiva, por si hace falta colocar algo justo al lado de una guía.
- **Zoom de la línea de tiempo:** acerca para trabajar al detalle o aleja para ver el montaje entero, con los botones, con las teclas o con **Ctrl** y la rueda del ratón, que mantiene fijo el segundo que hay bajo el cursor.
- **Tira de fotogramas:** cada clip muestra su contenido en miniaturas repartidas a lo largo de su duración, no una sola imagen estirada, así se reconoce de un vistazo sin tener que reproducirlo.

### Transiciones

Hay **veintiuna transiciones**, repartidas en cinco familias y descritas como datos en un único catálogo. Eso es lo que garantiza que lo que ves al editar sea idéntico a lo que sale exportado, porque el visor y el compositor ejecutan el mismo motor.

- **Sin transición:** el corte seco, un plano entra justo donde acaba el anterior.
- **Atenuaciones:** fundido con el plano anterior, fundido a negro y fundido a blanco.
- **Barridos:** a la derecha, a la izquierda, hacia arriba, hacia abajo y en diagonal, con el borde del recorte ligeramente difuminado para que no se vea barato.
- **Formas y aperturas:** persianas, puertas horizontales, puertas verticales, barrido circular, rombo y tercios.
- **Zooms y empujes:** empujar en las cuatro direcciones, acercar y alejar.

La galería lleva buscador propio, que ignora mayúsculas y tildes porque es como la gente escribe de verdad, y cada muestra ejecuta la transición de verdad al pasar el cursor por encima. La duración va de 0,2 a 2 segundos y también se ajusta tirando del borde de la transición en la propia línea de tiempo.

### Corrección de color

- **Ruedas por zona tonal:** tres ruedas independientes para sombras, medios y luces. Arrastras hacia el color que quieras dar a cada zona, con **Shift** afinas el movimiento y con doble clic la rueda vuelve al centro.
- **Curvas por canal:** cuatro curvas editables, una maestra de luz y una por cada canal de rojo, verde y azul. Se añaden puntos con un clic, se doblan arrastrando y se quitan con doble clic.
- **Ajustes de tono:** exposición, contraste, saturación, temperatura y tinte, todos de -100 a 100.

Todo se aplica en vivo sobre el visor y llega igual al archivo exportado, porque las ruedas viajan como curva por canal en lugar de recalcularse aparte.

### Censura en movimiento

- **Tres formas:** círculo, rectángulo o pincel libre, con el que dibujas la máscara sobre el propio video y decides el grosor del trazo.
- **Tres efectos:** pixelar, difuminar o tapar del todo, con la intensidad regulable en los dos primeros.
- **Recorrido grabado con el cursor:** reproduces el video y arrastras el elemento siguiendo lo que quieres tapar. Cada instante queda guardado como un punto.
- **Cámara lenta al grabar:** el video se puede reproducir a mitad o a un cuarto de velocidad mientras dura la grabación, que es lo que permite seguir una cara o una matrícula que se mueve rápido. El recorrido se guarda en el tiempo real del video, no en el ralentizado.
- **Recorrido editable:** el trazado se dibuja sobre el visor y cualquier nodo se arrastra para corregir por dónde pasa, o se borra con doble clic. También se añade un punto suelto en la posición del cabezal.

El movimiento no es exclusivo de la censura: los textos, las imágenes y las figuras se animan con los mismos controles.

### Capas sobre el video

- **Texto:** contenido, doce tipografías que se previsualizan escritas con su propia letra, tamaño de 8 a 400 px, negrita, cursiva, subrayado, alineación, color y opacidad. Además admite fondo propio con su color y su opacidad, contorno con color y grosor, y sombra.
- **Imágenes:** logos y fotos superpuestos, con tamaño del 3 al 200 % del ancho del lienzo, recorte independiente por cada uno de los cuatro lados y opacidad regulable. Se aceptan PNG, JPG, WebP, GIF, BMP y AVIF hasta 20 MB, comprobando también su firma binaria.
- **Figuras:** rectángulo, redondeado, elipse, triángulo, estrella, línea y flecha, con relleno y borde independientes, o color y grosor en el caso de la línea y la flecha.
- **Marco:** diez estilos decorativos alrededor del video, entre ellos sólido, doble, discontinuo, punteado, redondeado con radio ajustable, sombra, neón, degradado, viñeta y polaroid.

Cada capa se mueve y se redimensiona con ocho tiradores en el visor, manteniendo la proporción si pulsas **Shift**, y en la línea de tiempo se decide de qué segundo a qué segundo aparece.

### Audio

- **Volumen general** del proyecto, de 0 a 200 %, con un botón de silencio que recuerda el nivel anterior.
- **Franjas de volumen:** añades un tramo, lo colocas y lo recortas en la línea de tiempo, y le das su propia ganancia entre 0 y 200 %. Sirve para bajar la música justo donde alguien habla, o para silenciar solo un fragmento.

### Lienzo

- **Seis proporciones:** 16:9, 9:16, 1:1, 4:5, 4:3 y 3:4, o el ajuste automático a las medidas del primer video.
- **Relleno de las bandas:** cuando el video no cubre todo el lienzo, las zonas sobrantes se rellenan con un color a elegir o con el propio video ampliado y desenfocado, con el nivel de desenfoque regulable. Es lo habitual para colocar una toma vertical en un lienzo apaisado sin dejar dos franjas planas.

### Exportación

- **Todo dentro del navegador:** el proyecto se reproduce dibujando cada fotograma en un lienzo a la resolución elegida, se mezcla el audio con Web Audio y se graba todo junto con MediaRecorder.
- **Formato según el navegador:** se prefiere MP4 con H.264 y AAC, y si el navegador no lo admite se cae a WebM con VP9 u VP8. El archivo se descarga solo al terminar.
- **24, 30 o 60 imágenes por segundo,** a elegir antes de empezar.
- **Sin perder calidad:** la tasa de bits se calcula a partir de la resolución, con un techo de 40 Mbps, y el audio queda sincronizado.
- **Progreso y cancelación:** se ve el avance en porcentaje y se puede parar a mitad. Al hacerse en tiempo real, un video de un minuto tarda alrededor de un minuto en exportarse.

### Proyectos guardados

- **Guardado en el propio navegador:** los proyectos viven en IndexedDB con sus videos incluidos, no como texto, así que no se pierden al cerrar la pestaña. El proyecto conserva su identidad entre guardados, de modo que volver a guardar actualiza el mismo en lugar de ir dejando copias.
- **Autoguardado** a los cuatro segundos del último cambio que importe, con un aviso en la barra superior cuando quedan cambios pendientes y otro antes de cerrar la pestaña. Mover el cabezal o cambiar de herramienta no dispara un guardado.
- **Descarga e importación:** un proyecto se empaqueta en un archivo `.veproj` con sus medios dentro, listo para llevarlo a otro equipo y volver a abrirlo. Al importarlo recibe una identidad nueva, así traerlo dos veces no pisa lo que ya tenías.
- **Listado con buscador,** que ignora mayúsculas y tildes, cuatro criterios de orden (más reciente, más antiguo y por nombre en los dos sentidos) y paginación de seis en seis. Cada tarjeta muestra portada, duración, número de medios y las fechas de creación y última edición.
- **Duplicar, descargar y borrar** desde la propia tarjeta, con confirmación antes de eliminar porque se van también los videos guardados.
- **Ficha de detalles:** cada proyecto abre una ficha con lo que se sabe de él y de sus archivos, desde los clips, los niveles y las capas hasta la resolución y la proporción de salida, el espacio ocupado y, por cada medio, sus dimensiones, orientación, duración, formato y megapíxeles.
- **Dirección propia:** cada proyecto abierto tiene su enlace, así que se puede recargar la página o guardar el marcador sin perder en cuál estabas trabajando.
- **Aviso de espacio:** la aplicación consulta cuánto reserva el navegador en el equipo y cuánto llevas usado, para avisar antes de que un guardado se rechace por falta de sitio.

### Sitio de presentación

La aplicación no arranca en el editor, sino en un sitio que explica lo que hace y deja probarlo antes de importar nada.

- **Portada con demostraciones que funcionan de verdad:** las ruedas de color, ocho de las veintiuna transiciones, la censura con su recuadro arrastrable, los controles del visor y el cambio de proporción del lienzo. No son videos grabados, ejecutan el mismo motor que el editor.
- **Recorrido por las herramientas,** que van pasando solas hasta que tocas una, con el montaje y la exportación representados en maquetas animadas.
- **Preguntas frecuentes** y el paso a paso de cómo se monta un video de principio a fin.
- **Manual de uso** en su propia página, con el montaje, el color, las capas, la censura, el guardado y la exportación explicados paso a paso, además de la tabla de atajos.
- **Términos y condiciones** y **política de privacidad,** escritas para entenderse leyéndolas una vez, con índice lateral que se genera a partir de las propias secciones y va marcando por dónde vas leyendo.

### Interfaz

- **Tema claro y oscuro,** con el claro por defecto y un fundido entre ambos en lugar de un salto seco.
- **Once herramientas** en un riel lateral fijo: proyecto, propiedades, lienzo, marco, texto, imagen, figura, audio, censura, velocidad y tono. Sigue visible aunque pliegues el panel.
- **Panel de opciones contextual:** cada herramienta muestra solo sus controles, y lo que ajustas se ve en el visor mientras lo mueves. Seleccionar un clip, una capa o una franja abre directamente su herramienta.
- **Paneles ajustables,** para dar más sitio al visor o a la línea de tiempo según lo que estés haciendo.
- **Todo local:** *sin cuentas, sin marcas de agua, sin funciones de pago.*

## Atajos de teclado

| Acción | Atajo |
| ------ | ----- |
| Reproducir o pausar | `Barra espaciadora` |
| Dividir en el cabezal | `S` |
| Borrar lo seleccionado (clip, capa o franja de audio) | `Supr` o `Retroceso` |
| Mover el cabezal un fotograma | `←` y `→` |
| Mover el cabezal un segundo | `Shift` + `←` o `→` |
| Ir al principio o al final | `Inicio` y `Fin` |
| Acercar o alejar la línea de tiempo | `+` y `-`, o `Ctrl` + rueda del ratón |
| Soltar la selección | `Esc` |
| Guardar el proyecto | `Ctrl+S` |

Mientras escribes en un campo de texto los atajos no se disparan, así que la barra espaciadora escribe un espacio en lugar de partir el video.

## Requisitos

Un navegador de escritorio reciente basado en Chromium o en Firefox. No hace falta instalar nada, ni conceder permisos, ni mantener la conexión una vez cargada la página. Para guardar proyectos conviene tener espacio libre en disco, porque incluyen los videos completos.

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
| Interfaz | [React 18](https://react.dev/) y [TypeScript 5](https://www.typescriptlang.org/) | La aplicación y sus componentes, con tipado estricto |
| Empaquetado | [Vite 5](https://vite.dev/) | Servidor de desarrollo y build de producción |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) | El diseño y el tema claro u oscuro |
| Estado | [Zustand](https://zustand-demo.pmnd.rs/) | El estado del proyecto, el editor, el tema y la vista |
| Navegación | [React Router](https://reactrouter.com/) | Una dirección por vista, recargable y compartible |
| Animación | [Framer Motion](https://www.framer.com/motion/) y [Lenis](https://lenis.darkroom.engineering/) | Las transiciones de la interfaz y el desplazamiento suave del sitio |
| Componentes | [Radix UI](https://www.radix-ui.com/), [Embla](https://www.embla-carousel.com/), [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) | Diálogos, acordeones, menús, carruseles y paneles ajustables |
| Detalles de UI | [lucide-react](https://lucide.dev/), [react-colorful](https://omgovich.github.io/react-colorful/), [Sonner](https://sonner.emilkowal.ski/) | Iconos vectoriales, selectores de color y avisos |
| Tipografías | Inter y Plus Jakarta Sans | Servidas desde el propio paquete, sin pedirlas a terceros |
| Exportación | Canvas, Web Audio y MediaRecorder | Render y grabación del video, todo en el navegador |
| Almacenamiento | IndexedDB | Los proyectos guardados con sus medios |

El motor de edición (validación, análisis de medios, color, transiciones, compositor y exportación) vive en `src/lib`, **separado de la interfaz** de `src/components` y `src/features`, para que la lógica no dependa de React.

## Estructura del proyecto

```
video-editor/
├── index.html
├── vite.config.ts            cabeceras COOP/COEP por si más adelante se usa WebCodecs
├── vercel.json               las mismas cabeceras en producción
├── tailwind.config.js
└── src/
    ├── main.tsx              punto de entrada
    ├── App.tsx               raíz de la aplicación
    ├── rutas.tsx             enrutador y direcciones de cada vista
    ├── rutasDef.ts           las direcciones en un solo sitio
    ├── index.css             tokens del tema y estilos base
    ├── config/               versión, límites y formatos aceptados
    ├── types/                tipos del dominio (medios, capas, audio, marco, tiempo)
    ├── lib/                  motor sin dependencia de react
    │   ├── validation/       validación de archivos (tipo, tamaño, firma)
    │   ├── media/            análisis de video y miniaturas
    │   ├── layers/           capas, movimiento, geometría y guías
    │   ├── color/            ruedas, curvas y ajustes de tono
    │   ├── transiciones/     catálogo, motor y pintado
    │   ├── audio/            ganancia por franjas
    │   ├── timeline/         cálculos de la línea de tiempo
    │   ├── proyecto/         almacén, empaquetado y sesión
    │   ├── export/           compositor y exportación
    │   ├── scroll/           desplazamiento suave del sitio
    │   └── format/           utilidades de formato
    ├── store/                estado global (tema, proyecto, editor, vista)
    ├── components/
    │   ├── ui/               iconos, avisos, controles, ruedas y curvas
    │   ├── sitio/            piezas y demostraciones de la presentación
    │   └── layout/           barra superior, navegación y pie
    └── features/
        ├── sitio/            portada, manual, legales y página no encontrada
        ├── import/           pantalla de importación
        ├── proyectos/        listado y ficha de los proyectos guardados
        └── editor/           visor, paneles, línea de tiempo y exportación
```

## Privacidad

> **Tus videos se procesan por completo en tu equipo.** Nada se sube a ningún servidor, ni mientras editas ni al exportar. No hay cuentas, ni seguimiento, ni analítica. Los proyectos que guardas se quedan en el almacenamiento de tu propio navegador, y borrarlos desde la aplicación los elimina de verdad.

## Contribuir

Los reportes de errores y las ideas son bienvenidos en los [issues](https://github.com/Cris223511/video-editor/issues). Para aportar código, abre un *pull request*. El proyecto se ejecuta con `npm install` y `npm run dev`, sin ninguna configuración adicional.

## Licencia

**MIT** © [Cris223511](https://github.com/Cris223511). Puedes usarlo, modificarlo y compartirlo con libertad. El texto completo está en el archivo [LICENSE](LICENSE).

*Si el proyecto te resulta útil, una estrella en el repositorio ayuda a que más personas lo encuentren.*
