import {
  accountOwnerships,
  accountTypes,
  auditActions,
  currencies,
  entityStatuses,
  frequencies,
  limitTypes,
  receiverTypes,
  reminderDeliveries,
  resetCodeKinds,
  tenantUsageKinds,
  transactionHistoryActions,
  transactionStatuses,
  transactionTypes,
  unsplitModes,
  userRoles,
  type AccountOwnership,
  type AccountType,
  type AuditAction,
  type Currency,
  type EntityStatus,
  type Frequency,
  type LimitType,
  type ReceiverType,
  type ReminderDelivery,
  type ResetCodeKind,
  type TenantUsageKind,
  type TransactionHistoryAction,
  type TransactionStatus,
  type TransactionType,
  type UnsplitMode,
  type UserRole,
} from '@workspace/domain'
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

import { money } from './money.js'

export {
  accountOwnerships,
  accountTypes,
  auditActions,
  currencies,
  entityStatuses,
  frequencies,
  limitTypes,
  receiverTypes,
  reminderDeliveries,
  resetCodeKinds,
  tenantUsageKinds,
  transactionHistoryActions,
  transactionStatuses,
  transactionTypes,
  unsplitModes,
  userRoles,
  type AccountOwnership,
  type AccountType,
  type AuditAction,
  type Currency,
  type EntityStatus,
  type Frequency,
  type LimitType,
  type ReceiverType,
  type ReminderDelivery,
  type ResetCodeKind,
  type TenantUsageKind,
  type TransactionHistoryAction,
  type TransactionStatus,
  type TransactionType,
  type UnsplitMode,
  type UserRole,
}

const dt = (name: string) => integer(name, { mode: 'timestamp_ms' })

