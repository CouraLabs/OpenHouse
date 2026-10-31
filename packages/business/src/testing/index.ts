import {
  accounts,
  auditLog,
  AuditLogRepository,
  categories,
  createDatabase,
  creditCardStatements,
  goals,
  importMappings,
  limits,
  notificationLog,
  NotificationLogRepository,
  PasswordResetRepository,
  passwordResetCodes,
  receivers,
  recurringTransactions,
  SettingsRepository,
  tenantCodes,
  TenantDeletionRepository,
  tenantSettings,
  tenants,
  transactionHistory,
  transactionLinkers,
  transactions,
  users,
  type Database,
  type LogKey,
} from '@workspace/db'
import { CARD_PAYMENT_CATEGORY } from '@workspace/domain'
import { eq } from 'drizzle-orm'

import { AuditLogService } from '../audit/audit-log.service.js'
import { PasswordResetService } from '../auth/password-reset.service.js'
import { ResetAttemptLimiter } from '../auth/reset-attempt-limiter.js'
import { checkBalancesForTenant } from '../balances/balances.jobs.js'
import { runRemindersForTenant } from '../notifications/reminders.jobs.js'
import { Clock } from '../ports/clock.js'
import { PushTransport, type PushTarget } from '../ports/push-transport.js'
import { runRecurringForTenant } from '../recurring-transactions/recurring.jobs.js'
import {
  BANK_OFX_SGML,
  CARD_OFX_XML,
  FOREIGN_OFX,
} from '../statement-imports/ofx-samples.fixture-spec.js'
import { deleteTenantNow } from '../tenant-deletion/tenant-deletion.jobs.js'
import { TenantDeletionService } from '../tenant-deletion/tenant-deletion.service.js'

export { BANK_OFX_SGML, CARD_OFX_XML, CARD_PAYMENT_CATEGORY, FOREIGN_OFX }

export class FixedClock extends Clock {
  constructor(private readonly instant: Date = new Date()) {
    super()
  }

  now(): Date {
    return this.instant
  }
}

export class DisabledPushTransport extends PushTransport {
  readonly enabled = false

  readonly publicKey = null

  async send(_target: PushTarget, _payload: string): Promise<void> {}
}

export class TestDatabaseHarness {
  readonly db: Database

  constructor(d1: unknown) {
    this.db = createDatabase(d1 as Parameters<typeof createDatabase>[0])
  }

  async insertImportMapping(input: {
    tenantId: number
    accountId: number
    mapping: Record<string, unknown>
    createdBy: number
  }): Promise<void> {
    await this.db.insert(importMappings).values(input)
  }

  async listAuditActions(tenantId: number): Promise<string[]> {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenantId))

    return rows.map((row) => row.action)
  }

  async findUserPassword(userId: number): Promise<string | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId))

    return row?.password
  }

  async findCategoryCreatedBy(
    categoryId: number
  ): Promise<number | null | undefined> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))

    return row?.createdBy
  }

  async findTenantName(tenantId: number): Promise<string> {
    const [row] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))

    return row.name
  }

  async countTenantTransactions(tenantId: number): Promise<number> {
    const rows = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))

    return rows.length
  }

  async setTenantDeletionDate(
    tenantId: number,
    deletionDate: string
  ): Promise<void> {
    await this.db
      .update(tenants)
      .set({ deletionDate })
      .where(eq(tenants.id, tenantId))
  }

  async scheduleTenantDeletion(
    tenantId: number,
    userId: number,
    tenantName: string,
    clock: Clock = new FixedClock()
  ): Promise<{ deletionDate: string }> {
    const audit = new AuditLogService(new AuditLogRepository(this.db))
    const deletion = new TenantDeletionService(
      this.db,
      new TenantDeletionRepository(this.db),
      new SettingsRepository(this.db),
      audit,
      clock
    )

    return deletion.schedule(tenantId, userId, tenantName)
  }

  async deleteTenantNow(
    tenantId: number,
    clock: Clock = new FixedClock()
  ): Promise<void> {
    const audit = new AuditLogService(new AuditLogRepository(this.db))

    return deleteTenantNow(this.db, clock, tenantId, audit)
  }

  async countRemainingTenantRows(tenantId: number): Promise<number[]> {
    const tables = [
      transactionHistory,
      transactions,
      recurringTransactions,
      transactionLinkers,
      goals,
      limits,
      creditCardStatements,
      accounts,
      receivers,
      categories,
      tenantCodes,
      tenantSettings,
      users,
      importMappings,
    ]
    const counts = await Promise.all(
      tables.map(async (table) => {
        const rows = await this.db
          .select()
          .from(table)
          .where(eq(table.tenantId, tenantId))

        return rows.length
      })
    )

    return counts
  }

  async tenantExists(tenantId: number): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))

    return rows.length > 0
  }

  async runReminders(
    tenantId: number,
    clock: Clock = new FixedClock(),
    pushTransport: PushTransport = new DisabledPushTransport()
  ): Promise<number> {
    return runRemindersForTenant(this.db, clock, tenantId, pushTransport)
  }

  async listNotificationLogs(tenantId: number) {
    return this.db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.tenantId, tenantId))
  }

  async claimNotificationLog(key: LogKey): Promise<boolean> {
    return new NotificationLogRepository(this.db).claim(key)
  }

  async runRecurring(
    tenantId: number,
    clock: Clock = new FixedClock()
  ): Promise<number> {
    return runRecurringForTenant(this.db, clock, tenantId)
  }

  async checkBalances(tenantId: number): Promise<number> {
    return checkBalancesForTenant(this.db, tenantId)
  }

  async findPasswordResetCodesByHash(codeHash: string) {
    return this.db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.codeHash, codeHash))
  }

  async setPasswordResetCodeExpiry(
    codeHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db
      .update(passwordResetCodes)
      .set({ expiresAt })
      .where(eq(passwordResetCodes.codeHash, codeHash))
  }

  async issueServerPasswordResetCode(
    email: string,
    clock: Clock = new FixedClock()
  ) {
    return new PasswordResetService(
      new PasswordResetRepository(this.db),
      new ResetAttemptLimiter(clock),
      clock
    ).issueFromServer(email)
  }

  async setAccountCachedBalance(
    accountId: number,
    balance: string
  ): Promise<void> {
    await this.db
      .update(accounts)
      .set({ balance })
      .where(eq(accounts.id, accountId))
  }
}
