import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // The app lives under /app on its domain: the Worker's zone route sends
  // kantim.couralabs.dev/app* here, while the landing stays at the root.
  base: '/app/',
  plugins: [
    react(),
    tailwindcss(),
    // Installable web app: manifest + our own service worker (src/sw/sw.ts),
    // which precaches the build and handles web push. The worker
    // auto-updates (every reload checks for a new deployment).
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon.png',
        'mask-icon.svg',
      ],
      manifest: {
        name: 'Kantim',
        short_name: 'Kantim',
        description: 'Kantim — the tenant command center.',
        lang: 'en-US',
        start_url: '/app/',
        scope: '/app/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
          {
            src: 'icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon-monochrome-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'monochrome',
          },
        ],
      },
      devOptions: {
        // Serve the worker in dev too, so reload behaves exactly like
        // production and stale registrations never 404.
        enabled: true,
        // The worker is an ES module in dev (it imports workbox).
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // The API the page talks to. Development runs the two in separate
      // processes; same-origin requests keep the session cookies from being
      // cross-site, so no CORS dance is needed.
      '/api': {
        // Forwarded as-is: the Worker's API answers at /api/*.
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