const NOW = sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`

const json = (name?: string) =>
  name === undefined ? text({ mode: 'json' }) : text(name, { mode: 'json' })

const day = (name: string) => text(name)

export function tenantEntityColumns() {
  return {
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    status: text().$type<EntityStatus>().notNull().default('ACTIVE'),
    createdBy: integer('created_by'),
    createdDt: dt('created_dt').notNull().default(NOW),
    updateBy: integer('update_by'),
    updateDt: dt('update_dt').notNull().default(NOW),
  }
}

export const tenants = sqliteTable('tenants', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  expiresIn: dt('expires_in'),
  deletionDate: day('deletion_date'),
  tier: integer().notNull().default(0),
  createdAt: dt('created_at').notNull().default(NOW),
  updatedAt: dt('updated_at').notNull().default(NOW),
})

export const tenantUsage = sqliteTable(
  'tenant_usage',
  {
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    kind: text().$type<TenantUsageKind>().notNull(),
    period: text().notNull(),
    count: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.kind, table.period] }),
  ]
)

export const users = sqliteTable(
  'users',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    email: text().notNull(),
    name: text().notNull(),
    password: text().notNull(),
    role: text().$type<(typeof userRoles)[number]>().notNull().default('user'),
    refreshTokenHash: text('refresh_token_hash'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    anonymizedAt: dt('anonymized_at'),
    startPage: text('start_page').notNull().default('/'),
    emailVerifiedAt: dt('email_verified_at'),
    emailVerificationHash: text('email_verification_hash'),
    emailVerificationExpiresAt: dt('email_verification_expires_at'),
    emailVerificationSentAt: dt('email_verification_sent_at'),
    emailVerificationWindowAt: dt('email_verification_window_at'),
    emailVerificationSends: integer('email_verification_sends')
      .notNull()
      .default(0),
    createdAt: dt('created_at').notNull().default(NOW),
    updatedAt: dt('updated_at').notNull().default(NOW),
  },
  (table) => [
    uniqueIndex('users_email_verification_hash_key').on(
      table.emailVerificationHash
    ),
    uniqueIndex('users_email_key').on(sql`lower(${table.email})`),
    index('users_tenant_id_idx').on(table.tenantId),
  ]
)

export const userSessions = sqliteTable(
  'user_sessions',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: dt('expires_at').notNull(),
    createdAt: dt('created_at').notNull().default(NOW),
    lastUsedAt: dt('last_used_at').notNull().default(NOW),
  },
  (table) => [
    uniqueIndex('user_sessions_token_hash_key').on(table.tokenHash),
    index('user_sessions_user_id_idx').on(table.userId),
  ]
)

export const signInAttempts = sqliteTable('sign_in_attempts', {
  key: text().primaryKey(),
  lastAttemptAt: dt('last_attempt_at').notNull(),
})

export const tenantCodes = sqliteTable('tenant_codes', {
  id: integer().primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  code: text().notNull().unique(),
  usedAt: dt('used_at'),
  expiresAt: dt('expires_at'),
  createdAt: dt('created_at').notNull().default(NOW),
})

export const passwordResetCodes = sqliteTable(
  'password_reset_codes',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    codeHash: text('code_hash').notNull(),
    kind: text().$type<ResetCodeKind>().notNull(),
    issuedBy: integer('issued_by'),
    expiresAt: dt('expires_at'),
    usedAt: dt('used_at'),
    noticeSeenAt: dt('notice_seen_at'),
    createdAt: dt('created_at').notNull().default(NOW),
  },
  (table) => [
    uniqueIndex('password_reset_codes_code_hash_key').on(table.codeHash),
    index('password_reset_codes_user_id_idx').on(table.userId),
  ]
)

export const tenantSettings = sqliteTable('tenant_settings', {
  tenantId: integer('tenant_id')
    .primaryKey()
    .references(() => tenants.id),
  timezone: text().notNull(),
  mainCurrency: text('main_currency').$type<Currency>().notNull(),
  timezoneConfirmed: integer('timezone_confirmed', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  unsplitMode: text('unsplit_mode')
    .$type<UnsplitMode>()
    .notNull()
    .default('personal'),
  updateBy: integer('update_by'),
  updateDt: dt('update_dt').notNull().default(NOW),
})

export const categories = sqliteTable(
  'categories',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    name: text().notNull(),
    searchName: text('search_name').notNull(),
    color: text().notNull(),
    defaultSplit: json('default_split').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('categories_tenant_id_idx').on(table.tenantId),
    index('categories_tenant_id_search_name_idx').on(
      table.tenantId,
      table.searchName
    ),
    uniqueIndex('categories_tenant_id_name_active_key')
      .on(table.tenantId, table.searchName)
      .where(sql`status = 'ACTIVE'`),
    check('categories_name_length', sql`length(${table.name}) <= 255`),
    check('categories_color_length', sql`length(${table.color}) <= 9`),
  ]
)

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
export type TenantCode = typeof tenantCodes.$inferSelect
export type NewTenantCode = typeof tenantCodes.$inferInsert
export type TenantSettingsRow = typeof tenantSettings.$inferSelect
export type PasswordResetCode = typeof passwordResetCodes.$inferSelect
export type NewPasswordResetCode = typeof passwordResetCodes.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export const limits = sqliteTable(
  'limits',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    amount: money().notNull(),
    type: text().$type<LimitType>().notNull(),
  },
  (table) => [index('limits_tenant_id_idx').on(table.tenantId)]
)

export type Limit = typeof limits.$inferSelect
export type NewLimit = typeof limits.$inferInsert

export const accounts = sqliteTable(
  'accounts',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    name: text().notNull(),
    agency: text('agency'),
    number: text('number'),
    type: text().$type<AccountType>().notNull(),
    balance: money().notNull(),
    openingBalance: money('opening_balance').notNull(),
    openingDt: day('opening_dt')
      .notNull()
      .default(sql`current_date`),
    reconciledThrough: day('reconciled_through'),
    currency: text().$type<Currency>().notNull(),
    spreadPct: money('spread_pct').notNull().default('0.00'),
    limit: money(),
    closeDay: integer('close_day'),
    dueDay: integer('due_day'),
    closeDayInclusive: integer('close_day_inclusive', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    isDefault: integer('is_default', { mode: 'boolean' })
      .notNull()
      .default(false),
    ownership: text().$type<AccountOwnership>().notNull().default('personal'),
  },
  (table) => [
    index('accounts_tenant_id_idx').on(table.tenantId),
    uniqueIndex('accounts_one_default_per_tenant_key')
      .on(table.tenantId)
      .where(sql`is_default`),
    check(
      'accounts_spread_pct_range',
      sql`${table.spreadPct} >= 0 and ${table.spreadPct} <= 10000`
    ),
    check('accounts_name_length', sql`length(${table.name}) <= 255`),
    check(
      'accounts_agency_length',
      sql`${table.agency} is null or length(${table.agency}) <= 255`
    ),
    check(
      'accounts_number_length',
      sql`${table.number} is null or length(${table.number}) <= 34`
    ),
  ]
)

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export const creditCardStatements = sqliteTable(
  'credit_card_statements',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    periodStart: day('period_start').notNull(),
    closeDate: day('close_date').notNull(),
    dueDate: day('due_date').notNull(),
    closedAt: dt('closed_at'),
    minimumDue: money('minimum_due'),
    bankTotal: money('bank_total'),
    reconciledAt: dt('reconciled_at'),
  },
  (table) => [
    uniqueIndex('credit_card_statements_account_close_key')
      .on(table.tenantId, table.accountId, table.closeDate)
      .where(sql`status = 'ACTIVE'`),
    index('credit_card_statements_tenant_account_due_idx').on(
      table.tenantId,
      table.accountId,
      table.dueDate
    ),
    check(
      'credit_card_statements_period_order',
      sql`${table.closeDate} > ${table.periodStart}`
    ),
    check(
      'credit_card_statements_due_after_close',
      sql`${table.dueDate} >= ${table.closeDate}`
    ),
  ]
)

export type CreditCardStatement = typeof creditCardStatements.$inferSelect
export type NewCreditCardStatement = typeof creditCardStatements.$inferInsert

export const goals = sqliteTable(
  'goals',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    name: text().notNull(),
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    balance: money().notNull(),
    balanceDt: day('balance_dt').notNull(),
    targetBalance: money('target_balance').notNull(),
    targetDt: day('target_dt'),
  },
  (table) => [
    index('goals_tenant_id_idx').on(table.tenantId),
    check('goals_name_length', sql`length(${table.name}) <= 255`),
  ]
)

export type Goal = typeof goals.$inferSelect
export type NewGoal = typeof goals.$inferInsert

export const receivers = sqliteTable(
  'receivers',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    name: text().notNull(),
    searchName: text('search_name').notNull(),
    type: text().$type<ReceiverType>().notNull(),
  },
  (table) => [
    index('receivers_tenant_id_idx').on(table.tenantId),
    index('receivers_tenant_id_search_name_idx').on(
      table.tenantId,
      table.searchName
    ),
    check('receivers_name_length', sql`length(${table.name}) <= 255`),
  ]
)

export type Receiver = typeof receivers.$inferSelect
export type NewReceiver = typeof receivers.$inferInsert

export const transactionLinkers = sqliteTable(
  'transaction_linkers',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    description: text().notNull(),
    searchName: text('search_name').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    receiverId: integer('receiver_id').references(() => receivers.id),
  },
  (table) => [
    index('transaction_linkers_tenant_id_idx').on(table.tenantId),
    index('transaction_linkers_tenant_id_search_name_idx').on(
      table.tenantId,
      table.searchName
    ),
  ]
)

export type TransactionLinker = typeof transactionLinkers.$inferSelect
export type NewTransactionLinker = typeof transactionLinkers.$inferInsert

export const recurringTransactions = sqliteTable(
  'recurring_transactions',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    receiverId: integer('receiver_id')
      .notNull()
      .references(() => receivers.id),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    amount: money().notNull(),
    type: text().$type<TransactionType>().notNull().default('Expense'),
    frequency: text().$type<Frequency>().notNull(),
    frequencyDay: integer('frequency_day'),
    frequencyMonth: integer('frequency_month'),
    paidByUserId: integer('paid_by_user_id').references(() => users.id),
    defaultSplit: json('default_split').$type<Record<string, unknown>>(),
  },
  (table) => [index('recurring_transactions_tenant_id_idx').on(table.tenantId)]
)

export type RecurringTransaction = typeof recurringTransactions.$inferSelect
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    name: text().notNull(),
    note: text(),
    invoice: text('invoice'),
    amount: money().notNull(),
    transactionDt: day('transaction_dt').notNull(),
    balanceOnDt: money('balance_on_dt').notNull(),
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    receiverId: integer('receiver_id').references(() => receivers.id),
    recurringId: integer('recurring_id').references(
      () => recurringTransactions.id
    ),
    type: text().$type<TransactionType>().notNull(),
    reviewStatus: text('review_status')
      .$type<TransactionStatus>()
      .notNull()
      .default('Verify'),
    statusNote: text('status_note'),
    transferGroupId: text('transfer_group_id'),
    statementId: integer('statement_id').references(
      () => creditCardStatements.id
    ),
    statementPinned: integer('statement_pinned', { mode: 'boolean' })
      .notNull()
      .default(false),
    paymentStatementId: integer('payment_statement_id').references(
      () => creditCardStatements.id
    ),
    installmentGroupId: text('installment_group_id'),
    installmentNumber: integer('installment_number'),
    installmentCount: integer('installment_count'),
    isAdjustment: integer('is_adjustment', { mode: 'boolean' })
      .notNull()
      .default(false),
    externalId: text('external_id'),
    importBatchId: text('import_batch_id'),
    paidByUserId: integer('paid_by_user_id').references(() => users.id),
    isSettlement: integer('is_settlement', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (table) => [
    index('transactions_account_dt_idx').on(
      table.tenantId,
      table.linkedAccountId,
      table.transactionDt,
      table.id
    ),
    index('transactions_tenant_id_idx').on(table.tenantId),
    index('transactions_tenant_id_dt_idx').on(
      table.tenantId,
      table.transactionDt
    ),
    uniqueIndex('transactions_recurring_materialized_key')
      .on(table.tenantId, table.recurringId, table.transactionDt)
      .where(sql`status = 'ACTIVE' and recurring_id is not null`),
    uniqueIndex('transactions_external_id_key')
      .on(table.tenantId, table.linkedAccountId, table.externalId)
      .where(sql`status = 'ACTIVE' and external_id is not null`),
    index('transactions_import_batch_idx')
      .on(table.tenantId, table.importBatchId)
      .where(sql`import_batch_id is not null`),
    index('transactions_statement_id_idx')
      .on(table.tenantId, table.statementId)
      .where(sql`status = 'ACTIVE' and statement_id is not null`),
    check(
      'transactions_pinned_needs_statement',
      sql`not ${table.statementPinned} or ${table.statementId} is not null`
    ),
    index('transactions_payment_statement_id_idx')
      .on(table.tenantId, table.paymentStatementId)
      .where(sql`status = 'ACTIVE' and payment_statement_id is not null`),
    index('transactions_installment_group_idx')
      .on(table.tenantId, table.installmentGroupId)
      .where(sql`installment_group_id is not null`),
    check(
      'transactions_installment_shape',
      sql`(${table.installmentGroupId} is null and ${table.installmentNumber} is null and ${table.installmentCount} is null) or (${table.installmentGroupId} is not null and 1 <= ${table.installmentNumber} and ${table.installmentNumber} <= ${table.installmentCount} and ${table.installmentCount} <= 48)`
    ),
    check(
      'transactions_payment_is_transfer_in',
      sql`${table.paymentStatementId} is null or (${table.type} = 'Income' and ${table.transferGroupId} is not null and ${table.statementId} is null)`
    ),
    check('transactions_name_length', sql`length(${table.name}) <= 255`),
    check(
      'transactions_invoice_length',
      sql`${table.invoice} is null or length(${table.invoice}) <= 255`
    ),
    check(
      'transactions_status_note_length',
      sql`${table.statusNote} is null or length(${table.statusNote}) <= 500`
    ),
    check(
      'transactions_external_id_length',
      sql`${table.externalId} is null or length(${table.externalId}) <= 255`
    ),
  ]
)

export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

export const transactionSplits = sqliteTable(
  'transaction_splits',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactions.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    share: money().notNull(),
  },
  (table) => [
    index('transaction_splits_transaction_id_idx').on(table.transactionId),
    index('transaction_splits_tenant_id_idx').on(table.tenantId),
    uniqueIndex('transaction_splits_member_key')
      .on(table.transactionId, table.userId)
      .where(sql`status = 'ACTIVE'`),
    check('transaction_splits_share_positive', sql`${table.share} > 0`),
  ]
)

export type TransactionSplit = typeof transactionSplits.$inferSelect
export type NewTransactionSplit = typeof transactionSplits.$inferInsert

export const importMappings = sqliteTable(
  'import_mappings',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    mapping: json().$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex('import_mappings_account_key').on(
      table.tenantId,
      table.accountId
    ),
  ]
)

export type ImportMappingRow = typeof importMappings.$inferSelect
export type NewImportMappingRow = typeof importMappings.$inferInsert

export const transactionHistory = sqliteTable(
  'transaction_history',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactions.id),
    action: text().$type<TransactionHistoryAction>().notNull(),
    before: json(),
    after: json(),
    createdBy: integer('created_by'),
    createdDt: dt('created_dt').notNull().default(NOW),
  },
  (table) => [
    index('transaction_history_transaction_id_idx').on(table.transactionId),
  ]
)

export type TransactionHistoryRow = typeof transactionHistory.$inferSelect
export type NewTransactionHistoryRow = typeof transactionHistory.$inferInsert

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id').notNull(),
    actorId: integer('actor_id'),
    action: text().$type<AuditAction>().notNull(),
    details: json().$type<Record<string, unknown>>().notNull().default({}),
    createdDt: dt('created_dt').notNull().default(NOW),
  },
  (table) => [index('audit_log_tenant_id_idx').on(table.tenantId, table.id)]
)

export type AuditLogRow = typeof auditLog.$inferSelect
export type NewAuditLogRow = typeof auditLog.$inferInsert

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  inAppEnabled: integer('in_app_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  pushEnabled: integer('push_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  pushDetails: integer('push_details', { mode: 'boolean' })
    .notNull()
    .default(false),
  billLeadDays: integer('bill_lead_days').notNull().default(3),
  recurringLeadDays: integer('recurring_lead_days').notNull().default(1),
  limitAlert80: integer('limit_alert_80', { mode: 'boolean' })
    .notNull()
    .default(true),
  limitAlert100: integer('limit_alert_100', { mode: 'boolean' })
    .notNull()
    .default(true),
  delivery: text().$type<ReminderDelivery>().notNull().default('individual'),
  updateDt: dt('update_dt').notNull().default(NOW),
})

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    endpoint: text().notNull(),
    p256dh: text().notNull(),
    auth: text().notNull(),
    userAgent: text('user_agent'),
    createdAt: dt('created_at').notNull().default(NOW),
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_key').on(table.endpoint),
    index('push_subscriptions_user_id_idx').on(table.userId),
  ]
)

export const notifications = sqliteTable(
  'notifications',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    body: json().$type<Record<string, unknown>>().notNull(),
    createdAt: dt('created_at').notNull().default(NOW),
    readAt: dt('read_at'),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId, table.id)]
)

export const notificationLog = sqliteTable(
  'notification_log',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    kind: text().notNull(),
    refId: integer('ref_id').notNull(),
    dueDate: day('due_date').notNull(),
    createdAt: dt('created_at').notNull().default(NOW),
  },
  (table) => [
    uniqueIndex('notification_log_claim_key').on(
      table.userId,
      table.kind,
      table.refId,
      table.dueDate
    ),
  ]
)

export const calendarFeeds = sqliteTable(
  'calendar_feeds',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    token: text().notNull(),
    createdAt: dt('created_at').notNull().default(NOW),
  },
  (table) => [uniqueIndex('calendar_feeds_token_key').on(table.token)]
)

export type NotificationPreferencesRow =
  typeof notificationPreferences.$inferSelect
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect
export type NotificationRow = typeof notifications.$inferSelect
export type NotificationLogRow = typeof notificationLog.$inferSelect
export type CalendarFeedRow = typeof calendarFeeds.$inferSelect
