import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'

import type { AppEnv, App } from '../common/context.js'
import { UnauthorizedError } from '../common/errors.js'
import { clientAddressOf, limitRequest } from '../common/rate-limit.js'
import {
  baseCookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from '../common/session/cookies.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { SessionResponse } from '@workspace/poco'
import {
  changePasswordSchema,
  issueResetCodeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@workspace/poco'
import type { AuthService } from './auth.service.js'
import type { PasswordChangeLimiter } from './password-change-limiter.js'
import type { PasswordResetService } from './password-reset.service.js'
import type { TokenService } from './token.service.js'

/**
 * The routes a browser session goes through: sign up, sign in, refresh,
 * sign out, reading the session back, and the password changes and resets.
 * The tokens never touch the response body — they ride in httpOnly cookies,
 * so scripts on the page cannot read them.
 *
 * The credential routes ride the tighter rate-limit namespace; the same
 * shape the throttler's `@Throttle` guarded.
 */
export function authRoutes(deps: {
  auth: AuthService
  tokens: TokenService
  passwordChanges: PasswordChangeLimiter
  passwordResets: PasswordResetService
}): { publicRouter: App; protectedRouter: App } {
  const publicRouter = new Hono<AppEnv>()
  const protectedRouter = new Hono<AppEnv>()

  /** Limits the credential routes per client address. */
  const limitCredentials = async (context: import('hono').Context<AppEnv>) =>
    limitRequest(context.env, 'credentials', clientAddressOf(context.req.raw))

  /** Issues the token pair for a session the service established and sets
   * both cookies. The refresh cookie's lifetime is a session cookie (no
   * maxAge) unless the sign-in asked to be remembered. */
  async function establish(
    context: import('hono').Context<AppEnv>,
    session: SessionResponse,
    rememberMe: boolean
  ): Promise<SessionResponse> {
    const issued = await deps.auth.establishSession(session.user, rememberMe)
    const options = baseCookieOptions(context.req.raw.url)

    setCookie(context, ACCESS_COOKIE, issued.accessToken, {
      ...options,
      maxAge: issued.accessMaxAgeS,
    })
    setCookie(context, REFRESH_COOKIE, issued.refreshToken, rememberMe
      ? { ...options, maxAge: issued.refreshMaxAgeS }
      : options)

    return session
  }

  // --- The public routes (mounted before the auth middleware) ---

  /** Creates the tenant and its owner in one batch, then signs in. */
  publicRouter.post('/sign-up', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, signUpSchema)

    const created =
      body.tenantName !== undefined
        ? await deps.auth.signUpWithTenant({
            tenantName: body.tenantName,
            name: body.name,
            email: body.email,
            password: body.password,
            timezone: body.timezone,
            currency: body.currency,
          })
        : await deps.auth.signUpWithCode({
            tenantCode: body.tenantCode as string,
            name: body.name,
            email: body.email,
            password: body.password,
          })

    // A creation: 201, like the old controller's POST default.
    return context.json(await establish(context, created, false), 201)
  })

  /** Checks the credentials and starts a session. */
  publicRouter.post('/sign-in', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, signInSchema)

    const session = await deps.auth.signIn({
      email: body.email,
      password: body.password,
    })

    return context.json(await establish(context, session, body.rememberMe))
  })

  /**
   * Exchanges the refresh cookie for a fresh pair. The presented token is
   * rotated out: the next request with it fails, which is how a stolen
   * refresh token is caught.
   */
  publicRouter.post('/refresh', async (context) => {
    const presented = getCookie(context, REFRESH_COOKIE)

    if (typeof presented !== 'string' || presented === '') {
      throw new UnauthorizedError('Missing session.')
    }

    const claims = await deps.tokens.verifyRefreshToken(presented)

    if (claims === null) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    const refreshed = await deps.auth.refresh(
      Number.parseInt(claims.sub, 10),
      presented
    )

    // The refresh token carries the sign-in's remember-me, so a remembered
    // session stays remembered: each refresh extends it by the remembered
    // lifetime, and an unremembered one stays a browser-session cookie.
    return context.json(await establish(context, refreshed, claims.rem))
  })

  /**
   * Redeems a reset code — owner-issued, a recovery code, or one the server
   * printed — for a new password, then signs the user in. Every session the
   * user had is signed out; wrong, expired, and used codes answer one
   * generic 400.
   */
  publicRouter.post('/password/reset', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, resetPasswordSchema)

    const user = await deps.passwordResets.redeem(body.code, body.newPassword)

    return context.json(
      await establish(context, await deps.auth.sessionFor(user), false)
    )
  })

  // --- The signed-in routes ---

  /** Ends the session server-side and clears both cookies. */
  protectedRouter.post('/sign-out', async (context) => {
    const session = context.get('session')
    await deps.auth.signOut(session.user.id)

    // Setting the cookies expired ends the session client-side.
    deleteCookie(context, ACCESS_COOKIE, { path: '/' })
    deleteCookie(context, REFRESH_COOKIE, { path: '/' })

    return context.json({ ok: true })
  })

  /** The session the current cookies resolve to, or 401. */
  protectedRouter.get('/me', async (context) => {
    const session = context.get('session')

    return context.json(await deps.auth.current(session))
  })

  /**
   * Changes the signed-in user's password. Every other session is signed
   * out; this one gets a fresh token pair, so the user stays signed in
   * here. Limited to 5 attempts per 15 minutes per user.
   */
  protectedRouter.post('/password/change', async (context) => {
    const session = context.get('session')
    deps.passwordChanges.consume(session.user.id)

    const body = await parseJsonBody(context, changePasswordSchema)

    const changed = await deps.auth.changePassword(session.user.id, body)

    // This session keeps the remember-me it was signed in with.
    const presented = getCookie(context, REFRESH_COOKIE)
    const remembered =
      typeof presented === 'string' &&
      (await deps.tokens.verifyRefreshToken(presented))?.rem === true

    return context.json(await establish(context, changed, remembered))
  })

  /** Issues a one-time, 30-minute reset code for a member of the tenant. */
  protectedRouter.post(
    '/password/reset-codes',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const body = await parseJsonBody(context, issueResetCodeSchema)

      const issued = await deps.passwordResets.issueForMember(
        session.tenant.id,
        session.user.id,
        body.userId
      )

      return context.json({
        code: issued.code,
        expiresAt: issued.expiresAt.toISOString(),
      })
    }
  )

  /** Generates the owner's 10 recovery codes; the previous set stops
   * working. */
  protectedRouter.post('/recovery-codes', requireRole(['owner']), async (context) => {
    const session = context.get('session')

    return context.json({
      codes: await deps.passwordResets.generateRecoveryCodes(session.user.id),
    })
  })

  /** The signed-in user's recovery codes left and unacknowledged
   * server-issued resets. */
  protectedRouter.get('/security', async (context) => {
    const session = context.get('session')

    return context.json(await deps.passwordResets.security(session.user.id))
  })

  /** Acknowledges the notices of server-issued resets. */
  protectedRouter.post('/security/notices/seen', async (context) => {
    const session = context.get('session')

    await deps.passwordResets.acknowledgeServerNotices(session.user.id)

    return context.body(null, 204)
  })

  return { publicRouter, protectedRouter }
}
