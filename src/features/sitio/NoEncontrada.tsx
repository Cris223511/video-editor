import { Link } from 'react-router-dom'
import { RUTAS } from '../../rutasDef'
import { ANCHO_CONTENIDO, RELLENO } from '../../components/sitio/Contenedor'

// pantalla para una dirección que no existe. en lugar de un mensaje seco,
// ofrece las tres salidas razonables desde aquí
export default function NoEncontrada() {
  return (
    <div
      className={`mx-auto flex min-h-[70vh] w-full ${ANCHO_CONTENIDO} ${RELLENO} flex-col items-center justify-center py-16 text-center`}
    >
      <p className="font-display text-titulo-xl text-brand">404</p>
      <h1 className="mt-2 font-display text-titulo-lg">Esta página no existe</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[color:var(--muted)]">
        Puede que el enlace esté mal escrito o que la dirección ya no exista. Elige a dónde
        quieres ir.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          to={RUTAS.portada}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg active:translate-y-0 active:scale-95"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
