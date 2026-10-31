# Kantim

**Every coin in the house, in its place.**

Kantim is an open-source household finance app. It keeps a household's
accounts, transactions, limits, and goals in one shared ledger, and everyone
in the house signs in to the same books. Deploy it to your own Cloudflare
account for free.

Built on Cloudflare Workers, Hono, D1, and React.

## Features

**The ledger**

- **Transactions** grouped by day, filterable by month, with daily totals.
  Account balances stay correct as money comes in and goes out, transfers
  included.
- **Accounts and cards**: bank accounts and credit cards with balances,
  closing dates, and due dates, in USD, BRL, or EUR.
- **Recurring rules** create transactions on schedule, so rent and
  subscriptions always get recorded.
- **Limits per category** cap what a category may cost per day, week, month,
  or year, and show how much of the cap is used.
- **Goals** point at a savings account and a target balance, and a gauge
  fills as the account grows.
- **Households**: one tenant, many members. New members join with an invite
  code.
- **Presets (transaction linkers) and receivers**: typing "Monthly rent"
  fills in the category and receiver. A receiver is a person, a service, a
  merchant, or a charity.

**Planners and guides**

- Simple vs compound interest
- Rate conversion between year, month, and business day (by compounding)
- Financial independence: monthly savings to reach a target, and payout once
  you stop
- Buy or rent: financing a property against renting and investing the
  difference
- Financial tips: short guides that need no account

## Tech stack

| Layer    | Tools                                                                  |
| -------- | ---------------------------------------------------------------------- |
| API      | Hono on Cloudflare Workers, Drizzle ORM on D1 (SQLite), JWT sessions in cookies, zod |
| Web      | React, Vite, TanStack Router / Query / Table, react-hook-form, i18next — served by the same Worker |
| UI       | shadcn/ui on base-ui, Tailwind CSS                                      |
| Monorepo | npm workspaces, Turborepo, Biome (lint), Prettier (format), Vitest      |

## Repository layout

```
apps/
  api/        the Worker: Hono API + the web app's static assets
  web/        the React app (installable as a PWA)
  landing/    the public marketing page (static, no API)
packages/
  domain/     interfaces, types, plain objects and constants; imports nothing
  dto/        wire contract: zod request schemas and response types
  db/         Drizzle schema, relations, migrations, repositories; the only schema owner
  business/   every rule and use case; the API's only path to data
  ui/         shared design system: shadcn primitives, DataTable, MoneyField…
```

The web app renders what the API returns and imports only `packages/dto` and
`packages/ui`. The API handles HTTP and imports only `packages/business` and
`packages/dto`. [`CLAUDE.md`](./CLAUDE.md) holds the full architecture contract:
the import graph, where new code goes, and the recipes for tenant entities,
money, and table pages. Read it before adding a feature.
[`AGENTS.md`](./AGENTS.md) describes the design system.

## Getting started

### Prerequisites

- Node.js **20.19+**
- npm (the repo pins `npm@12` through `packageManager`)
- A Cloudflare account (free tier works) for deploying; local development
  needs no account at all

### 1. Install

```sh
git clone https://github.com/CouraLabs/Kantim.git
cd Kantim
npm install
```

### 2. Configure the local secrets

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Set `JWT_SECRET` (`openssl rand -base64 48`). That is all local development
needs.

### 3. Migrate and run

```sh
npm run db:migrate   # applies the D1 migrations to the local database
npm run dev
```

| App     | URL                   |
| ------- | --------------------- |
| Web     | http://localhost:5173 |
| API (Worker) | http://localhost:8787 |
| Landing | http://localhost:5174 |

The Worker serves the API under `/api` and — in production — the web app's
static assets everywhere else. In development the web dev server proxies
`/api` to `wrangler dev`, so requests are same-origin and cookies work with
no CORS setup. Open the web app and sign up to create your household.

## Scripts

Run these from the repo root. Turbo runs each one in every workspace.

