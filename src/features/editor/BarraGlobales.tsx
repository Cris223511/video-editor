import { ReactNode } from 'react'
import {
  BringToFront,
  Copy,
  Crop,
  Scissors,
  SendToBack,
  SlidersHorizontal,
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

// deslizador fino para los ajustes que caben en la propia barra, como la opacidad
// de una capa o el volumen de un audio
function Mando({
  etiqueta,
  valor,
  min,
  max,
  onChange,
}: {
  etiqueta: string
  valor: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[color:var(--muted)]">
      <span className="whitespace-nowrap">{etiqueta}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-24 cursor-pointer accent-[color:rgb(var(--brand))]"
      />
      <span className="w-9 tabular-nums text-right">{valor}</span>
    </label>
  )
}

// separador vertical entre grupos de la barra
function Corte() {
  return <span className="h-5 w-px shrink-0" style={{ background: 'rgb(var(--border) / 0.16)' }} />
}

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
  const setVolumenClip = useEditorStore((s) => s.setVolumenClip)
  const dividirEnCabezal = useEditorStore((s) => s.dividirEnCabezal)
  const duplicarClip = useEditorStore((s) => s.duplicarClip)
  const quitarClip = useEditorStore((s) => s.quitarClip)
  const duplicarCapa = useEditorStore((s) => s.duplicarCapa)
  const quitarCapa = useEditorStore((s) => s.quitarCapa)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const traerAlFrente = useEditorStore((s) => s.traerAlFrente)
  const enviarAtras = useEditorStore((s) => s.enviarAtras)
  const setVolumenAudio = useEditorStore((s) => s.setVolumenAudio)
  const quitarAudio = useEditorStore((s) => s.quitarAudio)
  const actualizarRegionAudio = useEditorStore((s) => s.actualizarRegionAudio)
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
    <div
      className="flex shrink-0 items-center gap-2 overflow-x-auto px-3 py-1.5"
      style={{ borderBottom: '1px solid rgb(var(--border) / 0.1)' }}
    >
      {clip && (
        <>
          <span className="shrink-0 text-[11px] font-medium text-[color:var(--text)]">Video</span>
          <Corte />
          <Accion
            icono={clip.mudo || clip.silenciado ? <VolumeX size={15} /> : <Volume2 size={15} />}
            texto={clip.mudo ? 'Su audio está en la pista de sonido' : clip.silenciado ? 'Quitar el silencio' : 'Silenciar'}
            activo={!!clip.mudo || !!clip.silenciado}
            onClick={() => {
              if (!clip.mudo) alternarSilencioClip(clip.id)
            }}
          />
          <Accion icono={<Crop size={15} />} texto="Recortar la imagen" onClick={() => irAPanel('recortar')} />
          <Accion icono={<Scissors size={15} />} texto="Dividir en el cabezal" onClick={dividirEnCabezal} />
          <Accion icono={<Copy size={15} />} texto="Duplicar" onClick={() => duplicarClip(clip.id)} />
          <Accion icono={<Trash2 size={15} />} texto="Borrar" onClick={() => quitarClip(clip.id)} />
          <Corte />
          {/* el volumen del clip y su botón de silencio van de la mano: bajarlo a
              cero silencia y subirlo desde cero devuelve el sonido */}
          {!clip.mudo && (
            <Mando
              etiqueta="Volumen"
              valor={clip.silenciado ? 0 : Math.round((clip.volumen ?? 1) * 100)}
              min={0}
              max={200}
              onChange={(v) => setVolumenClip(clip.id, v / 100)}
            />
          )}
          <Mando
            etiqueta="Tamaño"
            valor={Math.round((clip.encuadre?.escala ?? 1) * 100)}
            min={20}
            max={300}
            onChange={(v) => useEditorStore.getState().actualizarEncuadre(clip.id, { escala: v / 100 })}
          />
        </>
      )}

      {capa && (
        <>
          <span className="shrink-0 text-[11px] font-medium text-[color:var(--text)]">
            {capa.tipo === 'texto'
              ? 'Texto'
              : capa.tipo === 'imagen'
                ? 'Imagen'
                : capa.tipo === 'figura'
                  ? 'Figura'
                  : capa.tipo === 'trazo'
                    ? 'Dibujo'
                    : 'Censura'}
          </span>
          <Corte />
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
          <Corte />
          <Mando
            etiqueta="Opacidad"
            valor={capa.opacidad}
            min={0}
            max={100}
            onChange={(v) => actualizarCapa(capa.id, { opacidad: v })}
          />
        </>
      )}

      {audio && (
        <>
          <span className="shrink-0 text-[11px] font-medium text-[color:var(--text)]">Audio</span>
          <Corte />
          <Accion icono={<Trash2 size={15} />} texto="Borrar" onClick={() => quitarAudio(audio.id)} />
          <Corte />
          <Mando
            etiqueta="Volumen"
            valor={Math.round(audio.volumen * 100)}
            min={0}
            max={200}
            onChange={(v) => setVolumenAudio(audio.id, v / 100)}
          />
        </>
      )}

      {region && (
        <>
          <span className="shrink-0 text-[11px] font-medium text-[color:var(--text)]">
            Franja de volumen
          </span>
          <Corte />
          <Accion
            icono={<Trash2 size={15} />}
            texto="Borrar"
            onClick={() => quitarRegionAudio(region.id)}
          />
          <Corte />
          <Mando
            etiqueta="Ganancia"
            valor={Math.round(region.ganancia * 100)}
            min={0}
            max={200}
            onChange={(v) => actualizarRegionAudio(region.id, { ganancia: v / 100 })}
          />
        </>
      )}

      {/* atajo al panel completo de lo elegido, para lo que no cabe en la barra */}
      <button
        type="button"
        onClick={() =>
          irAPanel(
            clip
              ? 'transformar'
              : capa
                ? capa.tipo === 'trazo'
                  ? 'dibujar'
                  : capa.tipo === 'imagen'
                    ? 'transformar'
                    : capa.tipo
                : 'audio',
          )
        }
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--muted)] transition-colors hover:bg-brand/10 hover:text-brand"
      >
        <SlidersHorizontal size={14} /> Más opciones
      </button>
    </div>
  )
}
