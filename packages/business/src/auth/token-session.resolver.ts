import type { Database } from '@workspace/db'

import type { Session } from '@workspace/domain'
import { SessionResolver } from '../ports/session-resolver.js'
import { TokenService } from './token.service.js'

export class TokenSessionResolver extends SessionResolver {
  constructor(
    private readonly tokens: TokenService,
    private readonly db: Database
  ) {
    super()
  }

  async resolve(accessToken: string): Promise<Session | null> {
    const claims = await this.tokens.verifyAccessToken(accessToken)
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
