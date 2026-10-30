import {
  CAPTCHA_FAILED,
  CAPTCHA_REQUIRED,
  type CaptchaError,
} from '@workspace/poco'
import type { TurnstileConfig } from '../../config/env.js'
import { ForbiddenError } from '../errors.js'

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResult {
  success?: boolean
  action?: string
  hostname?: string
}

export class TurnstileVerifier {
  constructor(
    private readonly config: TurnstileConfig | undefined,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init)
  ) {}

  get enabled(): boolean {
    return this.config !== undefined
  }

  async verify(
    token: string | undefined,
    action: string,
    remoteIp: string
  ): Promise<void> {
    if (this.config === undefined) {
      return
    }

    if (token === undefined || token.length === 0) {
      throw captchaError(
        CAPTCHA_REQUIRED,
        'Complete the bot check to continue.'
      )
    }

    if (token.length > 2048) {
      throw rejected()
    }

    const result = await this.siteverify(this.config.secret, token, remoteIp)

    if (
      result?.success !== true ||
      result.action !== action ||
      result.hostname === undefined ||
      !this.config.hostnames.includes(result.hostname)
    ) {
      throw rejected()
    }
  }

  private async siteverify(
    secret: string,
    token: string,
    remoteIp: string
  ): Promise<SiteverifyResult | undefined> {
    const form = new URLSearchParams({ secret, response: token })
    if (remoteIp !== '') {
      form.set('remoteip', remoteIp)
    }

    try {
      const response = await this.fetcher(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) {
        return undefined
      }

      return (await response.json()) as SiteverifyResult
    } catch {
      return undefined
    }
  }
}

function captchaError(
  code: CaptchaError['code'],
  message: string
): ForbiddenError {
  return new ForbiddenError({
    message,
    error: 'Forbidden',
    statusCode: 403,
    code,
  } satisfies CaptchaError)
}

function rejected(): ForbiddenError {
  return captchaError(CAPTCHA_FAILED, 'The bot check failed. Try again.')
}
