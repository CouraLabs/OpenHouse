import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import type { Database, TenantCode } from '@workspace/db'
import { tenantCodes } from '@workspace/db'

import { Clock } from '../common/clock/clock.js'

/**
 * The length of the generated code, in characters. 24 URL-safe characters is
 * 144 bits of entropy — beyond brute force, short enough to paste.
 */
const CODE_BYTES = 18

/** A day, in milliseconds — the unit an invite's lifetime is chosen in. */
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Generates the single-use codes an owner hands out so the next users of the
 * tenant can sign up, lists them, and revokes the ones still open.
 */
@Injectable()
export class InviteCodeService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly clock: Clock
  ) {}

  /** Creates an unused code for the tenant, expiring after `expiresInDays`
   * days, or never when nothing is given. */
  async create(tenantId: number, expiresInDays?: number): Promise<TenantCode> {
    const code = randomBytes(CODE_BYTES).toString('base64url')
    const expiresAt =
      expiresInDays === undefined
        ? null
        : new Date(this.clock.now().getTime() + expiresInDays * DAY_MS)

    const [row] = await this.db
      .insert(tenantCodes)
      .values({ tenantId, code, expiresAt })
      .returning()

    return row
  }

  /** Lists the tenant's codes, newest first. */
  async list(tenantId: number): Promise<TenantCode[]> {
    return this.db.query.tenantCodes.findMany({
      where: { tenantId },
      orderBy: (codes, ops) => ops.desc(codes.createdAt),
    })
  }

  /**
   * Revokes an open code: it expires now, so it stops working at once but
   * stays listed. A code already redeemed cannot be revoked.
   */
  async revoke(tenantId: number, id: number): Promise<void> {
    const [row] = await this.db
      .select()
      .from(tenantCodes)
      .where(and(eq(tenantCodes.tenantId, tenantId), eq(tenantCodes.id, id)))
    if (row === undefined) {
      throw new NotFoundException('Invite code not found.')
    }
    if (row.usedAt !== null) {
      throw new ConflictException('This invite code was already used.')
    }

    const now = this.clock.now()
    if (row.expiresAt !== null && row.expiresAt <= now) {
      return
    }

    await this.db
      .update(tenantCodes)
      .set({ expiresAt: now })
      .where(eq(tenantCodes.id, id))
  }
}
