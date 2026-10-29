import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, asc, eq, gt, isNull, or } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { Database, DbOrTx, User } from '@workspace/db'
import { runBatch, type LedgerStatement } from '../common/ledger/ledger-batch.js'
import {
  calendarFeeds,
  notifications,
  passwordResetCodes,
  pushSubscriptions,
  users,
} from '@workspace/db'

/** A user row without its secrets — what the Users section reads. */
export type TenantUserRow = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'isActive' | 'anonymizedAt' | 'createdAt'
>

/** The columns a `TenantUserRow` selects. */
const PUBLIC_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  anonymizedAt: users.anonymizedAt,
  createdAt: users.createdAt,
}

/**
 * The tenant's user rows, reached only through the tenant of the session.
 * Every method takes the tenant id explicitly.
 */
@Injectable()
export class TenantUserRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Lists the tenant's users, oldest first. */
  async list(tenantId: number): Promise<TenantUserRow[]> {
    return this.db
      .select(PUBLIC_COLUMNS)
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.createdAt), asc(users.id))
  }

  /** Reads one user of the tenant. */
  async findById(
    tenantId: number,
    id: number,
    tx: DbOrTx = this.db
  ): Promise<TenantUserRow | undefined> {
    const [row] = await tx
      .select(PUBLIC_COLUMNS)
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))

    return row
  }

  /**
   * Deactivates a user under the guard that keeps the tenant one active
   * owner: removing the last active owner matches no rows, whichever
   * writer gets there first — the re-check the row locks once did.
   */
  async deactivate(
    tenantId: number,
    id: number
  ): Promise<TenantUserRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ isActive: false, refreshTokenHash: null, updatedAt: new Date() })
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.id, id),
          sql`(${users.role} <> 'owner' or exists (
            select 1 from users keeper
            where keeper.tenant_id = ${tenantId}
              and keeper.role = 'owner'
              and keeper.is_active = 1
              and keeper.id <> ${id}
          ))`
        )
      )
      .returning(PUBLIC_COLUMNS)

    return row
  }

  /** Restores a removed user; they sign in again to get a session. */
  async setActive(
    tenantId: number,
    id: number,
    isActive: boolean
  ): Promise<TenantUserRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set({ isActive, refreshTokenHash: null, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning(PUBLIC_COLUMNS)

    return row
  }

  /**
   * Anonymizes a user as one batch: the name and email are replaced, the
   * password hash and the refresh hash are cleared, and the open reset
   * codes expire — nothing can sign them back in. Nothing may reach an
   * erased member either: their push subscriptions and calendar feed go,
   * and so does their notification centre. The rows they created are not
   * touched.
   */
  async anonymizeWithAudit(
    tenantId: number,
    id: number,
    identity: { name: string; email: string },
    now: Date,
    auditStatement: LedgerStatement
  ): Promise<TenantUserRow | undefined> {
    const [row] = await this.db
      .update(users)
      .set({
        name: identity.name,
        email: identity.email,
        password: '',
        refreshTokenHash: null,
        isActive: false,
        anonymizedAt: now,
        updatedAt: now,
      })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning(PUBLIC_COLUMNS)

    if (row === undefined) {
      return undefined
    }

    await runBatch(this.db, [
      this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id)),
      this.db.delete(calendarFeeds).where(eq(calendarFeeds.userId, id)),
      this.db.delete(notifications).where(eq(notifications.userId, id)),
      this.db
        .update(passwordResetCodes)
        .set({ expiresAt: now })
        .where(
          and(
            eq(passwordResetCodes.userId, id),
            isNull(passwordResetCodes.usedAt),
            or(
              isNull(passwordResetCodes.expiresAt),
              gt(passwordResetCodes.expiresAt, now)
            )
          )
        ),
      auditStatement,
    ])

    return row
  }
}
