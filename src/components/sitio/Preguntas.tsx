import { ReactNode } from 'react'
import * as Acordeon from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

const PREGUNTAS: { p: string; r: ReactNode }[] = [
  {
    p: '¿Los videos se envían a algún servidor?',
    r: (
      <>
        No. El archivo se abre desde tu disco y se procesa dentro de la propia pestaña, con las
        mismas herramientas que el navegador usa para reproducir cualquier video.{' '}
        <b>No existe ninguna petición que envíe tu material fuera</b>, ni al editar ni al exportar.
        Si quieres comprobarlo por tu cuenta, abre las herramientas de desarrollo, entra en la
        pestaña de red y verás que mientras trabajas no sale nada. El código es público, así que
        también puedes leerlo entero.
      </>
    ),
  },
  {
    p: '¿Necesito crear una cuenta?',
    r: (
      <>
        No. Abres la página y ya estás dentro. Tampoco se piden correo, nombre ni ningún otro dato,
        de modo que no hay nada que confirmar ni contraseña que recordar. Como consecuencia directa,
        tampoco existen planes de pago ni funciones reservadas: <b>todo lo que ves está disponible
        desde el primer momento</b>, con la misma calidad de salida para cualquiera.
      </>
    ),
  },
  {
    p: '¿Qué archivos puedo traer al editor?',
    r: (
      <>
        Video en <b>MP4, WebM, MOV, MKV, M4V y OGV</b>, hasta 1,5 GB por archivo. Imágenes en PNG,
        JPG, WebP, GIF, AVIF, BMP, SVG, ICO, TIFF y HEIC, hasta 5 MB. Y audio en MP3, WAV, OGG, M4A,
        AAC, FLAC y Opus, entre otros. Cada archivo se comprueba al entrar mirando su contenido real
        y no solo la extensión, así que un archivo renombrado se detecta en el momento en lugar de
        fallar a mitad del montaje. El contenedor <b>AVI se rechaza a propósito</b>: el navegador no
        sabe decodificarlo, y aceptarlo solo llevaba a un error más adelante.
      </>
    ),
  },
  {
    p: '¿Dónde se guardan los proyectos?',
    r: (
      <>
        En el almacenamiento del propio navegador de este equipo, <b>con los videos incluidos</b>. No
        se guarda una referencia al archivo original sino el archivo entero, así que mover o
        renombrar el video en tu carpeta no rompe nada. La contrapartida es que si borras los datos
        del navegador, o abres la aplicación en otro dispositivo, no estarán ahí. Para algo que te
        importe, <b>descarga el proyecto como archivo</b> desde la lista y guárdalo donde quieras;
        se vuelve a importar cuando lo necesites.
      </>
    ),
  },
  {
    p: '¿Y si cierro la pestaña sin guardar?',
    r: (
      <>
        No se pierde nada. El proyecto <b>se guarda solo con cada cambio</b>, por pequeño que sea:
        mover un clip, ajustar un color o cambiar el volumen. Si cierras con algo a medio escribir,
        el navegador avisa antes de salir, y al volver a entrar el montaje aparece tal como lo
        dejaste. Existe además un botón de guardar en la barra superior, aunque casi nunca hace falta
        tocarlo.
      </>
    ),
  },
  {
    p: '¿Cuánto tarda la exportación?',
    r: (
      <>
        Aproximadamente lo que dure el video final, porque el resultado{' '}
        <b>se graba en tiempo real</b> mientras se reproduce el montaje. Un minuto de video tarda
        alrededor de un minuto. Mientras avanza verás el fotograma por el que va, así que puedes
        seguir el progreso y confirmar que está saliendo bien. Conviene dejar la pestaña a la vista,
        porque el navegador ralentiza las que quedan en segundo plano. A cambio no hay cola de
        espera, ni turno, ni límite diario.
      </>
    ),
  },
  {
    p: '¿Con qué calidad sale el archivo?',
    r: (
      <>
        A la resolución de tu proyecto y a <b>24, 30 o 60 imágenes por segundo</b>, como elijas. Se
        prefiere MP4 con H.264 y, si tu navegador no lo admite, WebM. La tasa de bits se calcula a
        partir de la resolución y de los cuadros por segundo, con un techo alto, de modo que no verás
        el vídeo emborronarse al exportar. El diálogo te muestra una estimación del peso antes de
        empezar, y esa estimación cambia si subes o bajas los cuadros por segundo.
      </>
    ),
  },
  {
    p: '¿Qué necesita mi equipo?',
    r: (
      <>
        Un navegador de escritorio reciente basado en Chromium o Firefox, y memoria suficiente para
        el material con el que trabajes. Un proyecto corto en <b>1080p</b> se maneja bien en
        cualquier equipo moderno; varios clips en <b>4K</b> piden bastante más, sobre todo si llevan
        corrección de color y censura en movimiento. Si notas tirones, exportar a 30 imágenes por
        segundo en lugar de 60 alivia mucho, y esconder los niveles que no estés tocando también
        ayuda.
      </>
    ),
  },
  {
    p: '¿Puedo usar lo que exporte donde quiera?',
    r: (
      <>
        Sí, el archivo es enteramente tuyo. <b>No se añade marca de agua</b> ni hay límite de
        duración, y nada distingue un vídeo exportado aquí de uno hecho con cualquier otra
        herramienta. La aplicación se publica con <b>licencia MIT</b>, así que también puedes leer el
        código, copiarlo, modificarlo o partir de él para un proyecto propio. Lo único que queda de
        tu lado es tener los derechos del material que edites.
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
