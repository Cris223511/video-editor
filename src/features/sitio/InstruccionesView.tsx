import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RUTAS } from '../../rutasDef'
import Titulo from '../../components/sitio/Titulo'
import Aparece from '../../components/sitio/Aparece'
import Destello, { Subrayado } from '../../components/sitio/Destello'
import { Aviso, RejillaFondo } from '../../components/sitio/Piezas'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'

// cada entrada arranca con la palabra clave en negrita y sigue con lo que hace
// de verdad esa herramienta. es el formato de la referencia y responde a lo
// pedido: textos detallados, no resumidos
interface Paso {
  clave: string
  texto: string
}

const MONTAJE: Paso[] = [
  {
    clave: 'Importa',
    texto:
      'tus videos arrastrándolos a la zona de carga o pulsando para buscarlos en el equipo. Los archivos no se suben a ningún servidor, se abren directamente desde tu disco.',
  },
  {
    clave: 'Arrastra',
    texto:
      'un medio desde el panel inferior hasta la línea de tiempo. Cada clip se coloca donde lo sueltes y puedes moverlo después con el ratón.',
  },
  {
    clave: 'Apila',
    texto:
      'clips en varios niveles de video, y reparte los textos, las figuras y los audios en varias filas cuando se solapan en el tiempo. Lo que esté en un nivel superior tapa a lo que haya debajo, y cada nivel tiene su propia altura ajustable.',
  },
  {
    clave: 'Duplica',
    texto:
      'o copia cualquier elemento manteniendo Alt mientras lo arrastras, o con Ctrl+C y Ctrl+V. Todo el montaje se deshace y se rehace con Ctrl+Z y Ctrl+Y.',
  },
  {
    clave: 'Divide',
    texto:
      'un clip en dos por la posición del cabezal con la tecla S o el botón de las tijeras. Sirve para quitar una parte del medio sin recortar los extremos.',
  },
  {
    clave: 'Recorta',
    texto:
      'arrastrando los bordes de un clip. El material original no se toca, así que siempre puedes volver a alargarlo hasta donde llegue el video.',
  },
  {
    clave: 'Cierra',
    texto:
      'los espacios vacíos que queden entre planos con el botón que aparece sobre ellos. Todo lo que viene después se adelanta lo que medía el hueco.',
  },
  {
    clave: 'Separa el audio',
    texto:
      'de un clip de video para llevarlo a su propia pista y ajustarlo aparte, con su volumen propio o recortándolo sin tocar la imagen. También añades franjas de volumen para bajar la música justo donde alguien habla.',
  },
]

const EFECTOS: Paso[] = [
  {
    clave: 'Corrige el color',
    texto:
      'con tres ruedas para sombras, medios y luces, más cuatro curvas editables. Al arrastrar una rueda el cursor se oculta y el movimiento se vuelve fino; con Shift afinas todavía más y con doble clic vuelve al centro.',
  },
  {
    clave: 'Ajusta el tono',
    texto:
      'con los controles de exposición, contraste, saturación, temperatura y tinte, que se aplican en vivo sobre el visor.',
  },
  {
    clave: 'Elige la transición',
    texto:
      'de entrada de cada clip, con veintiuna para elegir entre fundidos, barridos direccionales, persianas, puertas, círculo, rombo, empujes y zooms. Pasa el cursor por una muestra para verla funcionando antes de aplicarla.',
  },
  {
    clave: 'Cambia la velocidad',
    texto:
      'de un clip para acelerarlo o ralentizarlo. La duración en la línea de tiempo se recalcula sola y el audio acompaña al cambio.',
  },
  {
    clave: 'Transforma',
    texto:
      'el elemento seleccionado girándolo en pasos de noventa grados, volteándolo en espejo o cambiando su opacidad, y decide con traer al frente o enviar atrás cuál queda encima cuando dos se pisan.',
  },
  {
    clave: 'Aplica efectos',
    texto:
      'sobre el clip, como el desenfoque de movimiento, con la intensidad que decidas.',
  },
]

const CAPAS: Paso[] = [
  {
    clave: 'Añade texto',
    texto:
      'con la tipografía, el tamaño y el color que quieras, además de contorno, sombra, fondo y alineación. Se escala por las esquinas manteniendo su proporción.',
  },
  {
    clave: 'Coloca imágenes',
    texto:
      'o tu logo sobre el video, con opacidad, corrección de color propia y un recorte que ajustas arrastrando un recuadro sobre el visor. Puedes deformarlas libremente o devolverles su proporción original.',
  },
  {
    clave: 'Inserta figuras',
    texto:
      'geométricas como rectángulo, redondeado, elipse, triángulo, estrella, línea y flecha, con relleno y borde configurables.',
  },
  {
    clave: 'Dibuja',
    texto:
      'a mano alzada sobre el video con el pincel, eligiendo color y grosor. El trazo se comporta como una capa más, así que se mueve y se anima igual que el resto.',
  },
  {
    clave: 'Censura',
    texto:
      'una zona con pixelado, desenfoque o transparencia, en forma de círculo, rectángulo o pincel libre, con la intensidad que decidas.',
  },
  {
    clave: 'Graba el movimiento',
    texto:
      'de una censura o de cualquier capa siguiendo con el cursor lo que se mueve en pantalla. Puedes reproducir a cámara lenta mientras grabas, y después corregir cada punto del recorrido o borrarlo.',
  },
  {
    clave: 'Alinea',
    texto:
      'los elementos con las guías que aparecen solas al arrastrar, tanto respecto al lienzo como a las demás capas. Con Alt se desactivan si estorban.',
  },
]

