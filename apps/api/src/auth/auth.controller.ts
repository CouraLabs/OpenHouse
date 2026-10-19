import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import type { SessionResponse } from '@workspace/poco'
import { AuthService } from './auth.service.js'
import {
  ACCESS_COOKIE,
  baseCookieOptions,
  REFRESH_COOKIE,
} from '../common/session/auth.guard.js'
import {
  CurrentSession,
  Public,
  type Session,
} from '../common/session/session.js'
import {
  changePasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ChangePasswordBody,
  type ResetPasswordBody,
  type SignInBody,
  type SignUpBody,
} from '@workspace/poco'
import { PasswordChangeLimiter } from './password-change-limiter.js'
import { PasswordResetService } from './password-reset.service.js'
import { TokenService } from './token.service.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

/**
 * The attempts one IP may make at the credential routes per minute, when the
 * limits are enforced — tight enough to slow password guessing, loose enough
 * for a typo or two.
 */
const CREDENTIAL_THROTTLE = { default: { limit: 10, ttl: 60_000 } }

/**
 * The attempts one IP may make at redeeming a reset code per 15 minutes,
 * when the limits are enforced. A code is the whole credential, so the
 * route is tighter than sign-in; a failing code prefix is also blocked on
 * its own, in every environment.
 */
const RESET_THROTTLE = { default: { limit: 5, ttl: 15 * 60_000 } }

/**
 * The routes a browser session goes through: sign up, sign in, refresh, sign
 * out, and reading the session back. The tokens never touch the response
 * body — they ride in httpOnly cookies, so scripts on the page cannot read
 * them.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly passwordChanges: PasswordChangeLimiter,
    private readonly passwordResets: PasswordResetService
  ) {}

  /** Creates the tenant and its owner in one transaction, then signs in. */
  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('sign-up')
  async signUp(
    @Body(new ZodValidationPipe(signUpSchema)) body: SignUpBody,
    @Res({ passthrough: true }) response: Response
  ): Promise<SessionResponse> {
    const created =
      body.tenantName !== undefined
        ? await this.auth.signUpWithTenant({
            tenantName: body.tenantName,
            name: body.name,
            email: body.email,
            password: body.password,
            timezone: body.timezone,
            currency: body.currency,
          })
        : await this.auth.signUpWithCode({
            tenantCode: body.tenantCode as string,
            name: body.name,
            email: body.email,
            password: body.password,
          })

    return this.establish(response, created, false)
  }

  /** Checks the credentials and starts a session. */
  @Public()
  @HttpCode(200)
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('sign-in')
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) body: SignInBody,
    @Res({ passthrough: true }) response: Response
  ): Promise<SessionResponse> {
    const session = await this.auth.signIn({
      email: body.email,
      password: body.password,
    })

    return this.establish(response, session, body.rememberMe)
  }

  /**
   * Exchanges the refresh cookie for a fresh pair. The presented token is
   * rotated out: the next request with it fails, which is how a stolen
   * refresh token is caught.
   */
  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request
  ): Promise<SessionResponse> {
    const presented = request.cookies?.[REFRESH_COOKIE]
    if (typeof presented !== 'string' || presented === '') {
      throw new UnauthorizedException('Missing session.')
    }

    const claims = this.tokens.verifyRefreshToken(presented)
    if (claims === null) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    const refreshed = await this.auth.refresh(
      Number.parseInt(claims.sub, 10),
      presented
    )

    // The refresh token carries the sign-in's remember-me, so a remembered
    // session stays remembered: each refresh extends it by the remembered
    // lifetime, and an unremembered one stays a browser-session cookie.
    return this.establish(response, refreshed, claims.rem)
  }

  /** Ends the session server-side and clears both cookies. */
  @HttpCode(200)
  @Post('sign-out')
  async signOut(
    @CurrentSession() session: Session,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ ok: true }> {
    await this.auth.signOut(session.user.id)

    // `clearCookie` re-sets the cookie as expired rather than removing it
    // from the browser, which is what ends the session client-side.
    response.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), maxAge: 0 })
    response.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), maxAge: 0 })

    return { ok: true }
  }

  /** The session the current cookies resolve to, or 401. */
  @Get('me')
  me(@CurrentSession() session: Session): Promise<SessionResponse> {
    return this.auth.current(session)
  }

  /**
   * Changes the signed-in user's password. Every other session is signed
   * out; this one gets a fresh token pair, so the user stays signed in
   * here. Limited to 5 attempts per 15 minutes per user.
   */
  @HttpCode(200)
  @Post('password/change')
  async changePassword(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ): Promise<SessionResponse> {
    this.passwordChanges.consume(session.user.id)

    const changed = await this.auth.changePassword(session.user.id, body)

    // This session keeps the remember-me it was signed in with.
    const presented = request.cookies?.[REFRESH_COOKIE]
    const remembered =
      typeof presented === 'string' &&
      this.tokens.verifyRefreshToken(presented)?.rem === true

    return this.establish(response, changed, remembered)
  }

  /**
   * Redeems a reset code — owner-issued, a recovery code, or one the server
   * printed — for a new password, then signs the user in. Every session the
   * user had is signed out; wrong, expired, and used codes answer the same
   * 400.
   */
  @Public()
  @HttpCode(200)
  @Throttle(RESET_THROTTLE)
  @Post('password/reset')
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordBody,
    @Res({ passthrough: true }) response: Response
  ): Promise<SessionResponse> {
    const user = await this.passwordResets.redeem(body.code, body.newPassword)

    return this.establish(response, await this.auth.sessionFor(user), false)
  }

  /**
   * Issues the token pair for a session the service established and sets both
   * cookies. The refresh cookie's lifetime is a session cookie (no maxAge)
   * unless the sign-in asked to be remembered.
   */
  private async establish(
    response: Response,
    session: SessionResponse,
    rememberMe: boolean
  ): Promise<SessionResponse> {
    const issued = await this.auth.establishSession(session.user, rememberMe)
    const options = baseCookieOptions()

    response.cookie(ACCESS_COOKIE, issued.accessToken, {
      ...options,
      maxAge: issued.accessMaxAgeS * 1000,
    })
    response.cookie(
      REFRESH_COOKIE,
      issued.refreshToken,
      rememberMe
        ? { ...options, maxAge: issued.refreshMaxAgeS * 1000 }
        : options
    )

    return session
  }
}
