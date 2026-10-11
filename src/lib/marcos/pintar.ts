import { Marco, TipoMarco } from '../../types/marco'

// el dibujo del marco, uno solo para todo. el visor lo pinta sobre un lienzo que va encima del video
// y la exportación lo pinta sobre cada fotograma con esta misma función, así lo que se ve al editar
// es exactamente lo que sale en el archivo. los marcos con movimiento dependen del tiempo (t, en
// segundos): como en ambos sitios t es el instante del proyecto, el movimiento sale igual

// valores con los que se rellena lo que un proyecto antiguo no traía
const DEFECTO = {
  color2: '#ff3ba7',
  separacion: 0,
  velocidad: 50,
  opacidad: 100,
}

const TAU = Math.PI * 2

// qué controles tienen sentido para cada tipo. el panel solo muestra los que cuentan, así no se
// ofrecen mandos que no cambian nada
export type ControlMarco = 'color' | 'color2' | 'grosor' | 'separacion' | 'radio' | 'velocidad' | 'opacidad'

export const CONTROLES_MARCO: Record<TipoMarco, ControlMarco[]> = {
  ninguno: [],
  solido: ['color', 'grosor', 'separacion', 'opacidad'],
  doble: ['color', 'grosor', 'separacion', 'opacidad'],
  discontinuo: ['color', 'grosor', 'separacion', 'opacidad'],
  punteado: ['color', 'grosor', 'separacion', 'opacidad'],
  redondeado: ['color', 'grosor', 'separacion', 'radio', 'opacidad'],
  esquinas: ['color', 'grosor', 'separacion', 'opacidad'],
  polaroid: ['color', 'grosor', 'opacidad'],
  sombra: ['grosor', 'opacidad'],
  vineta: ['opacidad'],
  degradado: ['color', 'color2', 'grosor', 'separacion', 'opacidad'],
  neon: ['color', 'grosor', 'separacion', 'radio', 'opacidad'],
  'neon-doble': ['color', 'color2', 'grosor', 'separacion', 'opacidad'],
  brillo: ['color', 'grosor', 'separacion', 'radio', 'opacidad'],
  pelicula: ['color', 'color2', 'grosor', 'opacidad'],
  cine: ['color', 'grosor', 'opacidad'],
  visor: ['color', 'grosor', 'separacion', 'opacidad'],
  latido: ['color', 'grosor', 'separacion', 'radio', 'velocidad', 'opacidad'],
  giratorio: ['color', 'color2', 'grosor', 'separacion', 'radio', 'velocidad', 'opacidad'],
  luces: ['color', 'color2', 'grosor', 'separacion', 'velocidad', 'opacidad'],
  cinta: ['color', 'color2', 'grosor', 'velocidad', 'opacidad'],
  arcoiris: ['grosor', 'separacion', 'radio', 'velocidad', 'opacidad'],
  respira: ['color', 'grosor', 'separacion', 'radio', 'velocidad', 'opacidad'],
  'esquinas-vivas': ['color', 'grosor', 'separacion', 'velocidad', 'opacidad'],
  rec: ['color', 'grosor', 'separacion', 'velocidad', 'opacidad'],
}

