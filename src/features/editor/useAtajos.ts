import { useEffect } from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { useAppStore } from '../../store/useAppStore'
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

      // copiar y pegar el elemento elegido (clip, capa o audio). al estar fuera de
      // un campo de texto, no pisa la copia de texto del navegador. al pegar, la
      // copia cae en el cabezal con todas sus propiedades
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        st.copiar()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        st.pegar()
        return
      }

      // duplicar lo elegido, sea un clip, una capa o un audio. es de lo que más se
      // usa al montar y hasta ahora obligaba a ir al menú o a arrastrar con alt
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        if (st.clipSeleccionado) st.duplicarClip(st.clipSeleccionado)
        else if (st.capaSeleccionada) st.duplicarCapa(st.capaSeleccionada)
        else if (st.regionSeleccionada) {
          if (st.audios.some((a) => a.id === st.regionSeleccionada)) st.duplicarAudio(st.regionSeleccionada)
          else st.duplicarRegionAudio(st.regionSeleccionada)
        }
        return
      }

      // exportar sin ir a buscar el botón
      if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault()
        useAppStore.getState().abrirExport()
        return
      }

      // orden de apilado de la capa elegida, con los corchetes, que es la
      // combinación de toda la vida en las herramientas de diseño
      if (st.capaSeleccionada && (e.key === ']' || e.key === '[')) {
        e.preventDefault()
        if (e.key === ']') st.traerAlFrente(st.capaSeleccionada)
        else st.enviarAtras(st.capaSeleccionada)
        return
      }

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
          // el proyecto se guarda solo con cada cambio, así que Ctrl+S ya no hace
          // nada; aun así se corta para que el navegador no abra su diálogo de
          // "guardar página". la S a secas sigue dividiendo por el cabezal
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            return
          }
          e.preventDefault()
          st.dividirEnCabezal()
          return

        // la C abre el recorte de lo que esté elegido, sea un clip de video o una
        // imagen. copiar es Ctrl+C y se atiende más arriba, así que aquí solo llega
        // la tecla suelta
        case 'c':
        case 'C': {
          const capaSel = st.capas.find((c) => c.id === st.capaSeleccionada)
          if (st.clipSeleccionado || capaSel?.tipo === 'imagen') {
            e.preventDefault()
            st.setHerramienta('recortar')
          }
          return
        }

        // saltar a una herramienta sin apuntar al riel. son las que más se pisan
        // al montar; el resto se siguen eligiendo con el ratón
        case 't':
        case 'T':
          e.preventDefault()
          st.setHerramienta('texto')
          return

        case 'b':
        case 'B':
          e.preventDefault()
          st.setHerramienta('borrador')
          return

        case 'p':
        case 'P':
          e.preventDefault()
          st.setHerramienta('dibujar')
          return

        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          // con varios bloques marcados se borran todos de una vez, pero antes se
          // pregunta: perder de golpe un puñado de clips por un roce de tecla sería
          // muy caro aunque exista deshacer
          if (st.bloquesSeleccionados.length > 1) {
            const cuantos = st.bloquesSeleccionados.length
            if (window.confirm(`¿Borrar estos ${cuantos} elementos de la línea de tiempo?`)) {
              st.quitarBloques(st.bloquesSeleccionados)
            }
            return
          }
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
