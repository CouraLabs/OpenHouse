import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    setupFiles: './test/setup.ts',
    passWithNoTests: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
