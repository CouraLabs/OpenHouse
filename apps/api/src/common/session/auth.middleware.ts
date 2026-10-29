import { getCookie } from 'hono/cookie'

import type { AppEnv } from '../context.js'
import { UnauthorizedError, ForbiddenError } from '../errors.js'
import type { SessionResolver } from './session-resolver.js'
import type { Session } from './session.js'
import { ACCESS_COOKIE } from './cookies.js'
import type { UserRole } from '@workspace/db'

/**
 * The auth middleware: the replacement of the global `AuthGuard`. Mounted
 * on the authenticated router group after the public auth routes, it hands
 * the access cookie to the `SessionResolver` and attaches the session for
 * the handlers to read (`c.var.session`). A request without a session that
 * reaches here answers 401.
 */
export function authMiddleware(sessions: SessionResolver) {
  return async (
    context: import('hono').Context<AppEnv>,
    next: () => Promise<void>
  ): Promise<void | Response> => {
    // The deployment probe's route needs no session.
    if (context.req.path === '/api/health') {
      return next()
    }

    const rawToken = getCookie(context, ACCESS_COOKIE)

    if (typeof rawToken !== 'string' || rawToken === '') {
      throw new UnauthorizedError('Missing session.')
    }

    const session = await sessions.resolve(rawToken)

    if (session === null) {
      throw new UnauthorizedError('Session expired or invalid.')
    }

    context.set('session', session)

    return next()
  }
}

/** The roles a route accepts when it declares none: any signed-in user. */
const ANY_ROLE: readonly UserRole[] = ['owner', 'user']

/** The role middleware replacing `@Roles()`: a route it wraps answers 403
 * to a role outside the list. */
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
