import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * The lifecycle status every tenant entity carries. Soft delete is a status
 * change, never a row removal. The wire spelling of this vocabulary lives in
 * `@workspace/poco` (`entityStatuses`) — keep the two in step.
 */
export const entityStatuses = ['ACTIVE', 'DELETED'] as const

export type EntityStatus = (typeof entityStatuses)[number]

/**
 * The columns every tenant-scoped entity shares — the `TenantEntity` base
 * shape. The tenant and the lifecycle status come first; the audit trail
 * records who acted and when (`createdBy`/`updateBy` hold a `users.id`, kept
 * plain so removing a user never breaks the history they left behind).
 *
 * Spread this into a `pgTable` — the columns keep full type inference, and
 * the table adds its own identity and business columns after the spread.
 */
export function tenantEntityColumns() {
  return {
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    status: text().$type<EntityStatus>().notNull().default('ACTIVE'),
    createdBy: integer('created_by'),
    createdDt: timestamp('created_dt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updateBy: integer('update_by'),
    updateDt: timestamp('update_dt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
}

/**
 * A tenant is the isolation boundary of the application: every user belongs
 * to exactly one, and every piece of tenant data is reached through the user
 * the session was issued to.
 */
export const tenants = pgTable('tenants', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  /** The tenant's display name. Unique so sign-up can reject duplicates. */
  name: text().notNull().unique(),
  /** When the tenant's access ends, or nothing while it is active. */
  expiresIn: timestamp('expires_in', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/**
 * The roles a user can hold. The first user of a tenant is an `owner`; every
 * user after it joins with an invite code and is a `user`.
 */
export const userRoles = ['owner', 'user'] as const

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    email: text().notNull(),
    name: text().notNull(),
    /** The bcrypt hash of the password. Never the password itself. */
    password: text().notNull(),
    role: text().$type<(typeof userRoles)[number]>().notNull().default('user'),
    /**
     * The hash of the refresh token the user's current session was issued.
     * Nothing while signed out, so a presented token that verifies but does
     * not match is a reuse and revokes the session.
     */
    refreshTokenHash: text('refresh_token_hash'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Every query that resolves a session starts from the tenant, so the
    // column is indexed. Uniqueness of an email is per tenant: two tenants
    // may each have someone@example.com.
    uniqueIndex('users_tenant_id_email_key').on(table.tenantId, table.email),
    index('users_tenant_id_idx').on(table.tenantId),
  ]
)

/**
 * The code an owner generates so the next users of the tenant can sign up.
 * A code is single-use and, when set, expires at `expiresAt`.
 */
export const tenantCodes = pgTable('tenant_codes', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  code: text().notNull().unique(),
  /** When the code was used, or nothing while it is still redeemable. */
  usedAt: timestamp('used_at', { withTimezone: true }),
  /** When the code stops working, or nothing while it never does. */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/**
 * A category of something the tenant organizes — the first tenant entity
 * built on the shared base shape. A name is unique per tenant among ACTIVE
 * rows: deleting a category frees its name for reuse, and the partial index
 * enforces that at the database even under concurrent creates.
 */
export const categories = pgTable(
  'categories',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    name: varchar({ length: 255 }).notNull(),
    /** A hex color, `#RRGGBB` or `#RRGGBBAA` — the column holds 9 characters. */
    color: varchar({ length: 9 }).notNull(),
  },
  (table) => [
    // Every query that lists or searches categories starts from the tenant.
    index('categories_tenant_id_idx').on(table.tenantId),
    // The uniqueness rule the service surfaces as a friendly 409, enforced
    // here so a race cannot slip two ACTIVE rows past the check. The match
    // is case-insensitive, like the check that precedes it.
    uniqueIndex('categories_tenant_id_name_active_key')
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`status = 'ACTIVE'`),
  ]
)

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type TenantCode = typeof tenantCodes.$inferSelect
export type NewTenantCode = typeof tenantCodes.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type UserRole = (typeof userRoles)[number]

/**
 * The currencies money can be denominated in. The wire spelling lives in
 * `@workspace/poco` (`currencies`) — keep the two in step.
 */
export const currencies = ['USD', 'BRL', 'EUR'] as const

export type Currency = (typeof currencies)[number]

/**
 * The periods a spending limit covers. The wire spelling lives in
 * `@workspace/poco` (`limitTypes`) — keep the two in step.
 */
export const limitTypes = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export type LimitType = (typeof limitTypes)[number]

/**
 * A spending limit the tenant sets on a category: how much may be spent
 * across a Day, a Week, a Month, or a Year. The amount is a `numeric` column
 * mapped to a string, so money never travels through a float.
 */
export const limits = pgTable(
  'limits',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** The category the limit caps. Deleting a category is soft, so the
     * reference always resolves. */
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    /** The capped amount, carried as a string like "12.34". */
    amount: numeric({ precision: 16, scale: 2 }).notNull(),
    /** The period the amount covers. */
    type: text().$type<LimitType>().notNull(),
    /** The currency the amount is denominated in. */
    currency: text().$type<Currency>().notNull(),
  },
  (table) => [
    // Every query that lists or searches limits starts from the tenant.
    index('limits_tenant_id_idx').on(table.tenantId),
  ]
)

export type Limit = typeof limits.$inferSelect
export type NewLimit = typeof limits.$inferInsert

/**
 * The kinds of account a tenant keeps. The wire spelling lives in
 * `@workspace/poco` (`accountTypes`) — keep the two in step.
 */
export const accountTypes = [
  'Checking',
  'Wallet',
  'Savings',
  'Credit Card',
] as const

export type AccountType = (typeof accountTypes)[number]

/**
 * An account of the tenant: a bank account (Checking, Savings), a wallet, or
 * a credit card (Credit Card). The amount columns are `numeric` mapped to
 * strings, so money never travels through a float. A credit card closes on a
 * day of the month and its bill is due on another — days of the month alone,
 * with no month or year, since a card closes on the 15th whatever the month.
 */
export const accounts = pgTable(
  'accounts',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** The account's display name. */
    name: varchar({ length: 255 }).notNull(),
    /** The bank or branch the account sits at; a credit card has none. */
    agency: varchar({ length: 255 }),
    /** The bank account's number; a wallet or a card has none. */
    number: integer(),
    /** The kind of account, which decides which other fields apply. */
    type: text().$type<AccountType>().notNull(),
    /** The current balance, carried as a string like "12.34". */
    balance: numeric({ precision: 16, scale: 2 }).notNull(),
    /** The currency the account's money is denominated in. */
    currency: text().$type<Currency>().notNull(),
    /** The credit card's limit; `limit` is a reserved SQL word, safe here
     * because drizzle quotes identifiers. */
    limit: numeric({ precision: 16, scale: 2 }),
    /** The day of the month the credit card bill closes. */
    closeDay: smallint(),
    /** The day of the month the credit card bill is due. */
    dueDay: smallint(),
    /** Whether the account is the tenant's default — the one new
     * transactions start in. At most one account of a tenant carries the
     * flag; the write paths clear the previous holder first. */
    isDefault: boolean('is_default').notNull().default(false),
  },
  (table) => [
    // Every query that lists or searches accounts starts from the tenant.
    index('accounts_tenant_id_idx').on(table.tenantId),
    // The one-default rule, enforced by the database: a tenant can never
    // hold two flagged rows, whatever the write path does.
    uniqueIndex('accounts_one_default_per_tenant_key')
      .on(table.tenantId)
      .where(sql`is_default`),
  ]
)

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

/**
 * A goal the tenant saves toward: a target balance on a savings account,
 * tracked from the account's balance at a day. The amount columns are
 * `numeric` mapped to strings, so money never travels through a float; the
 * date columns are `date` mapped to `YYYY-MM-DD` strings, so a goal's day
 * never shifts with a timezone.
 */
export const goals = pgTable(
  'goals',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** The goal's display name. */
    name: varchar({ length: 255 }).notNull(),
    /** The savings account the goal tracks. Deleting an account is soft,
     * so the reference always resolves. */
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    /** The tracked balance on `balanceDt`, carried as a string like "12.34". */
    balance: numeric({ precision: 16, scale: 2 }).notNull(),
    /** The day the balance was taken, without a time or timezone. */
    balanceDt: date('balance_dt').notNull(),
    /** The balance the goal aims for, carried as a string like "12.34". */
    targetBalance: numeric('target_balance', {
      precision: 16,
      scale: 2,
    }).notNull(),
    /** The day the goal should be reached, or nothing while it has no deadline. */
    targetDt: date('target_dt'),
    /** The currency the balances are denominated in. */
    currency: text().$type<Currency>().notNull(),
  },
  (table) => [
    // Every query that lists or searches goals starts from the tenant.
    index('goals_tenant_id_idx').on(table.tenantId),
  ]
)

