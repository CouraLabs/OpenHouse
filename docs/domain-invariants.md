# Domain invariants

Rules every feature touching tenants, money, dates, bills, deletion or credentials keeps. The code is the source of truth; this file describes it. `CLAUDE.md` has one line per section.

## Tenant entities

- Business tables spread `tenantEntityColumns()` (`tenantId`, `status`, `createdBy`/`createdDt`, `updateBy`/`updateDt`).
- Delete = `status: 'DELETED'`. Never remove the row.
- Tenant and user come from `context.get('session')`, never the body or query.
- Repositories take the tenant id first; writes stamp `createdBy`/`updateBy` from the session user.
- Display fields are joined by the API (`categoryName`, not a bare `categoryId`). The web never resolves ids into labels.

Tables outside the recipe, each with its own columns and no soft delete:

| Table | Shape |
| --- | --- |
| `tenants`, `users` | identity rows; a user is deactivated (`isActive`) or anonymized, never deleted |
| `tenant_settings` | one row per tenant, typed columns (a new setting is a new column), keeps `updateBy`/`updateDt` |
| `tenant_codes`, `password_reset_codes` | one-time codes, spent via `usedAt` / `expiresAt` |
| `tenant_usage` | counters per tenant, kind and month |
| `notification_preferences`, `push_subscriptions`, `notifications`, `notification_log`, `calendar_feeds` | user-scoped, carry `tenantId` + `userId` |
| `transaction_history`, `audit_log` | append-only |
| `sign_in_attempts` | throttle state keyed by hashed IP or email |

## Time

- "Today" is `todayIn(settings.timezone)` in the API and `useTenantToday()` on the web, never the server or device zone.
- `date` columns are calendar days and never shift when the zone changes.
- Day logic in services takes the injected `Clock` (`common/clock/`). Instant stamps (`updateDt`, `createdAt`, `usedAt`) may use `new Date()`.

## Currency

- `accounts.currency` is the only per-row currency and never changes after creation.
- Transactions, recurring rules, bills and installments use their account's currency.
- Limits and goals use `tenant_settings.mainCurrency`.
- Wire rows carry a read-only `currency` filled by the API.
- Nothing is converted yet:
  - a goal's account must be in the main currency;
  - a limit counts only main-currency accounts (`excludedCount` reports the rest);
  - changing the main currency answers 409 with the limit and goal counts until the body confirms.
- `accounts.spreadPct` is stored for future exchange rates and read by nothing.

## Money

- Stored as integer cents via the `money` type (`packages/db`), which maps decimal strings like `"12.34"` and rejects values above 2^53 cents.
- Raw SQL returns cents through `centsToDecimal`, never a cast.
- On the wire: decimal strings validated by poco's regex.
- Arithmetic on money uses `toCents`/`formatCents` (bigint), never floats.
- On the web: displayed through `lib/format-money.ts` (the row's currency, else `useMainCurrency()`; the locale picks separators) and typed into `MoneyField`. `Number()` is only for chart values and ratios.

## Transactions

- **Transfer:** two legs (Expense out, Income in) sharing one `transferGroupId`.
- **Card payment:** the Income leg of a transfer into the card, with `paymentStatementId` set and `statementId` null (a DB check enforces this).
- **Installments:** share an `installmentGroupId`, with `1 <= installmentNumber <= installmentCount <= 48` (DB check). Only a hand-entered purchase splits: not a transfer, not recurring, not already split.
- **Recurring:** at most one active row per rule and day (unique index).
- **Imported:** at most one active row per account and `externalId` (unique index).
- **History:** every create, update and delete writes a `transaction_history` row in the same batch (`common/ledger/transaction-history.ts`).

## Household splits

- `transaction_splits` holds one active share per member, each greater than 0, summing to the amount.
- `resolveSplit` (poco) supports three modes:
  - `equal`;
  - `percentage` (must total 100);
  - `exact`.
- Rounding cents go to the payer.
- An expense with no explicit split is split equally across active members only when all of these hold:
  - `tenant_settings.unsplitMode` is `household`;
  - the account is personal;
  - the row is not a transfer, adjustment or settlement.

## Card bills

- A `credit_card_statements` row is one cycle of one card:
  - `periodStart` is inclusive;
  - `closeDate` is the exclusive end (the day after the close day on a `closeDayInclusive` card);
  - `dueDate` is set at creation.
- Totals, `paid`, carry-over (`previousBalance`, `amountDue`, `carriedTo`) and status are computed on read, never stored.
- A purchase's bill comes from poco's `resolveStatement`. `statementPinned` keeps a manual choice.
- A payment settles the bill named by `paymentStatementId`, chosen explicitly or from `defaultPaymentStatement`, never from the payment date.
- `minimumDue` and `bankTotal` are typed in from the bank's bill.
- `closedAt` and `reconciledAt` are audit stamps no logic reads.

## Deletion

- **Tenant:** the owner types the tenant name to schedule it. 30 tenant-days later an hourly job deletes everything with `tenant_id = ?` in one `db.batch`, children first and `tenants` last, so a crashed run resumes.
- **Member anonymization:** clears name, email and password, deactivates the user, expires unused reset codes, and deletes their `push_subscriptions`, `calendar_feeds` and `notifications`.
- **Credential rows:**
  - a `push_subscriptions` row goes on unsubscribe or a 404/410 from the push service;
  - a `calendar_feeds` row goes on regenerate or revoke;
  - `sign_in_attempts` rows are pruned daily after 24 hours.
- Nothing else hard-deletes.
- `audit_log` has no FK to `tenants` and keeps `tenant.deleted`.
- Exports (`data-exports/`, CSV) are audited and built in memory per request, never stored (see `data-export.md`).

## Password recovery

- Reset codes come from three places:
  - an owner issuing one for a member;
  - an owner's recovery codes;
  - the operator command `npm run reset-code` (never over HTTP).
- `POST auth/password/reset` redeems a code.
- Only the SHA-256 of the normalized code is stored; the plaintext is shown once.
- Redeeming clears the refresh hash, which signs every session out.
- Wrong, expired and used codes all answer one generic 400.

## Environment switches

- `ENVIRONMENT` is `development` or `production` (unset = production).
- In production, `OPENHOUSE_ENABLE_EMAIL_VERIFICATION` and `OPENHOUSE_ENABLE_CAPTCHA_CHECK` enable:
  - the sign-up confirmation link;
  - Turnstile on sign-up, on a sign-in retried within 5 s, on confirmation resends and on invite codes.
- Production also hardens Hono: HSTS, a CSRF origin check, and no error detail in responses.
- In development both checks are off, whatever the variables say.
- The web reads the effective switches from `GET auth/config`.
- Accounts created while confirmation was off keep `email_verified_at` empty and are asked to confirm at their next sign-in once it is on.

## Plans

- `tenants.tier`: -1 Developer (no caps; the dev default), 0 Free (the prod default), 1 Plus, 2 Pro, 3 Max.
- The catalog is poco's `TIER_PLANS`. There is no billing; a tier changes only through `npm run set-tier`.
- Caps are enforced in `app.ts` through `TierGate`:
  - creating an account, category, receiver, linker, limit, goal or recurring rule counts its active rows (system categories excluded);
  - invites count active users;
  - exports and import commits count `tenant_usage` per month.
  - A refusal answers 403 `tier_limit`.
- Free shows only the current month and the two before:
  - older transactions are hidden from lists, search, summaries and lookups, and can't be created or edited;
  - balances, bills and goals still count them;
  - they are never deleted, and a paid tier shows them again.
- Messaging, AI and the Household Assistant are plan flags only, until those features exist.
