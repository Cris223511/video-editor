// cargador de pantalla completa: lo que hay detrás se desenfoca y se apaga
// mientras tres barras suben y bajan desfasadas, despacio. al terminar, todo
// vuelve fundiéndose, sin cortes bruscos
export default function Loader({ texto }: { texto?: string }) {
  return (
    <div
      className="animate-fundido-in fixed inset-0 z-[100] grid place-items-center"
      style={{
        background: 'rgb(var(--surface) / 0.55)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <Barras />
        {texto && (
          <p className="text-sm font-medium text-[color:var(--muted)]">{texto}</p>
        )}
      </div>
    </div>
  )
}

// las mismas tres barras, sueltas, para usarlas dentro de un panel o un botón
export function Barras({ alto = 34 }: { alto?: number }) {
  return (
    <div className="flex items-end gap-1.5" style={{ height: alto }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 rounded-full"
          style={{
            height: '100%',
            background: 'rgb(var(--accent))',
            transformOrigin: 'center',
            animation: `barra-carga 1.1s ${i * 0.16}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  )
}
