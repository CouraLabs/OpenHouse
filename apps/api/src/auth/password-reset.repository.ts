import { and, count, desc, eq, gt, isNull, max, or, sql } from 'drizzle-orm'
import type {
  Database,
  NewPasswordResetCode,
  PasswordResetCode,
  ResetCodeKind,
  User,
} from '@workspace/db'
import { passwordResetCodes, users } from '@workspace/db'

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
export class PasswordResetRepository {
  constructor(private readonly db: Database) {}

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

  /**
   * Expires every open code of one kind the user holds and stores the
   * issued ones — their hashes only — as one batch: the old codes stop and
   * the new ones start together.
   */
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

  /** Reads the code a hash belongs to, whatever its state. */
  async findByHash(codeHash: string): Promise<PasswordResetCode | undefined> {
    const [row] = await this.db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.codeHash, codeHash))

    return row
  }

  /**
   * Redeems a code for a new password as one batch: the code is claimed
   * (used) and the password set together — two redemptions racing lose one
   * to the claim's guard, and a claim with no password set behind it is
   * impossible. The claim's guard answers nothing when the code was used
   * or expired meanwhile; the password's guard answers nothing when the
   * user is gone; the caller tells them apart from the returned rows.
   */
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
    ])

    const [claimed, user] = results as [PasswordResetCode[], User[]]

    if (user.length === 0) {
      return { kind: 'userGone' }
    }

    if (claimed.length === 0) {
      return { kind: 'codeTaken' }
    }

    return { kind: 'claimed', user: user[0] }
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
