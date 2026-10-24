import type { NotificationBody, PushPayload } from '@workspace/poco'

/** Where tapping a push opens. */
export const PUSH_URL = '/upcoming'

/**
 * Builds the push payload for the reminders sent together. Quiet unless the
 * user opted in to details: a lock screen is a shared space in a household,
 * so by default the message carries a count and a route — nothing else.
 */
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
