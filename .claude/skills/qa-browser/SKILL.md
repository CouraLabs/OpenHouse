---
name: qa-browser
description: How to test Kantim's web app in a real browser after a web change — the Playwright suite in packages/e2e, dev servers, isolated browser contexts, seeding fixtures, driving base-ui controls, and the local QA account for manual checks. Use after any change under apps/web or packages/ui, before calling the work done.
---

# Testing the web app in a browser

After any web change, drive the real UI with the Playwright suite in `packages/e2e`. Green unit tests do not prove that a dialog opens or a form submits.

1. Apply the local migrations once: `npm run db:migrate`.
2. Run the suite from the repo root, or only the spec you touched:
   - `npm run test:e2e` runs everything. It starts `npm run dev` when nothing listens on `localhost:5173`, and reuses it otherwise.
   - One page: `cd packages/e2e && npx playwright test --project=owner tests/owner/<page>.spec.ts`.
   - Watch a run: add `--headed`, or `--ui` for the Playwright UI.
3. For a page you changed, update its spec in `packages/e2e/tests/owner/<page>.spec.ts`, or add one. Each test wraps its actions in `test.step('Action: …')` and its checks in `test.step('Expect: …')`. Name rows with `uniqueName()` and seed fixtures with the helpers in `support/seed.ts`. Drive the feature under test through the UI, not the API.
4. Isolation: every Playwright test gets a fresh browser context, so no developer's own browser session or data is used. The owner household is created by the setup project in the local dev database. Sign-in and sign-up tests use their own households.
5. A failure keeps `test-failed-1.png`, `error-context.md` (the page snapshot), and `trace.zip` under `packages/e2e/test-results`. Open the trace with `npx playwright show-trace <path>`.
6. A `test.fail(...)` marks a known bug listed in `packages/e2e/issue.md`. Remove the marker when the bug is fixed.

## Driving the UI

- Use role locators. A select is `getByRole('combobox', { name })`, then `getByRole('option', { name })`. Real clicks open base-ui Select; a synthetic `.click()` does not.
- Form placement differs by page: the transaction, transfer, and split forms are dialogs, while the account, category, and recurring-rule forms are inline. Check the page before you scope a locator. Assert a form closed by its heading, such as `New transaction`, not by counting `role="dialog"`: toasts render as dialogs too (issue OBS-2).
- The transaction and recurring forms have radios with no accessible name. Use `getByRole('radiogroup').getByRole('radio').nth(i)`; Income is the first radio.
- Row actions: categories, accounts, and receivers have direct `Edit` and `Delete` buttons. Transactions keep `Delete` and `Split into installments` under `More actions`. Delete confirmations are `alertdialog`s, so scope them to `page.getByRole('alertdialog')`.
- Tables (accounts, categories, receivers, bills, recurring rules, goals) expose `role="row"`. The transactions list is a grid of divs with no roles (issue OBS-3); filter `div.grid.items-center` by the row's text.
- `MoneyField` reads decimals: `fill('1200.00')` and `fill('1200')` both give `1,200.00`, and `fill('0.00')` gives a zero amount.
- A transaction whose name shares a word with a category pre-selects that category (issue OBS-1). Give test rows names without common words.
- The API allows 300 requests per 60 seconds per client address, and 10 sign-up or sign-in calls per 60 seconds. The owner project runs on one worker, and `E2E_PACE_MS` (default 2500) pauses between tests so a full run stays under the request limit. Wait a minute before a second full run.

## Manual checks in the dev database

For a quick look outside the suite, sign in with the QA account below. If it does not exist in the local database, sign up at `/app/sign-up` with the household name `QA Household`, the same email and password, and no tenant code.

- Email: `qa-installments-1@example.com`
- Password: `password-a`
- Household: `QA Household` (main currency BRL, timezone default)

Never reuse these anywhere but a local dev database.
