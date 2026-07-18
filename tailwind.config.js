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
      animation: {
        'tip-in': 'tip-in 0.16s ease-out both',
        'modal-in': 'modal-in 0.2s ease-out both',
        'fundido-in': 'fundido-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
