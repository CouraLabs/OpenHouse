import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from '../common/session/auth.guard.js'
import { AuthService } from './auth.service.js'
import { PasswordChangeLimiter } from './password-change-limiter.js'
import { TokenService } from './token.service.js'
import { SettingsModule } from '../settings/settings.module.js'

/**
 * Everything a session goes through: issuing and verifying the two JWTs,
 * guarding the routes of every other module, and the auth routes themselves.
 * `SettingsModule` is imported so a sign-up seeds the new tenant's settings
 * and every session response carries them.
 *
 * The `AuthGuard` is exported so `AppModule` can bind it as a global guard:
 * every route is protected unless a controller opts out.
 */
@Module({
  imports: [JwtModule.register({}), SettingsModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, AuthGuard, PasswordChangeLimiter],
  exports: [AuthGuard, TokenService],
})
export class AuthModule {}
