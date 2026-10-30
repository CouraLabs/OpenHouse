export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function needsHomeScreenInstall(): boolean {
  return isIos() && !isStandalone()
}

function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }

  return bytes
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  const registration = await navigator.serviceWorker.ready

  return registration.pushManager.getSubscription()
}

export type SubscribeResult =
  | { status: 'subscribed'; subscription: PushSubscription }
  | { status: 'denied' }
  | { status: 'unsupported' }

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

export async function unsubscribeFromPush(): Promise<string | null> {
  const subscription = await currentPushSubscription()

  if (subscription === null) {
    return null
  }

  await subscription.unsubscribe()

  return subscription.endpoint
}
