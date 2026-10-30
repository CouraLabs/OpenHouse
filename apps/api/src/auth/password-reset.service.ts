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

const SHORT_LIVED_MS = 30 * 60 * 1000

const RECOVERY_SET_SIZE = 10

const INVALID_CODE = 'This code is not valid.'

export class PasswordResetService {
  constructor(
    private readonly repository: PasswordResetRepository,
    private readonly limiter: ResetAttemptLimiter,
    private readonly clock: Clock
  ) {}

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

    const redeemed = await this.repository.redeem(
      row.id,
      row.userId,
      passwordHash,
      now
    )

    if (redeemed.kind !== 'claimed') {
      throw await this.invalid(prefix)
    }

    return redeemed.user
  }

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

  async acknowledgeServerNotices(userId: number): Promise<void> {
    await this.repository.markServerNoticesSeen(userId, this.clock.now())
  }

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

  private async invalid(prefix: string): Promise<BadRequestError> {
    this.limiter.recordFailure(prefix)

    return new BadRequestError(INVALID_CODE)
  }
}
