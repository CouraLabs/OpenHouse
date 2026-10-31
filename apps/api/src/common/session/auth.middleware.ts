import { getCookie } from 'hono/cookie'

import type { AppEnv } from '../context.js'
import { UnauthorizedError, ForbiddenError } from '@workspace/business'
import type { Session } from '@workspace/business'
import { ACCESS_COOKIE } from './cookies.js'
import type { UserRole } from '@workspace/dto'

export function authMiddleware() {
  return async (
    context: import('hono').Context<AppEnv>,
    next: () => Promise<void>
  ): Promise<void | Response> => {
    if (context.req.path === '/api/health') {
      return next()
    }

    const rawToken = getCookie(context, ACCESS_COOKIE)

    if (typeof rawToken !== 'string' || rawToken === '') {
      throw new UnauthorizedError('Missing session.')
    }

    const session = await context.var.business.sessions.resolve(rawToken)

    if (session === null) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    context.set('session', session)

    return next()
  }
}

const ANY_ROLE: readonly UserRole[] = ['owner', 'user']

export function requireRole(
  roles: readonly UserRole[]
): (
  context: import('hono').Context<AppEnv>,
  next: () => Promise<void>
) => Promise<void | Response> {
  return async (context, next) => {
    const session: Session | undefined = context.get('session')

    if (session === undefined) {
      throw new UnauthorizedError('Missing session.')
    }

    if (!roles.includes(session.role)) {
      throw new ForbiddenError('This route needs another role.')
    }

    return next()
  }
}
