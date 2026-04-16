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
        // Keep path as-is: /backend/* -> http://localhost/backend/*
        // This matches setups where Apache serves this project at localhost root.
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