export type Goal = typeof goals.$inferSelect
export type NewGoal = typeof goals.$inferInsert

/**
 * The kinds of receiver a payment goes to. The wire spelling lives in
 * `@workspace/poco` (`receiverTypes`) — keep the two in step.
 */
export const receiverTypes = [
  'Person',
  'Service',
  'Merchant',
  'Charity',
] as const

export type ReceiverType = (typeof receiverTypes)[number]

/**
 * A receiver the tenant pays: a person, a service, a merchant, or a
 * charity. Transactions and recurring rules point at one by id; the
 * display name rides on the wire joined, never resolved on the web.
 */
export const receivers = pgTable(
  'receivers',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** The receiver's display name. */
    name: varchar({ length: 255 }).notNull(),
    /** The kind of receiver. */
    type: text().$type<ReceiverType>().notNull(),
  },
  (table) => [
    // Every query that lists or searches receivers starts from the tenant.
    index('receivers_tenant_id_idx').on(table.tenantId),
  ]
)

export type Receiver = typeof receivers.$inferSelect
export type NewReceiver = typeof receivers.$inferInsert

/**
 * A quick-entry preset: a description plus the category and receiver a
 * transaction built from it should carry. Picking a linker prefills the
 * transaction form; the amount, day, and account stay the user's.
 */
