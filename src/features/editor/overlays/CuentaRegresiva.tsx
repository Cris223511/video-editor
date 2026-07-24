import { useEditorStore } from '../../../store/useEditorStore'

// número grande de la cuenta regresiva antes de grabar un recorrido, centrado en el
// visor. antes salía en el panel de opciones, donde apenas se veía; aquí ocupa el
// centro de la escena, que es a donde uno está mirando para colocar el cursor. cada
// segundo estrena su animación gracias a la key, que lo hace crecer y desvanecerse
export default function CuentaRegresiva() {
  const cuenta = useEditorStore((s) => s.cuentaEnCurso)
  if (cuenta === null || cuenta <= 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center">
      <div
        key={cuenta}
        className="grid h-28 w-28 place-items-center rounded-full text-6xl font-bold tabular-nums text-white"
        style={{
          background: 'rgb(8 12 24 / 0.55)',
          boxShadow: '0 0 0 3px rgb(255 255 255 / 0.5), 0 12px 40px rgb(0 0 0 / 0.45)',
          backdropFilter: 'blur(4px)',
          animation: 'cuenta-pulso 1s ease-out',
        }}
      >
        {cuenta}
      </div>
    </div>
  )
}
