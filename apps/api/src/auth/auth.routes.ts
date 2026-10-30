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
import type { TurnstileVerifier } from '../common/turnstile/turnstile-verifier.js'
import type { SessionResponse, SignUpAccepted } from '@workspace/poco'
import {
  changePasswordSchema,
  issueResetCodeSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from '@workspace/poco'
import type { AuthService } from './auth.service.js'
import type { EmailVerificationService } from './email-verification.service.js'
import type { PasswordChangeLimiter } from './password-change-limiter.js'
import type { PasswordResetService } from './password-reset.service.js'
import type { TokenService } from './token.service.js'

export function authRoutes(deps: {
  auth: AuthService
  tokens: TokenService
  passwordChanges: PasswordChangeLimiter
  passwordResets: PasswordResetService
  verification: EmailVerificationService
  turnstile: TurnstileVerifier
}): { publicRouter: App; protectedRouter: App } {
  const publicRouter = new Hono<AppEnv>()
  const protectedRouter = new Hono<AppEnv>()

  const limitCredentials = async (context: import('hono').Context<AppEnv>) =>
    limitRequest(context.env, 'credentials', clientAddressOf(context.req.raw))

  const limitEmail = async (context: import('hono').Context<AppEnv>) =>
    limitRequest(context.env, 'email', clientAddressOf(context.req.raw))

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
    setCookie(
      context,
      REFRESH_COOKIE,
      issued.refreshToken,
      rememberMe ? { ...options, maxAge: issued.refreshMaxAgeS } : options
    )

    return session
  }

  publicRouter.post('/sign-up', async (context) => {
    await limitCredentials(context)
    await limitEmail(context)
    const body = await parseJsonBody(context, signUpSchema)

    await deps.turnstile.verify(
      body.turnstileToken,
      'signup',
      clientAddressOf(context.req.raw)
    )

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

    await deps.verification.issue(created)

    return context.json(
      {
        verificationRequired: true,
        email: created.email,
      } satisfies SignUpAccepted,
      201
    )
  })

  publicRouter.post('/email/verify', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, verifyEmailSchema)

    const user = await deps.verification.verify(body.token)

    return context.json(
      await establish(context, await deps.auth.sessionFor(user), false)
    )
  })

  publicRouter.post('/email/resend', async (context) => {
    await limitCredentials(context)
    await limitEmail(context)
    const body = await parseJsonBody(context, resendVerificationSchema)

    await deps.turnstile.verify(
      body.turnstileToken,
      'verify-resend',
      clientAddressOf(context.req.raw)
    )

    await deps.verification.resend(body.email)

    return context.body(null, 202)
  })

  publicRouter.post('/sign-in', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, signInSchema)

    const session = await deps.auth.signIn({
      email: body.email,
      password: body.password,
    })

    return context.json(await establish(context, session, body.rememberMe))
  })

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

    return context.json(await establish(context, refreshed, claims.rem))
  })

  publicRouter.post('/password/reset', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, resetPasswordSchema)

    const user = await deps.passwordResets.redeem(body.code, body.newPassword)

    return context.json(
      await establish(context, await deps.auth.sessionFor(user), false)
    )
  })

  protectedRouter.post('/sign-out', async (context) => {
    const session = context.get('session')
    await deps.auth.signOut(session.user.id)

    deleteCookie(context, ACCESS_COOKIE, { path: '/' })
    deleteCookie(context, REFRESH_COOKIE, { path: '/' })

    return context.json({ ok: true })
  })

  protectedRouter.get('/me', async (context) => {
    const session = context.get('session')

    return context.json(await deps.auth.current(session))
  })

  protectedRouter.post('/password/change', async (context) => {
    const session = context.get('session')
    deps.passwordChanges.consume(session.user.id)

    const body = await parseJsonBody(context, changePasswordSchema)

    const changed = await deps.auth.changePassword(session.user.id, body)

    const presented = getCookie(context, REFRESH_COOKIE)
    const remembered =
      typeof presented === 'string' &&
      (await deps.tokens.verifyRefreshToken(presented))?.rem === true

    return context.json(await establish(context, changed, remembered))
  })

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

  protectedRouter.post(
    '/recovery-codes',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')

      return context.json({
        codes: await deps.passwordResets.generateRecoveryCodes(session.user.id),
      })
    }
  )

  protectedRouter.get('/security', async (context) => {
    const session = context.get('session')

    return context.json(await deps.passwordResets.security(session.user.id))
  })

  protectedRouter.post('/security/notices/seen', async (context) => {
    const session = context.get('session')

    await deps.passwordResets.acknowledgeServerNotices(session.user.id)

    return context.body(null, 204)
  })

  return { publicRouter, protectedRouter }
}
