import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// The unit specs are pure functions — no DOM, no network. The `@` alias
// mirrors vite.config.ts, so imports resolve the same way in tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
  },
})