const SALIDA: Paso[] = [
  {
    clave: 'Cambia el lienzo',
    texto:
      'a la proporción que necesites. Si el video no la cubre, rellena las bandas con un color o con el propio video ampliado y desenfocado, que es lo habitual para colocar una toma vertical en un formato cuadrado.',
  },
  {
    clave: 'Olvídate de guardar',
    texto:
      'porque el editor lo hace solo cada vez que tocas algo, por pequeño que sea el cambio, con los videos ya dentro. Si aun así quieres forzarlo, tienes el botón de guardar en la barra superior.',
  },
  {
    clave: 'Descarga el proyecto',
    texto:
      'como archivo para llevártelo a otro equipo o conservarlo como respaldo, y vuelve a importarlo cuando quieras.',
  },
  {
    clave: 'Exporta el video',
    texto:
      'eligiendo entre 24, 30 o 60 imágenes por segundo. La exportación ocurre en tiempo real dentro de tu navegador, así que tarda aproximadamente lo que dura el resultado.',
  },
]

const ATAJOS: [string, string][] = [
  ['Espacio', 'Reproducir o pausar'],
  ['S', 'Dividir en el cabezal'],
  ['Supr', 'Eliminar lo seleccionado'],
  ['Ctrl + C y Ctrl + V', 'Copiar y pegar'],
  ['Ctrl + Z y Ctrl + Y', 'Deshacer y rehacer'],
  ['Flechas', 'Mover el cabezal un fotograma'],
  ['Shift + flechas', 'Mover el cabezal un segundo'],
  ['Inicio y Fin', 'Ir al principio o al final'],
  ['Más y menos', 'Acercar y alejar la línea de tiempo'],
  ['Esc', 'Soltar la selección'],
]

function Lista({ titulo, pasos }: { titulo: string; pasos: Paso[] }) {
  return (
    <Aparece className="mt-10">
      <h2 className="font-display text-titulo-md">{titulo}</h2>
      <ul className="mt-5 grid gap-3 lg:grid-cols-2">
        {pasos.map((p) => (
          <li
            key={p.clave}
            className="flex gap-3 rounded-xl p-3.5 text-sm leading-relaxed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            style={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border) / 0.1)',
            }}
          >
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="text-[color:var(--muted)]">
              <b className="text-[color:var(--text)]">{p.clave}</b> {p.texto}
            </span>
          </li>
        ))}
      </ul>
    </Aparece>
  )
}

// página que explica qué hace cada herramienta del editor. sigue el formato de
// la referencia: título, entrada con enlaces, y listas largas con la palabra
// clave destacada al principio de cada línea
export default function InstruccionesView() {
  return (
    <div className="relative overflow-hidden">
      <RejillaFondo />
      <Destello x="82%" y="8%" tamano={420} intensidad={0.3} />

      <div className={`mx-auto w-full ${ANCHO_CONTENIDO} ${RELLENO} py-12`}>
        <Link
          to={RUTAS.portada}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft size={15} className="transition-transform duration-200 group-hover:-translate-x-1" /> Volver al inicio
        </Link>

        <Titulo nivel="xl" como="h1" className="mt-5">
          Cómo funciona el <Subrayado>editor</Subrayado>
        </Titulo>

        <p className="mt-5 max-w-3xl text-entrada text-[color:var(--muted)]">
          Aquí tienes cada herramienta del editor explicada con calma, para que sepas qué esperar
          antes de tocarla. No necesitas una cuenta ni descargar ningún programa. Abre{' '}
          <Link to={RUTAS.medios} className="text-brand hover:underline">
            el editor
          </Link>
          , arrastra un video y ponte a trabajar. Y cuando quieras seguir con un montaje que dejaste
          a medias, lo encuentras guardado en{' '}
          <Link to={RUTAS.proyectos} className="text-brand hover:underline">
            mis proyectos
          </Link>
          .
        </p>

        <Lista titulo="Montar la línea de tiempo" pasos={MONTAJE} />
        <Lista titulo="Color, transiciones y velocidad" pasos={EFECTOS} />
        <Lista titulo="Texto, imágenes y censura" pasos={CAPAS} />
        <Lista titulo="Guardar y exportar" pasos={SALIDA} />

        <Aparece className="mt-10">
          <h2 className="font-display text-titulo-md">Atajos de teclado</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ATAJOS.map(([tecla, que]) => (
              <div
                key={tecla}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgb(var(--border) / 0.06)' }}
              >
                <kbd
                  className="shrink-0 rounded-md px-2 py-1 font-mono text-[13px] font-semibold"
                  style={{
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border) / 0.16)',
                  }}
                >
                  {tecla}
                </kbd>
                <span className="text-sm text-[color:var(--muted)]">{que}</span>
              </div>
            ))}
          </div>
        </Aparece>

        <Aparece className="mt-10">
          <Aviso titulo="Privacidad">
            Todo el procesamiento ocurre dentro de tu navegador. Los videos no se suben ni se envían
            a ningún servidor externo, ni mientras editas ni al exportar. La información permanece
            en tu equipo en todo momento, y el rendimiento depende del tamaño de los archivos y de
            la potencia de tu ordenador.
          </Aviso>
        </Aparece>
      </div>
    </div>
  )
}
