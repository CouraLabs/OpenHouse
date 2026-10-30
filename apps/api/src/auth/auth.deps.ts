import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { AuthService } from './auth.service.js'
import { authRoutes } from './auth.routes.js'
import { PasswordChangeLimiter } from './password-change-limiter.js'
import { PasswordResetRepository } from './password-reset.repository.js'
import { PasswordResetService } from './password-reset.service.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'
import { TokenService } from './token.service.js'
import { TokenSessionResolver } from './token-session.resolver.js'

export interface AuthDeps {
  publicRouter: App
  protectedRouter: App
  sessions: TokenSessionResolver
}

export function authDeps(
  db: Database,
  config: Config,
  clock: SystemClock
): AuthDeps {
  const tokens = new TokenService(config.jwtSecret, config.ttls)
  const settings = new SettingsRepository(db)
  const auth = new AuthService(db, tokens, settings, config.ttls)
  const passwordResets = new PasswordResetService(
    new PasswordResetRepository(db),
    new ResetAttemptLimiter(clock),
    clock
  )
  const passwordChanges = new PasswordChangeLimiter(clock)

  const { publicRouter, protectedRouter } = authRoutes({
    auth,
    tokens,
    passwordChanges,
    passwordResets,
  })

  return {
    publicRouter,
    protectedRouter,
    sessions: new TokenSessionResolver(tokens, db),
  }
}
