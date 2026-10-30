import { and, asc, eq, gt, isNull, or } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { Database, User } from '@workspace/db'
import {
  runBatch,
  type LedgerStatement,
} from '../common/ledger/ledger-batch.js'
import {
  calendarFeeds,
  notifications,
  passwordResetCodes,
  pushSubscriptions,
  userSessions,
  users,
} from '@workspace/db'

export type TenantUserRow = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'isActive' | 'anonymizedAt' | 'createdAt'
>

const PUBLIC_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  anonymizedAt: users.anonymizedAt,
  createdAt: users.createdAt,
}

export class TenantUserRepository {
  constructor(private readonly db: Database) {}

  async list(tenantId: number): Promise<TenantUserRow[]> {
    return this.db
      .select(PUBLIC_COLUMNS)
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.createdAt), asc(users.id))
  }

  async findById(
    tenantId: number,
    id: number
  ): Promise<TenantUserRow | undefined> {
    const [row] = await this.db
      .select(PUBLIC_COLUMNS)
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))

    return row
  }

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

    if (row !== undefined) {
      await this.db.delete(userSessions).where(eq(userSessions.userId, id))
    }

    return row
  }

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

    if (row !== undefined) {
      await this.db.delete(userSessions).where(eq(userSessions.userId, id))
    }

    return row
  }

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
      this.db.delete(userSessions).where(eq(userSessions.userId, id)),
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
