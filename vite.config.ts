/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works whether the site lives at /, on GitHub
  // Pages under /<repo-name>/, or anywhere else under a subdirectory.
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['node_modules', 'dist', 'e2e/**', '.claude/**', 'deploy/**'],
  },
})
