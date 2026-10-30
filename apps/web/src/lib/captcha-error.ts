import { CAPTCHA_FAILED, CAPTCHA_REQUIRED } from '@workspace/poco'
import { ApiError } from './api.js'

export function isCaptchaError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) {
    return false
  }

  const code = (error.body as { code?: string } | undefined)?.code

  return code === CAPTCHA_REQUIRED || code === CAPTCHA_FAILED
}
