# OpenHouse

**Every coin in the house, in its place.**

OpenHouse is an open-source household finance app. It keeps a household's
accounts, transactions, limits, and goals in one shared ledger, and everyone
in the house signs in to the same books. Run it on your own server for free.

Built on PostgreSQL, NestJS, and React.

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
| API      | NestJS, Drizzle ORM, PostgreSQL, JWT sessions in cookies, zod           |
| Web      | React, Vite, TanStack Router / Query / Table, react-hook-form, i18next  |
| UI       | shadcn/ui on base-ui, Tailwind CSS                                      |
| Monorepo | npm workspaces, Turborepo, Biome (lint), Prettier (format), Vitest      |

## Repository layout

```
apps/
  api/        NestJS API, one directory per domain feature
  web/        the React app (installable as a PWA)
  landing/    the public marketing page (static, no API)
packages/
  db/         Drizzle schema, relations, migrations; the only schema owner
  poco/       shared contracts: zod request schemas and wire DTO types
  ui/         shared design system: shadcn primitives, DataTable, MoneyField…
```

Any shape that crosses HTTP is declared once in `packages/poco`, and both the
API and the web app import it. [`CLAUDE.md`](./CLAUDE.md) holds the full
architecture contract: dependency directions, where new code goes, and the
recipes for tenant entities, money, and table pages. Read it before adding
a feature. [`AGENTS.md`](./AGENTS.md) describes the design system.

## Getting started

### Prerequisites

- Node.js **20.19+** (the Docker image uses Node 24)
- npm (the repo pins `npm@12` through `packageManager`)
- PostgreSQL 17, running locally or in Docker

### 1. Install

```sh
git clone https://github.com/CouraLabs/OpenHouse.git
cd OpenHouse
npm install
```

### 2. Configure

Each app reads its own `.env`. Copy the examples and adjust them:

```sh
cp packages/db/.env.example   packages/db/.env     # DATABASE_URL + pool tuning
cp apps/api/.env.example      apps/api/.env        # port, JWT, throttling, CORS
cp apps/landing/.env.example  apps/landing/.env    # VITE_APP_URL
```

The defaults work for local development. `DATABASE_URL` defaults to
`postgres://postgres:postgres@localhost:5432/openhouse`.

If you don't have PostgreSQL installed, a throwaway one works:

```sh
docker run -d --name openhouse-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=openhouse postgres:17-alpine
```

### 3. Migrate and run

```sh
npm run db:migrate
npm run dev
```

| App     | URL                   |
| ------- | --------------------- |
| Web     | http://localhost:5173 |
| API     | http://localhost:3000 |
| Landing | http://localhost:5174 |

In development, the web dev server proxies `/api` to the API. Requests are
same-origin, so cookies work with no CORS setup. Open the web app and sign up
to create your household.

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

## Self-hosting with Docker

`docker-compose.yml` starts the API and a PostgreSQL database. The production
API refuses to start without `CORS_ORIGINS`, so set it to the origin your web
app is served from:

```sh
CORS_ORIGINS=https://openhouse.example.com docker compose up --build
```

Compose does not run migrations, and the database publishes no port. To
migrate, publish the port for one command and run the migration from the
host:

```sh
docker compose run --rm -p 5433:5432 db
DATABASE_URL=postgres://postgres:postgres@localhost:5433/openhouse npm run db:migrate
```

In production, also set `JWT_SECRET`. `apps/api/.env.example` documents every
API variable, and `apps/api/src/config/env.ts` validates them at boot. The web
app is a static Vite build (`apps/web/dist`). Serve it from any static host and
route `/api` to the API.

## Contributing

1. Read [`CLAUDE.md`](./CLAUDE.md). Its structure rules are enforced in
   review.
2. Change contracts in `packages/poco` first; the API and web follow.
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
