import { useEffect, useRef, useState } from 'react'

// rótulo de una fila que se edita en el sitio. en reposo es solo texto; al pasar
// el cursor se dibuja un fondo tenue que invita a tocarlo, y con un clic se
// convierte en un campo con todo seleccionado, listo para reemplazar. se guarda
// al pulsar enter o al perder el foco, sin ningún aviso encima. escape descarta
export default function NombreEditable({
  valor,
  onGuardar,
  className = '',
}: {
  valor: string
  onGuardar: (nombre: string) => void
  className?: string
}) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(valor)
  const inputRef = useRef<HTMLInputElement>(null)

  // al entrar en edición el campo toma el foco y deja todo el texto marcado, para
  // que escribir lo sustituya de una sin tener que borrarlo antes
  useEffect(() => {
    if (editando) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editando])

  function abrir() {
    setBorrador(valor)
    setEditando(true)
  }

  function confirmar() {
    const limpio = borrador.trim()
    if (limpio) onGuardar(limpio)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        value={borrador}
        maxLength={40}
        spellCheck={false}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar()
          if (e.key === 'Escape') setEditando(false)
          e.stopPropagation()
        }}
        // el clic dentro del campo no debe llegar a la cabecera, que lo tomaría
        // como el arranque de un arrastre para reordenar
        onMouseDown={(e) => e.stopPropagation()}
        className={`min-w-0 flex-1 rounded-md border border-brand/60 bg-[rgb(var(--surface))] px-1.5 py-0.5 text-[12px] font-medium outline-none ${className}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={abrir}
      onMouseDown={(e) => e.stopPropagation()}
      title="Haz clic para cambiar el nombre"
      className={`min-w-0 flex-1 truncate rounded-md border border-transparent px-1.5 py-0.5 text-left text-[12px] font-medium text-[color:var(--muted)] transition-colors hover:border-[rgb(var(--border)/0.25)] hover:bg-[rgb(var(--border)/0.08)] ${className}`}
    >
      {valor}
    </button>
  )
}
