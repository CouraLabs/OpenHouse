import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, asc, eq, gt, isNull, or } from 'drizzle-orm'
import type { Database, DbOrTx, User } from '@workspace/db'
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

  /** Runs `work` in one transaction, so a guard and its write agree. */
  transaction<T>(work: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }

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

  /** Locks and lists the ids of the tenant's active owners, so two
   * concurrent removals cannot both leave the tenant ownerless. */
  async lockActiveOwnerIds(tenantId: number, tx: DbOrTx): Promise<number[]> {
    const rows = await tx
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'owner'),
          eq(users.isActive, true)
        )
      )
      .for('update')

    return rows.map((row) => row.id)
  }

  /**
   * Activates or deactivates a user. Deactivating also clears the refresh
   * hash, so no session of theirs can be renewed; reactivating leaves it
   * cleared, so they sign in again.
   */
  async setActive(
    tenantId: number,
    id: number,
    isActive: boolean,
    tx: DbOrTx = this.db
  ): Promise<TenantUserRow | undefined> {
    const [row] = await tx
      .update(users)
      .set({ isActive, refreshTokenHash: null, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))
      .returning(PUBLIC_COLUMNS)

    return row
  }

  /**
   * Anonymizes a user: the name and email are replaced, the password hash and
   * the refresh hash are cleared, and the open reset codes expire — nothing
   * can sign them back in. The rows they created are not touched.
   */
  async anonymize(
    tenantId: number,
    id: number,
    identity: { name: string; email: string },
    now: Date,
    tx: DbOrTx = this.db
  ): Promise<TenantUserRow | undefined> {
    const [row] = await tx
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

    // Nothing may reach an erased member: their push subscriptions and
    // calendar feed go, and so does their notification centre.
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id))
    await tx.delete(calendarFeeds).where(eq(calendarFeeds.userId, id))
    await tx.delete(notifications).where(eq(notifications.userId, id))

    await tx
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
      )

    return row
  }
}
