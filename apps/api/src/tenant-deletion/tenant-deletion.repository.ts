import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { eq, inArray, isNotNull } from 'drizzle-orm'
import type { Database, DbOrTx } from '@workspace/db'
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
  passwordResetCodes,
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

  /** Runs `work` in one transaction. */
  transaction<T>(work: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }

  /** Reads the tenant's name and scheduled deletion day. */
  async find(
    tenantId: number,
    tx: DbOrTx = this.db
  ): Promise<{ name: string; deletionDate: string | null } | undefined> {
    const [row] = await tx
      .select({ name: tenants.name, deletionDate: tenants.deletionDate })
      .from(tenants)
      .where(eq(tenants.id, tenantId))

    return row
  }

  /** Sets the day the tenant is deleted, or clears it with `null`. */
  async setDeletionDate(
    tenantId: number,
    deletionDate: string | null,
    tx: DbOrTx = this.db
  ): Promise<void> {
    await tx
      .update(tenants)
      .set({ deletionDate, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
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
   * transactions it points at, down to the tenant row. Run inside the
   * caller's transaction. The audit log has no foreign key and is kept.
   */
  async hardDelete(tenantId: number, tx: DbOrTx): Promise<void> {
    // The reminders and their per-user settings point at users: first.
    await tx.delete(notifications).where(eq(notifications.tenantId, tenantId))
    await tx
      .delete(notificationLog)
      .where(eq(notificationLog.tenantId, tenantId))
    await tx
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.tenantId, tenantId))
    await tx
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.tenantId, tenantId))
    await tx.delete(calendarFeeds).where(eq(calendarFeeds.tenantId, tenantId))
    await tx
      .delete(transactionHistory)
      .where(eq(transactionHistory.tenantId, tenantId))
    await tx
      .delete(transactionSplits)
      .where(eq(transactionSplits.tenantId, tenantId))
    await tx.delete(transactions).where(eq(transactions.tenantId, tenantId))
    await tx.delete(importMappings).where(eq(importMappings.tenantId, tenantId))
    await tx
      .delete(recurringTransactions)
      .where(eq(recurringTransactions.tenantId, tenantId))
    await tx
      .delete(transactionLinkers)
      .where(eq(transactionLinkers.tenantId, tenantId))
    await tx.delete(goals).where(eq(goals.tenantId, tenantId))
    await tx.delete(limits).where(eq(limits.tenantId, tenantId))
    await tx
      .delete(creditCardStatements)
      .where(eq(creditCardStatements.tenantId, tenantId))
    await tx.delete(accounts).where(eq(accounts.tenantId, tenantId))
    await tx.delete(receivers).where(eq(receivers.tenantId, tenantId))
    await tx.delete(categories).where(eq(categories.tenantId, tenantId))
    await tx.delete(tenantCodes).where(eq(tenantCodes.tenantId, tenantId))
    await tx.delete(tenantSettings).where(eq(tenantSettings.tenantId, tenantId))
    const tenantUsers = tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId))
    await tx
      .delete(passwordResetCodes)
      .where(inArray(passwordResetCodes.userId, tenantUsers))
    await tx.delete(users).where(eq(users.tenantId, tenantId))
    await tx.delete(tenants).where(eq(tenants.id, tenantId))
  }
}
