import type { Clock } from '../common/clock/clock.js'
import type { TurnstileVerifier } from '../common/turnstile/turnstile-verifier.js'
import { needsSignInCaptcha } from './sign-in-captcha-policy.js'
import type { SignInAttemptRepository } from './sign-in-attempt.repository.js'
import { hashToken } from './token.service.js'

export class SignInGuard {
  constructor(
    private readonly attempts: SignInAttemptRepository,
    private readonly turnstile: TurnstileVerifier,
    private readonly clock: Clock
  ) {}

  async check(input: {
    email: string
    clientAddress: string
    turnstileToken: string | undefined
  }): Promise<void> {
    if (!this.turnstile.enabled) {
      return
    }

    const keys = [await hashToken(`email:${input.email.trim().toLowerCase()}`)]
    if (input.clientAddress !== '') {
      keys.push(await hashToken(`ip:${input.clientAddress}`))
    }

    const now = this.clock.now()
    const previous = await this.attempts.touch(keys, now)

    if (
      input.turnstileToken !== undefined ||
      needsSignInCaptcha(previous, now)
    ) {
      await this.turnstile.verify(
        input.turnstileToken,
        'login',
        input.clientAddress
      )
    }
  }
}