// categorías que organiza el panel, con los tipos que lleva cada una y su nombre visible
export const CATEGORIAS_MARCO: { id: string; nombre: string; tipos: { tipo: TipoMarco; nombre: string }[] }[] = [
  {
    id: 'clasicos',
    nombre: 'Clásicos',
    tipos: [
      { tipo: 'ninguno', nombre: 'Ninguno' },
      { tipo: 'solido', nombre: 'Sólido' },
      { tipo: 'doble', nombre: 'Doble' },
      { tipo: 'discontinuo', nombre: 'Discontinuo' },
      { tipo: 'punteado', nombre: 'Punteado' },
      { tipo: 'redondeado', nombre: 'Redondeado' },
      { tipo: 'esquinas', nombre: 'Esquinas' },
      { tipo: 'polaroid', nombre: 'Polaroid' },
      { tipo: 'sombra', nombre: 'Sombra' },
      { tipo: 'vineta', nombre: 'Viñeta' },
      { tipo: 'degradado', nombre: 'Degradado' },
    ],
  },
  {
    id: 'luz',
    nombre: 'Luz',
    tipos: [
      { tipo: 'neon', nombre: 'Neón' },
      { tipo: 'neon-doble', nombre: 'Neón doble' },
      { tipo: 'brillo', nombre: 'Brillo' },
    ],
  },
  {
    id: 'cine',
    nombre: 'Cine',
    tipos: [
      { tipo: 'pelicula', nombre: 'Película' },
      { tipo: 'cine', nombre: 'Barras de cine' },
      { tipo: 'visor', nombre: 'Visor' },
    ],
  },
  {
    id: 'movimiento',
    nombre: 'Movimiento',
    tipos: [
      { tipo: 'latido', nombre: 'Neón que late' },
      { tipo: 'giratorio', nombre: 'Borde giratorio' },
      { tipo: 'luces', nombre: 'Luces en carrera' },
      { tipo: 'cinta', nombre: 'Cinta que corre' },
      { tipo: 'arcoiris', nombre: 'Arcoíris' },
      { tipo: 'respira', nombre: 'Borde que respira' },
      { tipo: 'esquinas-vivas', nombre: 'Esquinas vivas' },
      { tipo: 'rec', nombre: 'Grabando' },
    ],
  },
]

// si el marco se mueve con el tiempo. sirve para saber si el visor debe repintarlo en cada cuadro
export function marcoAnimado(tipo: TipoMarco): boolean {
  return CATEGORIAS_MARCO.find((c) => c.id === 'movimiento')!.tipos.some((x) => x.tipo === tipo)
}

// traza un rectángulo con esquinas redondeadas a mano, para no depender de roundRect
function rectRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

// punto del perímetro de un rectángulo a una distancia d recorrida desde la esquina superior
// izquierda, en sentido horario. sirve para las luces que corren por el borde
function puntoEnPerimetro(x: number, y: number, w: number, h: number, d: number): [number, number] {
  const per = 2 * (w + h)
  let r = ((d % per) + per) % per
  if (r < w) return [x + r, y]
  r -= w
  if (r < h) return [x + w, y + r]
  r -= h
  if (r < w) return [x + w - r, y + h]
  r -= w
  return [x, y + h - r]
}

