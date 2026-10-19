import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller.js'
import { SessionResolver } from '../common/session/session-resolver.js'
import { getJwtSecret, getJwtTtls } from '../config/env.js'
import { AuthService } from './auth.service.js'
import { JWT_TTLS } from './jwt-ttls.js'
import { PasswordChangeLimiter } from './password-change-limiter.js'
import { PasswordResetController } from './password-reset.controller.js'
import { PasswordResetRepository } from './password-reset.repository.js'
import { PasswordResetService } from './password-reset.service.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'
import { TokenService } from './token.service.js'
import { TokenSessionResolver } from './token-session.resolver.js'
import { SettingsModule } from '../settings/settings.module.js'

/**
 * Everything a session goes through: issuing and verifying the two JWTs,
 * resolving the session the global guard attaches, the auth routes
 * themselves, and password recovery without email (reset and recovery
 * codes). `SettingsModule` is imported so a sign-up seeds the new
 * tenant's settings and every session response carries them.
 *
 * The secret and lifetimes are read here, in module factories, so the
 * session code receives validated values instead of reading the environment.
 * `SessionResolver` is exported so `AppModule`'s global `AuthGuard` can
 * resolve sessions without `common/` knowing what a token or a user is.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({ secret: getJwtSecret() }),
    }),
    SettingsModule,
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [
    AuthService,
    TokenService,
    PasswordChangeLimiter,
    PasswordResetRepository,
    PasswordResetService,
    ResetAttemptLimiter,
    { provide: JWT_TTLS, useFactory: getJwtTtls },
    { provide: SessionResolver, useClass: TokenSessionResolver },
  ],
  exports: [SessionResolver],
})
export class AuthModule {}
