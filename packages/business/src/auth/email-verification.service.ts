import { and, eq, gt, isNull, sql } from 'drizzle-orm'

import type { Database, User } from '@workspace/db'
import { users } from '@workspace/db'
import { BadRequestError } from '../errors.js'
import type { Clock } from '../ports/clock.js'
import type { Mailer } from '../ports/mailer.js'
import { hashToken } from './token.service.js'
import { verificationEmail } from './verification-email.js'
import {
  decideSend,
  VERIFICATION_TOKEN_TTL_MS,
} from './verification-send-policy.js'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export class EmailVerificationService {
  constructor(
    private readonly db: Database,
    private readonly mailer: Mailer,
    private readonly clock: Clock,
    private readonly appUrl: string
  ) {}

  async issue(user: User): Promise<void> {
    const now = this.clock.now()
    const decision = decideSend(
      {
        sentAt: user.emailVerificationSentAt,
        windowAt: user.emailVerificationWindowAt,
        sends: user.emailVerificationSends,
      },
      now
    )

    if (!decision.allowed) {
      return
    }

    const token = generateToken()
    const guard =
      user.emailVerificationSentAt === null
        ? isNull(users.emailVerificationSentAt)
        : eq(users.emailVerificationSentAt, user.emailVerificationSentAt)

    const claimed = await this.db
      .update(users)
      .set({
        emailVerificationHash: await hashToken(token),
        emailVerificationExpiresAt: new Date(
          now.getTime() + VERIFICATION_TOKEN_TTL_MS
        ),
        emailVerificationSentAt: now,
        emailVerificationWindowAt: decision.windowAt,
        emailVerificationSends: decision.sends,
      })
      .where(and(eq(users.id, user.id), isNull(users.emailVerifiedAt), guard))
      .returning({ id: users.id })

    if (claimed.length === 0) {
      return
    }

    const link = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`

    try {
      await this.mailer.send(
        verificationEmail({ to: user.email, name: user.name, link })
      )
    } catch (error) {
      console.error(
        JSON.stringify({
          kind: 'mail.failed',
          userId: user.id,
          message: error instanceof Error ? error.message : String(error),
        })
      )
    }
  }

  async resend(email: string): Promise<void> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.trim().toLowerCase()))

    if (user === undefined || !user.isActive || user.emailVerifiedAt !== null) {
      return
    }

    await this.issue(user)
  }

  async verify(token: string): Promise<User> {
    const now = this.clock.now()

    const [verified] = await this.db
      .update(users)
      .set({
        emailVerifiedAt: now,
        emailVerificationHash: null,
        emailVerificationExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.emailVerificationHash, await hashToken(token)),
          gt(users.emailVerificationExpiresAt, now),
          isNull(users.emailVerifiedAt),
          eq(users.isActive, true)
        )
      )
      .returning()

    if (verified === undefined) {
      throw new BadRequestError(
        'This confirmation link is invalid or has expired.'
      )
    }

    return verified
  }
}
