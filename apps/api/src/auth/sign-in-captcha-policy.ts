export const RAPID_SIGN_IN_WINDOW_MS = 5_000

export const SIGN_IN_ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000

export function needsSignInCaptcha(
  previousAttempts: Array<Date | null>,
  now: Date
): boolean {
  return previousAttempts.some(
    (at) =>
      at !== null && now.getTime() - at.getTime() < RAPID_SIGN_IN_WINDOW_MS
  )
}
