import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import Icon, { NombreIcono } from '../Icon'

export type TipoToast = 'success' | 'error' | 'warning' | 'info'

interface Aviso {
  id: string
  tipo: TipoToast
  mensaje: string
}

interface ContextoToast {
  mostrar: (tipo: TipoToast, mensaje: string) => void
}

const Ctx = createContext<ContextoToast | null>(null)

// hook para lanzar avisos desde cualquier parte de la app
export function useToast(): ContextoToast {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}

const iconoPorTipo: Record<TipoToast, NombreIcono> = {
  success: 'check',
  error: 'alerta',
  warning: 'alerta',
  info: 'info',
}

const colorPorTipo: Record<TipoToast, string> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-brand',
}

// contenedor de avisos anclado arriba a la derecha. cada aviso se retira solo
// tras unos segundos, o al pulsar la cruz
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])

  const cerrar = useCallback((id: string) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const mostrar = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      const id = crypto.randomUUID()
      setAvisos((prev) => [...prev, { id, tipo, mensaje }])
      window.setTimeout(() => cerrar(id), 4200)
    },
    [cerrar],
  )

  return (
    <Ctx.Provider value={{ mostrar }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3">
        {avisos.map((a) => (
          <div
            key={a.id}
            className="glass pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
            style={{ animation: 'toast-in .25s ease-out' }}
          >
            <span className={colorPorTipo[a.tipo]}>
              <Icon name={iconoPorTipo[a.tipo]} size={20} />
            </span>
            <p className="flex-1 text-sm leading-snug">{a.mensaje}</p>
            <button
              onClick={() => cerrar(a.id)}
              className="mt-0.5 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Cerrar aviso"
            >
              <Icon name="cerrar" size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
