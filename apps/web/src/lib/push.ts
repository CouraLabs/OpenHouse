/**
 * The browser side of web push: what the device supports, and turning a
 * subscription on and off. Nothing here prompts by itself — the permission
 * dialog only opens inside `subscribeToPush`, which the UI calls from a
 * click.
 */

/** Whether the browser can do web push at all. */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Whether the device is an iPhone or iPad. Newer iPads report as a Mac,
 * told apart by their touch screen. */
export function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}

/** Whether the app runs as an installed app (added to the Home Screen). */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Whether to tell the user to add the app to the Home Screen first: iOS
 * supports web push only for installed web apps. */
export function needsHomeScreenInstall(): boolean {
  return isIos() && !isStandalone()
}

/** The VAPID key as the bytes `pushManager.subscribe` takes. */
function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }

  return bytes
}

/** The subscription this browser currently holds, or nothing. */
export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  const registration = await navigator.serviceWorker.ready

  return registration.pushManager.getSubscription()
}

/** The ways subscribing can end. */
export type SubscribeResult =
  | { status: 'subscribed'; subscription: PushSubscription }
  | { status: 'denied' }
  | { status: 'unsupported' }

/**
 * Asks for the notification permission and subscribes this browser. Call it
 * from a click handler only: it opens the browser's permission prompt.
 */
export async function subscribeToPush(
  publicKey: string
): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    return { status: 'unsupported' }
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    return { status: 'denied' }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(publicKey),
  })

  return { status: 'subscribed', subscription }
}

/** Drops this browser's subscription; answers its endpoint, if it had one. */
export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await currentPushSubscription()

  if (subscription === null) {
    return null
  }

  await subscription.unsubscribe()

  return subscription.endpoint
}
