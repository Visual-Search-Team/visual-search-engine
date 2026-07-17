import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
      // '/minio-proxy': {
      //   target: 'http://localhost:9000', 
      //   changeOrigin: false, 
      //   rewrite: (path) => path.replace(/^\/minio-proxy/, ''),
      //   configure: (proxy, _options) => {
      //     proxy.on('proxyReq', (proxyReq, req, res) => {
      //       proxyReq.setHeader('Host', 'minio:9000');
      //     });
      //   }
      // },
    }
  }
})
