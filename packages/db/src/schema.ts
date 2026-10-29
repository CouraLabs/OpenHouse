import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

import { money } from './money.js'

/**
 * The lifecycle status every tenant entity carries. Soft delete is a status
 * change, never a row removal. The wire spelling of this vocabulary lives in
 * `@workspace/poco` (`entityStatuses`) — keep the two in step.
 */
export const entityStatuses = ['ACTIVE', 'DELETED'] as const

export type EntityStatus = (typeof entityStatuses)[number]

/**
 * Milliseconds since the epoch, stored as an INTEGER — SQLite has no
 * timestamp type, and an integer compares and sorts exactly. `fromDriver`
 * builds a `Date`.
 */
const dt = (name: string) => integer(name, { mode: 'timestamp_ms' })

/** The default a write stamps when it sets no time of its own: the write's
 * moment, truncated to whole milliseconds so the column always holds an
 * exact integer (a bare `unixepoch('subsec') * 1000` is a REAL, and a REAL
 * in the column would break `update_dt = ?` equality checks). */
const NOW = sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`

/** A JSON document, stored as TEXT and parsed on read. */
const json = (name?: string) =>
  name === undefined ? text({ mode: 'json' }) : text(name, { mode: 'json' })

/**
 * A calendar day, stored as the `YYYY-MM-DD` text SQLite `date()` columns
 * hold. ISO text sorts and compares correctly, and a day never shifts when
 * a timezone changes (rule 6c).
 */
const day = (name: string) => text(name)

/**
 * The columns every tenant-scoped entity shares — the `TenantEntity` base
 * shape. The tenant and the lifecycle status come first; the audit trail
 * records who acted and when (`createdBy`/`updateBy` hold a `users.id`, kept
 * plain so removing a user never breaks the history they left behind).
 *
 * Spread this into a `sqliteTable` — the columns keep full type inference,
 * and the table adds its own identity and business columns after the spread.
 */
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

/**
 * How a tenant reads an expense that carries no split. The wire spelling
 * lives in `@workspace/poco` (`unsplitModes`) — keep the two in step.
 */
export const unsplitModes = ['personal', 'household'] as const

export type UnsplitMode = (typeof unsplitModes)[number]

/**
 * Who an account belongs to. A `shared` (joint) account's expenses create
 * no debts between members. The wire spelling lives in `@workspace/poco`
 * (`accountOwnerships`) — keep the two in step.
 */
export const accountOwnerships = ['personal', 'shared'] as const

export type AccountOwnership = (typeof accountOwnerships)[number]

/**
 * A tenant is the isolation boundary of the application: every user belongs
 * to exactly one, and every piece of tenant data is reached through the user
 * the session was issued to.
 */
export const tenants = sqliteTable('tenants', {
  id: integer().primaryKey({ autoIncrement: true }),
  /** The tenant's display name. Unique so sign-up can reject duplicates. */
  name: text().notNull().unique(),
  /** When the tenant's access ends, or nothing while it is active. */
  expiresIn: dt('expires_in'),
  /**
   * The calendar day, in the tenant's time zone, the tenant and everything
   * it owns are hard-deleted — the owner scheduled it 30 days ahead and can
   * cancel until then. Nothing while no deletion is scheduled. The one
   * sanctioned exception to soft delete.
   */
  deletionDate: day('deletion_date'),
  createdAt: dt('created_at').notNull().default(NOW),
  updatedAt: dt('updated_at').notNull().default(NOW),
})

/**
 * The roles a user can hold. The first user of a tenant is an `owner`; every
 * user after it joins with an invite code and is a `user`.
 */
export const userRoles = ['owner', 'user'] as const

export const users = sqliteTable(
  'users',
  {
    id: integer().primaryKey({ autoIncrement: true }),
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
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    /**
     * When an owner anonymized the user at their request (LGPD/GDPR
     * erasure): the name, email, and password hash are gone, the rows they
     * created stay for the household's books. Nothing for a normal user.
     */
    anonymizedAt: dt('anonymized_at'),
    /**
     * The page the user opens on after signing in — a web route path. The
     * vocabulary lives in `@workspace/poco` (`startPages`); a value it no
     * longer knows reads as the home page.
     */
    startPage: text('start_page').notNull().default('/'),
    createdAt: dt('created_at').notNull().default(NOW),
    updatedAt: dt('updated_at').notNull().default(NOW),
  },
  (table) => [
    // Every query that resolves a session starts from the tenant, so the
    // column is indexed. An email is unique across every tenant — one
    // email is one user in one tenant — so sign-in, which names no tenant,
    // always finds exactly one row. Emails are stored lowercase-trimmed; the
    // index on `lower(email)` holds even against a write that forgets to.
    uniqueIndex('users_email_key').on(sql`lower(${table.email})`),
    index('users_tenant_id_idx').on(table.tenantId),
  ]
)

/**
 * The code an owner generates so the next users of the tenant can sign up.
 * A code is single-use and, when set, expires at `expiresAt`.
 */
export const tenantCodes = sqliteTable('tenant_codes', {
  id: integer().primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  code: text().notNull().unique(),
  /** When the code was used, or nothing while it is still redeemable. */
  usedAt: dt('used_at'),
  /** When the code stops working, or nothing while it never does. */
  expiresAt: dt('expires_at'),
  createdAt: dt('created_at').notNull().default(NOW),
})

/**
 * How a password reset code came to be: an owner issued it for a member, the
 * owner generated it in advance as a recovery code, or the server command
 * printed it. The wire spelling lives in `@workspace/poco`
 * (`resetCodeKinds`) — keep the two in step.
 */
export const resetCodeKinds = ['owner_issued', 'recovery', 'server'] as const

export type ResetCodeKind = (typeof resetCodeKinds)[number]

/**
 * A one-time code that sets a new password without email. Only the SHA-256
 * of the normalized code (uppercase, no hyphen) is stored — the plaintext is
 * shown once and never reaches the database. Invalidating an unused code
 * expires it now, so the row stays as the audit trail of what was issued.
 */
export const passwordResetCodes = sqliteTable(
  'password_reset_codes',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    /** The user the code sets a new password for. */
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    /** The SHA-256 (hex) of the normalized code. */
    codeHash: text('code_hash').notNull(),
    kind: text().$type<ResetCodeKind>().notNull(),
    /** The owner who issued an `owner_issued` code; nothing otherwise. */
    issuedBy: integer('issued_by'),
    /** When the code stops working; nothing for a recovery code, which
     * works until used or replaced by a new set. */
    expiresAt: dt('expires_at'),
    /** When the code was redeemed, or nothing while it is still open. */
    usedAt: dt('used_at'),
    /** When the user acknowledged a `server` code's notice, or nothing
     * while it is still shown to them. */
    noticeSeenAt: dt('notice_seen_at'),
    createdAt: dt('created_at').notNull().default(NOW),
  },
  (table) => [
    // Redeeming looks a code up by its hash alone — the code names no user.
    uniqueIndex('password_reset_codes_code_hash_key').on(table.codeHash),
    index('password_reset_codes_user_id_idx').on(table.userId),
  ]
)

/**
 * The tenant's global settings, one row per tenant, created with it. Typed
 * columns rather than key/value pairs: every setting is checked by poco and
 * by the database, and a new setting is a new column by migration.
 *
 * A sanctioned exception to the tenant-entity recipe: a singleton has no
 * lifecycle, so it spreads no `tenantEntityColumns()` — no status, no soft
 * delete — and is keyed by the tenant itself.
 */
export const tenantSettings = sqliteTable('tenant_settings', {
  tenantId: integer('tenant_id')
    .primaryKey()
    .references(() => tenants.id),
  /** The IANA time zone that decides what "today" is for the tenant. */
  timezone: text().notNull(),
  /** The currency limits and goals are denominated in, and new accounts
   * default to. Changing it re-denominates them without converting. */
  mainCurrency: text('main_currency').$type<Currency>().notNull(),
  /** False while a migrated tenant still runs on the `UTC` placeholder. */
  timezoneConfirmed: integer('timezone_confirmed', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  /** How an expense with no split reads: `personal` (the payer's own, no
   * debts) or `household` (shared equally by every active member). */
  unsplitMode: text('unsplit_mode')
    .$type<UnsplitMode>()
    .notNull()
    .default('personal'),
  updateBy: integer('update_by'),
  updateDt: dt('update_dt').notNull().default(NOW),
})

/**
 * A category of something the tenant organizes — the first tenant entity
 * built on the shared base shape. A name is unique per tenant among ACTIVE
 * rows: deleting a category frees its name for reuse, and the partial index
 * enforces that at the database even under concurrent creates.
 *
 * `searchName` carries the name lowercased and accent-stripped
 * (`normalizeSearchName`): SQLite folds case and accents in ASCII only, so
 * the pt-BR names the tenants actually write are matched through this column
 * instead of `lower(name)`.
 */
export const categories = sqliteTable(
  'categories',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    name: text().notNull(),
    /** The searchable name: the name lowercased and accent-stripped. */
    searchName: text('search_name').notNull(),
    /** A hex color, `#RRGGBB` or `#RRGGBBAA` — the column holds 9 characters. */
    color: text().notNull(),
    /** The split new expenses of the category start with ("Rent: 60/40"),
     * as the poco `SplitInput` JSON, or nothing. Validated on every write. */
    defaultSplit: json('default_split').$type<Record<string, unknown>>(),
  },
  (table) => [
    // Every query that lists or searches categories starts from the tenant,
    // and the search matches through `search_name`.
    index('categories_tenant_id_idx').on(table.tenantId),
    index('categories_tenant_id_search_name_idx').on(
      table.tenantId,
      table.searchName
    ),
    // The uniqueness rule the service surfaces as a friendly 409, enforced
    // here so a race cannot slip two ACTIVE rows past the check. The match
    // is the accent-stripped name, like the check that precedes it.
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
export type TenantCode = typeof tenantCodes.$inferSelect
export type NewTenantCode = typeof tenantCodes.$inferInsert
export type TenantSettingsRow = typeof tenantSettings.$inferSelect
export type PasswordResetCode = typeof passwordResetCodes.$inferSelect
export type NewPasswordResetCode = typeof passwordResetCodes.$inferInsert
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
 * across a Day, a Week, a Month, or a Year. The amount is stored as integer
 * cents (the `money` type) and carried as a string like "12.34".
 */
export const limits = sqliteTable(
  'limits',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The category the limit caps. Deleting a category is soft, so the
     * reference always resolves. */
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    /** The capped amount, carried as a string like "12.34". */
    amount: money().notNull(),
    /** The period the amount covers. The amount is denominated in the
     * tenant's main currency (`tenant_settings.mainCurrency`) — currency
     * lives on accounts only. */
    type: text().$type<LimitType>().notNull(),
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
 * a credit card (Credit Card). The amount columns are stored as integer
 * cents (the `money` type) and carried as strings, so money never travels
 * through a float. A credit card closes on a day of the month and its bill
 * is due on another — days of the month alone, with no month or year, since
 * a card closes on the 15th whatever the month.
 */
export const accounts = sqliteTable(
  'accounts',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The account's display name. */
    name: text().notNull(),
    /** The bank or branch the account sits at; a credit card has none. */
    agency: text('agency'),
    /** The bank account's number; a wallet or a card has none. An
     * identifier, not a quantity: text keeps leading zeros and check digits
     * (`00012345-6`), and 34 characters fit an IBAN. */
    number: text('number'),
    /** The kind of account, which decides which other fields apply. */
    type: text().$type<AccountType>().notNull(),
    /** The cached current balance, stored as integer cents and carried as
     * a string like "12.34". The ledger writes move it by a relative
     * `balance = balance + ?` inside the insert's batch; it always equals
     * `openingBalance` plus the applied deltas of the account's rows (the
     * consistency check asserts it). */
    balance: money().notNull(),
    /** What the account held before its first transaction: the running
     * balance of every row starts from it. Editing it recomputes `balance`. */
    openingBalance: money('opening_balance').notNull(),
    /** The day the opening balance is stated for. */
    openingDt: day('opening_dt')
      .notNull()
      .default(sql`current_date`),
    /** The day through which the account was reconciled against the bank:
     * rows on or before it are locked behind a confirmation. Nothing until
     * the first reconciliation. */
    reconciledThrough: day('reconciled_through'),
    /** The currency the account's money is denominated in — the only
     * currency column for money that moves. Never changes after creation. */
    currency: text().$type<Currency>().notNull(),
    /** The markup, in percent, the bank or card applies on top of the market
     * rate when it converts a foreign amount (`"4.00"` is 4%). Stored now
     * for the exchange-rate integration; no calculation reads it yet. */
    spreadPct: money('spread_pct')
      .notNull()
      .default('0.00'),
    /** The credit card's limit; `limit` is a reserved SQL word, safe here
     * because drizzle quotes identifiers. */
    limit: money(),
    /** The day of the month the credit card bill closes. */
    closeDay: integer('close_day'),
    /** The day of the month the credit card bill is due. */
    dueDay: integer('due_day'),
    /** Whether a purchase on the close day still lands on the closing bill.
     * Off by default: most banks bill it on the next cycle. */
    closeDayInclusive: integer('close_day_inclusive', {
      mode: 'boolean',
    })
      .notNull()
      .default(false),
    /** Whether the account is the tenant's default — the one new
     * transactions start in. At most one account of a tenant carries the
     * flag; the write paths clear the previous holder first. */
    isDefault: integer('is_default', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Whether the account is one member's or the household's joint one.
     * Expenses paid from a shared account create no debts. */
    ownership: text().$type<AccountOwnership>().notNull().default('personal'),
  },
  (table) => [
    // Every query that lists or searches accounts starts from the tenant.
    index('accounts_tenant_id_idx').on(table.tenantId),
    // The one-default rule, enforced by the database: a tenant can never
    // hold two flagged rows, whatever the write path does.
    uniqueIndex('accounts_one_default_per_tenant_key')
      .on(table.tenantId)
      .where(sql`is_default`),
    // A spread is a percentage: poco checks the shape, the database the
    // range — 0% through 100%, in cents of percent.
    check(
      'accounts_spread_pct_range',
      sql`${table.spreadPct} >= 0 and ${table.spreadPct} <= 10000`
    ),
    check('accounts_name_length', sql`length(${table.name}) <= 255`),
    check('accounts_agency_length', sql`${table.agency} is null or length(${table.agency}) <= 255`),
    check('accounts_number_length', sql`${table.number} is null or length(${table.number}) <= 34`),
  ]
)

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

/**
 * One billing cycle of one credit card — a bill. The period is
 * `[periodStart, closeDate)`: `closeDate` is the exclusive end (the close
 * day itself, or the day after it on a `closeDayInclusive` card). The days
 * are snapshotted when the bill is created, so editing the card's days
 * later never rewrites a closed bill. Totals and status are not stored:
 * they are derived from the transactions on read, so they never drift.
 */
export const creditCardStatements = sqliteTable(
  'credit_card_statements',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The credit card the bill belongs to. Deleting an account is soft,
     * so the reference always resolves. */
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    /** The first day of the period, inclusive. */
    periodStart: day('period_start').notNull(),
    /** The exclusive end of the period. */
    closeDate: day('close_date').notNull(),
    /** The day the bill must be paid by. */
    dueDate: day('due_date').notNull(),
    /** When a write first found the bill past its close — an audit stamp
     * only; the status is derived from the dates, never from this. */
    closedAt: dt('closed_at'),
    /** The minimum payment printed on the bank's bill — typed in by the
     * user, shown only; nothing computes it. */
    minimumDue: money('minimum_due'),
    /** The total printed on the bank's bill, as last typed in to reconcile. */
    bankTotal: money('bank_total'),
    /** When the bill was reconciled against the bank's — an audit stamp
     * only, like `closedAt`; no logic reads it. */
    reconciledAt: dt('reconciled_at'),
  },
  (table) => [
    // One ACTIVE bill per card cycle. The partial unique index turns the
    // get-or-create into an atomic claim: two writes racing to open the
    // same bill insert one row, and the loser reads it.
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

/**
 * A goal the tenant saves toward: a target balance on a savings account,
 * tracked from the account's balance at a day. The amount columns are
 * stored as integer cents (the `money` type) and carried as strings; the
 * date columns are `YYYY-MM-DD` text, so a goal's day never shifts with a
 * timezone.
 */
export const goals = sqliteTable(
  'goals',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The goal's display name. */
    name: text().notNull(),
    /** The savings account the goal tracks. Deleting an account is soft,
     * so the reference always resolves. */
    linkedAccountId: integer('linked_account_id')
      .notNull()
      .references(() => accounts.id),
    /** The tracked balance on `balanceDt`, carried as a string like "12.34". */
    balance: money().notNull(),
    /** The day the balance was taken, without a time or timezone. */
    balanceDt: day('balance_dt').notNull(),
    /** The balance the goal aims for, carried as a string like "12.34". */
    targetBalance: money('target_balance').notNull(),
    /** The day the goal should be reached, or nothing while it has no
     * deadline. The balances are denominated in the tenant's main currency
     * (`tenant_settings.mainCurrency`) — currency lives on accounts only. */
    targetDt: day('target_dt'),
  },
  (table) => [
    // Every query that lists or searches goals starts from the tenant.
    index('goals_tenant_id_idx').on(table.tenantId),
    check('goals_name_length', sql`length(${table.name}) <= 255`),
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
 *
 * `searchName` carries the name lowercased and accent-stripped
 * (`normalizeSearchName`): SQLite folds case and accents in ASCII only, so
 * pt-BR names are searched through this column.
 */
export const receivers = sqliteTable(
  'receivers',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The receiver's display name. */
    name: text().notNull(),
    /** The searchable name: the name lowercased and accent-stripped. */
    searchName: text('search_name').notNull(),
    /** The kind of receiver. */
    type: text().$type<ReceiverType>().notNull(),
  },
  (table) => [
    // Every query that lists or searches receivers starts from the tenant,
    // and the search matches through `search_name`.
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

/**
 * A quick-entry preset: a description plus the category and receiver a
 * transaction built from it should carry. Picking a linker prefills the
 * transaction form; the amount, day, and account stay the user's.
 *
 * `searchName` carries the description lowercased and accent-stripped
 * (`normalizeSearchName`) — the column the description search matches.
 */
export const transactionLinkers = sqliteTable(
  'transaction_linkers',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** What this preset is for, free text. */
    description: text().notNull(),
    /** The searchable text: the description lowercased and accent-stripped. */
    searchName: text('search_name').notNull(),
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
    // Every query that lists or searches linkers starts from the tenant,
    // and the search matches through `search_name`.
    index('transaction_linkers_tenant_id_idx').on(table.tenantId),
    index('transaction_linkers_tenant_id_search_name_idx').on(
      table.tenantId,
      table.searchName
    ),
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
 * `frequencyMonth` (1–12) plus `frequencyDay`. The amount is stored as
 * integer cents (the `money` type) and carried as a string like "12.34".
 */
export const recurringTransactions = sqliteTable(
  'recurring_transactions',
  {
    id: integer().primaryKey({ autoIncrement: true }),
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
    amount: money().notNull(),
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
    /** The member who pays the generated transactions, or nothing. */
    paidByUserId: integer('paid_by_user_id').references(() => users.id),
    /** The shares the generated transactions are split with, as the poco
     * `SplitInput` JSON, or nothing. */
    defaultSplit: json('default_split').$type<Record<string, unknown>>(),
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
 * snapshot are stored as integer cents (the `money` type) and carried as
 * strings; the day is `YYYY-MM-DD` text, so day grouping never shifts with
 * a timezone. `balanceOnDt` is the linked account's balance right after the
 * transaction applied, stamped server-side and never edited.
 */
export const transactions = sqliteTable(
  'transactions',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The transaction's display name. */
    name: text().notNull(),
    /** A free note, or nothing. */
    note: text(),
    /** The invoice reference the transaction is backed by, or nothing. */
    invoice: text('invoice'),
    /** The moved amount, carried as a string like "12.34". */
    amount: money().notNull(),
    /** The day the transaction happened, without a time or timezone. */
    transactionDt: day('transaction_dt').notNull(),
    /** @deprecated The linked account's balance when the row was written —
     * write order, not date order, so it is wrong after a backdated entry.
     * Reads compute the chronological `runningBalance` instead. */
    balanceOnDt: money('balance_on_dt').notNull(),
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
    statusNote: text('status_note'),
    /** The id both sides of one transfer share, or nothing for a row that
     * is not a transfer side. The write paths use it to keep the pair in
     * step — deleting or editing one side alone would invent money. */
    transferGroupId: text('transfer_group_id'),
    /** The card bill a charge lands on — set on every card row except the
     * card side of a payment, and nothing on the other account kinds. */
    statementId: integer('statement_id').references(
      () => creditCardStatements.id
    ),
    /** Whether the user moved the charge to its bill by hand: date edits
     * then no longer re-resolve it. */
    statementPinned: integer('statement_pinned', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** The bill a payment settles — set only on the card side of a transfer
     * into a card, chosen explicitly and never resolved from the day. */
    paymentStatementId: integer('payment_statement_id').references(
      () => creditCardStatements.id
    ),
    /** The id the installments of one card purchase share ("parcelado em
     * Nx"), or nothing for a row that is not an installment. */
    installmentGroupId: text('installment_group_id'),
    /** Which installment this row is, 1-based. */
    installmentNumber: integer('installment_number'),
    /** How many installments the purchase was split into. */
    installmentCount: integer('installment_count'),
    /** Whether the row is a reconciliation adjustment: it moves the balance
     * but is no income or expense, so the reports leave it out. */
    isAdjustment: integer('is_adjustment', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** The bank's own id for the row — the OFX `FITID` — or nothing for a
     * row typed in or imported from a file that carries none. */
    externalId: text('external_id'),
    /** The statement import that wrote the row, or nothing for a row not
     * imported. Undoing the import soft-deletes the rows sharing it. */
    importBatchId: text('import_batch_id'),
    /** The member who paid, or nothing for a row no member paid (a system
     * write with no payer). Defaults to the creator. Never cleared. */
    paidByUserId: integer('paid_by_user_id').references(() => users.id),
    /** Whether the row settles a debt between two members: it moves money
     * (or is paid to a member) but is no income or expense, so reports
     * leave it out. */
    isSettlement: integer('is_settlement', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (table) => [
    // The running-balance window partitions by account and walks the days,
    // so it reads this index in order instead of sorting the table.
    index('transactions_account_dt_idx').on(
      table.tenantId,
      table.linkedAccountId,
      table.transactionDt,
      table.id
    ),
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
    // Importing the same bank file twice adds nothing: one ACTIVE row per
    // bank id per account. The `ACTIVE` condition is what lets an undone
    // import (a soft delete) be imported again.
    uniqueIndex('transactions_external_id_key')
      .on(table.tenantId, table.linkedAccountId, table.externalId)
      .where(sql`status = 'ACTIVE' and external_id is not null`),
    // Undoing an import reads its rows by batch.
    index('transactions_import_batch_idx')
      .on(table.tenantId, table.importBatchId)
      .where(sql`import_batch_id is not null`),
    // A bill's totals sum its transactions.
    index('transactions_statement_id_idx')
      .on(table.tenantId, table.statementId)
      .where(sql`status = 'ACTIVE' and statement_id is not null`),
    check(
      'transactions_pinned_needs_statement',
      sql`not ${table.statementPinned} or ${table.statementId} is not null`
    ),
    // A bill's `paid` sums the payments that settle it.
    index('transactions_payment_statement_id_idx')
      .on(table.tenantId, table.paymentStatementId)
      .where(sql`status = 'ACTIVE' and payment_statement_id is not null`),
    // Only the card side of a transfer settles a bill, and it is on none.
    // A purchase's installments are reached by their group.
    index('transactions_installment_group_idx')
      .on(table.tenantId, table.installmentGroupId)
      .where(sql`installment_group_id is not null`),
    // The three installment columns are all set or all null, the number
    // within the count, the count at most 48.
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

/**
 * One member's share of a transaction. The shares of a transaction add up
 * to its amount exactly. Rows are never removed: replacing a split marks
 * the old rows DELETED, and a removed member's rows stay for the books.
 */
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
    /** The member's share, carried as a string like "12.34". */
    share: money().notNull(),
  },
  (table) => [
    index('transaction_splits_transaction_id_idx').on(table.transactionId),
    index('transaction_splits_tenant_id_idx').on(table.tenantId),
    // One ACTIVE share per member per transaction.
    uniqueIndex('transaction_splits_member_key')
      .on(table.transactionId, table.userId)
      .where(sql`status = 'ACTIVE'`),
    check(
      'transaction_splits_share_positive',
      sql`${table.share} > 0`
    ),
  ]
)

export type TransactionSplit = typeof transactionSplits.$inferSelect
export type NewTransactionSplit = typeof transactionSplits.$inferInsert

/**
 * How an account's CSV statement files read, saved the first time one is
 * imported and reused on the next: which column is which, the date format,
 * the decimal separator, and the sign convention. One row per account; the
 * JSON is the poco `importMappingSchema`, validated on every read and write.
 */
export const importMappings = sqliteTable(
  'import_mappings',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    ...tenantEntityColumns(),
    /** The account the mapping belongs to. */
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    /** The mapping, as the poco `ImportMapping` JSON. */
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
export const transactionHistory = sqliteTable(
  'transaction_history',
  {
    id: integer().primaryKey({ autoIncrement: true }),
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
    before: json(),
    /** The row as it was after the change; nothing on DELETE. */
    after: json(),
    /** The user the session acted as, or nothing for a system write (the
     * cron that materializes recurring rules). */
    createdBy: integer('created_by'),
    createdDt: dt('created_dt').notNull().default(NOW),
  },
  (table) => [
    // Every read of a transaction's history starts from the transaction.
    index('transaction_history_transaction_id_idx').on(table.transactionId),
  ]
)

export type TransactionHistoryRow = typeof transactionHistory.$inferSelect
export type NewTransactionHistoryRow = typeof transactionHistory.$inferInsert

/**
 * What the audit log records. Not a wire vocabulary: nothing renders the
 * log, it is read back only by the full export.
 */
export const auditActions = [
  'csv.export',
  'tenant.export',
  'member.export',
  'member.anonymize',
  'tenant.deletion_scheduled',
  'tenant.deletion_canceled',
  'tenant.deleted',
] as const

export type AuditAction = (typeof auditActions)[number]

/**
 * An append-only record of a sensitive action: who exported what, who
 * anonymized whom, when a deletion was scheduled, canceled, or carried out.
 * Rows hold ids and names of things, never personal data, so the log can
 * outlive what it describes.
 *
 * `tenantId` is deliberately not a foreign key: hard-deleting a tenant
 * (the sanctioned exception to soft delete) leaves its `tenant.deleted`
 * line behind, so the deletion itself stays on record. For the same reason
 * `actorId` is a plain id — nothing here breaks when a user goes away.
 */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tenantId: integer('tenant_id').notNull(),
    /** The user who acted, or nothing for the system (the deletion cron). */
    actorId: integer('actor_id'),
    action: text().$type<AuditAction>().notNull(),
    /** What the action was about: the entity exported, the member id, the
     * deletion date. Ids and labels only. */
    details: json().$type<Record<string, unknown>>().notNull().default({}),
    createdDt: dt('created_dt').notNull().default(NOW),
  },
  (table) => [
    // The full export reads a tenant's log in order.
    index('audit_log_tenant_id_idx').on(table.tenantId, table.id),
  ]
)

export type AuditLogRow = typeof auditLog.$inferSelect
export type NewAuditLogRow = typeof auditLog.$inferInsert

/**
 * How a reminder reaches the user: one message each, or one daily digest.
 * The wire spelling lives in `@workspace/poco` (`reminderDeliveries`) —
 * keep the two in step.
 */
export const reminderDeliveries = ['individual', 'digest'] as const

export type ReminderDelivery = (typeof reminderDeliveries)[number]

/**
 * One user's reminder preferences, one row per user, created the first time
 * the user saves them (a user with no row gets the poco defaults). Channels
 * are boolean columns — there is no email yet, and adding one is a new
 * column by migration. A per-user singleton like `tenant_settings`, it has
 * no lifecycle: no status, no soft delete.
 */
export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id),
  tenantId: integer('tenant_id')
    .notNull()
    .references(() => tenants.id),
  /** The bell in the header. */
  inAppEnabled: integer('in_app_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  /** Web push to the user's subscribed browsers. */
  pushEnabled: integer('push_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  /** Whether a push payload carries amounts and names. Quiet by default. */
  pushDetails: integer('push_details', { mode: 'boolean' })
    .notNull()
    .default(false),
  /** Days before a card bill's due date. */
  billLeadDays: integer('bill_lead_days').notNull().default(3),
  /** Days before a recurring expense fires. */
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

/**
 * A browser or device a user subscribed to web push from: one row per
 * endpoint. The push service answering 404 or 410 means the subscription is
 * dead, and the row is deleted.
 */
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
    // One endpoint is one browser: re-subscribing replaces the row.
    uniqueIndex('push_subscriptions_endpoint_key').on(table.endpoint),
    index('push_subscriptions_user_id_idx').on(table.userId),
  ]
)

/**
 * An entry of a user's notification centre. `body` is the structured
 * reminder (kind, names, amounts), rendered by the web in the user's
 * language; the table never stores prose.
 */
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
    /** When the user read it, or nothing while it is unread. */
    readAt: dt('read_at'),
  },
  (table) => [index('notifications_user_id_idx').on(table.userId, table.id)]
)

/**
 * The idempotency log of the reminder cron: one row per reminder ever
 * claimed, keyed `(userId, kind, refId, dueDate)`. The unique index turns
 * the claim into an atomic insert — a restart or a second replica inserting
 * the same key finds it taken and sends nothing — the same pattern as the
 * recurring materialization. `dueDate` is the day the reminder is about (a
 * bill's due date, a rule's firing day, a limit period's first day), so the
 * next cycle is a new key. Rows are kept: the log is the proof a reminder
 * was sent.
 */
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

/**
 * A user's secret calendar feed: the token in the `.ics` URL is the only
 * credential, so it is random, unique, and replaceable. At most one per user.
 */
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