export const transactionLinkers = pgTable(
  'transaction_linkers',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** What this preset is for, free text. */
    description: text().notNull(),
    /** The category transactions built from this preset start in. Deleting
     * a category is soft, so the reference always resolves. */
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    /** The receiver transactions built from this preset start with, or
     * nothing when the preset does not fix one. */
    receiverId: integer('receiver_id').references(() => receivers.id),
  },
  (table) => [
    // Every query that lists or searches linkers starts from the tenant.
    index('transaction_linkers_tenant_id_idx').on(table.tenantId),
  ]
)

export type TransactionLinker = typeof transactionLinkers.$inferSelect
export type NewTransactionLinker = typeof transactionLinkers.$inferInsert

/**
 * The frequencies a recurring rule can repeat with. The wire spelling
 * lives in `@workspace/poco` (`frequencies`) — keep the two in step.
 */
export const frequencies = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

export type Frequency = (typeof frequencies)[number]

/**
 * A rule that materializes a transaction on a schedule: Daily needs no
 * day; Weekly repeats on `frequencyDay` (1–7, Monday is 1); Monthly on
 * `frequencyDay` (1–31, clamped to the month's last day); Yearly on
 * `frequencyMonth` (1–12) plus `frequencyDay`. The amount is a `numeric`
 * column mapped to a string, so money never travels through a float.
 */
export const recurringTransactions = pgTable(
  'recurring_transactions',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** The receiver the generated transactions pay. */
    receiverId: integer('receiver_id')
      .notNull()
      .references(() => receivers.id),
    /** The category the generated transactions land in. */
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    /** The account the generated transactions hit. */
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    /** The amount each generated transaction carries, as a string like "12.34". */
    amount: numeric({ precision: 16, scale: 2 }).notNull(),
    /** Whether the generated transaction is an Income or an Expense. The
     * column defaults to Expense so an existing row survives the migration;
     * the wire body always states it. */
    type: text().$type<TransactionType>().notNull().default('Expense'),
    /** The schedule the rule repeats with. */
    frequency: text().$type<Frequency>().notNull(),
    /** Weekly: weekday 1–7; Monthly/Yearly: day 1–31; Daily: nothing. */
    frequencyDay: integer('frequency_day'),
    /** Yearly only: month 1–12. */
    frequencyMonth: integer('frequency_month'),
  },
  (table) => [
    // Every query that lists or searches recurring rules starts from the
    // tenant — and the cron that materializes them reads across tenants.
    index('recurring_transactions_tenant_id_idx').on(table.tenantId),
  ]
)

export type RecurringTransaction = typeof recurringTransactions.$inferSelect
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert

/**
 * The kinds of transaction. The wire spelling lives in `@workspace/poco`
 * (`transactionTypes`) — keep the two in step.
 */
export const transactionTypes = ['Income', 'Expense'] as const

export type TransactionType = (typeof transactionTypes)[number]

/**
 * The states a transaction's review can be in: freshly entered, checked,
 * or canceled. The wire spelling lives in `@workspace/poco`
 * (`transactionStatuses`) — keep the two in step.
 */
export const transactionStatuses = ['Verify', 'Canceled', 'Checked'] as const

export type TransactionStatus = (typeof transactionStatuses)[number]

