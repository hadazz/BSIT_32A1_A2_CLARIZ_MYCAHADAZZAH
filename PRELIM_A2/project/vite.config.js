import { defineConfig } from 'vite'

export default defineConfig({
  root: 'PRELIM_A2',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})