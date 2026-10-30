# @workspace/e2e

Playwright regression suite for the web app, run against the local dev servers.

## Run

Apply the local migrations once, then run from the repo root. Playwright starts `npm run dev` when nothing is listening on the web port and reuses it otherwise.

```bash
npm run db:migrate
npm run test:e2e
```

The web app is at `http://localhost:5173/app/` (override with `E2E_BASE_URL`). Reports land in `packages/e2e/playwright-report`.

## Projects

- `setup` — signs up two households through the API in BRL: the shared owner (session in `.auth/owner.json`), and a sign-in household (`.auth/sign-in-account.json`) used only by the sign-in and logout tests. Those tests replace the refresh token of the account they sign in as, so they must not use the owner (see OBS-6 in `issue.md`).
- `anonymous` — sign-up, sign-in and route guards, with no session.
- `owner` — every feature test, signed in as the shared owner. Each test creates its own rows with unique names, so tests do not depend on each other.

## Constraints

- The API's general rate limit is 300 requests per 60 seconds per client address (`wrangler.jsonc`). Owner tests run one at a time and pause `E2E_PACE_MS` (default 2500 ms) after each test so a full run stays under it. The credentials limit (10 per 60 seconds) covers the sign-up and sign-in calls, so run the suite again only after a minute.
- Accounts, categories, receivers and household names are unique per tenant. Test data uses `uniqueName()` and `uniqueEmail()`.
- Dev tenants are on the Developer tier, so the tier caps do not apply here.

## Known bugs

Known bugs are tested with `test.fail(...)`: the test passes while the bug exists and fails once it is fixed, which is the signal to drop the marker. The bugs, their root causes, and the observations from the QA pass are in [issue.md](issue.md).

- `anonymous/auth.spec.ts` — BUG-1: a taken household name answers 500 instead of 409.
- `owner/accounts.spec.ts` — BUG-2: a zero amount cannot be typed in `MoneyField`.

## Layout

- `support/` — fixtures (`test.ts` with the pacing fixture), owner credentials, API seeders, form helpers.
- `tests/setup/` — the owner setup project.
- `tests/anonymous/` — signed-out flows.
- `tests/owner/` — feature specs, one file per page.
