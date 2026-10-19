import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller.js'
import { SessionResolver } from '../common/session/session-resolver.js'
import { getJwtSecret, getJwtTtls } from '../config/env.js'
import { AuthService } from './auth.service.js'
import { JWT_TTLS } from './jwt-ttls.js'
import { PasswordChangeLimiter } from './password-change-limiter.js'
import { TokenService } from './token.service.js'
import { TokenSessionResolver } from './token-session.resolver.js'
import { SettingsModule } from '../settings/settings.module.js'

/**
 * Everything a session goes through: issuing and verifying the two JWTs,
 * resolving the session the global guard attaches, and the auth routes
 * themselves. `SettingsModule` is imported so a sign-up seeds the new
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
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordChangeLimiter,
    { provide: JWT_TTLS, useFactory: getJwtTtls },
    { provide: SessionResolver, useClass: TokenSessionResolver },
  ],
  exports: [SessionResolver],
})
export class AuthModule {}
