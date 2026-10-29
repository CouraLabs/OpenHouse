import { defineConfig } from 'vitest/config'
import { cloudflareTest } from '@cloudflare/vitest-plugin'

export default defineConfig({
  // Every test — unit and e2e — runs inside the Workers runtime against a
  // real local D1, with per-test isolated storage.
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
      main: './src/index.ts',
    }),
  ],
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: './test/setup.ts',
    // The sign-in flows run bcrypt at cost 10 several times per spec.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
