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
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
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
