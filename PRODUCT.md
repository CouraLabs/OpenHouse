# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Every member of a household, on equal footing. They all sign in to the same
books (one tenant per household, members join with an invite code): the app
is the shared ledger, and everyone reads and writes it. There is no
single-admin mental model in the product; roles exist only where the data
model requires them (e.g. only the owner may delete the whole tenant).

## Product Purpose

OpenHouse is an open-source household app. It keeps what the house runs on in
one shared place — today the money (accounts, transactions, limits, goals in
one shared ledger); next, the rest of home life. Everyone in the house signs
in to the same home. Success is a household that trusts OpenHouse enough to
stop keeping side-spreadsheets and group-chat reminders.

## Positioning

- **The shared home for the whole house, money first.** The mechanism a
  neighbor cannot copy: one tenant per household, every member on equal
  footing, and each domain of home life as a module of the same shared home —
  not a bundle of single-user apps.
- **Announced modules beyond money** (user-confirmed direction; sequencing
  undecided): pantry, food/meal management, laundry and storage, pets,
  health, todos, calendar, email connection, and Telegram/WhatsApp
  integrations. Until each ships, the product presents them as announced
  arrivals — never as live features.
- **Open source and self-hostable for free**, with an optional hosted service
  on the maintainer's servers. Confirmed tier plan (names still fluid):
  Free (self-host), "Initial" with limits, Premium (5× Initial's limits),
  Premium with AI enabled (10× the limits plus AI features).
- **Multi-currency households are a real use case, not an edge case**: USD,
  BRL, and EUR accounts and cards side by side in one house.
- Neighbors (YNAB, Monarch, Firefly III) are either single-user-oriented,
  closed, or admin-heavy; OpenHouse's claim is the shared-books model that
  any member can run, self-hosted.

## Operating Context

- Households, not individuals: one tenant, many human members, invite codes
  for joining.
- Planners (interest, FI, rent-vs-buy, rate conversion, tips) work without
  any account — they are public utility surfaces.
- Data lifecycle: deletion is a status change everywhere except whole-tenant
  deletion, which the owner schedules, waits 30 days (cancelable), then a
  daily-per-zone job hard-deletes in one transaction. See `docs/data-export.md`.
- Export ZIPs and in-memory export jobs are single-process; scaling the API
  to multiple replicas requires shared storage (same for the throttler cache).
- The web app is an installable PWA; the landing page is static with no API.

## Capabilities and Constraints

- Ledger: transactions grouped by day with daily totals and month filtering;
  account/card balances stay correct through transfers.
- Accounts and cards with balances, closing dates, due dates; USD/BRL/EUR.
- Recurring rules on schedule; limits per category per day/week/month/year
  with usage; goals tied to a savings account with a fill gauge.
- Presets ("transaction linkers") and receivers (person, service, merchant,
  charity) fill fields while typing.
- Full-screen feature areas already present: accounts, transactions, bills,
  upcoming, recurring, limits, goals, categories, receivers, linkers,
  statement imports, notifications, household, settings, plus the planners.
- Auth: sign-in, sign-up, reset password, recovery codes; JWT sessions in
  cookies. Stack: NestJS + Drizzle + PostgreSQL (API), React + Vite +
  TanStack Router/Query/Table + react-hook-form + i18next (web), shadcn/ui
  on base-ui + Tailwind (UI), npm workspaces + Turborepo (monorepo).
- Localization exists (i18next, `en-US` locale file, locale switcher) — new
  user-facing copy goes through `locales/en-US.json`.

## Brand Commitments

- Name: **OpenHouse**.
- Tagline: **"Every coin in the house, in its place."**
- Voice: plain, warm, and concrete (README tone — short declarative lines,
  "the house", "the books").

## Evidence on Hand

- A full working monorepo (API, web app, landing page, DB package) with the
  feature set above already implemented.
- `docs/data-export.md` documents the export and deletion lifecycle.
- No testimonials, customer logos, benchmarks, or pricing pages exist —
  future work must not fabricate any of these.

## Product Principles

1. **The books belong to the house.** Every surface assumes several people
   looking at the same data, not one owner with viewers.
2. **Balances never lie.** Correctness of account balances through any
   operation (transfers included) outranks convenience features.
3. **Self-hosting is first-class.** Free self-host parity is a product
   promise; hosted tiers sell limits and AI, not core features.
4. **Money has context.** Currencies, closing dates, due dates, and
   category limits reflect how real households actually run.
5. **Planners earn trust.** The no-account tools behave like the ledger
   tools: honest math, no dark patterns.

## Accessibility & Inclusion

- Light and dark themes are first-class (no-flash theme boot, per-scheme
  theme-color meta).
- Localization is wired end-to-end (i18next); English copy lives in
  `locales/en-US.json` and locale switching is a UI affordance.
