import { ReactNode } from 'react'
import * as Acordeon from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

const PREGUNTAS: { p: string; r: ReactNode }[] = [
  {
    p: '¿Los videos se envían a algún servidor?',
    r: (
      <>
        No. El archivo se abre desde tu disco y se procesa dentro de la propia pestaña, con las mismas herramientas que el navegador usa para reproducir cualquier
        video. <b>No existe ninguna petición que envíe tu material a un servidor</b>, ni al editar ni
        al exportar. Si quieres verificarlo, abre las herramientas de desarrollo de tu navegador,
        entra en la pestaña de red y comprueba que mientras trabajas no sale nada. El código es
        público, así que también puedes leerlo.
      </>
    ),
  },
  {
    p: '¿Es necesario registrarse?',
    r: (
      <>
        No hay registro ni inicio de sesión. Tampoco se piden correo, nombre ni ningún otro dato
        personal, porque <b>no hay servidor donde guardarlos</b>. Abres la aplicación y empiezas a
        trabajar. Esto significa además que no existen planes de pago, límites de exportación ni
        marcas de agua reservadas para quien pague.
      </>
    ),
  },
  {
    p: '¿Dónde se almacenan los proyectos?',
    r: (
      <>
        En el almacenamiento del propio navegador de este equipo, <b>con los videos incluidos</b>. No
        se guarda una referencia al archivo original, sino el archivo entero, así que mover o
        renombrar el video de tu carpeta no rompe el proyecto. La contrapartida es que si borras los
        datos del navegador o usas otro dispositivo no estarán. Para algo importante,{' '}
        <b>descarga el proyecto como archivo</b> desde la lista y guárdalo donde quieras.
      </>
    ),
  },
  {
    p: '¿Cuánto tarda la exportación?',
    r: (
      <>
        Aproximadamente lo que dure el video final, porque el resultado <b>se graba en tiempo real</b>{' '}
        mientras se reproduce el montaje. Es la contrapartida directa de no tener servidores: no hay una granja de máquinas comprimiendo por
        ti, sino tu propio equipo haciendo el trabajo. Conviene dejar la pestaña activa mientras
        dura, porque el navegador ralentiza las que quedan en segundo plano. A cambio, tu material
        no viaja a ninguna parte y no hay cola de espera ni límite diario.
      </>
    ),
  },
  {
    p: '¿Qué requisitos tiene la aplicación?',
    r: (
      <>
        Un navegador reciente basado en Chromium o Firefox, y memoria suficiente para el material con
        el que trabajes. Un proyecto corto en <b>1080p</b> se maneja bien en cualquier equipo
        moderno; varios clips en <b>4K</b> piden bastante más, sobre todo si llevan corrección de
        color y censura en movimiento. Si notas tirones, exportar a 30 imágenes por segundo en lugar
        de 60 alivia mucho.
      </>
    ),
  },
  {
    p: '¿Qué licencia tiene el resultado exportado?',
    r: (
      <>
        Sí. <b>No se añade marca de agua</b>, no hay límite de duración y el archivo es enteramente
        tuyo. La aplicación se publica con <b>licencia MIT</b>, así que también puedes leer el
        código, copiarlo, modificarlo o usarlo en un proyecto propio. Lo único de lo que respondes tú
        es de tener los derechos del material que edites.
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
