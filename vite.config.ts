import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// configuración del bundler. las cabeceras COOP y COEP dejan disponible
// SharedArrayBuffer, que más adelante necesitan WebCodecs y ffmpeg.wasm para
// exportar el video sin perder calidad. conviene tenerlas activas desde ahora
export default defineConfig({
  plugins: [react()],
  // ffmpeg.wasm crea un worker interno usando import.meta.url; si Vite lo pre-bundlea, esa url apunta al
  // archivo empaquetado y el worker no encuentra su propio código, así que la carga se cuelga sin avisar.
  // dejándolo fuera de la optimización se sirve tal cual y el worker resuelve bien su ruta
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
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
