import { ReactNode } from 'react'
import {
  BringToFront,
  Copy,
  Crop,
  SendToBack,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import Tooltip from '../../components/ui/Tooltip'
import { useEditorStore, Herramienta } from '../../store/useEditorStore'

// botón compacto de la barra. el estado activo se usa para lo que se enciende y
// se apaga, como el silencio de un clip
function Accion({
  icono,
  texto,
  activo = false,
  onClick,
}: {
  icono: ReactNode
  texto: string
  activo?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip texto={texto} lado="arriba">
      <button
        type="button"
        onClick={onClick}
        aria-label={texto}
        className={[
          'grid h-8 w-8 place-items-center rounded-lg transition-colors duration-150',
          activo
            ? 'bg-brand/15 text-brand'
            : 'text-[color:var(--muted)] hover:bg-brand/10 hover:text-brand',
        ].join(' ')}
      >
        {icono}
      </button>
    </Tooltip>
  )
}


// separador vertical entre grupos de la barra

// barra de opciones de lo que esté seleccionado. vive sobre la línea de tiempo, no
// en el riel de la izquierda: el riel elige en qué se trabaja, y esto son las
// acciones de lo que ya está elegido. lo que se muestra cambia según sea un clip
// de video, una capa o un audio, y el botón del final lleva al panel completo de
// esa herramienta cuando hace falta algo que aquí no cabe
export default function BarraGlobales() {
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const regionSeleccionada = useEditorStore((s) => s.regionSeleccionada)
  const clips = useEditorStore((s) => s.pista.clips)
  const capas = useEditorStore((s) => s.capas)
  const audios = useEditorStore((s) => s.audios)
  const audioRegiones = useEditorStore((s) => s.audioRegiones)

  const setHerramienta = useEditorStore((s) => s.setHerramienta)
  const alternarSilencioClip = useEditorStore((s) => s.alternarSilencioClip)
  const duplicarClip = useEditorStore((s) => s.duplicarClip)
  const quitarClip = useEditorStore((s) => s.quitarClip)
  const duplicarCapa = useEditorStore((s) => s.duplicarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const traerAlFrente = useEditorStore((s) => s.traerAlFrente)
  const enviarAtras = useEditorStore((s) => s.enviarAtras)
  const quitarAudio = useEditorStore((s) => s.quitarAudio)
  const quitarRegionAudio = useEditorStore((s) => s.quitarRegionAudio)

  const clip = clips.find((c) => c.id === clipSeleccionado)
  const capa = capas.find((c) => c.id === capaSeleccionada)
  const audio = audios.find((a) => a.id === regionSeleccionada)
  const region = audioRegiones.find((r) => r.id === regionSeleccionada)

  // sin nada elegido la barra no se dibuja: así no roba alto a la línea de tiempo
  // mientras solo se está mirando el montaje
  if (!clip && !capa && !audio && !region) return null

  // el panel al que lleva "más opciones" depende de lo que haya elegido
  const irAPanel = (h: Herramienta) => setHerramienta(h)

  return (
    // columna al costado derecho del visor. antes vivía sobre la línea de tiempo y
    // al elegir un clip la empujaba hacia abajo, que era incómodo justo cuando se
    // está montando. acá puede crecer sin descolocar nada
    <div
      className="flex items-center gap-1 border-r pr-1 border-[rgb(var(--border)/0.14)]"
    >
      {clip && (
        <>
          <div className="flex items-center gap-1">
          <Accion
            icono={clip.mudo || clip.silenciado ? <VolumeX size={15} /> : <Volume2 size={15} />}
            texto={clip.mudo ? 'Su audio está en la pista de sonido' : clip.silenciado ? 'Quitar el silencio' : 'Silenciar'}
            activo={!!clip.mudo || !!clip.silenciado}
            onClick={() => {
              if (!clip.mudo) alternarSilencioClip(clip.id)
            }}
          />
          <Accion icono={<Crop size={15} />} texto="Recortar la imagen" onClick={() => irAPanel('recortar')} />
          <Accion icono={<Copy size={15} />} texto="Duplicar" onClick={() => duplicarClip(clip.id)} />
          <Accion icono={<Trash2 size={15} />} texto="Borrar" onClick={() => quitarClip(clip.id)} />
          </div>
        </>
      )}

      {capa && (
        <>
          <div className="flex flex-wrap items-center gap-1">
          {/* el color se cambia sin salir de la barra en lo que lo admite */}
          {(capa.tipo === 'texto' || capa.tipo === 'trazo') && (
            <Tooltip texto="Color" lado="arriba">
              <input
                type="color"
                aria-label="Color"
                value={capa.color}
                onChange={(e) => actualizarCapa(capa.id, { color: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
              />
            </Tooltip>
          )}
          {capa.tipo === 'figura' && (
            <Tooltip texto="Color de relleno" lado="arriba">
              <input
                type="color"
                aria-label="Color de relleno"
                value={capa.colorRelleno}
                onChange={(e) => actualizarCapa(capa.id, { colorRelleno: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded-md border-0 bg-transparent p-0"
              />
            </Tooltip>
          )}
          {capa.tipo !== 'censura' && (
            <>
              <Accion
                icono={<BringToFront size={15} />}
                texto="Traer al frente"
                onClick={() => traerAlFrente(capa.id)}
              />
              <Accion
                icono={<SendToBack size={15} />}
                texto="Enviar atrás"
                onClick={() => enviarAtras(capa.id)}
              />
            </>
          )}
          {capa.tipo === 'imagen' && (
            <Accion icono={<Crop size={15} />} texto="Recortar la imagen" onClick={() => irAPanel('recortar')} />
          )}
          <Accion icono={<Copy size={15} />} texto="Duplicar" onClick={() => duplicarCapa(capa.id)} />
          <Accion icono={<Trash2 size={15} />} texto="Borrar" onClick={() => quitarCapa(capa.id)} />
          </div>
        </>
      )}

      {audio && (
        <>
          <div className="flex items-center gap-1">
            <Accion icono={<Trash2 size={15} />} texto="Borrar" onClick={() => quitarAudio(audio.id)} />
          </div>
        </>
      )}

      {region && (
        <>
          <div className="flex items-center gap-1">
            <Accion
              icono={<Trash2 size={15} />}
              texto="Borrar"
              onClick={() => quitarRegionAudio(region.id)}
            />
          </div>
        </>
      )}

    </div>
  )
}
