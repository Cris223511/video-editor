import { ReactNode } from 'react'
import { BringToFront, FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, SendToBack, Undo2 } from 'lucide-react'
import SinSeleccion from '../../../components/ui/SinSeleccion'
import { Campo, Deslizador } from '../../../components/ui/Controls'
import { useEditorStore } from '../../../store/useEditorStore'
import { CapaTexto, CapaImagen, CapaFigura, CapaTrazo } from '../../../types/layers'

// capas que admiten girar y voltear. la censura queda fuera a propósito: su
// efecto muestrea el video y girarla dejaría la zona tapada descuadrada
type CapaTransformable = CapaTexto | CapaImagen | CapaFigura | CapaTrazo

// deja el ángulo siempre entre 0 y 359, para que sumar y restar giros no acumule
// vueltas enteras que no aportan nada
function normalizarAngulo(a: number): number {
  return ((a % 360) + 360) % 360
}

// botón cuadrado con icono y rótulo debajo, en rejilla. se resalta cuando su
// transformación está activa (por ejemplo, el espejo ya aplicado)
function Boton({
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
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-[11px] font-medium transition-colors',
        activo
          ? 'border-brand bg-brand/10 text-brand'
          : 'border-black/10 text-[color:var(--muted)] hover:border-brand hover:text-brand dark:border-white/10',
      ].join(' ')}
    >
      {icono}
      {texto}
    </button>
  )
}

// opciones generales que se desbloquean al seleccionar algo: girar en pasos de
// noventa grados y voltear en espejo. funcionan sobre lo que esté elegido, sea un
// clip de video o una capa de texto, imagen o figura
export default function TransformarPanel() {
  const capaSeleccionada = useEditorStore((s) => s.capaSeleccionada)
  const clipSeleccionado = useEditorStore((s) => s.clipSeleccionado)
  const capas = useEditorStore((s) => s.capas)
  const clips = useEditorStore((s) => s.pista.clips)
  const actualizarCapa = useEditorStore((s) => s.actualizarCapa)
  const actualizarEncuadre = useEditorStore((s) => s.actualizarEncuadre)
  const traerAlFrente = useEditorStore((s) => s.traerAlFrente)
  const enviarAtras = useEditorStore((s) => s.enviarAtras)

  const capa = capas.find((c) => c.id === capaSeleccionada)
  const clip = clips.find((c) => c.id === clipSeleccionado)

  // una capa de texto, imagen, figura o dibujo se puede girar y voltear
  if (
    capa &&
    (capa.tipo === 'texto' || capa.tipo === 'imagen' || capa.tipo === 'figura' || capa.tipo === 'trazo')
  ) {
    const t = capa as CapaTransformable
    const girar = (delta: number) =>
      actualizarCapa(t.id, { rotacion: normalizarAngulo((t.rotacion ?? 0) + delta) })
    return (
      <Contenido
        titulo={`Transformar ${etiquetaCapa(t.tipo)}`}
        rotacion={t.rotacion ?? 0}
        espejoH={!!t.espejoH}
        espejoV={!!t.espejoV}
        onGirarIzq={() => girar(-90)}
        onGirarDer={() => girar(90)}
        onEspejoH={() => actualizarCapa(t.id, { espejoH: !t.espejoH })}
        onEspejoV={() => actualizarCapa(t.id, { espejoV: !t.espejoV })}
        onReiniciar={() => actualizarCapa(t.id, { rotacion: 0, espejoH: false, espejoV: false })}
        opacidad={t.opacidad}
        onOpacidad={(v) => actualizarCapa(t.id, { opacidad: v })}
        onTraerFrente={() => traerAlFrente(t.id)}
        onEnviarAtras={() => enviarAtras(t.id)}
        onRotacionLibre={(v) => actualizarCapa(t.id, { rotacion: normalizarAngulo(v) })}
      />
    )
  }

  // el clip de video también gira y se escala: su encuadre guarda el giro, el
  // espejo y el tamaño, y el visor y la exportación los aplican igual
  if (clip) {
    const enc = clip.encuadre
    const rot = enc?.rotacion ?? 0
    const girarClip = (delta: number) =>
      actualizarEncuadre(clip.id, { rotacion: normalizarAngulo(rot + delta) })
    return (
      <Contenido
        titulo="Transformar video"
        rotacion={rot}
        espejoH={!!enc?.espejoH}
        espejoV={!!enc?.espejoV}
        onGirarIzq={() => girarClip(-90)}
        onGirarDer={() => girarClip(90)}
        onEspejoH={() => actualizarEncuadre(clip.id, { espejoH: !enc?.espejoH })}
        onEspejoV={() => actualizarEncuadre(clip.id, { espejoV: !enc?.espejoV })}
        onReiniciar={() =>
          actualizarEncuadre(clip.id, { rotacion: 0, espejoH: false, espejoV: false, escala: 1 })
        }
        onRotacionLibre={(v) => actualizarEncuadre(clip.id, { rotacion: normalizarAngulo(v) })}
        escala={enc?.escala ?? 1}
        onEscala={(v) => actualizarEncuadre(clip.id, { escala: v })}
      />
    )
  }

  if (capa && capa.tipo === 'censura') {
    return (
      <SinSeleccion icono="transformar" titulo="La censura no se transforma">
        Girar o voltear una censura descuadraría la zona que tapa. Selecciona un video, un texto,
        una imagen o una figura para transformarlo.
      </SinSeleccion>
    )
  }

  return (
    <SinSeleccion icono="transformar" titulo="Nada seleccionado">
      Pulsa un video en la línea de tiempo, o un texto, imagen o figura en el visor, y aquí se
      desbloquean las opciones para girarlo y voltearlo.
    </SinSeleccion>
  )
}

