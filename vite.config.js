import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export default defineConfig({
  plugins: [react()],
  // We're handling environment variables in the build script
  // No need to define them here
  optimizeDeps: {
    include: ['face-api.js']
  },
  build: {
    rollupOptions: {
      external: [],
      input: {
        popup: resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'assets/[name].js'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
})
