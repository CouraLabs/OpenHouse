import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'

import type { AppEnv, App } from '../common/context.js'
import { UnauthorizedError } from '@workspace/business'
import { clientAddressOf, limitRequest } from '../common/rate-limit.js'
import {
  baseCookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from '../common/session/cookies.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type {
  AuthConfig,
  SessionResponse,
  SignUpAccepted,
} from '@workspace/dto'
import {
  changePasswordSchema,
  issueResetCodeSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from '@workspace/dto'

export function authRoutes(): { publicRouter: App; protectedRouter: App } {
  const publicRouter = new Hono<AppEnv>()
  const protectedRouter = new Hono<AppEnv>()

  const limitCredentials = async (context: import('hono').Context<AppEnv>) =>
    limitRequest(context.env, 'credentials', clientAddressOf(context.req.raw))

  const limitEmail = async (context: import('hono').Context<AppEnv>) =>
    limitRequest(context.env, 'email', clientAddressOf(context.req.raw))

  async function establish(
    context: import('hono').Context<AppEnv>,
    session: SessionResponse,
    rememberMe: boolean,
    previousToken?: string
  ): Promise<SessionResponse> {
    const issued = await context.var.business.auth.establishSession(
      session,
      rememberMe,
      previousToken
    )
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

    await context.var.business.turnstile.verify(
      body.turnstileToken,
      'signup',
      clientAddressOf(context.req.raw)
    )

    const created =
      body.tenantName !== undefined
        ? await context.var.business.auth.signUpWithTenant({
            tenantName: body.tenantName,
            name: body.name,
            email: body.email,
            password: body.password,
            timezone: body.timezone,
            currency: body.currency,
          })
        : await context.var.business.auth.signUpWithCode({
            tenantCode: body.tenantCode as string,
            name: body.name,
            email: body.email,
            password: body.password,
          })

    if (!context.var.business.authConfig.emailVerification) {
      const session = await establish(
        context,
        await context.var.business.auth.sessionFor(created),
        false
      )
      return context.json({ ...session, status: 'accepted' as const }, 201)
    }

    await context.var.business.emailVerification.issue(created)

    return context.json(
      {
        status: 'verificationRequired',
        verificationRequired: true,
        email: created.email,
      } satisfies SignUpAccepted,
      201
    )
  })

  publicRouter.get('/config', (context) =>
    context.json(context.var.business.authConfig)
  )

  publicRouter.post('/email/verify', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, verifyEmailSchema)

    const user = await context.var.business.emailVerification.verify(body.token)

    return context.json(
      await establish(
        context,
        await context.var.business.auth.sessionFor(user),
        false
      )
    )
  })

  publicRouter.post('/email/resend', async (context) => {
    await limitCredentials(context)
    await limitEmail(context)
    const body = await parseJsonBody(context, resendVerificationSchema)

    await context.var.business.turnstile.verify(
      body.turnstileToken,
      'verify-resend',
      clientAddressOf(context.req.raw)
    )

    await context.var.business.emailVerification.resend(body.email)

    return context.body(null, 202)
  })

  publicRouter.post('/sign-in', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, signInSchema)

    await context.var.business.signInGuard.check({
      email: body.email,
      clientAddress: clientAddressOf(context.req.raw),
      turnstileToken: body.turnstileToken,
    })

    const session = await context.var.business.auth.signIn({
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

    const claims =
      await context.var.business.tokens.verifyRefreshToken(presented)

    if (claims === null) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    const refreshed = await context.var.business.auth.refresh(
      Number.parseInt(claims.sub, 10),
      presented
    )

    return context.json(
      await establish(context, refreshed, claims.rem, presented)
    )
  })

  publicRouter.post('/password/reset', async (context) => {
    await limitCredentials(context)
    const body = await parseJsonBody(context, resetPasswordSchema)

    const user = await context.var.business.passwordResets.redeem(
      body.code,
      body.newPassword
    )

    return context.json(
      await establish(
        context,
        await context.var.business.auth.sessionFor(user),
        false
      )
    )
  })

  protectedRouter.post('/sign-out', async (context) => {
    const session = context.get('session')
    await context.var.business.auth.signOut(
      session.user.id,
      getCookie(context, REFRESH_COOKIE)
    )

    deleteCookie(context, ACCESS_COOKIE, { path: '/' })
    deleteCookie(context, REFRESH_COOKIE, { path: '/' })

    return context.json({ ok: true })
  })

  protectedRouter.get('/me', async (context) => {
    const session = context.get('session')

    return context.json(await context.var.business.auth.current(session))
  })

  protectedRouter.post('/password/change', async (context) => {
    const session = context.get('session')
    context.var.business.passwordChanges.consume(session.user.id)

    const body = await parseJsonBody(context, changePasswordSchema)

    const changed = await context.var.business.auth.changePassword(
      session.user.id,
      body
    )

    const presented = getCookie(context, REFRESH_COOKIE)
    const remembered =
      typeof presented === 'string' &&
      (await context.var.business.tokens.verifyRefreshToken(presented))?.rem ===
        true

    return context.json(await establish(context, changed, remembered))
  })

  protectedRouter.post(
    '/password/reset-codes',
    requireRole(['owner']),
    async (context) => {
      const session = context.get('session')
      const body = await parseJsonBody(context, issueResetCodeSchema)

      const issued = await context.var.business.passwordResets.issueForMember(
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
        codes: await context.var.business.passwordResets.generateRecoveryCodes(
          session.user.id
        ),
      })
    }
  )

  protectedRouter.get('/security', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.passwordResets.security(session.user.id)
    )
  })

  protectedRouter.post('/security/notices/seen', async (context) => {
    const session = context.get('session')

    await context.var.business.passwordResets.acknowledgeServerNotices(
      session.user.id
    )

    return context.body(null, 204)
  })

  return { publicRouter, protectedRouter }
}
