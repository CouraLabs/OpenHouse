import type { NotificationBody, PushPayload } from '@workspace/poco'

export const PUSH_URL = '/upcoming'

export function buildPushPayload(
  bodies: readonly NotificationBody[],
  includeDetails: boolean
): PushPayload {
  const count = bodies.reduce(
    (sum, body) => sum + (body.kind === 'digest' ? body.items.length : 1),
    0
  )

  return {
    v: 1,
    count,
    url: PUSH_URL,
    ...(includeDetails ? { details: [...bodies] } : {}),
  }
}