| Command               | What it does                                             |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | API, web, and landing in watch mode                      |
| `npm run build`       | Production build of every workspace                      |
| `npm run typecheck`   | `tsc --noEmit` everywhere                                |
| `npm run lint`        | Biome                                                    |
| `npm run format`      | Prettier                                                 |
| `npm run test`        | Vitest unit specs (next to the code, `*.spec.ts`)        |
| `npm run test:e2e`    | API e2e specs in `apps/api/test/` (needs `DATABASE_URL`) |
| `npm run db:generate` | Generate a Drizzle migration from the schema in `packages/db` |
| `npm run db:migrate`  | Apply pending migrations                                 |

To scope a command to one workspace, use a Turbo filter, for example
`npm run test -- --filter=api`.

## Deploy to your own Cloudflare account

The whole stack is one Worker: the Hono API under `/api` and the web app's
static assets everywhere else, with D1 as the database. One deploy command
ships everything.

### 1. Create the resources

```sh
npx wrangler login
npx wrangler d1 create kantim          # copy the database_id it prints
npx wrangler queues create kantim-jobs
```

Put the printed `database_id` into `apps/api/wrangler.jsonc`, and the queue
name if you renamed it.

### 2. Set the secrets

```sh
cd apps/api
npx wrangler secret put JWT_SECRET           # openssl rand -base64 48
npx wrangler secret put PUSH_VAPID_PUBLIC_KEY   # optional: enables web push
npx wrangler secret put PUSH_VAPID_PRIVATE_KEY
```

### 3. Deploy

```sh
npm run deploy
```

This applies the pending D1 migrations to the remote database **before**
`wrangler deploy` ships the new Worker — the expand/contract rule: a
migration must leave the running Worker working for the seconds before the
new bundle takes over. Open the Worker's URL and sign up; the first sign-up
creates your household, and other members join with an invite code from the
settings.

To put it on your own domain, add a Custom Domain to the Worker
(in the Cloudflare dashboard or `wrangler domains`), and set the web app's
origin for the landing page's links.

### Updating

```sh
git pull
npm run deploy
```

The web app is an installable PWA, and its service worker picks up the new
build on the next reload.

### Backups

D1's Time Travel keeps point-in-time snapshots of the database for 30 days
(Workers Paid; 7 on Free). Restore the whole database from the Cloudflare
dashboard or `wrangler d1 time-travel restore` — see `docs/operations.md`
for restoring one household out of a full restore.

### Rate limits

The Worker uses Cloudflare's Rate Limiting binding: every route allows 300
requests per minute per client address, and the credential routes (sign-in,
sign-up, password resets) allow 10. Password changes allow 5 per 15 minutes
per user, and a reset-code prefix that fails 10 times is blocked for an
hour — those two live in the isolate's memory.

### Forgotten passwords

Nothing is emailed. Members get a reset code from the owner; owners use
their recovery codes. If an owner lost both, issue a code from the server:

```sh
npm run reset-code -- --email owner@example.com            # local database
npm run reset-code -- --email owner@example.com --remote   # the deployed one
```

### The landing page

`apps/landing` is a separate static site with no API. Build it with the URL
of your deployed web app, then host `apps/landing/dist` anywhere static
(e.g. as a second static-assets Worker or a Pages project):

```sh
VITE_APP_URL=https://kantim.example.com npm run build -- --filter=landing
```

### Checklist

- [ ] `JWT_SECRET` set to a long random value, and backed up
- [ ] The D1 `database_id` in `apps/api/wrangler.jsonc` matches your database
- [ ] The `kantim-jobs` queue exists
- [ ] A custom domain (HTTPS is automatic on Workers)

## Contributing

1. Read [`CLAUDE.md`](./CLAUDE.md). Its structure rules are enforced in
   review.
2. Change contracts in `packages/dto` first (and `packages/domain` when a
   type changes); the API and web follow.
3. Schema changes go in `packages/db`. Run `npm run db:generate` and commit
   the migration.
4. Put every user-facing label in `apps/web/src/locales/en-US.json`.
5. Before opening a PR, run `npm run typecheck && npm run lint && npm run test`.

To add a shadcn component, run this from the repo root. It lands in
`packages/ui/src/components`:

```sh
npx shadcn@latest add <component> -c apps/web
```

Then import it from the UI package:

```tsx
import { Button } from '@workspace/ui/components/button'
```
