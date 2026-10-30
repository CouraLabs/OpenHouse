export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export const RESEND_COOLDOWN_MS = 60 * 1000

export const SEND_WINDOW_MS = 24 * 60 * 60 * 1000

export const MAX_SENDS_PER_WINDOW = 5

export interface SendHistory {
  sentAt: Date | null
  windowAt: Date | null
  sends: number
}

export type SendDecision =
  { allowed: false } | { allowed: true; windowAt: Date; sends: number }

export function decideSend(history: SendHistory, now: Date): SendDecision {
  const at = now.getTime()

  if (
    history.sentAt !== null &&
    at - history.sentAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return { allowed: false }
  }

  const windowOpen =
    history.windowAt !== null &&
    at - history.windowAt.getTime() < SEND_WINDOW_MS

  if (!windowOpen) {
    return { allowed: true, windowAt: now, sends: 1 }
  }

  if (history.sends >= MAX_SENDS_PER_WINDOW) {
    return { allowed: false }
  }

  return {
    allowed: true,
    windowAt: history.windowAt as Date,
    sends: history.sends + 1,
  }
}
