import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// The marketing page: a static single-page build with no API behind it. It
// runs beside `web` in `npm run dev`, so it takes its own port.
export default defineConfig(({ mode }) => {
  // Every sign-in and sign-up link is built from this; a build without it
  // would ship dead links, so fail here instead of in the browser.
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')
  if (!env.VITE_APP_URL) {
    throw new Error(
      'VITE_APP_URL is not set — copy apps/landing/.env.example to .env'
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 5174,
    },
  }
})