/**
 * A transaction — the most important table in the app. Every row is money
 * moving in or out of one account on one day. The amount and the balance
 * snapshot are `numeric` mapped to strings, so money never travels
 * through a float; the day is a `date` mapped to `YYYY-MM-DD`, so day
 * grouping never shifts with a timezone. `balanceOnDt` is the linked
 * account's balance right after the transaction applied, stamped
 * server-side and never edited.
 */
export const transactions = pgTable(
  'transactions',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...tenantEntityColumns(),
    /** The transaction's display name. */
    name: varchar({ length: 255 }).notNull(),
    /** A free note, or nothing. */
    note: text(),
    /** The invoice reference the transaction is backed by, or nothing. */
    invoice: varchar({ length: 255 }),
    /** The moved amount, carried as a string like "12.34". */
    amount: numeric({ precision: 16, scale: 2 }).notNull(),
    /** The day the transaction happened, without a time or timezone. */
    transactionDt: date('transaction_dt').notNull(),
    /** The linked account's balance after the transaction applied. */
    balanceOnDt: numeric('balance_on_dt', {
      precision: 16,
      scale: 2,
    }).notNull(),
    /** The account the money moved in or out of. */
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    /** The category the transaction lands in. */
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    /** The receiver the transaction pays, or nothing when it is a transfer
     * or income with no counterpart. */
    receiverId: integer('receiver_id').references(() => receivers.id),
    /** The recurring rule that materialized this transaction, or nothing
     * for a hand-entered one. */
    recurringId: integer('recurring_id').references(
      () => recurringTransactions.id
    ),
    /** Whether the money came in or went out. */
    type: text().$type<TransactionType>().notNull(),
    /** Where the transaction stands in the review workflow. The wire name
     * is `status` (the entity lifecycle travels as `lifecycle`). */
    reviewStatus: text('review_status')
      .$type<TransactionStatus>()
      .notNull()
      .default('Verify'),
    /** Why the status changed, when the user wrote a reason. */
    statusNote: varchar('status_note', { length: 500 }),
    /** The id both sides of one transfer share, or nothing for a row that
     * is not a transfer side. The write paths use it to keep the pair in
     * step — deleting or editing one side alone would invent money. */
    transferGroupId: uuid('transfer_group_id'),
  },
  (table) => [
    // Every query that lists or searches transactions starts from the
    // tenant, and the month window plus the day grouping start from the day.
    index('transactions_tenant_id_idx').on(table.tenantId),
    index('transactions_tenant_id_dt_idx').on(
      table.tenantId,
      table.transactionDt
    ),
    // A recurring rule materializes at most one ACTIVE transaction per day.
    // The partial unique index turns the cron's find-then-insert into an
    // atomic claim — two replicas racing lose one to the index — and leaves
    // hand-entered rows and deleted days out.
    uniqueIndex('transactions_recurring_materialized_key')
      .on(table.tenantId, table.recurringId, table.transactionDt)
      .where(sql`status = 'ACTIVE' and recurring_id is not null`),
  ]
)

export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

/**
 * The actions a history row records. The wire spelling lives in
 * `@workspace/poco` (`transactionHistoryActions`) — keep the two in step.
 */
export const transactionHistoryActions = ['CREATE', 'UPDATE', 'DELETE'] as const

export type TransactionHistoryAction =
  (typeof transactionHistoryActions)[number]

/**
 * An append-only record of one change to a transaction: the row before and
 * after the change, as JSON snapshots. History rows are never updated or
 * deleted — they are not tenant entities, so there is no lifecycle status
 * and no audit trail to stamp again; the row itself is the audit trail.
 */
export const transactionHistory = pgTable(
  'transaction_history',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id),
    /** The transaction the row records a change of. */
    transactionId: integer('transaction_id')
      .notNull()
      .references(() => transactions.id),
    /** What the change was. */
    action: text().$type<TransactionHistoryAction>().notNull(),
    /** The row as it was before the change; nothing on CREATE. */
    before: jsonb(),
    /** The row as it was after the change; nothing on DELETE. */
    after: jsonb(),
    /** The user the session acted as, or nothing for a system write (the
     * cron that materializes recurring rules). */
    createdBy: integer('created_by'),
    createdDt: timestamp('created_dt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Every read of a transaction's history starts from the transaction.
    index('transaction_history_transaction_id_idx').on(table.transactionId),
  ]
)

export type TransactionHistoryRow = typeof transactionHistory.$inferSelect
export type NewTransactionHistoryRow = typeof transactionHistory.$inferInsert
