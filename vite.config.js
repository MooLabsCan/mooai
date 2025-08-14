import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/backend': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
        // Forward to Apache's document root where this project lives
        // so that PHP files are executed by PHP instead of served as static text.
        rewrite: (path) => path.replace(/^\/backend/, '/mooai/backend'),
      },
      // Proxy for authService and other PHP endpoints under /api
      '/api': {
        target: 'http://localhost/mapmoo',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