// pinta el marco sobre un lienzo de ancho por alto. escala es el alto dividido entre 1080, que es
// la altura de referencia en la que se expresan grosor, separación y radio
export function pintarMarco(
  ctx: CanvasRenderingContext2D,
  marco: Marco,
  ancho: number,
  alto: number,
  escala: number,
  t = 0,
) {
  if (marco.tipo === 'ninguno') return
  const k = escala
  const g = Math.max(0, marco.grosor) * k
  const sep = (marco.separacion ?? DEFECTO.separacion) * k
  const r = marco.radio * k
  const c1 = marco.color
  const c2 = marco.color2 ?? DEFECTO.color2
  const op = Math.max(0, Math.min(100, marco.opacidad ?? DEFECTO.opacidad)) / 100
  // la velocidad de 1 a 100 se traduce a ciclos por segundo, de muy lento a bastante vivo
  const vel = 0.1 + (Math.max(1, Math.min(100, marco.velocidad ?? DEFECTO.velocidad)) / 100) * 1.4
  const fase = t * vel

  // zona donde se dibuja la línea del marco: el lienzo menos la separación al borde
  const x0 = sep
  const y0 = sep
  const w0 = Math.max(1, ancho - 2 * sep)
  const h0 = Math.max(1, alto - 2 * sep)

  ctx.save()
  ctx.globalAlpha = op
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1, g)

  // línea continua a lo largo del borde, con la mitad del grosor hacia dentro para que el marco
  // quede pegado al borde y no se coma la imagen hacia afuera
  const marcoRect = () => rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, 0)

  switch (marco.tipo as TipoMarco) {
    case 'solido':
      ctx.strokeStyle = c1
      marcoRect()
      ctx.stroke()
      break

    case 'doble': {
      ctx.strokeStyle = c1
      ctx.lineWidth = Math.max(1, g / 3)
      rectRedondo(ctx, x0 + g / 6, y0 + g / 6, w0 - g / 3, h0 - g / 3, 0)
      ctx.stroke()
      rectRedondo(ctx, x0 + g - g / 6, y0 + g - g / 6, w0 - 2 * g + g / 3, h0 - 2 * g + g / 3, 0)
      ctx.stroke()
      break
    }

    case 'discontinuo':
      ctx.strokeStyle = c1
      ctx.setLineDash([g * 2, g])
      marcoRect()
      ctx.stroke()
      break

    case 'punteado':
      ctx.strokeStyle = c1
      ctx.setLineDash([0.01, g * 1.6])
      ctx.lineCap = 'round'
      marcoRect()
      ctx.stroke()
      break

    case 'redondeado':
      ctx.strokeStyle = c1
      rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, r)
      ctx.stroke()
      break

    case 'esquinas': {
      ctx.strokeStyle = c1
      ctx.lineCap = 'square'
      const L = Math.min(w0, h0) * 0.14
      const a = x0 + g / 2
      const b = y0 + g / 2
      const c = x0 + w0 - g / 2
      const d = y0 + h0 - g / 2
      ctx.beginPath()
      ctx.moveTo(a, b + L); ctx.lineTo(a, b); ctx.lineTo(a + L, b)
      ctx.moveTo(c - L, b); ctx.lineTo(c, b); ctx.lineTo(c, b + L)
      ctx.moveTo(a, d - L); ctx.lineTo(a, d); ctx.lineTo(a + L, d)
      ctx.moveTo(c - L, d); ctx.lineTo(c, d); ctx.lineTo(c, d - L)
      ctx.stroke()
      break
    }

    case 'polaroid':
      ctx.fillStyle = c1
      ctx.fillRect(0, 0, ancho, g)
      ctx.fillRect(0, 0, g, alto)
      ctx.fillRect(ancho - g, 0, g, alto)
      ctx.fillRect(0, alto - g * 3, ancho, g * 3)
      break

    case 'sombra': {
      // la sombra interior: un halo oscuro que se difumina hacia el centro
      const grad = ctx.createLinearGradient(0, 0, 0, alto)
      void grad
      ctx.shadowColor = 'rgba(0,0,0,0.65)'
      ctx.shadowBlur = Math.max(2, g * 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = Math.max(2, g)
      // se dibuja el trazo justo fuera del lienzo para que solo su difuminado entre
      ctx.beginPath()
      ctx.rect(-g / 2, -g / 2, ancho + g, alto + g)
      ctx.stroke()
      break
    }

    case 'vineta': {
      const grad = ctx.createRadialGradient(
        ancho / 2, alto / 2, Math.min(ancho, alto) * 0.35,
        ancho / 2, alto / 2, Math.max(ancho, alto) * 0.62,
      )
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.75)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, ancho, alto)
      break
    }

    case 'degradado': {
      const grad = ctx.createLinearGradient(0, 0, ancho, alto)
      grad.addColorStop(0, c1)
      grad.addColorStop(1, c2)
      ctx.strokeStyle = grad
      marcoRect()
      ctx.stroke()
      break
    }

    case 'neon': {
      ctx.strokeStyle = c1
      ctx.shadowColor = c1
      ctx.shadowBlur = Math.max(4, g * 1.2)
      ctx.lineWidth = Math.max(1.5, g / 3)
      rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, r)
      ctx.stroke()
      break
    }

    case 'neon-doble': {
      const fino = Math.max(1.5, g / 4)
      ctx.lineWidth = fino
      ctx.shadowBlur = Math.max(4, g)
      ctx.strokeStyle = c1
      ctx.shadowColor = c1
      rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, r)
      ctx.stroke()
      ctx.strokeStyle = c2
      ctx.shadowColor = c2
      rectRedondo(ctx, x0 + g * 1.4, y0 + g * 1.4, w0 - g * 2.8, h0 - g * 2.8, Math.max(0, r - g))
      ctx.stroke()
      break
    }

    case 'brillo': {
      // varias pasadas anchas y tenues que juntas dan un resplandor suave del borde
      ctx.strokeStyle = c1
      for (let i = 4; i >= 1; i--) {
        ctx.globalAlpha = op * (0.12 + (4 - i) * 0.1)
        ctx.lineWidth = Math.max(1, (g * i) / 2)
        rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, r)
        ctx.stroke()
      }
      break
    }

    case 'pelicula':
    case 'cinta': {
      // tira de película a cada lado, con sus perforaciones. en 'cinta' las perforaciones corren
      const banda = Math.max(8, g * 2.2)
      ctx.fillStyle = c1
      ctx.fillRect(0, 0, banda, alto)
      ctx.fillRect(ancho - banda, 0, banda, alto)
      ctx.fillStyle = c2
      const lado = banda * 0.42
      const paso = lado * 2.2
      const corre = marco.tipo === 'cinta' ? (fase * paso * 2) % paso : 0
      for (let y = -paso + corre; y < alto + paso; y += paso) {
        ctx.fillRect((banda - lado) / 2, y, lado, lado * 0.78)
        ctx.fillRect(ancho - banda + (banda - lado) / 2, y, lado, lado * 0.78)
      }
      break
    }

    case 'cine': {
      // barras negras de arriba y abajo, como una película apaisada
      ctx.fillStyle = c1
      ctx.fillRect(0, 0, ancho, g)
      ctx.fillRect(0, alto - g, ancho, g)
      break
    }

    case 'visor': {
      ctx.strokeStyle = c1
      ctx.fillStyle = c1
      ctx.lineCap = 'butt'
      ctx.lineWidth = Math.max(1.5, g / 3)
      const L = Math.min(w0, h0) * 0.09
      const m = Math.max(g, 8 * k) + sep
      const a = m
      const b = m
      const c = ancho - m
      const d = alto - m
      ctx.beginPath()
      ctx.moveTo(a, b + L); ctx.lineTo(a, b); ctx.lineTo(a + L, b)
      ctx.moveTo(c - L, b); ctx.lineTo(c, b); ctx.lineTo(c, b + L)
      ctx.moveTo(a, d - L); ctx.lineTo(a, d); ctx.lineTo(a + L, d)
      ctx.moveTo(c - L, d); ctx.lineTo(c, d); ctx.lineTo(c, d - L)
      // cruz pequeña al centro
      const cx = ancho / 2
      const cy = alto / 2
      const cruz = Math.min(w0, h0) * 0.025
      ctx.moveTo(cx - cruz, cy); ctx.lineTo(cx + cruz, cy)
      ctx.moveTo(cx, cy - cruz); ctx.lineTo(cx, cy + cruz)
      ctx.stroke()
      // punto rojo fijo de grabación arriba a la izquierda
      ctx.fillStyle = '#ff2d2d'
      ctx.beginPath()
      ctx.arc(a + L * 0.55, b + L * 0.7, Math.max(3, g * 0.45), 0, TAU)
      ctx.fill()
      break
    }

    case 'latido': {
      // el neón sube y baja de brillo siguiendo un latido de dos golpes
      const ciclo = (fase % 1 + 1) % 1
      const pulso = Math.max(0, Math.sin(ciclo * TAU * 2)) * 0.6 + 0.4
      ctx.strokeStyle = c1
      ctx.shadowColor = c1
      ctx.shadowBlur = Math.max(4, g * (0.6 + pulso * 1.4))
      ctx.globalAlpha = op * (0.55 + pulso * 0.45)
      ctx.lineWidth = Math.max(1.5, g / 3)
      rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, r)
      ctx.stroke()
      break
    }

    case 'giratorio':
    case 'arcoiris': {
      // degradado cónico que da vueltas alrededor del centro y pinta el borde
      const ang = fase * TAU
      const grad = ctx.createConicGradient(ang, ancho / 2, alto / 2)
      if (marco.tipo === 'arcoiris') {
        const tonos = ['#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2', '#ff3b30']
        tonos.forEach((c, i) => grad.addColorStop(i / (tonos.length - 1), c))
      } else {
        grad.addColorStop(0, c1)
        grad.addColorStop(0.5, c2)
        grad.addColorStop(1, c1)
      }
      ctx.strokeStyle = grad
      rectRedondo(ctx, x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, r)
      ctx.stroke()
      break
    }

    case 'luces': {
      // bombillas repartidas por el perímetro que se encienden y apagan en carrera
      const per = 2 * (w0 + h0)
      const n = Math.max(12, Math.round(per / (g * 3.2 + 6 * k)))
      const rad = Math.max(2, g * 0.45)
      for (let i = 0; i < n; i++) {
        const [px, py] = puntoEnPerimetro(x0 + g / 2, y0 + g / 2, w0 - g, h0 - g, (per * i) / n)
        const enc = Math.floor(((i - fase * n * 0.5) % 4 + 4) % 4) < 2
        ctx.fillStyle = enc ? c1 : c2
        ctx.globalAlpha = op * (enc ? 1 : 0.35)
        ctx.shadowColor = enc ? c1 : 'transparent'
        ctx.shadowBlur = enc ? rad * 2 : 0
        ctx.beginPath()
        ctx.arc(px, py, rad, 0, TAU)
        ctx.fill()
      }
      break
    }

    case 'respira': {
      // el grosor sube y baja suave, como si el borde respirara
      const v = 0.55 + 0.45 * Math.sin(fase * TAU)
      const gg = Math.max(1, g * v)
      ctx.strokeStyle = c1
      ctx.lineWidth = gg
      rectRedondo(ctx, x0 + gg / 2, y0 + gg / 2, w0 - gg, h0 - gg, r)
      ctx.stroke()
      break
    }

    case 'esquinas-vivas': {
      // escuadras en las esquinas cuyo largo late
      const largo = Math.min(w0, h0) * (0.08 + 0.07 * (0.5 + 0.5 * Math.sin(fase * TAU)))
      ctx.strokeStyle = c1
      ctx.lineCap = 'square'
      const a = x0 + g / 2
      const b = y0 + g / 2
      const c = x0 + w0 - g / 2
      const d = y0 + h0 - g / 2
      ctx.beginPath()
      ctx.moveTo(a, b + largo); ctx.lineTo(a, b); ctx.lineTo(a + largo, b)
      ctx.moveTo(c - largo, b); ctx.lineTo(c, b); ctx.lineTo(c, b + largo)
      ctx.moveTo(a, d - largo); ctx.lineTo(a, d); ctx.lineTo(a + largo, d)
      ctx.moveTo(c - largo, d); ctx.lineTo(c, d); ctx.lineTo(c, d - largo)
      ctx.stroke()
      break
    }

    case 'rec': {
      // visor de cámara con el punto de grabación parpadeando y la leyenda REC
      ctx.strokeStyle = c1
      ctx.lineCap = 'butt'
      ctx.lineWidth = Math.max(1.5, g / 3)
      const L = Math.min(w0, h0) * 0.09
      const m = Math.max(g, 8 * k) + sep
      const a = m
      const b = m
      const c = ancho - m
      const d = alto - m
      ctx.beginPath()
      ctx.moveTo(a, b + L); ctx.lineTo(a, b); ctx.lineTo(a + L, b)
      ctx.moveTo(c - L, b); ctx.lineTo(c, b); ctx.lineTo(c, b + L)
      ctx.moveTo(a, d - L); ctx.lineTo(a, d); ctx.lineTo(a + L, d)
      ctx.moveTo(c - L, d); ctx.lineTo(c, d); ctx.lineTo(c, d - L)
      ctx.stroke()
      const parpadea = Math.sin(fase * TAU * 1.0) > -0.2
      const px = a + L * 0.4
      const py = b + L * 1.25
      const rad = Math.max(3, g * 0.45)
      if (parpadea) {
        ctx.fillStyle = '#ff2d2d'
        ctx.beginPath()
        ctx.arc(px + rad, py, rad, 0, TAU)
        ctx.fill()
      }
      ctx.fillStyle = c1
      ctx.font = `700 ${Math.max(10, g * 0.9)}px system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillText('REC', px + rad * 2.6, py)
      break
    }
  }
  ctx.restore()
}
