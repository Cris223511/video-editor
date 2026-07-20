import { useState } from 'react'
import { Info } from 'lucide-react'
import Icon from '../../components/ui/Icon'
import Tooltip from '../../components/ui/Tooltip'
import Confirmar from '../../components/ui/Confirmar'
import { useProjectStore } from '../../store/useProjectStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useImportarMedios } from '../import/useImportarMedios'
import { ACEPTA_MEDIOS } from '../../lib/validation/validateVideo'
import { formatearDuracion } from '../../lib/format/duracion'
import FichaMedio from './FichaMedio'
import { useCongelarAncho } from './useCongelarAncho'
import { MediaAsset } from '../../types/media'

// tipo de dato que viaja al arrastrar un medio hacia la línea de tiempo
export const TIPO_ARRASTRE = 'application/x-video-editor-asset'

// panel de medios, abajo a la izquierda y junto a la línea de tiempo. los
// medios se arrastran desde aquí hasta la pista, y se importan más soltando
// archivos del explorador sobre la zona punteada
export default function MediaLibrary({ plegando = false }: { plegando?: boolean }) {
  const medios = useProjectStore((s) => s.medios)
  const quitar = useProjectStore((s) => s.quitar)
  const quitarUsosDeAsset = useEditorStore((s) => s.quitarUsosDeAsset)
  const { procesar, ocupado } = useImportarMedios()
  const [encima, setEncima] = useState(false)
  // igual que en el panel de opciones: el ancho se congela durante el plegado
  // para que el contenido no se reflowee mientras el panel se estrecha
  const { ref, estiloAncho } = useCongelarAncho(plegando)
  // qué medio tiene la ficha de detalles abierta
  const [detalle, setDetalle] = useState<MediaAsset | null>(null)
  // medio pendiente de confirmar antes de quitarlo. mientras no sea nulo, la
  // ventana de aviso queda abierta preguntando por él
  const [porQuitar, setPorQuitar] = useState<MediaAsset | null>(null)

  // quita de verdad el medio una vez confirmado: primero se llevan sus usos de la
  // línea de tiempo (clips, audios y capas de imagen) y luego se borra el asset
  // del proyecto, así no queda nada apuntando a un medio que ya no existe
  const confirmarQuitar = () => {
    if (!porQuitar) return
    quitarUsosDeAsset(porQuitar.id, porQuitar.url)
    quitar(porQuitar.id)
    setPorQuitar(null)
  }

  const soltarArchivos = (e: React.DragEvent) => {
    e.preventDefault()
    setEncima(false)
    if (e.dataTransfer.files?.length) procesar(e.dataTransfer.files)
  }

  return (
    <aside ref={ref} className="panel relative flex-1 overflow-hidden rounded-xl">
      {/* bloque en absoluto con ancho controlado para que, al plegar o desplegar,
          las miniaturas y textos no se estiren: solo se descubren o se recortan */}
      <div className="absolute inset-y-0 left-0 flex flex-col" style={{ width: estiloAncho }}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon name="pelicula" size={15} className="text-[color:var(--muted)]" />
        <span className="text-[13px] font-semibold">Medios</span>
        {/* el recuento iba suelto como un número a secas, sin decir de qué. ahora
            se acompaña de la palabra para que se lea «1 medio» y quede claro que
            cuenta los archivos importados */}
        <span
          className="ml-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-[color:var(--muted)]"
          style={{ background: 'rgb(var(--border) / 0.08)' }}
        >
          {medios.length} {medios.length === 1 ? 'medio' : 'medios'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5">
        {medios.length > 0 && (
          <ul className="mb-2.5 grid grid-cols-2 gap-2">
            {medios.map((m) => (
              <li key={m.id}>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TIPO_ARRASTRE, m.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  // solo en los videos, al posar el cursor se reproduce la vista
                  // previa en silencio desde el principio; al retirarlo se para y
                  // rebobina para volver a mostrar la portada. las imágenes y el
                  // audio se quedan como estaban
                  onMouseEnter={
                    m.clase === 'video'
                      ? (e) => {
                          const v = e.currentTarget.querySelector('video')
                          if (v) {
                            v.currentTime = 0
                            void v.play().catch(() => {})
                          }
                        }
                      : undefined
                  }
                  onMouseLeave={
                    m.clase === 'video'
                      ? (e) => {
                          const v = e.currentTarget.querySelector('video')
                          if (v) {
                            v.pause()
                            v.currentTime = 0
                          }
                        }
                      : undefined
                  }
                  // la miniatura ocupa toda la proporción del video, así se ve el
                  // encuadre de verdad en lugar de una franja recortada
                  className="group relative w-full cursor-grab overflow-hidden rounded-lg bg-black/40 ring-1 ring-[rgb(var(--border)/0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/50 active:cursor-grabbing"
                >
                  {/* la portada depende de la clase: el audio no tiene imagen y
                      se pinta con su icono sobre un fondo verde; la imagen se ve
                      entera sin recortar; el video usa su fotograma de portada */}
                  {m.clase === 'audio' ? (
                    <div className="grid aspect-video w-full place-items-center bg-gradient-to-br from-emerald-500/25 to-emerald-800/10">
                      <Icon name="musica" size={26} className="text-emerald-400" />
                    </div>
                  ) : (
                    <img
                      src={m.miniatura}
                      alt=""
                      className={[
                        'aspect-video w-full transition-transform duration-300 group-hover:scale-105',
                        m.clase === 'imagen' ? 'bg-black/40 object-contain' : 'object-cover',
                      ].join(' ')}
                    />
                  )}
                  {/* el video de vista previa se monta encima de la portada y
                      normalmente está invisible y parado; al pasar el cursor sube
                      su opacidad y se reproduce, así la transición entre foto y
                      video se ve suave. va sin arrastre propio para no estorbar al
                      draggable de la tarjeta */}
                  {m.clase === 'video' && (
                    <video
                      src={m.url}
                      muted
                      playsInline
                      preload="metadata"
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1.5">
                    <p className="truncate text-[12px] font-medium text-white">{m.nombre}</p>
                    <p className="truncate text-[10px] text-white/70">
                      {m.clase === 'audio'
                        ? formatearDuracion(m.duracion)
                        : m.clase === 'imagen'
                          ? `${m.ancho}×${m.alto}`
                          : `${formatearDuracion(m.duracion)} · ${m.ancho}×${m.alto}`}
                    </p>
                  </div>
                  {/* los dos botones salen al pasar el cursor: ver la ficha del
                      medio o quitarlo del proyecto */}
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Tooltip texto="Ver detalles">
                      <button
                        onClick={() => setDetalle(m)}
                        aria-label="Ver detalles"
                        className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-brand"
                      >
                        <Info size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip texto="Quitar del proyecto">
                      <button
                        onClick={() => setPorQuitar(m)}
                        aria-label="Quitar del proyecto"
                        className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition-colors hover:bg-red-500"
                      >
                        <Icon name="papelera" size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* con videos ya cargados, el cartel grande sobra y solo mete ruido. se
            deja un botón discreto para añadir más, que sigue aceptando archivos
            soltados encima. sin ninguno todavía, se muestra la zona amplia que
            invita a empezar */}
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setEncima(true)
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={soltarArchivos}
          className={
            medios.length
              ? [
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-center transition-all duration-200',
                  encima
                    ? 'border-brand bg-brand/10'
                    : 'border-[rgb(var(--border)/0.22)] text-[color:var(--muted)] hover:border-brand/60 hover:text-brand',
                  ocupado ? 'pointer-events-none opacity-60' : '',
                ].join(' ')
              : [
                  'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-10 text-center transition-all duration-200',
                  encima
                    ? 'scale-[1.02] border-brand bg-brand/10'
                    : 'border-[rgb(var(--border)/0.22)] hover:border-brand/60 hover:bg-brand/5',
                  ocupado ? 'pointer-events-none opacity-60' : '',
                ].join(' ')
          }
        >
          <Icon
            name={medios.length ? 'mas' : 'subir'}
            size={medios.length ? 15 : 22}
            className={encima ? 'text-brand' : 'text-[color:var(--muted)]'}
          />
          {medios.length ? (
            <span className="text-[13px] font-medium">
              {encima ? 'Suelta para importar' : 'Agregar más'}
            </span>
          ) : (
            <>
              <span className="text-[13px] font-medium leading-tight text-[color:var(--muted)]">
                {encima ? 'Suelta para importar' : 'Arrastra videos, audio o imágenes'}
              </span>
              <span className="text-[10px] text-[color:var(--muted)]">
                o haz clic para elegirlos
              </span>
            </>
          )}
          <input
            type="file"
            accept={ACEPTA_MEDIOS}
            multiple
            hidden
            onChange={(e) => e.target.files && procesar(e.target.files)}
          />
        </label>
      </div>
      </div>

      <FichaMedio medio={detalle} onCerrar={() => setDetalle(null)} />

      {/* quitar un medio arrastra consigo todo lo que dependa de él en la línea
          de tiempo, así que conviene preguntar antes en lugar de borrarlo de
          golpe con un clic */}
      <Confirmar
        abierto={porQuitar !== null}
        titulo="¿Quitar este medio?"
        mensaje="Se eliminará también de la línea de tiempo: sus clips, los audios importados desde él y las capas de imagen que lo usan."
        aceptar="Quitar"
        peligro
        onAceptar={confirmarQuitar}
        onCancelar={() => setPorQuitar(null)}
      />
    </aside>
  )
}
