import { and, count, desc, eq, gt, isNull, max, or, sql } from 'drizzle-orm'
import type { ResetCodeKind } from '@workspace/domain'
import type { Database } from '../../database.js'
import {
  passwordResetCodes,
  userSessions,
  users,
  type NewPasswordResetCode,
  type PasswordResetCode,
  type User,
} from '../../schema.js'

function isOpen(now: Date) {
  return and(
    isNull(passwordResetCodes.usedAt),
    or(
      isNull(passwordResetCodes.expiresAt),
      gt(passwordResetCodes.expiresAt, now)
    )
  )
}

export class PasswordResetRepository {
  constructor(private readonly db: Database) {}

  async findUserInTenant(
    tenantId: number,
    id: number
  ): Promise<User | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)))

    return row
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))

    return row
  }

  async replaceCodes(
    userId: number,
    kind: ResetCodeKind,
    now: Date,
    rows: NewPasswordResetCode[]
  ): Promise<void> {
    await this.db.batch([
      this.db
        .update(passwordResetCodes)
        .set({ expiresAt: now })
        .where(
          and(
            eq(passwordResetCodes.userId, userId),
            eq(passwordResetCodes.kind, kind),
            isOpen(now)
          )
        ),
      this.db.insert(passwordResetCodes).values(rows),
    ])
  }

  async findByHash(codeHash: string): Promise<PasswordResetCode | undefined> {
    const [row] = await this.db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.codeHash, codeHash))

    return row
  }

  async redeem(
    codeId: number,
    userId: number,
    passwordHash: string,
    now: Date
  ): Promise<
    | { kind: 'claimed'; user: User }
    | { kind: 'codeTaken' }
    | { kind: 'userGone' }
  > {
    const results = await this.db.batch([
      this.db
        .update(passwordResetCodes)
        .set({ usedAt: now })
        .where(and(eq(passwordResetCodes.id, codeId), isOpen(now)))
        .returning(),
      this.db
        .update(users)
        .set({ password: passwordHash, refreshTokenHash: null, updatedAt: now })
        .where(and(eq(users.id, userId), eq(users.isActive, true)))
        .returning(),
      this.db.delete(userSessions).where(eq(userSessions.userId, userId)),
    ])

    const [claimed, user] = results as unknown as [PasswordResetCode[], User[]]

    if (user.length === 0) {
      return { kind: 'userGone' }
    }

    if (claimed.length === 0) {
      return { kind: 'codeTaken' }
    }

    return { kind: 'claimed', user: user[0] }
  }

  async recoveryStatus(
    userId: number,
    now: Date
  ): Promise<{ remaining: number; generatedAt: Date | null }> {
    const recovery = and(
      eq(passwordResetCodes.userId, userId),
      eq(passwordResetCodes.kind, 'recovery')
    )
    const [[open], [latest]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(passwordResetCodes)
        .where(and(recovery, isOpen(now))),
      this.db
        .select({ value: max(passwordResetCodes.createdAt) })
        .from(passwordResetCodes)
        .where(recovery),
    ])

    return { remaining: open.value, generatedAt: latest.value }
  }

  async unseenServerNotices(userId: number): Promise<Date[]> {
    const rows = await this.db
      .select({ createdAt: passwordResetCodes.createdAt })
      .from(passwordResetCodes)
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          eq(passwordResetCodes.kind, 'server'),
          isNull(passwordResetCodes.noticeSeenAt)
        )
      )
      .orderBy(desc(passwordResetCodes.createdAt))

    return rows.map((row) => row.createdAt)
  }

  async markServerNoticesSeen(userId: number, now: Date): Promise<void> {
    await this.db
      .update(passwordResetCodes)
      .set({ noticeSeenAt: now })
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          eq(passwordResetCodes.kind, 'server'),
          isNull(passwordResetCodes.noticeSeenAt)
        )
      )
  }
}
