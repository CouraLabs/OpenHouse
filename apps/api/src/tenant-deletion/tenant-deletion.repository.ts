import { eq, inArray, isNotNull } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import {
  runBatch,
  type LedgerStatement,
} from '../common/ledger/ledger-batch.js'
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
  tenantUsage,
  transactionHistory,
  transactionLinkers,
  transactionSplits,
  transactions,
  userSessions,
  users,
} from '@workspace/db'

export class TenantDeletionRepository {
  constructor(private readonly db: Database) {}

  async find(
    tenantId: number
  ): Promise<{ name: string; deletionDate: string | null } | undefined> {
    const [row] = await this.db
      .select({ name: tenants.name, deletionDate: tenants.deletionDate })
      .from(tenants)
      .where(eq(tenants.id, tenantId))

    return row
  }

  setDeletionDateStatement(tenantId: number, deletionDate: string | null) {
    return this.db
      .update(tenants)
      .set({ deletionDate, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
  }

  async setDeletionDate(
    tenantId: number,
    deletionDate: string | null
  ): Promise<void> {
    await this.setDeletionDateStatement(tenantId, deletionDate)
  }

  listScheduled(): Promise<{ id: number; deletionDate: string }[]> {
    return this.db
      .select({ id: tenants.id, deletionDate: tenants.deletionDate })
      .from(tenants)
      .where(isNotNull(tenants.deletionDate)) as Promise<
      { id: number; deletionDate: string }[]
    >
  }

  hardDeleteStatements(
    tenantId: number,
    auditStatement?: LedgerStatement
  ): LedgerStatement[] {
    const deletes = [
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
      this.db.delete(tenantUsage).where(eq(tenantUsage.tenantId, tenantId)),
      this.db
        .delete(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId)),
      this.db
        .delete(userSessions)
        .where(
          inArray(
            userSessions.userId,
            this.db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.tenantId, tenantId))
          )
        ),
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
