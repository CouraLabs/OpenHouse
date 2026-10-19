import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, count, desc, eq, gt, isNull, max, or, sql } from 'drizzle-orm'
import type {
  Database,
  NewPasswordResetCode,
  PasswordResetCode,
  ResetCodeKind,
  User,
} from '@workspace/db'
import { passwordResetCodes, users } from '@workspace/db'

/** The database or an open transaction. */
type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0]

/** A code is open while it is unused and not yet expired at `now`. */
function isOpen(now: Date) {
  return and(
    isNull(passwordResetCodes.usedAt),
    or(
      isNull(passwordResetCodes.expiresAt),
      gt(passwordResetCodes.expiresAt, now)
    )
  )
}

/**
 * The password reset codes and the user rows a reset reads and writes. A
 * code names its user, so redeeming needs no tenant; issuing one for a
 * member reads the member through the owner's tenant, passed explicitly.
 */
@Injectable()
export class PasswordResetRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Runs `work` in one transaction, so invalidating and issuing — or
   * claiming and setting the password — happen together or not at all. */
  transaction<T>(work: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }

  /** Reads one user of the tenant. */
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

  /** Reads the user an email belongs to — emails are unique across every
   * tenant, so there is at most one. */
  async findUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))

    return row
  }

  /** Expires every open code of one kind the user holds, so only the codes
   * issued next work. */
  async expireOpen(
    userId: number,
    kind: ResetCodeKind,
    now: Date,
    tx: DbOrTx = this.db
  ): Promise<void> {
    await tx
      .update(passwordResetCodes)
      .set({ expiresAt: now })
      .where(
        and(
          eq(passwordResetCodes.userId, userId),
          eq(passwordResetCodes.kind, kind),
          isOpen(now)
        )
      )
  }

  /** Stores issued codes — their hashes only. */
  async insert(
    rows: NewPasswordResetCode[],
    tx: DbOrTx = this.db
  ): Promise<void> {
    await tx.insert(passwordResetCodes).values(rows)
  }

  /** Reads the code a hash belongs to, whatever its state. */
  async findByHash(codeHash: string): Promise<PasswordResetCode | undefined> {
    const [row] = await this.db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.codeHash, codeHash))

    return row
  }

  /**
   * Marks an open code used, answering it — or nothing when it was used or
   * expired meanwhile, so two redemptions racing cannot both succeed.
   */
  async claim(
    id: number,
    now: Date,
    tx: DbOrTx
  ): Promise<PasswordResetCode | undefined> {
    const [row] = await tx
      .update(passwordResetCodes)
      .set({ usedAt: now })
      .where(and(eq(passwordResetCodes.id, id), isOpen(now)))
      .returning()

    return row
  }

  /**
   * Sets an active user's password hash and clears the stored refresh hash,
   * which signs out every session they had. A removed user is left alone
   * and answers nothing.
   */
  async setActivePassword(
    userId: number,
    passwordHash: string,
    now: Date,
    tx: DbOrTx
  ): Promise<User | undefined> {
    const [row] = await tx
      .update(users)
      .set({ password: passwordHash, refreshTokenHash: null, updatedAt: now })
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .returning()

    return row
  }

  /** How many of the user's recovery codes are still open, and when the
   * latest set was generated. */
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

  /** When each server-issued code the user was not yet told about was
   * issued, newest first. */
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

  /** Records that the user saw the notices of their server-issued codes. */
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
