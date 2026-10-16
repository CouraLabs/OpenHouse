# Verifying OpenHouse

Recipe for driving the app to observe a change (companion to the /verify skill).

## Bring-up

1. Postgres runs as the `openhouse-postgres` Docker container (port 5432,
   `postgres:postgres`). `npm run db:migrate` applies `packages/db` migrations.
2. API: `PORT=3100 npm run dev --workspace=api` (Nest watch mode). The user
   often already runs one on :3000 — use another PORT; `.env` is read either way.
3. Web: `npm run dev --workspace=web` (:5173). The Vite proxy target is
   hardcoded to `http://localhost:3000` (apps/web/vite.config.ts) — to pair a
   second web instance with a second API, patch the target or reuse the :3000 API.
4. Routes live behind the session guard: an unauthenticated hit returns 401
   (route exists) vs 404 (route missing) — a quick way to see new routes.

## Sessions

- `POST /auth/sign-up` with `{tenantName, name, email, password}` creates a
  tenant + owner and sets `openhouse_access`/`openhouse_refresh` cookies. Use a
  fresh tenant per verification pass — data is shared with the user's dev DB.
- `curl -b cookies.txt` against the API port drives every endpoint.

## Browser

- Playwright is installed in `.verify-scratch/` (npm package only) — drive the
  system Chrome: `chromium.launch({ channel: 'chrome', headless: true })`.
- Sign in through the UI (email + password inputs, "Sign in" button).
- DOM `innerText` dumps of `main` are the evidence; screenshots land in
  `.verify-scratch/shots/`.
- base-ui quirks while driving: selects are `[role="combobox"]` with
  `[role="option"]:visible` in a portal (scope to `:visible` — closed popups
  stay mounted); checkboxes are `role="checkbox"` buttons (the paired
  `<input type="checkbox">` is aria-hidden and not clickable).
- Money inputs take cents (reverse masking): typing `999` yields `$9.99`.

## Worth driving after a change

- Accounts: type-dependent form (agency hidden for Wallet/Credit Card; card
  gets Limit + close/due day selects), the Default checkbox, the grid's
  Default badge, and default handoff on create/update/delete.
- Transactions: the dashboard cards (summary, two expense pies, Last Month,
  Next Month forecast, Goals, Limits usage), the Hide/Show cards toggle, the
  status badge dropdown on rows, and the new-transaction form (default
  account prefill, description→category inference, optional invoice, date =
  today even in a past month).
