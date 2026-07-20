import { useEffect } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { duracionTotal } from '../../lib/timeline/clips'
import { posicionCapa } from '../../lib/layers/motion'
import { CapaCensura } from '../../types/layers'

// paso de las flechas al ajustar una censura: uno fino para moverla y otro para
// estirarla, ambos en fracción del lienzo
const PASO_MOVER = 0.006
const PASO_TAMANO = 0.01

// paso del cabezal con las flechas: un fotograma a 30 imágenes por segundo, o un
// segundo entero si se mantiene Shift
const PASO = 1 / 30
const PASO_LARGO = 1

// mientras se escribe en un campo los atajos no deben dispararse, o la barra
// espaciadora partiría el video en lugar de escribir un espacio
function escribiendo(destino: EventTarget | null) {
  const el = destino as HTMLElement | null
  if (!el) return false
  if (el.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

// atajos de teclado del editor, con la misma lógica que un editor de escritorio
export function useAtajos() {
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (escribiendo(e.target)) return
      const st = useEditorStore.getState()
      const total = duracionTotal(st.pista.clips)
      const largo = e.shiftKey ? PASO_LARGO : PASO

      // con una censura seleccionada, las flechas dejan de mover el cabezal y pasan
      // a gobernar la caja: solas la mueven, con Alt cambian el ancho y con Ctrl el
      // alto. es lo mismo que anuncia la ayuda de atajos de la herramienta
      const censura = st.capas.find(
        (c) => c.id === st.capaSeleccionada && c.tipo === 'censura',
      ) as CapaCensura | undefined
      if (censura && e.key.startsWith('Arrow')) {
        e.preventDefault()
        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          const d = e.key === 'ArrowRight' ? PASO_TAMANO : -PASO_TAMANO
          st.actualizarCapa(censura.id, { anchoRel: Math.max(0.03, Math.min(2, censura.anchoRel + d)) })
          return
        }
        if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          const d = e.key === 'ArrowUp' ? PASO_TAMANO : -PASO_TAMANO
          st.actualizarCapa(censura.id, { altoRel: Math.max(0.03, Math.min(2, censura.altoRel + d)) })
          return
        }
        let dx = 0
        let dy = 0
        if (e.key === 'ArrowLeft') dx = -PASO_MOVER
        if (e.key === 'ArrowRight') dx = PASO_MOVER
        if (e.key === 'ArrowUp') dy = -PASO_MOVER
        if (e.key === 'ArrowDown') dy = PASO_MOVER
        if (censura.keyframes.length > 0) st.desplazarCapa(censura.id, dx, dy)
        else {
          const pos = posicionCapa(censura, st.playhead)
          st.moverCapaLienzo(censura.id, pos.x + dx, pos.y + dy)
        }
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          st.alternarReproduccion()
          return

        case 'z':
        case 'Z':
          // Ctrl+Z deshace; con Shift rehace, la alternativa que muchos editores
          // aceptan además de Ctrl+Y
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            if (e.shiftKey) st.rehacer()
            else st.deshacer()
          }
          return

        case 'y':
        case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            st.rehacer()
          }
          return

        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) return
          e.preventDefault()
          st.dividirEnCabezal()
          return

        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          if (st.clipSeleccionado) st.quitarClip(st.clipSeleccionado)
          else if (st.capaSeleccionada) st.quitarCapa(st.capaSeleccionada)
          else if (st.regionSeleccionada) st.quitarRegionAudio(st.regionSeleccionada)
          return

        case 'ArrowLeft':
          e.preventDefault()
          st.irA(Math.max(0, st.playhead - largo))
          return

        case 'ArrowRight':
          e.preventDefault()
          st.irA(Math.min(total, st.playhead + largo))
          return

        case 'Home':
          e.preventDefault()
          st.irA(0)
          return

        case 'End':
          e.preventDefault()
          st.irA(total)
          return

        case '+':
        case '=':
          e.preventDefault()
          st.aplicarZoom(1.3)
          return

        case '-':
          e.preventDefault()
          st.aplicarZoom(1 / 1.3)
          return

        case 'Escape':
          // suelta la selección, salvo que se esté grabando un recorrido o
          // dibujando una máscara, donde Escape ya tiene su propio cometido
          if (st.grabandoMovimiento || st.dibujandoMascara) return
          st.seleccionar(null)
          st.seleccionarCapa(null)
          return
      }
    }

    // al soltar el ratón o una tecla se cierra el gesto en curso: la siguiente
    // edición abrirá un paso de historial nuevo aunque llegue de inmediato. así
    // un arrastre entero es un solo paso, pero dos gestos seguidos no se funden
    const finGesto = () => useEditorStore.getState().finGesto()

    // el soltar de una tecla NO cierra el gesto si se está escribiendo en un
    // campo: la edición de texto se agrupa por su propio foco, no tecla a tecla,
    // para que deshacer revierta la palabra entera y no letra por letra
    const finGestoTecla = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      useEditorStore.getState().finGesto()
    }

    window.addEventListener('keydown', alPulsar)
    window.addEventListener('pointerup', finGesto)
    window.addEventListener('keyup', finGestoTecla)
    return () => {
      window.removeEventListener('keydown', alPulsar)
      window.removeEventListener('pointerup', finGesto)
      window.removeEventListener('keyup', finGestoTecla)
    }
  }, [])
}
