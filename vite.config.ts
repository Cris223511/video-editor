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
})
