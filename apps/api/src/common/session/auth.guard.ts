import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { UserRole } from '@workspace/db'
import { isProduction } from '../../config/env.js'
import { isPublic, ROLES_KEY, type AuthenticatedRequest } from './session.js'
import { SessionResolver } from './session-resolver.js'

/** The cookie holding the access token. Read by the guard, written at sign-in. */
export const ACCESS_COOKIE = 'openhouse_access'

/** The cookie holding the refresh token. Read by the refresh route only. */
export const REFRESH_COOKIE = 'openhouse_refresh'

/** The base cookie options every cookie of the session shares. */
export function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction(),
    path: '/',
  }
}

/** The roles a route accepts when it declares none: any signed-in user. */
const ANY_ROLE: readonly UserRole[] = ['owner', 'user']

/**
 * Guards every route the application does not mark public: it hands the
 * access cookie to the `SessionResolver`, checks the route's roles, and
 * attaches the session for the decorators to read.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SessionResolver) private readonly sessions: SessionResolver,
    @Inject(Reflector) private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // A route the application marked public — the auth routes a session is
    // being created through — passes without cookies.
    if (isPublic(context.getHandler(), context.getClass())) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const rawToken = request.cookies?.[ACCESS_COOKIE]
    if (typeof rawToken !== 'string' || rawToken === '') {
      throw new UnauthorizedException('Missing session.')
    }

    const session = await this.sessions.resolve(rawToken)
    if (session === null) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    const acceptedRoles =
      this.reflector.getAllAndOverride<readonly UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? ANY_ROLE
    if (!acceptedRoles.includes(session.role)) {
      throw new ForbiddenException('This route needs another role.')
    }

    request.session = session

    return true
  }
}
