import { clientsClaim, setCacheNameDetails } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  getCacheKeyForURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

import { parsePushPayload, pushMessage } from './push-message.js'

const BASE: string = new URL('.', self.location.href).pathname

declare const self: ServiceWorkerGlobalScope

setCacheNameDetails({ prefix: 'openhouse' })
void self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

if (getCacheKeyForURL(`${BASE}index.html`) !== undefined) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(`${BASE}index.html`), {
      denylist: [/^\/api\//],
    })
  )
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event.data?.text())
  const message = pushMessage(payload)

  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: `${BASE}icon-192.png`,
      badge: `${BASE}icon-monochrome-512.png`,
      tag: 'openhouse-reminders',
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? ''
  const target = new URL(url, self.registration.scope).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const open = windows.find((client) => 'focus' in client)

      if (open !== undefined) {
        await open.focus()
        await open.navigate(target)
        return
      }

      await self.clients.openWindow(target)
    })()
  )
})
