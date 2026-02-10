import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fatsecret/auth': {
        target: 'https://oauth.fatsecret.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fatsecret\/auth/, '/connect')
      },
      '/fatsecret/api': {
        target: 'https://platform.fatsecret.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fatsecret\/api/, '/rest/server.api')
      }
    }
  }
})