function etiquetaCapa(tipo: 'texto' | 'imagen' | 'figura' | 'trazo'): string {
  return tipo === 'texto' ? 'texto' : tipo === 'imagen' ? 'imagen' : tipo === 'trazo' ? 'dibujo' : 'figura'
}

// cuerpo común del panel. quien lo usa decide si muestra los botones de girar
// (pasando o no las funciones de rotación) según lo que admita cada elemento
function Contenido({
  titulo,
  rotacion,
  espejoH,
  espejoV,
  onGirarIzq,
  onGirarDer,
  onEspejoH,
  onEspejoV,
  onReiniciar,
  opacidad,
  onOpacidad,
  onTraerFrente,
  onEnviarAtras,
  onRotacionLibre,
  escala,
  onEscala,
}: {
  titulo: string
  rotacion?: number
  espejoH: boolean
  espejoV: boolean
  onGirarIzq?: () => void
  onGirarDer?: () => void
  onEspejoH: () => void
  onEspejoV: () => void
  onReiniciar: () => void
  // opacidad general, disponible en los elementos que la admiten (las capas)
  opacidad?: number
  onOpacidad?: (v: number) => void
  // orden de apilado: solo las capas lo traen, porque el video vive por debajo
  onTraerFrente?: () => void
  onEnviarAtras?: () => void
  // giro a cualquier ángulo, no solo en saltos de noventa grados
  onRotacionLibre?: (v: number) => void
  // tamaño del video dentro del lienzo; las capas se escalan por sus tiradores
  escala?: number
  onEscala?: (v: number) => void
}) {
  const hayGiro = onGirarIzq && onGirarDer
  const tocado = espejoH || espejoV || (rotacion ?? 0) !== 0
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-relaxed text-[color:var(--muted)]">
        {titulo}. Gira y voltea sin salir de aquí; lo que veas en el visor es lo que saldrá al
        exportar.
      </p>

      {hayGiro && (
        <div className="grid grid-cols-2 gap-2">
          <Boton icono={<RotateCcw size={18} />} texto="Girar a la izquierda" onClick={onGirarIzq!} />
          <Boton icono={<RotateCw size={18} />} texto="Girar a la derecha" onClick={onGirarDer!} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Boton
          icono={<FlipHorizontal2 size={18} />}
          texto="Voltear horizontal"
          activo={espejoH}
          onClick={onEspejoH}
        />
        <Boton
          icono={<FlipVertical2 size={18} />}
          texto="Voltear vertical"
          activo={espejoV}
          onClick={onEspejoV}
        />
      </div>

      {/* giro fino a cualquier ángulo. los botones de arriba siguen sirviendo para
          los cuartos de vuelta, que es lo que se usa la mayoría de las veces */}
      {onRotacionLibre && (
        <Campo etiqueta={`Rotación (${rotacion ?? 0}°)`}>
          <Deslizador valor={rotacion ?? 0} min={0} max={359} onChange={onRotacionLibre} />
        </Campo>
      )}

      {/* tamaño del video dentro del lienzo, del 20 % al 300 %. pasado el 100 % la
          imagen se sale del cuadro y lo que sobresale no llega al archivo final */}
      {onEscala && (
        <Campo etiqueta={`Tamaño (${Math.round((escala ?? 1) * 100)}%)`}>
          <Deslizador
            valor={Math.round((escala ?? 1) * 100)}
            min={20}
            max={300}
            onChange={(v) => onEscala(v / 100)}
          />
        </Campo>
      )}

      {onOpacidad && (
        <Campo etiqueta={`Opacidad (${opacidad ?? 100}%)`}>
          <Deslizador valor={opacidad ?? 100} min={0} max={100} onChange={onOpacidad} />
        </Campo>
      )}

      {onTraerFrente && onEnviarAtras && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-[color:var(--muted)]">
            Cuando dos elementos se pisan, decide cuál queda encima.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Boton icono={<BringToFront size={18} />} texto="Traer al frente" onClick={onTraerFrente} />
            <Boton icono={<SendToBack size={18} />} texto="Enviar atrás" onClick={onEnviarAtras} />
          </div>
        </div>
      )}

      {tocado && (
        <button
          onClick={onReiniciar}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:border-brand hover:text-brand dark:border-white/10"
        >
          <Undo2 size={15} /> Restablecer
        </button>
      )}
    </div>
  )
}
