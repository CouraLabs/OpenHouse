import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { eq, isNotNull } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { runBatch, type LedgerStatement } from '../common/ledger/ledger-batch.js'
import {
  accounts,
  calendarFeeds,
  categories,
  creditCardStatements,
  goals,
  importMappings,
  limits,
  notificationLog,
  notificationPreferences,
  notifications,
  pushSubscriptions,
  receivers,
  recurringTransactions,
  tenantCodes,
  tenantSettings,
  tenants,
  transactionHistory,
  transactionLinkers,
  transactionSplits,
  transactions,
  users,
} from '@workspace/db'

/**
 * The tenant rows of a deletion. Every method takes the tenant explicitly.
 * `hardDelete` is the one place in the application that removes rows: the
 * sanctioned exception to soft delete.
 */
@Injectable()
export class TenantDeletionRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Reads the tenant's name and scheduled deletion day. */
  async find(
    tenantId: number
  ): Promise<{ name: string; deletionDate: string | null } | undefined> {
    const [row] = await this.db
      .select({ name: tenants.name, deletionDate: tenants.deletionDate })
      .from(tenants)
      .where(eq(tenants.id, tenantId))

    return row
  }

  /** Sets the day the tenant is deleted, or clears it with `null`. */
  setDeletionDateStatement(
    tenantId: number,
    deletionDate: string | null
  ) {
    return this.db
      .update(tenants)
      .set({ deletionDate, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
  }

  /** Sets the day the tenant is deleted, or clears it with `null`. */
  async setDeletionDate(
    tenantId: number,
    deletionDate: string | null
  ): Promise<void> {
    await this.setDeletionDateStatement(tenantId, deletionDate)
  }

  /** Lists every tenant with a deletion scheduled. */
  listScheduled(): Promise<{ id: number; deletionDate: string }[]> {
    return this.db
      .select({ id: tenants.id, deletionDate: tenants.deletionDate })
      .from(tenants)
      .where(isNotNull(tenants.deletionDate)) as Promise<
      { id: number; deletionDate: string }[]
    >
  }

  /**
   * Removes the tenant and everything it owns, children first so no
   * foreign key is ever violated: the append-only history, then the
   * transactions it points at, down to the tenant row — one atomic batch,
   * with the audit line appended to it (the log has no foreign key and
   * survives the delete; the `tenants` row goes last, so a crashed run
   * resumes on the next hour and finds the tenant still listed).
   */
  hardDeleteStatements(
    tenantId: number,
    auditStatement?: LedgerStatement
  ): LedgerStatement[] {
    const deletes = [
      // The reminders and their per-user settings point at users: first.
      this.db.delete(notifications).where(eq(notifications.tenantId, tenantId)),
      this.db
        .delete(notificationLog)
        .where(eq(notificationLog.tenantId, tenantId)),
      this.db
        .delete(notificationPreferences)
        .where(eq(notificationPreferences.tenantId, tenantId)),
      this.db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.tenantId, tenantId)),
      this.db.delete(calendarFeeds).where(eq(calendarFeeds.tenantId, tenantId)),
      this.db
        .delete(transactionHistory)
        .where(eq(transactionHistory.tenantId, tenantId)),
      this.db
        .delete(transactionSplits)
        .where(eq(transactionSplits.tenantId, tenantId)),
      this.db.delete(transactions).where(eq(transactions.tenantId, tenantId)),
      this.db
        .delete(importMappings)
        .where(eq(importMappings.tenantId, tenantId)),
      this.db
        .delete(recurringTransactions)
        .where(eq(recurringTransactions.tenantId, tenantId)),
      this.db
        .delete(transactionLinkers)
        .where(eq(transactionLinkers.tenantId, tenantId)),
      this.db.delete(goals).where(eq(goals.tenantId, tenantId)),
      this.db.delete(limits).where(eq(limits.tenantId, tenantId)),
      this.db
        .delete(creditCardStatements)
        .where(eq(creditCardStatements.tenantId, tenantId)),
      this.db.delete(accounts).where(eq(accounts.tenantId, tenantId)),
      this.db.delete(receivers).where(eq(receivers.tenantId, tenantId)),
      this.db.delete(categories).where(eq(categories.tenantId, tenantId)),
      this.db.delete(tenantCodes).where(eq(tenantCodes.tenantId, tenantId)),
      this.db
        .delete(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId)),
      this.db.delete(users).where(eq(users.tenantId, tenantId)),
      this.db.delete(tenants).where(eq(tenants.id, tenantId)),
    ]

    if (auditStatement === undefined) {
      return deletes
    }

    return [...deletes, auditStatement]
  }

  async hardDelete(tenantId: number): Promise<void> {
    await runBatch(this.db, this.hardDeleteStatements(tenantId))
  }
}
