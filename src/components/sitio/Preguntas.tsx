import { ReactNode } from 'react'
import * as Acordeon from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

const PREGUNTAS: { p: string; r: ReactNode }[] = [
  {
    p: '¿Es necesario subir el video a un servidor para poder editarlo?',
    r: (
      <>
        No hace falta nada de eso. El archivo se abre directamente desde tu disco y todo el trabajo
        ocurre dentro de la propia pestaña, con las mismas herramientas que el navegador emplea para
        reproducir cualquier video. En ningún momento se envía tu material fuera del equipo, ni
        mientras editas ni al exportar. Si quieres comprobarlo, puedes abrir la pestaña de red en las
        herramientas del navegador y verás que no sale <b>ninguna petición</b>. Además, el código es{' '}
        <b>público</b> y está disponible para revisarlo por completo.
      </>
    ),
  },
  {
    p: '¿Tengo que registrarme o crear una cuenta para usar el editor?',
    r: (
      <>
        No se requiere ningún registro. Abres la página y ya puedes empezar a trabajar de inmediato,
        sin correo, sin nombre y sin contraseña que recordar. Como no existen cuentas, tampoco hay{' '}
        <b>planes de pago</b> ni funciones bloqueadas, de manera que todas las personas disponen de
        las mismas herramientas y de la misma calidad de exportación desde el <b>primer momento</b>.
      </>
    ),
  },
  {
    p: '¿Qué formatos de video, imagen y audio puedo importar?',
    r: (
      <>
        Puedes traer <b>video</b> en MP4, WebM, MOV, MKV, M4V y OGV, con un límite de 1,5 GB por
        archivo. También <b>imágenes</b> en PNG, JPG, WebP, GIF, AVIF, BMP y otros formatos
        habituales de hasta 5 MB, y <b>audio</b> en MP3, WAV, OGG, M4A, AAC, FLAC y Opus. Cada
        archivo se revisa al entrar mirando su contenido real y no solo su extensión, de modo que un
        archivo renombrado se detecta enseguida en lugar de fallar a mitad del montaje. El formato
        AVI queda fuera a propósito, ya que el navegador no sabe decodificarlo.
      </>
    ),
  },
  {
    p: '¿Dónde quedan guardados los proyectos y se pierden si cierro la pestaña?',
    r: (
      <>
        Los proyectos se guardan en el almacenamiento del propio navegador de este equipo, con los{' '}
        <b>videos incluidos</b> y no como una simple referencia, así que mover o renombrar el archivo
        original no rompe nada. El guardado es <b>automático</b> con cada cambio, de manera que
        cerrar la pestaña no te hace perder el trabajo y al volver lo encuentras tal como lo dejaste.
        Ten en cuenta que si borras los datos del navegador o abres la aplicación en otro dispositivo
        no estará ahí, por lo que conviene <b>descargar el proyecto</b> como archivo cuando quieras
        conservarlo o llevarlo a otro equipo.
      </>
    ),
  },
  {
    p: '¿Cuánto tarda en exportarse el video y con qué calidad sale?',
    r: (
      <>
        El tiempo depende sobre todo de la duración del video y de la potencia de tu equipo, y en la
        mayoría de los casos resulta <b>breve</b>. Mientras avanza se muestra el fotograma por el que
        va, de modo que puedes seguir el progreso en todo momento. El archivo se genera a la
        resolución de tu proyecto y a <b>24, 30 o 60</b> imágenes por segundo, con una calidad
        ajustada para que la imagen no pierda nitidez, y puedes elegir el formato entre MP4, WebM y
        MKV. No existen colas de espera ni límites diarios.
      </>
    ),
  },
  {
    p: '¿Puedo usar el archivo exportado donde quiera, sin marca de agua?',
    r: (
      <>
        Sí, el archivo es <b>enteramente tuyo</b>. No se añade ninguna marca de agua ni hay límite de
        duración, y nada distingue un video hecho aquí de uno creado con cualquier otra herramienta.
        La aplicación se publica además con <b>licencia MIT</b>, de manera que puedes leer el código,
        copiarlo, modificarlo o partir de él para tu propio proyecto. Lo único que corre de tu parte
        es contar con los derechos del material que edites.
      </>
    ),
  },
]

// preguntas frecuentes en acordeón. una sola abierta a la vez, para que la
// sección no se estire hasta lo absurdo y siempre se vea dónde estás
export default function Preguntas() {
  return (
    <Acordeon.Root type="single" collapsible className="flex flex-col gap-2.5">
      {PREGUNTAS.map((f, i) => (
        <Acordeon.Item
          key={f.p}
          value={`p-${i}`}
          className="group/item overflow-hidden rounded-2xl transition-all duration-300 hover:border-brand/30 data-[state=open]:shadow-lg"
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border) / 0.1)',
          }}
        >
          <Acordeon.Header>
            <Acordeon.Trigger className="group flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5">
              <span className="flex-1 font-display text-sm font-bold transition-colors duration-200 group-hover:text-brand group-data-[state=open]:text-brand sm:text-[15px]">
                {f.p}
              </span>
              {/* el signo gira hasta convertirse en una equis al abrirse */}
              {/* el fondo va como clase y no en línea: un estilo en línea gana
                  siempre, y la variante de abierto nunca llegaba a pintarlo */}
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgb(var(--accent)/0.12)] transition-colors duration-300 group-data-[state=open]:bg-[rgb(var(--accent-boton))]">
                <Plus
                  size={15}
                  className="text-brand transition-transform duration-300 group-data-[state=open]:rotate-45 group-data-[state=open]:text-white"
                />
              </span>
            </Acordeon.Trigger>
          </Acordeon.Header>
          <Acordeon.Content className="overflow-hidden data-[state=closed]:animate-acordeon-cerrar data-[state=open]:animate-acordeon-abrir">
            {/* el texto entra con un retraso pequeño respecto a la altura, así el
                despliegue se siente en dos tiempos y no como un tirón */}
            <p className="animate-[fundido-in_380ms_ease-out_both] px-4 pb-5 text-sm leading-relaxed text-[color:var(--muted)] sm:px-5">
              {f.r}
            </p>
          </Acordeon.Content>
        </Acordeon.Item>
      ))}
    </Acordeon.Root>
  )
}
