# Domain invariants

The rules every feature that touches tenants, money, dates, card bills, deletion, or credentials must keep. `CLAUDE.md` lists them in one line each; this file is the full text. Change it here first, then the code.

## Tenant entities follow the base recipe

A tenant-scoped table spreads `tenantEntityColumns()` (packages/db) and adds its identity + business columns. Deletion is a status change (soft), never a row removal. The route reads tenant and user from `context.get('session')` — a request body or query never names a tenant. The repository takes the tenant id as an explicit first argument, and every write stamps `createdBy`/`updateBy` from the session user.

Wire rows that need a display field from another table carry it **joined** (limits carry `categoryName`, never a bare `categoryId` for humans) — the web never resolves foreign-key ids into labels.

**Sanctioned exception — tenant singletons.** `tenant_settings` holds one row per tenant, keyed by `tenantId`, created in the sign-up transaction. It has no lifecycle, so it spreads no `tenantEntityColumns()` (no status, no soft delete, no `createdBy`); it keeps `updateBy`/`updateDt`. Settings are typed columns, never key/value rows: a new global setting is a new column by migration, validated by poco and the database.

**Sanctioned exception — user-scoped rows.** Rows that belong to one user inside a tenant (`notification_preferences`, keyed by `userId`; `push_subscriptions`, one per browser; `notifications`, `notification_log`, `calendar_feeds`) carry `tenantId` and `userId`, spread no `tenantEntityColumns()`, and take the tenant as an explicit argument. They are not business entities: no status, no soft delete. Their rows are deleted only as credentials or delivery state (see tenant deletion below).

## Time is the tenant's

"Today" is `todayIn(settings.timezone)` (poco), never the server's or the device's zone: the recurring job evaluates each tenant against its own calendar day, and web forms default dates through `useTenantToday()`. `date` columns are calendar days and never shift when the zone changes. Services whose logic depends on the day take the injectable `Clock` (`common/clock/`), never `new Date()`.

## Currency lives on the account

`accounts.currency` is the only currency column for money that moves, and it never changes after creation. Anything that moves money (transactions, recurring rules, card bills, installments) inherits it from its account. Anything not tied to an account (limits, goals) is denominated in the tenant's **main currency** from `tenant_settings`; no other table declares a currency. Wire rows still carry a read-only `currency`, joined or filled in by the API, so the web never derives it.

Until exchange rates exist, nothing is converted: a goal's account must be in the main currency, a limit counts only main-currency accounts (`excludedCount` reports the rest), and changing the main currency re-denominates limits and goals — the API answers 409 with their counts until the body confirms it. `accounts.spreadPct` is stored for the future exchange-rate integration and read by no calculation yet.

## Money is a string end to end

Storage is **integer minor units** (cents): the `money` custom type in `packages/db` maps a decimal string (`"12.34"`) to the integer SQLite stores, so `SUM` stays exact and nothing crosses a float — the converter rejects values above 2^53 cents; raw SQL answers cents through a `centsToDecimal` helper, not a cast.

poco validates the decimal shape with a regex. The web formats for display through `lib/format-money.ts` (the row's `Currency` from poco picks the symbol; an amount with no currency of its own formats in the tenant's main currency via `useMainCurrency()`, never a hard-coded one; the i18next locale picks separators and symbol placement) and inputs it through `MoneyField` (packages/ui), whose reverse masking (digits typed are cents) is locale-aware.

## Card bills are derived, not stored

A `credit_card_statements` row is one cycle of one card: `periodStart` inclusive, `closeDate` the exclusive end of the period (the close day itself on a default card, the day after it on a `closeDayInclusive` card), `dueDate` snapshotted at creation. Its totals, carry-over, and status are computed on read from its transactions — never stored, so they cannot drift. `closedAt` is an audit stamp written only by write paths; no logic reads it. The assignment rule is poco's `resolveStatement`, shared by the API and the form; a bill's money is in its card's account currency.

