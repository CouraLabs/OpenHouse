import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Vitest's 5s default is too tight here: every sign-in, sign-up and
    // password change runs bcrypt at cost 10 (~70ms a hash on this machine),
    // a test chains several of them, and the spec files share one database
    // and run in parallel. Measured: `settings.e2e-spec.ts` change-password
    // hit the 5000ms limit on a loaded run and passes in isolation.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
