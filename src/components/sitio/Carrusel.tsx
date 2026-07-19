import { ReactNode, useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// carrusel de tarjetas. en pantalla ancha caben tres y en móvil una, así que la
// misma pieza sirve para las dos situaciones sin duplicar nada. los controles
// solo aparecen cuando de verdad hay algo hacia lo que avanzar
export default function Carrusel({ children }: { children: ReactNode[] }) {
  const [ref, api] = useEmblaCarousel({
    align: 'start',
    loop: false,
    // recorta las paradas sobrantes al final, para que no exista un salto extra
    // que deje media tarjeta a la vista sin nada más que mostrar
    containScroll: 'trimSnaps',
  })
  const [puedeAtras, setPuedeAtras] = useState(false)
  const [puedeAdelante, setPuedeAdelante] = useState(false)
  const [indice, setIndice] = useState(0)

  const revisar = useCallback(() => {
    if (!api) return
    setPuedeAtras(api.canScrollPrev())
    setPuedeAdelante(api.canScrollNext())
    setIndice(api.selectedScrollSnap())
  }, [api])

  useEffect(() => {
    if (!api) return
    revisar()
    api.on('select', revisar).on('reInit', revisar)
  }, [api, revisar])

  return (
    <div>
      {/* el recorte necesita aire arriba y abajo: sin él, la sombra que asoma al
          pasar el cursor se corta justo en el borde y se ve sucia */}
      <div ref={ref} className="-my-3 overflow-hidden py-3">
        {/* la separación va como relleno de cada tarjeta y se compensa con un
            margen negativo en el contenedor. si se usara `gap`, tres tarjetas de
            un tercio más dos separaciones sumarían más del ancho y la última
            quedaría siempre cortada */}
        <div className="-ml-4 flex">
          {children.map((hijo, i) => (
            <div
              key={i}
              className="min-w-0 shrink-0 grow-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/3"
            >
              <div className="h-full">{hijo}</div>
            </div>
          ))}
        </div>
      </div>

      {(puedeAtras || puedeAdelante) && (
        <div className="mt-5 flex items-center justify-end gap-3">
          {/* puntos de posición, útiles sobre todo en móvil */}
          <div className="mr-auto flex gap-1.5">
            {api?.scrollSnapList().map((_, i) => (
              <button
                key={i}
                onClick={() => api.scrollTo(i)}
                aria-label={`Ir a la tarjeta ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === indice ? 20 : 6,
                  background:
                    i === indice ? 'rgb(var(--accent))' : 'rgb(var(--border) / 0.25)',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => api?.scrollPrev()}
            disabled={!puedeAtras}
            aria-label="Anterior"
            className="grid h-10 w-10 place-items-center rounded-full text-white transition-all duration-200 disabled:opacity-30"
            style={{ background: 'rgb(var(--accent-boton))' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => api?.scrollNext()}
            disabled={!puedeAdelante}
            aria-label="Siguiente"
            className="grid h-10 w-10 place-items-center rounded-full text-white transition-all duration-200 disabled:opacity-30"
            style={{ background: 'rgb(var(--accent-boton))' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