**A payment is a transfer into the card.** Its card side lands on no bill by date; `paymentStatementId` names the bill it settles, chosen explicitly (or poco's `defaultPaymentStatement`), never resolved from the payment's day. A bill's `paid` sums those rows, and the carry-over (`previousBalance`, `amountDue`, `carriedTo`) is derived on read too — no cache. `minimumDue`/`bankTotal` are typed in from the bank's bill and `reconciledAt`, like `closedAt`, is an audit stamp.

## Tenant deletion is the one hard delete

An owner schedules it by typing the tenant name; 30 days later (the tenant's own calendar day) an hourly job removes the tenant and everything it owns, children first, `import_mappings` and the append-only `transaction_history` included — one `db.batch([...])` of `DELETE … WHERE tenant_id = ?` statements (in chunks per table when a tenant is big; the `tenants` row goes last, so a crashed run resumes on the next hour). Nothing else ever removes business rows.

The sanctioned exceptions are credentials and throttle state that carry no history: `sign_in_attempts` (one row per hashed IP or email, the last sign-in attempt, read to ask for a bot check on a retry within 5 seconds) is pruned by the daily job after 24 hours. Likewise a `push_subscriptions` row is deleted when its browser unsubscribes or the push service answers 404/410, and a `calendar_feeds` row when its token is regenerated or revoked. No transaction, settlement, or notification row is ever removed this way. `audit_log` is append-only, has no foreign key to `tenants`, and keeps the `tenant.deleted` line.

Full exports (`data-exports/`) and CSV exports are owner-facing and audited; the ZIP is built in memory per request and returned as a download — nothing is stored, so there is no `EXPORT_DIR`, no expiry, and no one-download bookkeeping (see `data-export.md`).

## Password recovery never needs email

A one-time reset code — issued by an owner for a member, generated in advance as an owner's recovery codes, or printed by the operator command `npm run reset-code` (`apps/api/scripts/reset-code.mjs`, never over HTTP) — sets a new password through `POST auth/password/reset`. Only the SHA-256 of the normalized code is stored; the plaintext is shown once. Redeeming clears the refresh hash (every session signs out); wrong, expired, and used codes answer one generic 400.

## Bot checks and email confirmation are switches

`ENVIRONMENT` is `development` or `production` (unset means production). In production, `OPENHOUSE_ENABLE_EMAIL_VERIFICATION` and `OPENHOUSE_ENABLE_CAPTCHA_CHECK` turn on the confirmation link sent at sign-up and the Turnstile check (sign-up, a sign-in retried within 5 seconds, confirmation resends, invite codes). In development both are off whatever they say. The web learns the effective switches from `GET auth/config` and renders the widget only when the API enforces it. Accounts created while confirmation is off keep `email_verified_at` empty: turning it on later asks them to confirm at their next sign-in.

## Plans are tiers on the tenant

`tenants.tier` is the plan: -1 Developer (no limits; new tenants get it in development), 0 Free (new tenants in production, and every tenant that existed before tiers), 1 Plus, 2 Pro, 3 Max. The catalog — prices in BRL, caps, entitlements — lives once in poco (`TIER_PLANS`) and is read by the API and the web. There is no billing: a tier changes only through the operator command `npm run set-tier`, never over HTTP.

The API enforces the caps at the composition root: creating an account, category, receiver, transaction linker, limit, goal or recurring transaction counts that resource's active rows (system categories excluded); invite codes and invite redemptions count active users; full and CSV exports and import commits count against `tenant_usage`, one row per tenant, kind and tenant-month. A refusal is a 403 `tier_limit` naming the limit.

Free keeps a three-month transaction window (the tenant's current month and the two before). Older transactions are never deleted: they are hidden from lists, search, summaries and lookups, and cannot be created or edited; balances, bills and goals still count them, and moving to a paid tier shows them again. Messaging, AI and the Household Assistant are entitlement flags on the plan until those features exist.
