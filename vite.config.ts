import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative base so the build works at https://<user>.github.io/<repo>/
  base: './',
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
