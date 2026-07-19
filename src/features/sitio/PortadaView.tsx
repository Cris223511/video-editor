import {
  ArrowRight,
  Crop,
  Download,
  Gauge,
  Keyboard,
  Layers,
  MonitorPlay,
  Palette,
  PlayCircle,
  Save,
  Scissors,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { RUTAS } from '../../rutasDef'
import Titulo from '../../components/sitio/Titulo'
import Aparece, { Parallax } from '../../components/sitio/Aparece'
import MedioHover from '../../components/sitio/MedioHover'
import Destello, { Anillos, Subrayado } from '../../components/sitio/Destello'
import Carrusel from '../../components/sitio/Carrusel'
import Pestanas from '../../components/sitio/Pestanas'
import Preguntas from '../../components/sitio/Preguntas'
import DemoColor from '../../components/sitio/DemoColor'
import DemoTransiciones from '../../components/sitio/DemoTransiciones'
import DemoCensura from '../../components/sitio/DemoCensura'
import DemoLienzo from '../../components/sitio/DemoLienzo'
import DemoMontaje from '../../components/sitio/DemoMontaje'
import DemoCaracteristicas from '../../components/sitio/DemoCaracteristicas'
import DemoVideo from '../../components/sitio/DemoVideo'
import { MaquetaLineaTiempo } from '../../components/sitio/MaquetaEditor'
import MaquetaExporta from '../../components/sitio/MaquetaExporta'
import { Aviso, Chip, IconoCirculo, RejillaFondo, Tarjeta } from '../../components/sitio/Piezas'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'

// piezas de Unsplash y Pexels, verificadas una a una. van con parámetros de
// tamaño para no descargar originales de varios megas en una presentación
const MEDIOS = {
  // el banner solo lleva foto: no hay campo de video a propósito, para que no
  // vuelva a colarse un plano que no pinta nada en una pieza sobre montaje
  montaje: {
    imagen:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=70',
  },
  equipo: {
    imagen:
      'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=900&q=70',
    // comprobado que responde: Pexels bloquea el enlace directo de la mayoría de
    // sus videos, así que solo se usan los que devuelven contenido de verdad
    video: 'https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4',
  },
}

// cifras del banner. son datos reales de lo construido, no promesas
const DATOS = [
  { cifra: '21', pie: 'transiciones' },
  { cifra: '6', pie: 'niveles de video' },
  { cifra: '60 fps', pie: 'al exportar' },
  { cifra: '0', pie: 'archivos subidos' },
]

const CAPACIDADES = [
  {
    icono: <Layers size={20} />,
    titulo: 'Varios niveles de video',
    texto:
      'Apila clips en pistas independientes y decide cuál se ve encima. Cada nivel tiene su altura y los clips se arrastran de uno a otro sin perder su sitio en el tiempo.',
  },
  {
    icono: <Palette size={20} />,
    titulo: 'Corrección de color real',
    texto:
      'Tres ruedas para sombras, medios y luces, más cuatro curvas editables. Todo se aplica con aceleración por hardware y llega igual al archivo que exportas.',
  },
  {
    icono: <MonitorPlay size={20} />,
    titulo: 'Nada sale de tu equipo',
    texto:
      'El video se procesa en tu navegador. No hay servidor que reciba tus archivos, ni al editar ni al exportar el resultado final.',
  },
  {
    icono: <Save size={20} />,
    titulo: 'Proyectos que continúan',
    texto:
      'Guarda el montaje con sus videos dentro y retómalo cuando quieras. Se guarda solo unos segundos después de cada cambio, y puedes descargarlo como archivo.',
  },
]

// las siete características que se recorren en la sección del editor. el `id`
// decide qué demostración animada se dibuja al elegir cada una
const HERRAMIENTAS = [
  {
    id: 'recorte',
    icono: <Scissors size={17} />,
    titulo: 'Recorte y división',
    texto:
      'Corta un clip por el cabezal, ajusta sus bordes con el ratón y cierra los espacios vacíos que queden entre planos con un solo botón.',
  },
  {
    id: 'censura',
    icono: <Wand2 size={17} />,
    titulo: 'Censura en movimiento',
    texto:
      'Pixela o desenfoca una cara y graba el recorrido que sigue. Luego retocas cada punto del trazo hasta que encaje con el movimiento real.',
  },
  {
    id: 'texto',
    icono: <Sparkles size={17} />,
    titulo: 'Texto, figuras y marcas',
    texto:
      'Añade rótulos con contorno y sombra, figuras geométricas o tu logo. Todo se coloca sobre el lienzo con guías que lo alinean solo.',
  },
  {
    id: 'velocidad',
    icono: <Gauge size={17} />,
    titulo: 'Velocidad del clip',
    texto: 'Acelera o ralentiza un clip y la línea de tiempo se recalcula sola.',
  },
  {
    id: 'lienzo',
    icono: <Crop size={17} />,
    titulo: 'Lienzo y proporción',
    texto: 'Cambia la proporción y rellena las bandas con el video desenfocado.',
  },
  {
    id: 'audio',
    icono: <Volume2 size={17} />,
    titulo: 'Volumen y audio',
    texto: 'Ajusta el volumen general o por franjas de la línea de tiempo.',
  },
  {
    id: 'atajos',
    icono: <Keyboard size={17} />,
    titulo: 'Atajos de teclado',
    texto: 'Dividir, mover el cabezal, guardar y exportar desde el teclado.',
  },
]

const PASOS = [
  {
    n: '01',
    icono: <Upload size={19} />,
    titulo: 'Trae tu material',
    texto:
      'Arrastra los videos a la zona de carga o búscalos en el equipo. Se abren directamente desde tu disco, sin ninguna subida previa.',
  },
  {
    n: '02',
    icono: <Layers size={19} />,
    titulo: 'Monta la línea de tiempo',
    texto:
      'Coloca los clips, recórtalos, divídelos por el cabezal y repártelos en varios niveles hasta que el ritmo funcione.',
  },
  {
    n: '03',
    icono: <Palette size={19} />,
    titulo: 'Dale el acabado',
    texto:
      'Corrige el color, elige la transición de entrada de cada plano y añade texto, figuras o censura sobre lo que haga falta.',
  },
  {
    n: '04',
    icono: <Download size={19} />,
    titulo: 'Exporta el resultado',
    texto:
      'Elige los fotogramas por segundo y descarga el archivo terminado, sin marca de agua y sin límite de duración.',
  },
]

const FORMATOS = ['MP4', 'WebM', '1080p', '4K', '24 fps', '30 fps', '60 fps']

// portada del sitio. presenta qué hace el editor con ejemplos que se pueden
// tocar, y lleva a probarlo sin pedir registro en ningún punto
export default function PortadaView() {
  const navegar = useNavigate()
  const irAImportar = () => navegar(RUTAS.medios)

  return (
    <div>
      {/* banner superior */}
      <section className="relative overflow-hidden pb-16 pt-16 sm:pt-24">
        <RejillaFondo />
        <span className="pointer-events-none absolute right-[-14%] top-[-18%] hidden lg:block">
          <Anillos tamano={620} />
        </span>
        <Destello x="18%" y="18%" tamano={520} intensidad={0.34} />
        <Destello x="86%" y="52%" tamano={420} intensidad={0.24} />

        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <Chip destacado>Gratuito y de código abierto</Chip>
            <Titulo nivel="xl" como="h1" className="mt-4">
              Edita tu video sin salir <Subrayado>del navegador</Subrayado>
            </Titulo>
            <p className="mt-5 max-w-2xl text-entrada text-[color:var(--muted)]">
              Un editor completo que corre en tu equipo. Monta la línea de tiempo, ajusta el color,
              añade texto y efectos, y exporta el archivo terminado. Los videos no se suben a ningún
              servidor en ningún momento del proceso.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={irAImportar}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
              >
                Abrir el editor
              </button>
              <span className="text-sm text-[color:var(--muted)]">
                Sin cuenta, sin instalación, sin marca de agua.
              </span>
            </div>
          </Aparece>

          <Aparece retraso={0.15} className="mt-12 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <div
              className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-black"
              style={{ border: '1px solid rgb(var(--border) / 0.1)' }}
            >
              {/* aquí va una fotografía y nada más. cuando esto era un <video>
                  con la foto de cartel, en local se veía la imagen y en
                  producción entraba el video, que enseñaba una escena ajena al
                  editor */}
              <img
                src={MEDIOS.montaje.imagen}
                alt="Línea de tiempo de un montaje en marcha"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ filter: 'grayscale(0.55) brightness(0.8)' }}
              />
              {/* velo inferior, para que el texto se lea sea cual sea el
                  fotograma que toque */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgb(6 12 24 / 0.85) 0%, rgb(6 12 24 / 0.15) 55%, transparent 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="font-display text-sm font-bold text-white">
                  De los archivos sueltos al montaje terminado
                </p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  {DATOS.map((d) => (
                    <div key={d.pie}>
                      <p className="font-display text-base font-extrabold leading-none text-white">
                        {d.cifra}
                      </p>
                      <p className="mt-1 text-[10px] leading-tight text-white/60">{d.pie}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* la columna derecha lleva dos piezas apiladas. antes solo estaba la
                línea de tiempo, más baja que el video de al lado, y debajo quedaba
                un vacío que se veía desde lejos. la de exportar cierra el relato:
                el montaje se arma arriba y el archivo sale abajo */}
            {/* la separación va en un contenedor propio y no en la clase de
                Parallax: aquella se aplica al elemento de fuera, que envuelve a
                los hijos en otro más, así que el hueco entre las dos piezas nunca
                llegaba a aplicarse por mucho que se subiera */}
            <Parallax fuerza={26}>
              {/* la separación entre las dos piezas es la misma que la de la
                  rejilla que las contiene, para que el hueco horizontal y el
                  vertical se vean iguales */}
              <div className="flex flex-col gap-4">
                <MaquetaLineaTiempo />
                <MaquetaExporta />
              </div>
            </Parallax>
          </Aparece>
        </div>
      </section>

      {/* capacidades en carrusel */}
      <section className="relative py-20">
        <Destello x="50%" y="30%" tamano={520} intensidad={0.16} />
        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <Titulo centrado>
              Hecho para trabajar <Subrayado>sin fricción</Subrayado>
            </Titulo>
          </Aparece>
          <Aparece retraso={0.1} className="mt-8">
            <Carrusel>
              {CAPACIDADES.map((c) => (
                <Tarjeta key={c.titulo} hover className="h-full">
                  <IconoCirculo>{c.icono}</IconoCirculo>
                  <h3 className="mt-4 font-display text-titulo-md">{c.titulo}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{c.texto}</p>
                </Tarjeta>
              ))}
            </Carrusel>
          </Aparece>
        </div>
      </section>

      {/* representación de un montaje completo, sin título: la pieza habla sola */}
      <section className="relative py-16">
        <Destello x="50%" y="20%" tamano={520} intensidad={0.14} />
        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <DemoMontaje />
          </Aparece>
        </div>
      </section>

      {/* pruebas interactivas en pestañas: apiladas ocupaban media página y
          todas se leían igual */}
      <section className="relative py-20">
        <Destello x="72%" y="30%" tamano={480} intensidad={0.16} />
        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <Titulo centrado>
              Pruébalo <Subrayado>aquí mismo</Subrayado>
            </Titulo>
          </Aparece>
          <Aparece retraso={0.1} className="mt-8">
            <Pestanas
              pestanas={[
                {
                  id: 'color',
                  nombre: 'Color',
                  icono: <Palette size={15} />,
                  descripcion:
                    'Tres ruedas para sombras, medios y luces. Al arrastrar, el cursor se oculta y el movimiento se afina para elegir el tono con precisión.',
                  contenido: <DemoColor />,
                },
                {
                  id: 'transiciones',
                  nombre: 'Transiciones',
                  icono: <Sparkles size={15} />,
                  descripcion:
                    'Ocho de las veintiuna disponibles, una por familia. Ejecutan el mismo motor que aplica la transición a tu video y que genera el archivo al exportar.',
                  contenido: <DemoTransiciones />,
                },
                {
                  id: 'censura',
                  nombre: 'Censura',
                  icono: <Wand2 size={15} />,
                  descripcion:
                    'Pixelar, difuminar o tapar, en rectángulo o círculo. Arrastra el recuadro por dentro y estíralo por las esquinas.',
                  contenido: <DemoCensura />,
                },
                {
                  id: 'video',
                  nombre: 'Visor',
                  icono: <PlayCircle size={15} />,
                  descripcion:
                    'Los mismos controles con los que se revisa el montaje: reproducir, buscar por la barra, silenciar y cambiar el ritmo, incluida la cámara lenta que se usa al grabar recorridos.',
                  contenido: <DemoVideo />,
                },
                {
                  id: 'lienzo',
                  nombre: 'Lienzo',
                  icono: <Crop size={15} />,
                  descripcion:
                    'Cambia la proporción del proyecto y decide con qué se rellenan las bandas que el video no llega a cubrir.',
                  contenido: <DemoLienzo />,
                },
              ]}
            />
          </Aparece>
        </div>
      </section>

      {/* herramientas: se eligen de una lista y cada una enseña su propia
          demostración en movimiento, en vez de la rejilla plana con foto fija */}
      <section className="relative py-20">
        <Destello x="20%" y="35%" tamano={480} intensidad={0.14} />
        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <Titulo>
              Lo que encuentras <Subrayado>dentro del editor</Subrayado>
            </Titulo>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[color:var(--muted)]">
              Elige una herramienta de la lista y verás lo que hace. Van pasando solas hasta que
              toques una.
            </p>
          </Aparece>
          <Aparece retraso={0.1} className="mt-8">
            <DemoCaracteristicas items={HERRAMIENTAS} />
          </Aparece>
        </div>
      </section>

      {/* privacidad y formatos */}
      <section className="py-20">
        <div className={`mx-auto grid w-full ${ANCHO_CONTENIDO} ${RELLENO} items-center gap-10 lg:grid-cols-2`}>
          <Aparece>
            <Parallax fuerza={34}>
              <MedioHover
                imagen={MEDIOS.equipo.imagen}
                video={MEDIOS.equipo.video}
                alt="Vista aérea de la costa, con las olas rompiendo contra las rocas"
                proporcion="aspect-[5/4]"
              />
            </Parallax>
          </Aparece>
          <Aparece retraso={0.1}>
            <Titulo>
              Tus archivos se procesan <Subrayado>en tu equipo</Subrayado>
            </Titulo>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
              El montaje, los efectos y la exportación ocurren dentro de tu navegador. No existe una
              subida previa ni una cola de procesado en la nube, así que la única velocidad que
              cuenta es la de tu equipo y ningún tercero ve el material con el que trabajas.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted)]">
              Los proyectos que guardas también quedan en este navegador, con sus videos incluidos.
              Puedes descargarlos como archivo si quieres llevártelos a otro equipo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {FORMATOS.map((f) => (
                <Chip key={f}>{f}</Chip>
              ))}
            </div>
            <div className="mt-6">
              <Aviso titulo="Sin cuenta ni seguimiento">
                No hay registro, ni datos personales, ni medición de lo que haces. Abres la
                aplicación y empiezas a editar.
              </Aviso>
            </div>
          </Aparece>
        </div>
      </section>

      {/* cómo funciona, en cuatro pasos numerados */}
      <section className="relative py-20">
        <Destello x="15%" y="45%" tamano={440} intensidad={0.18} />
        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <Titulo centrado>
              Así se monta un video <Subrayado>de principio a fin</Subrayado>
            </Titulo>
          </Aparece>
          <div className="mx-auto mt-16 grid max-w-3xl gap-x-6 gap-y-12 sm:grid-cols-2">
            {PASOS.map((p, i) => (
              <Aparece key={p.n} retraso={i * 0.09} className="h-full">
                <div
                  className="group relative flex h-full flex-col rounded-2xl px-5 pb-6 pt-9 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                  style={{
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border) / 0.1)',
                  }}
                >
                  {/* el icono sobresale por arriba de la tarjeta. va quieto: la
                      flotación que tenía antes distraía de lo que cuenta el paso,
                      y con cuatro tarjetas seguidas el conjunto no paraba nunca */}
                  <span
                    className="absolute -top-6 left-5 grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg"
                    style={{
                      background:
                        'linear-gradient(140deg, rgb(var(--accent-boton)), rgb(var(--accent-soft)))',
                    }}
                  >
                    {p.icono}
                  </span>

                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-3 font-display text-4xl font-extrabold leading-none"
                    style={{ color: 'rgb(var(--accent) / 0.09)' }}
                  >
                    {p.n}
                  </span>

                  <span className="font-display text-[11px] font-extrabold tracking-wider text-brand">
                    PASO {p.n}
                  </span>
                  <h3 className="mt-1.5 font-display text-base font-bold leading-snug">
                    {p.titulo}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-[color:var(--muted)]">
                    {p.texto}
                  </p>
                </div>
              </Aparece>
            ))}
          </div>
        </div>
      </section>

      {/* preguntas frecuentes */}
      <section className="relative py-20">
        <Destello x="80%" y="30%" tamano={460} intensidad={0.16} />
        <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <Aparece>
            <Titulo centrado>
              Preguntas <Subrayado>frecuentes</Subrayado>
            </Titulo>
          </Aparece>
          <Aparece retraso={0.1} className="mx-auto mt-8 max-w-3xl">
            <Preguntas />
          </Aparece>
        </div>
      </section>

      {/* llamada final */}
      <section className="pb-20 pt-6">
        <Aparece className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO}`}>
          <div
            className="relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:py-20"
            style={{
              background:
                'linear-gradient(160deg, rgb(var(--profundo-2)) 0%, rgb(var(--profundo)) 60%)',
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgb(255 255 255 / 0.045) 1px, transparent 1px)',
                backgroundSize: '64px 100%',
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-full h-72 w-[36rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgb(var(--accent) / 0.38) 0%, transparent 70%)',
                filter: 'blur(52px)',
              }}
            />

            <h2 className="relative font-display text-titulo-lg text-white">
              Empieza a editar tu video ahora.
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/65">
              Arrastra un archivo y ponte a trabajar. No hay nada que instalar, ningún formulario
              que rellenar y ninguna marca de agua esperándote al final.
            </p>
            <button
              onClick={irAImportar}
              // al pasar el cursor sube un poco, igual que el botón del banner y
              // que los del resto del sitio. antes crecía, y ese zoom era el único
              // botón principal que reaccionaba de otra manera
              className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[color:rgb(var(--profundo))] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95"
            >
              Abrir el editor <ArrowRight size={16} />
            </button>
          </div>
        </Aparece>
      </section>
    </div>
  )
}
