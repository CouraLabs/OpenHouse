import { Injectable } from '@nestjs/common'
import type { NotificationBody, ReminderDetail } from '@workspace/poco'

import {
  stampFor,
  type LedgerStatement,
} from '../common/ledger/ledger-batch.js'
import { NotificationLogRepository, isClaimed } from './notification-log.repository.js'
import { NotificationRepository } from './notification.repository.js'
import type { Recipient } from './notification-preferences.repository.js'
import { PushService } from './push.service.js'
import type { ReminderCandidate } from './reminder-rules.js'

/**
 * Delivers the reminders due for one user, exactly once. Every reminder is
 * first claimed in the `notification_log` — the unique index on `(userId,
 * kind, refId, dueDate)` makes the claim atomic across restarts and
 * replicas — and only the claims this call won are stored in the
 * notification centre and pushed. The claims and the centre entries commit
 * in one batch, each centre entry gated in SQL on its claim, so a reminder
 * is never logged without being stored.
 *
 * A digest user gets at most one digest a day: the day's digest is itself
 * a claim, and the day's item entries are gated on it — a second run the
 * same day stores nothing, leaving the items for the next day's digest.
 */
@Injectable()
export class ReminderDeliveryService {
  constructor(
    private readonly log: NotificationLogRepository,
    private readonly notifications: NotificationRepository,
    private readonly push: PushService
  ) {}

  /** Delivers what is due; answers how many messages were stored or pushed. */
  async deliver(
    recipient: Recipient,
    candidates: readonly ReminderCandidate[],
    today: string
  ): Promise<number> {
    const { tenantId, userId, preferences } = recipient

    if (candidates.length === 0) {
      return 0
    }

    // A reminder with nowhere to go is not claimed: enabling a channel
    // later must not wake up days of stale ones.
    const pushable =
      preferences.pushEnabled &&
      this.push.config().enabled &&
      (await this.push.hasSubscriptions(userId))

    if (!preferences.inAppEnabled && !pushable) {
      return 0
    }

    const digest = preferences.delivery === 'digest'
    // The run's stamp: the claims carry it as their `created_at`, and the
    // entries gate on it — so an entry is stored by the run that won its
    // claim, never by a later run reading the same key. Monotonic, so two
    // runs in the same millisecond are still two different runs.
    const stamp = stampFor()
    const digestKey = {
      tenantId,
      userId,
      kind: 'digest' as const,
      refId: 0,
      dueDate: today,
      stamp,
    }

    // One batch per user: the digest's claim first (it decides the day),
    // the item claims — for a digest, gated on the digest's claim standing,
    // so a day that already sent its digest claims nothing and the items
    // wait for the next day — and, for individual delivery, the centre
    // entries each gated on their own claim. A claim that lost to a
    // concurrent delivery inserts nothing.
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

    // What this run won, read off the claim results — the push rides after
    // the batch, like the old transaction's commit did.
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
      // The digest's entry rides after the claims (its items are what the
      // run just learned it won); a crash here loses the day's digest, and
      // the items wait claimed for the next day's.
      await this.notifications.insert(tenantId, userId, stored[0])
    }

    if (pushable) {
      await this.push.notify(userId, stored, preferences.pushDetails)
    }

    return stored.length
  }
}
