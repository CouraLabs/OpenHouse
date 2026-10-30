---
name: qa-browser
description: How to test OpenHouse's web app in a real browser after a web change — dev servers, an isolated browser context, the local QA account, seeding fixtures, and driving base-ui controls. Use after any change under apps/web or packages/ui, before calling the work done.
---

# Testing the web app in a browser

After any web change, test the real UI with the `browser-use` CLI (run `browser-use skill` once for its helpers) — green unit and e2e tests do not prove a dialog opens or a form submits.

1. `npm run dev` (web on `localhost:5173`, api on `localhost:8787` — the Worker with its local D1; apply migrations first with `npm run db:migrate`).
2. Open a **separate browser context** so the developer's own logged-in session and data are never touched: `ctx = cdp("Target.createBrowserContext")["browserContextId"]`, then `cdp("Target.createTarget", url="http://localhost:5173/", browserContextId=ctx)` and `switch_tab(<targetId>)`. Dispose it when done (`Target.disposeBrowserContext`).
3. Sign in with the QA account below. If it does not exist in the local database, sign up at `/sign-up` with tenant name `QA Household` and the same email and password (leave the tenant code empty).
4. Seed fixtures (accounts, categories, one-off charges) with `fetch('/api/<route>', {credentials: 'include', ...})` from the page — `/api` is the Vite proxy to the API, so the session cookie works. `POST /accounts` needs a `currency` (`BRL`, `USD`, `EUR`); a card also needs `type: 'Credit Card'`, `limit`, `closeDay`, `dueDay`. Drive the feature under test through the UI, not the API.
5. Take a screenshot (`capture_screenshot`) and read it after each step; read `[role=dialog]` `innerText` to assert content.

## Driving the UI

- Get element positions from `getBoundingClientRect()` and use `click_at_xy` — a synthetic `.click()` on base-ui `Select` triggers and options does not open or pick them.
- Focus an input with a real click, call `.select()`, then `type_text`.
- `MoneyField` is reverse-masked: typing `120000` gives `1,200.00`.
- Row action buttons have `aria-label`s (`Edit`, `Delete`, `Installment purchase`, `Split into installments`).
- If the first click on a freshly rendered control does nothing, click it again.

## QA account (local development only, throwaway)

- Email: `qa-installments-1@example.com`
- Password: `password-a`
- Tenant: `QA Household` (main currency BRL, timezone default)

Never reuse these anywhere but a local dev database.
