import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  getCacheKeyForURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

import { parsePushPayload, pushMessage } from './push-message.js'

/**
 * The application's service worker (vite-plugin-pwa `injectManifest`):
 * precaches the build like the generated worker did, and handles web push.
 */
declare const self: ServiceWorkerGlobalScope

// Auto-update: a new deployment's worker takes over without a manual reload.
void self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Single-page app: navigations fall back to the shell — except the API,
// whose `.ics` calendar feed is a real navigation the worker must not hijack.
// The dev worker precaches nothing, and workbox throws for an unprecached
// URL, which fails the worker's evaluation and so blocks push in dev. Only
// a build that precaches the shell gets the fallback.
if (getCacheKeyForURL('index.html') !== undefined) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//],
    })
  )
}

/** Shows the system notification for a push. A push must always show one
 * (iOS revokes the permission of a site that pushes silently). */
self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event.data?.text())
  const message = pushMessage(payload)

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: '/icon-192.png',
      badge: '/icon-monochrome-512.png',
      // One notification stands for the pending reminders: a new push
      // replaces it rather than stacking.
      tag: 'openhouse-reminders',
      data: { url: payload.url },
    })
  )
})

/** Tapping the notification focuses an open app window on the target page,
 * or opens one. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const open = windows.find((client) => 'focus' in client)

      if (open !== undefined) {
        await open.focus()
        await open.navigate(url)
        return
      }

      await self.clients.openWindow(url)
    })()
  )
})
