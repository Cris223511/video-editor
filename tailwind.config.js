/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // el azul y el celeste salen del degradado del logo
        brand: {
          DEFAULT: '#1861ff',
          soft: '#4b83ff',
          dark: '#1454d4',
          sky: '#12a5f0',
        },
      },
      keyframes: {
        // la estrella nace apagada, alcanza su brillo propio a media vida y se
        // vuelve a apagar, derivando un poco mientras tanto. cada una lleva su
        // brillo y su dirección en variables, así ninguna repite a otra
        estrella: {
          '0%, 100%': { opacity: '0', transform: 'translate(0, 0) scale(0.6)' },
          '20%': { opacity: 'var(--brillo)', transform: 'translate(calc(var(--deriva) * 0.3), calc(var(--deriva) * -0.2)) scale(1)' },
          '55%': { opacity: 'var(--brillo)', transform: 'translate(calc(var(--deriva) * 0.7), calc(var(--deriva) * -0.5)) scale(1)' },
          '80%': { opacity: '0.12', transform: 'translate(var(--deriva), calc(var(--deriva) * -0.8)) scale(0.85)' },
        },
        // vaivén muy corto: si el recorrido fuera mayor, cuatro iconos moviéndose
        // a la vez marearían en lugar de dar vida
        flotar: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        // el acordeón se abre hasta el alto real de su contenido, que radix
        // publica en una variable; con un alto fijo unas respuestas quedarían
        // cortadas y otras dejarían hueco
        'acordeon-abrir': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'acordeon-cerrar': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // el halo respira: cambia de tamaño y de intensidad muy despacio, sin
        // llegar a apagarse del todo en ningún momento
        destello: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '0.75' },
          '50%': { transform: 'translate(-50%, -50%) scale(1.14)', opacity: '1' },
        },
      },
      fontFamily: {
        // Inter para texto corrido, que es la más legible en pantalla a
        // tamaños pequeños
        sans: ['"Inter Variable"', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        // Jakarta para titulares: geométrica pero con detalles propios en la a
        // y la g, lo que evita el aire de plantilla
        display: ['"Plus Jakarta Sans Variable"', 'Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
      },
      // escala de titulares con interlineado ya ajustado. sin esto cada título
      // acababa con un tamaño decidido sobre la marcha
      fontSize: {
        'titulo-xl': ['clamp(2.25rem, 5vw, 3.75rem)', { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '800' }],
        'titulo-lg': ['clamp(1.75rem, 3.5vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '800' }],
        'titulo-md': ['clamp(1.25rem, 2.2vw, 1.6rem)', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }],
        'entrada': ['clamp(1rem, 1.5vw, 1.125rem)', { lineHeight: '1.7' }],
      },
      // radios moderados, para que nada quede en punta
      borderRadius: {
        DEFAULT: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      // un solo bloque de animaciones: había dos y el segundo pisaba al primero,
      // así que el pulso de los destellos nunca llegaba a aplicarse
      animation: {
        'acordeon-abrir': 'acordeon-abrir 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        'acordeon-cerrar': 'acordeon-cerrar 340ms cubic-bezier(0.4, 0, 0.2, 1)',
        destello: 'destello 7s ease-in-out infinite',
        'tip-in': 'tip-in 0.16s ease-out both',
        'modal-in': 'modal-in 0.2s ease-out both',
        'fundido-in': 'fundido-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
