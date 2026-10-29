import bcrypt from 'bcryptjs'
import type { User } from '@workspace/db'
import type { AccountSecurity } from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../common/errors.js'
import { PasswordResetRepository } from './password-reset.repository.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'
import {
  generateResetCode,
  hashesMatch,
  hashResetCode,
  isWellFormedResetCode,
  normalizeResetCode,
  resetCodePrefix,
} from './reset-code.js'

/** How long an owner-issued or a server-issued code works: 30 minutes. */
const SHORT_LIVED_MS = 30 * 60 * 1000

/** How many recovery codes a set holds. */
const RECOVERY_SET_SIZE = 10

/** The one answer for a wrong, expired, or used code — the response never
 * tells which, so it cannot be used to probe codes. */
const INVALID_CODE = 'This code is not valid.'

/**
 * Password recovery without email. A code sets a new password once:
 * an owner issues one for a member, an owner generates recovery codes for
 * themself in advance, or the server command prints one as the last resort.
 * Only a code's hash is stored; the plaintext is answered once and never
 * reaches the database. Redeeming signs out every session the user had.
 */
export class PasswordResetService {
  constructor(
    private readonly repository: PasswordResetRepository,
    private readonly limiter: ResetAttemptLimiter,
    private readonly clock: Clock
  ) {}

  /**
   * Issues a one-time code for a member of the owner's tenant, valid for 30
   * minutes; the member's older unused codes stop working. The member's
   * current password keeps working until the code is redeemed. An owner
   * cannot issue a code for an owner — themself included: owners recover
   * with their recovery codes.
   */
  async issueForMember(
    tenantId: number,
    ownerId: number,
    userId: number
  ): Promise<{ code: string; expiresAt: Date }> {
    const target = await this.repository.findUserInTenant(tenantId, userId)
    if (target === undefined) {
      throw new NotFoundError('User not found.')
    }
    if (target.role === 'owner') {
      throw new ConflictError('A reset code cannot be issued for an owner.')
    }
    if (!target.isActive) {
      throw new ConflictError(
        'This user was removed. Reactivate them first.'
      )
    }

    return this.issueShortLived(target.id, 'owner_issued', ownerId)
  }

  /**
   * Issues a one-time code from the server, for the user an email names —
   * the last resort of an owner who lost both password and recovery codes.
   * Valid for 30 minutes; the row is the audit entry, and the user is told
   * about it the next time they sign in.
   */
  async issueFromServer(
    email: string
  ): Promise<{ code: string; expiresAt: Date; user: User }> {
    const user = await this.repository.findUserByEmail(email)
    if (user === undefined) {
      throw new NotFoundError(`No user has the email ${email}.`)
    }

    const issued = await this.issueShortLived(user.id, 'server', null)

    return { ...issued, user }
  }

  /**
   * Generates a fresh set of recovery codes for the user; the previous set
   * stops working. The codes are answered once — only their hashes stay.
   */
  async generateRecoveryCodes(userId: number): Promise<string[]> {
    const now = this.clock.now()
    const codes = Array.from({ length: RECOVERY_SET_SIZE }, generateResetCode)

    await this.repository.replaceCodes(
      userId,
      'recovery',
      now,
      await Promise.all(
        codes.map(async (code) => ({
          userId,
          codeHash: await hashResetCode(code),
          kind: 'recovery' as const,
          createdAt: now,
        }))
      )
    )

    return codes
  }

  /**
   * Redeems a code — of any kind — for a new password. The code must be
   * open; the same error answers a wrong, expired, or used one, and a
   * prefix that keeps failing is blocked for an hour. On success the code
   * is used up, the password replaced, and every session of the user
   * signed out; the caller signs them in again.
   */
  async redeem(code: string, newPassword: string): Promise<User> {
    const normalized = normalizeResetCode(code)
    const prefix = resetCodePrefix(normalized)
    this.limiter.assertAllowed(prefix)

    const presented = await hashResetCode(normalized)
    const row = isWellFormedResetCode(normalized)
      ? await this.repository.findByHash(presented)
      : undefined
    const now = this.clock.now()

    if (
      row === undefined ||
      !hashesMatch(row.codeHash, presented) ||
      row.usedAt !== null ||
      (row.expiresAt !== null && row.expiresAt <= now)
    ) {
      throw await this.invalid(prefix)
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    // A code that loses the race, or names a removed user, stays unused
    // and changes nothing: the batch is atomic, and each guard answers
    // nothing when its half of the redemption is gone.
    const redeemed = await this.repository.redeem(
      row.id,
      row.userId,
      passwordHash,
      now
    )

    if (redeemed.kind !== 'claimed') {
      // Redeemed or expired between the read above and here; a removed
      // user cannot come back through a code.
      throw await this.invalid(prefix)
    }

    return redeemed.user
  }

  /** The user's recovery codes left and their unacknowledged server-issued
   * resets. */
  async security(userId: number): Promise<AccountSecurity> {
    const [recovery, notices] = await Promise.all([
      this.repository.recoveryStatus(userId, this.clock.now()),
      this.repository.unseenServerNotices(userId),
    ])

    return {
      recoveryCodes: {
        remaining: recovery.remaining,
        generatedAt: recovery.generatedAt?.toISOString() ?? null,
      },
      serverResetNotices: notices.map((issuedAt) => issuedAt.toISOString()),
    }
  }

  /** Records that the user saw their server-issued reset notices. */
  async acknowledgeServerNotices(userId: number): Promise<void> {
    await this.repository.markServerNoticesSeen(userId, this.clock.now())
  }

  /** Issues one 30-minute code, invalidating the user's open ones of the
   * same kind first. */
  private async issueShortLived(
    userId: number,
    kind: 'owner_issued' | 'server',
    issuedBy: number | null
  ): Promise<{ code: string; expiresAt: Date }> {
    const now = this.clock.now()
    const code = generateResetCode()
    const expiresAt = new Date(now.getTime() + SHORT_LIVED_MS)

    await this.repository.replaceCodes(
      userId,
      kind,
      now,
      [
        {
          userId,
          codeHash: await hashResetCode(code),
          kind,
          issuedBy,
          expiresAt,
          createdAt: now,
        },
      ]
    )

    return { code, expiresAt }
  }

  /** Records the failure and answers the one generic error. */
  private async invalid(prefix: string): Promise<BadRequestError> {
    this.limiter.recordFailure(prefix)

    return new BadRequestError(INVALID_CODE)
  }
}
