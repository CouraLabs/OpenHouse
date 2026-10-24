import { Inject, Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import type { Session } from '../common/session/session.js'
import { SessionResolver } from '../common/session/session-resolver.js'
import { TokenService } from './token.service.js'

/**
 * Resolves an access token by verifying its JWT and loading the user and
 * their tenant from the database.
 *
 * The database read on every request is what keeps the tenant context
 * authoritative — the token never carries tenant data, so a user moved
 * between tenants or deactivated never keeps acting on a stale tenant.
 */
@Injectable()
export class TokenSessionResolver extends SessionResolver {
  constructor(
    @Inject(TokenService) private readonly tokens: TokenService,
    @InjectDrizzle() private readonly db: Database
  ) {
    super()
  }

  async resolve(accessToken: string): Promise<Session | null> {
    const claims = this.tokens.verifyAccessToken(accessToken)
    if (claims === null) {
      return null
    }

    const userId = Number.parseInt(claims.sub, 10)
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return null
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
        anonymizedAt: true,
        startPage: true,
        createdAt: true,
        updatedAt: true,
      },
      limit: 1,
    })
    if (row === undefined || !row.isActive || row.tenant === undefined) {
      return null
    }

    const { tenant, ...user } = row

    return { user, tenant, role: user.role }
  }
}
