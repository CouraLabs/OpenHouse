# QA issues: real bugs and observations

Found while building the Playwright regression suite in `packages/e2e` (73 tests, all passing). The two bugs are tested with `test.fail(...)`, which passes while the bug exists. When one is fixed its test fails, and you should drop the marker.

| ID | Kind | Severity | Summary |
| --- | --- | --- | --- |
| BUG-1 | Bug | Medium | A taken household name answers 500, not 409 |
| BUG-2 | Bug | Medium | A zero amount cannot be typed in `MoneyField` |
| OBS-1 | Observation | Low | Category pre-selection matches on a shared generic word |
| OBS-2 | Observation | Low | Toasts render with `role="dialog"` |
| OBS-3 | Observation | Low | Transactions list has no table or row semantics |
| OBS-4 | Observation | Low | Category chip overlaps the name column in the transactions grid |
| OBS-5 | Observation | Low | `/app/registerSW.js` returns 404 in the browser on every page load |
| OBS-6 | Observation | Medium | One refresh token per user: a sign-in replaces the others |
| OBS-7 | Observation | Medium | The general API rate limit is reached by a single suite run |
| OBS-8 | Observation | Low | Credit card forms require an opening balance |
| OBS-9 | Observation | Low | Close and due day errors repeat under both fields |
| OBS-10 | Observation | Low | Sign-up asks for no currency; the household defaults to USD |

## BUG-1: a taken household name answers 500

**Expected:** `409` with "This tenant name is already taken." on the sign-up form.
**Actual:** `500` with "Something went wrong on our side." The API detail reads `D1_ERROR: UNIQUE constraint failed: tenants.name`.

**Reproduce:** sign up at `/app/sign-up` with a household name that already exists and a new email. Or, against the dev API:

```bash
curl -s -X POST localhost:8787/api/auth/sign-up -H 'content-type: application/json' \
  -d '{"tenantName":"<existing name>","name":"Dup","email":"new@example.com","password":"password-a"}'
```

**Root cause (verified):** `isUniqueViolation` in `apps/api/src/common/db-errors.ts` takes the column list from the text after the first `:`. In D1 messages that is `D1_ERROR:`, so `tenants.name` is never found. Calling the function with the real message returns `false` for `(tenants, ['name'])` and `true` for `(tenants)` alone. The same parse breaks any single-column unique constraint on a plain column, which is every such constraint without a named index. A duplicate email already answers 409 (checked with `curl`), so the bug is specific to the tenant-name constraint in this path.

**Fix direction:** read the columns after `UNIQUE constraint failed: `, not after the first colon, and add a `db-errors.spec.ts` case with the D1 message.

**Regression test:** `tests/anonymous/auth.spec.ts`, "a household name that is already taken is refused with a readable message" (`test.fail`).

## BUG-2: a zero amount cannot be typed

**Expected:** `0.00` is accepted. `balanceSchema` in `packages/poco/src/accounts.ts` allows it.
**Actual:** typing `0` or `0.00` leaves the field empty, and the form reports "Enter an amount like 12.34." on save.

**Reproduce:** Accounts → New account → type Wallet, Balance `0.00`, Currency BRL, Save.

**Root cause (verified in the browser and in the code):** `parseInput` and `toDisplay` in `packages/ui/src/components/money-field.tsx` both return an empty string when the digits are zero, so the stored value is empty and the display clears.

**Fix direction:** keep the typed digits as they are, and only show the blank state for an empty input. The error text is also misleading for a zero value.

**Regression test:** `tests/owner/accounts.spec.ts`, "a wallet can start with a zero balance" (`test.fail`).

## OBS-1: category pre-selection matches on a shared generic word

A transaction name is matched against category names by shared tokens, and a single shared word can be enough. A name such as "QA Incomplete" picks "QA Groceries" because both contain "QA". The form pre-selects the match, and the user has to notice it and change it.

**Verified:** `inferCategory("QA Incomplete mvu7xyz", [{ name: "QA Groceries mvu9abc" }])` returns "QA Groceries". `inferCategory` is in `packages/poco/src/infer-category.ts`, and the form uses it in `apps/web/src/features/transactions/transaction-form-fields.tsx`.

**Suggestion:** ignore very short tokens and common words, or show the match as a suggestion rather than selecting it.

## OBS-2: toasts render with `role="dialog"`

After saving a transaction, the "Transaction saved — the books absorbed it." toast matches `getByRole('dialog')`, so a check that no dialog is open fails while the toast is up. Screen readers will announce the toast as a dialog.

**Suggestion:** render toasts as `role="status"` (or `alert` for errors).

## OBS-3: the transactions list has no table or row semantics

The list is a CSS grid of `div`s with no `role` attributes. Screen readers cannot move through it as a table. The accounts, categories, and bills lists do expose rows, so this one is out of line with them. The tests have to locate transaction rows with `div.grid.items-center` filtered by text.

**Suggestion:** use the table or grid roles the other lists already use.

## OBS-4: category chip overlaps the name column

On the transactions page at a 1280px viewport, a long category name runs into the Name column, so the chip sits on top of the transaction name. The grid is `grid-cols-[2.5rem_10rem_1fr_1fr_10rem_7rem_7rem]`, and the category and account column is 10rem wide. Seen in QA screenshots with generated category names of 25 characters or more; not automated.

**Suggestion:** truncate the chip inside its column, or widen the column.

## OBS-5: `/app/registerSW.js` returns 404 in the browser

Every page load in dev requests `/app/registerSW.js` and gets a 404. The same URL returns `200` to `curl`, so the browser request is the one that fails. Checked in a clean Playwright context on `/app/`, `/app/accounts`, and `/app/transactions`. Console noise only; the cause is not investigated.

## OBS-6: one refresh token per user

`users.refreshTokenHash` is a single column (`apps/api/src/auth/auth.service.ts`). Issuing a session (sign-in, sign-up) writes the new token's hash into it, and sign-out clears it. Presenting a token that does not match clears the hash as well. So a second sign-in on another device makes the first device's refresh fail as soon as its access token (15 minutes) expires.

**Verified in the suite:** the owner's stored session stopped refreshing (`401` on `/api/auth/refresh`) after the sign-in and logout tests ran as the same user. The suite now uses a separate household for those tests.

**Question:** is one active session per user intended? If not, the refresh token needs a row per session.

## OBS-7: the general API rate limit is reached by one suite run

The general limit is 300 requests per 60 seconds per client address (`apps/api/wrangler.jsonc`). One run of the suite with a single worker made 896 API requests in about 3.4 minutes, and `POST /api/categories` and `POST /api/receivers` answered `429 Too many requests` during that run. The suite now waits 2.5 seconds between tests.

**Question:** is 300 per minute right for real use? A busy session that loads several pages in a row could reach it, since each page load makes several API requests.

## OBS-8: credit card forms require an opening balance

The Balance field is required for every account type, including Credit Card. A card with no balance cannot be saved, and because of BUG-2 a zero balance cannot be typed either.

**Question:** should a card be able to start with no opening balance?

## OBS-9: close and due day errors repeat under both fields

Setting the same day for close and due shows "The close and due days must differ." under both date fields. The message is correct, but the repeat is noise.

## OBS-10: sign-up asks for no currency

The sign-up form asks for a household name, your name, an email, and a password. It does not ask for a currency or a timezone. `apps/api/src/auth/auth.service.ts` falls back to `USD` for the main currency when none is given, so a household created from the form gets USD, and the form never says so. The suite creates its households in BRL through the API.

**Question:** should sign-up ask for the main currency?
