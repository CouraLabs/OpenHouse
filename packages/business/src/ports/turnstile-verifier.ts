import {
  CAPTCHA_FAILED,
  CAPTCHA_REQUIRED,
  type CaptchaError,
} from '@workspace/dto'
import { ForbiddenError } from '../errors.js'

export interface TurnstileConfig {
  secret: string
  hostnames: readonly string[]
  siteKey: string
}

export interface SiteverifyResult {
  success?: boolean
  action?: string
  hostname?: string
}

export type SiteverifyFn = (
  secret: string,
  token: string,
  remoteIp: string
) => Promise<SiteverifyResult | undefined>

export class TurnstileVerifier {
  constructor(
    private readonly config: TurnstileConfig | undefined,
    private readonly siteverify: SiteverifyFn
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
