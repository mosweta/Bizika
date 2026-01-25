import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      'firebase/app': 'firebase/compat/app',
      'firebase/auth': 'firebase/compat/auth',
      'firebase/firestore': 'firebase/compat/firestore',
      'firebase/storage': 'firebase/compat/storage',
      'firebase/functions': 'firebase/compat/functions',
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/compat'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})