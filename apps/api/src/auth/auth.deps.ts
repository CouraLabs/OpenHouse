import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App, AppEnv } from '../common/context.js'
import {
  BindingMailer,
  type SendEmailBinding,
} from '../common/mail/binding-mailer.js'
import { TurnstileVerifier } from '../common/turnstile/turnstile-verifier.js'
import type { Config } from '../config/env.js'
import { DEVELOPER_TIER, FREE_TIER } from '@workspace/poco'
import { tierGateFor } from '../tiers/tiers.deps.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { AuthService } from './auth.service.js'
import { EmailVerificationService } from './email-verification.service.js'
import { authRoutes } from './auth.routes.js'
import { PasswordChangeLimiter } from './password-change-limiter.js'
import { PasswordResetRepository } from './password-reset.repository.js'
import { PasswordResetService } from './password-reset.service.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'
import { SignInAttemptRepository } from './sign-in-attempt.repository.js'
import { SignInGuard } from './sign-in-guard.js'
import { TokenService } from './token.service.js'
import { TokenSessionResolver } from './token-session.resolver.js'
import { UserSessionRepository } from './user-session.repository.js'

export interface AuthDeps {
  publicRouter: App
  protectedRouter: App
  sessions: TokenSessionResolver
}

export function authDeps(
  db: Database,
  config: Config,
  clock: SystemClock,
  env: AppEnv['Bindings']
): AuthDeps {
  const tokens = new TokenService(config.jwtSecret, config.ttls)
  const settings = new SettingsRepository(db)
  const auth = new AuthService(
    db,
    tokens,
    settings,
    config.ttls,
    config.features.emailVerification,
    config.environment === 'development' ? DEVELOPER_TIER : FREE_TIER,
    tierGateFor(db, clock),
    new UserSessionRepository(db)
  )
  const passwordResets = new PasswordResetService(
    new PasswordResetRepository(db),
    new ResetAttemptLimiter(clock),
    clock
  )
  const passwordChanges = new PasswordChangeLimiter(clock)
  const verification = new EmailVerificationService(
    db,
    new BindingMailer(
      env.EMAIL as SendEmailBinding | undefined,
      config.mail.from
    ),
    clock,
    config.mail.appUrl
  )
  const turnstile = new TurnstileVerifier(config.turnstile)
  const signInGuard = new SignInGuard(
    new SignInAttemptRepository(db),
    turnstile,
    clock
  )

  const { publicRouter, protectedRouter } = authRoutes({
    auth,
    tokens,
    passwordChanges,
    passwordResets,
    verification,
    turnstile,
    signInGuard,
    authConfig: {
      captcha:
        config.turnstile === undefined
          ? null
          : { siteKey: config.turnstile.siteKey },
      emailVerification: config.features.emailVerification,
    },
  })

  return {
    publicRouter,
    protectedRouter,
    sessions: new TokenSessionResolver(tokens, db),
  }
}
