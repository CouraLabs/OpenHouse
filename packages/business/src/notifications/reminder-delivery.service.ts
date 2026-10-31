import {
  isClaimed,
  stampFor,
  type LedgerStatement,
  type NotificationLogRepository,
  type NotificationRepository,
  type Recipient,
} from '@workspace/db'
import type { NotificationBody, ReminderDetail } from '@workspace/dto'

import { PushService } from './push.service.js'
import type { ReminderCandidate } from './reminder-rules.js'

export class ReminderDeliveryService {
  constructor(
    private readonly log: NotificationLogRepository,
    private readonly notifications: NotificationRepository,
    private readonly push: PushService
  ) {}

  async deliver(
    recipient: Recipient,
    candidates: readonly ReminderCandidate[],
    today: string
  ): Promise<number> {
    const { tenantId, userId, preferences } = recipient

    if (candidates.length === 0) {
      return 0
    }

    const pushable =
      preferences.pushEnabled &&
      this.push.config().enabled &&
      (await this.push.hasSubscriptions(userId))

    if (!preferences.inAppEnabled && !pushable) {
      return 0
    }

    const digest = preferences.delivery === 'digest'
    const stamp = stampFor()
    const digestKey = {
      tenantId,
      userId,
      kind: 'digest' as const,
      refId: 0,
      dueDate: today,
      stamp,
    }

    const statements: LedgerStatement[] = []

    if (digest) {
      statements.push(this.log.claimStatement(digestKey))
    }

    for (const candidate of candidates) {
      statements.push(
        digest
          ? this.log.gatedClaimStatement(
              { tenantId, userId, ...candidate.key, stamp },
              [digestKey]
            )
          : this.log.claimStatement({ tenantId, userId, ...candidate.key, stamp })
      )
    }

    if (preferences.inAppEnabled && !digest) {
      for (const [_index, candidate] of candidates.entries()) {
        statements.push(
          this.notifications.insertStatement(tenantId, userId, candidate.detail, [
            { userId, ...candidate.key, stamp },
          ])
        )
      }
    }

    const results = await this.log.runAll(statements)

    const won: ReminderDetail[] = []
    for (const [index, candidate] of candidates.entries()) {
      if (isClaimed(results[index])) {
        won.push(candidate.detail)
      }
    }

    if (digest && !isClaimed(results[0])) {
      return 0
    }

    if (won.length === 0) {
      return 0
    }

    const stored: NotificationBody[] = digest
      ? [{ kind: 'digest', items: won }]
      : won

    if (preferences.inAppEnabled && digest) {
      await this.notifications.insert(tenantId, userId, stored[0])
    }

    if (pushable) {
      await this.push.notify(userId, stored, preferences.pushDetails)
    }

    return stored.length
  }
}
