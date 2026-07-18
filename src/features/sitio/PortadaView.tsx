import { Layers, MonitorPlay, Palette, Scissors, Sparkles, Wand2 } from 'lucide-react'
import Titulo from '../../components/sitio/Titulo'
import Aparece from '../../components/sitio/Aparece'
import MedioHover from '../../components/sitio/MedioHover'
import { MaquetaColor, MaquetaLineaTiempo } from '../../components/sitio/MaquetaEditor'
import { Aviso, Chip, IconoCirculo, RejillaFondo, Tarjeta } from '../../components/sitio/Piezas'
import { useNavigate } from 'react-router-dom'
import { RUTAS } from '../../rutas'

// piezas de Pexels y Unsplash. van con parámetros de tamaño para no descargar
// originales de varios megas en una página de presentación
const MEDIOS = {
  montaje: {
    imagen:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=70',
    video: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4',
  },
  color: {
    imagen:
      'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=900&q=70',
  },
  equipo: {
    imagen:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=70',
  },
}

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
]

const HERRAMIENTAS = [
  {
    icono: <Scissors size={17} />,
    titulo: 'Recorte y división',
    texto:
      'Corta un clip por el cabezal, ajusta sus bordes con el ratón y cierra los espacios vacíos que queden entre planos con un solo botón.',
  },
  {
    icono: <Wand2 size={17} />,
    titulo: 'Censura en movimiento',
    texto:
      'Pixela o desenfoca una cara y graba el recorrido que sigue. Luego retocas cada punto del trazo hasta que encaje con el movimiento real.',
  },
  {
    icono: <Sparkles size={17} />,
    titulo: 'Texto, figuras y marcas',
    texto:
      'Añade rótulos con contorno y sombra, figuras geométricas o tu logo. Todo se coloca sobre el lienzo con guías que lo alinean solo.',
  },
]

const FORMATOS = ['MP4', 'WebM', '1080p', '4K', '24 fps', '30 fps', '60 fps']

// portada del sitio. presenta qué hace el editor con ejemplos concretos y lleva
// a probarlo, sin pedir registro en ningún punto
export default function PortadaView() {
  const navegar = useNavigate()
  const irAImportar = () => navegar(RUTAS.medios)

  return (
    <div>
      {/* zona superior */}
      <section className="relative overflow-hidden px-5 pb-16 pt-16 sm:pt-24">
        <RejillaFondo />
        <div className="mx-auto w-full max-w-5xl">
          <Aparece>
            <Chip>Gratuito y de código abierto</Chip>
            <Titulo nivel="xl" como="h1" acento="del navegador." className="mt-4">
              Edita tu video sin salir
            </Titulo>
            <p className="mt-5 max-w-2xl text-entrada text-[color:var(--muted)]">
              Un editor completo que corre en tu equipo. Monta la línea de tiempo, corrige el color,
              censura lo que haga falta y exporta el archivo terminado. Los videos no se suben a
              ningún servidor en ningún momento del proceso.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={irAImportar}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-brand-dark active:scale-95"
              >
                Abrir el editor
              </button>
              <span className="text-sm text-[color:var(--muted)]">
                Sin cuenta, sin instalación, sin marca de agua.
              </span>
            </div>
          </Aparece>

          <Aparece retraso={0.15} className="mt-12 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <MedioHover
              imagen={MEDIOS.montaje.imagen}
              video={MEDIOS.montaje.video}
              alt="Mesa de montaje de video"
              proporcion="aspect-[16/10]"
            />
            <MaquetaLineaTiempo />
          </Aparece>
        </div>
      </section>

      {/* tres capacidades principales */}
      <section className="px-5 py-16">
        <div className="mx-auto grid w-full max-w-5xl gap-8 sm:grid-cols-3">
          {CAPACIDADES.map((c, i) => (
            <Aparece key={c.titulo} retraso={i * 0.1}>
              <IconoCirculo>{c.icono}</IconoCirculo>
              <h3 className="mt-4 font-display text-titulo-md">{c.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">{c.texto}</p>
            </Aparece>
          ))}
        </div>
      </section>

      {/* herramientas, con una pieza en movimiento al lado */}
      <section className="px-5 py-16">
        <div className="mx-auto w-full max-w-5xl">
          <Aparece>
            <Titulo acento="dentro" despues="del editor">
              Lo que encuentras
            </Titulo>
          </Aparece>
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              {HERRAMIENTAS.map((h, i) => (
                <Aparece key={h.titulo} retraso={i * 0.08}>
                  <Tarjeta hover>
                    <div className="flex gap-3">
                      <span className="mt-0.5 text-brand">{h.icono}</span>
                      <div>
                        <h3 className="text-sm font-semibold">{h.titulo}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">
                          {h.texto}
                        </p>
                      </div>
                    </div>
                  </Tarjeta>
                </Aparece>
              ))}
            </div>
            <Aparece retraso={0.1} className="flex flex-col gap-4">
              <MedioHover
                imagen={MEDIOS.color.imagen}
                alt="Corrección de color sobre una toma"
                proporcion="aspect-[16/10]"
              />
              <MaquetaColor />
            </Aparece>
          </div>
        </div>
      </section>

      {/* privacidad y formatos */}
      <section className="px-5 py-16">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
          <Aparece>
            <MedioHover
              imagen={MEDIOS.equipo.imagen}
              alt="Equipo de trabajo con material de video"
              proporcion="aspect-[5/4]"
            />
          </Aparece>
          <Aparece retraso={0.1}>
            <Titulo acento="en tu equipo" despues="y ahí se quedan">
              Tus archivos se procesan
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

      {/* llamada final */}
      <section className="px-5 pb-20 pt-6">
        <Aparece className="mx-auto w-full max-w-5xl">
          <div
            className="overflow-hidden rounded-3xl px-6 py-14 text-center"
            style={{ background: 'linear-gradient(150deg, #0d1a33, #13233d 55%, #0a2a63)' }}
          >
            <h2 className="font-display text-titulo-lg text-white">
              Monta tu primer video <span style={{ color: '#6ea8ff' }}>ahora mismo</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70">
              Arrastra un archivo y empieza. No hay nada que instalar ni ningún formulario que
              rellenar antes de probarlo.
            </p>
            <button
              onClick={irAImportar}
              className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#13233d] transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              Abrir el editor
            </button>
          </div>
        </Aparece>
      </section>
    </div>
  )
}
