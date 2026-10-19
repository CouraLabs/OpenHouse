import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database, UserRole } from '@workspace/db'
import { getJwtTtls } from '../../config/env.js'
import { isPublic, type AuthenticatedRequest, type Session } from './session.js'
import { TokenService } from '../../auth/token.service.js'

/** The cookie holding the access token. Read by the guard, written at sign-in. */
export const ACCESS_COOKIE = 'openhouse_access'

/** The cookie holding the refresh token. Read by the refresh route only. */
export const REFRESH_COOKIE = 'openhouse_refresh'

/** The base cookie options every cookie of the session shares. */
export function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

/** The max-age, in seconds, of the refresh cookie for a session. */
export function refreshCookieMaxAgeS(rememberMe: boolean): number {
  return rememberMe
    ? getJwtTtls().rememberRefreshTtlS
    : getJwtTtls().refreshTtlS
}

/** The roles a route accepts when it declares none: any signed-in user. */
const ANY_ROLE: readonly UserRole[] = ['owner', 'user']

/**
 * Guards every route the application does not mark public: it verifies the
 * access cookie's JWT, loads the user and their tenant from the database, and
 * attaches the session for the decorators to read.
 *
 * The database read on every request is what keeps the tenant context
 * authoritative — the token never carries tenant data, so a user moved
 * between tenants or deactivated never keeps acting on a stale tenant.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(Reflector) private readonly reflector: Reflector,
    @InjectDrizzle() private readonly db: Database
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

    const claims = this.tokens.verifyAccessToken(rawToken)
    if (claims === null) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    const userId = Number.parseInt(claims.sub, 10)
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    const [row] = await this.db.query.users.findMany({
      where: { id: userId },
      with: { tenant: true },
      columns: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        startPage: true,
        createdAt: true,
        updatedAt: true,
      },
      limit: 1,
    })
    if (row === undefined || !row.isActive || row.tenant === undefined) {
      throw new UnauthorizedException('Session expired or invalid.')
    }

    const { tenant, ...user } = row
    const session: Session = { user, tenant, role: user.role }
    const acceptedRoles =
      this.reflector.getAllAndOverride<readonly UserRole[]>('accepted-roles', [
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
