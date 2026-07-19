import { Forma, Transicion } from './catalogo'

// dibuja la forma del recorte para un progreso dado, de 0 a 1. la ruta se traza
// en el contexto que se pase y quien llame decide si la usa para recortar o para
// rellenar. trabajar con rutas y no con imágenes intermedias es lo que permite
// que el visor y el compositor produzcan exactamente lo mismo
export function trazarForma(
  ctx: CanvasRenderingContext2D,
  forma: Forma,
  p: number,
  ancho: number,
  alto: number,
) {
  ctx.beginPath()

  switch (forma) {
    case 'barrido-der':
      ctx.rect(0, 0, ancho * p, alto)
      break
    case 'barrido-izq':
      ctx.rect(ancho * (1 - p), 0, ancho * p, alto)
      break
    case 'barrido-aba':
      ctx.rect(0, 0, ancho, alto * p)
      break
    case 'barrido-arr':
      ctx.rect(0, alto * (1 - p), ancho, alto * p)
      break

    case 'diagonal': {
      // el corte avanza en diagonal, así que el frente debe recorrer el ancho
      // más el alto para llegar a cubrirlo todo
      const avance = (ancho + alto) * p
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.min(avance, ancho), 0)
      ctx.lineTo(0, Math.min(avance, alto))
      ctx.closePath()
      break
    }

    case 'persianas': {
      // ocho franjas que crecen a la vez desde su borde izquierdo
      const franjas = 8
      const w = ancho / franjas
      for (let i = 0; i < franjas; i++) ctx.rect(i * w, 0, w * p, alto)
      break
    }

    case 'puertas-h': {
      // dos hojas que se abren desde el centro hacia los lados
      const mitad = (ancho / 2) * p
      ctx.rect(0, 0, mitad, alto)
      ctx.rect(ancho - mitad, 0, mitad, alto)
      break
    }
    case 'puertas-v': {
      const mitad = (alto / 2) * p
      ctx.rect(0, 0, ancho, mitad)
      ctx.rect(0, alto - mitad, ancho, mitad)
      break
    }

    case 'circulo': {
      // el radio llega a la esquina, no al borde, o quedarían cuatro rincones
      // sin cubrir al terminar
      const maximo = Math.hypot(ancho, alto) / 2
      ctx.arc(ancho / 2, alto / 2, maximo * p, 0, Math.PI * 2)
      break
    }

    case 'rombo': {
      const rx = (ancho / 2 + alto / 2) * p
      const ry = rx
      ctx.moveTo(ancho / 2, alto / 2 - ry)
      ctx.lineTo(ancho / 2 + rx, alto / 2)
      ctx.lineTo(ancho / 2, alto / 2 + ry)
      ctx.lineTo(ancho / 2 - rx, alto / 2)
      ctx.closePath()
      break
    }

    case 'tercios': {
      // tres franjas horizontales que arrancan escalonadas: la primera va por
      // delante y la última entra al final
      const filas = 3
      const h = alto / filas
      for (let i = 0; i < filas; i++) {
        const retraso = i * 0.18
        const local = Math.max(0, Math.min(1, (p - retraso) / (1 - retraso || 1)))
        ctx.rect(0, i * h, ancho * local, h)
      }
      break
    }
  }
}

// cuánto se desplaza cada plano en las transiciones de empuje, en píxeles
export function desplazamiento(
  direccion: 'izq' | 'der' | 'arr' | 'aba',
  p: number,
  ancho: number,
  alto: number,
): { entrante: [number, number]; saliente: [number, number] } {
  switch (direccion) {
    case 'der':
      return { entrante: [-ancho * (1 - p), 0], saliente: [ancho * p, 0] }
    case 'izq':
      return { entrante: [ancho * (1 - p), 0], saliente: [-ancho * p, 0] }
    case 'aba':
      return { entrante: [0, -alto * (1 - p)], saliente: [0, alto * p] }
    case 'arr':
      return { entrante: [0, alto * (1 - p)], saliente: [0, -alto * p] }
  }
}

// escala de cada plano en las transiciones de acercar y alejar
export function escalas(acercar: boolean, p: number): { entrante: number; saliente: number } {
  return acercar
    ? { entrante: 0.6 + 0.4 * p, saliente: 1 + 0.25 * p }
    : { entrante: 1.35 - 0.35 * p, saliente: 1 - 0.2 * p }
}

// opacidad de cada plano según la técnica. el negro y el blanco no mezclan los
// dos planos: apagan el primero en la mitad inicial y encienden el segundo en la
// segunda, con un velo de color por medio
export function opacidades(
  t: Transicion,
  p: number,
): { entrante: number; saliente: number; velo: number } {
  switch (t.tecnica) {
    case 'corte':
      return { entrante: p >= 1 ? 1 : 0, saliente: 1, velo: 0 }
    case 'opacidad':
      return { entrante: p, saliente: 1, velo: 0 }
    case 'negro':
    case 'blanco': {
      // primera mitad: se apaga lo que había. segunda mitad: aparece lo nuevo
      const velo = p < 0.5 ? p * 2 : (1 - p) * 2
      return { entrante: p < 0.5 ? 0 : 1, saliente: 1, velo }
    }
    default:
      // las de máscara, empuje y escala muestran ambos planos completos y el
      // efecto lo da la geometría, no la transparencia
      return { entrante: 1, saliente: 1, velo: 0 }
  }
}
