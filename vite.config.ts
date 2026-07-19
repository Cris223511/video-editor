import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// configuración del bundler. las cabeceras COOP y COEP dejan disponible
// SharedArrayBuffer, que más adelante necesitan WebCodecs y ffmpeg.wasm para
// exportar el video sin perder calidad. conviene tenerlas activas desde ahora
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // las librerías se separan del código propio: cambian mucho menos, así
        // que el navegador las reaprovecha entre versiones en lugar de volver a
        // descargarlo todo por cada retoque de la aplicación
        manualChunks: {
          react: ['react', 'react-dom'],
          animacion: ['framer-motion'],
          interfaz: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            'sonner',
            'react-resizable-panels',
            'react-colorful',
          ],
          iconos: ['lucide-react'],
        },
      },
    },
  },
})
