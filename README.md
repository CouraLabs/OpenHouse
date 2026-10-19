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

## Deploy

The repository ships everything a self-hosted deployment needs: a
multi-target `Dockerfile` and a `docker-compose.yml` that runs the whole
stack. The browser only ever talks to the web container. nginx serves the
app and forwards `/api` to the API, so the page and the API share one origin
and the session cookies are never cross-site.

| Service   | Image target | What it does                                                  |
| --------- | ------------ | ------------------------------------------------------------- |
| `db`      | `postgres:17-alpine` | PostgreSQL. Data lives in the `db-data` volume        |
| `migrate` | `migrate`    | Applies pending migrations, then exits                        |
| `api`     | `api`        | The NestJS API. Starts only after `migrate` succeeds          |
| `web`     | `web`        | nginx: the static web build, plus the `/api` proxy. The only published port |

### Requirements

- Docker with Compose v2 (`docker compose`)
- For anything beyond a local trial: a domain and HTTPS. In production the
  session cookies are `Secure`, so browsers only send them over HTTPS.
  Chrome and Firefox make an exception for `http://localhost`; Safari does not.

### 1. Configure

```sh
cp .env.example .env
```

Set at least `JWT_SECRET`, and check the rest:

| Variable               | Default                 | Notes                                                                  |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `JWT_SECRET`           | (none, required)        | Signs the session tokens. `openssl rand -base64 48`. Keep it stable: changing it signs everyone out |
| `PUBLIC_ORIGIN`        | `http://localhost:8080` | The exact origin users open, e.g. `https://openhouse.example.com`. The API only accepts browser requests from it |
| `WEB_PORT`             | `8080`                  | The host port the web container is published on                       |
| `POSTGRES_PASSWORD`    | `postgres`              | Set it before the first start. PostgreSQL keeps the password it was initialized with in its volume |
| `APP_TRUST_PROXY_HOPS` | `1`                     | Proxies between the client and the API. The bundled nginx is 1; a TLS terminator in front makes it 2 |

### 2. Start

```sh
docker compose up --build -d
```

Compose starts the database, runs the migrations, starts the API, and then
starts the web container. Open `PUBLIC_ORIGIN` and sign up. The first sign-up
creates your household, and other members join with an invite code from the
settings.

To check on the stack:

```sh
docker compose ps
docker compose logs -f api
```

### 3. Put HTTPS in front

Point a TLS-terminating proxy at the web container's port. With
[Caddy](https://caddyserver.com), which fetches certificates on its own, the
whole `Caddyfile` is:

```
openhouse.example.com {
  reverse_proxy localhost:8080
}
```

Then set these in `.env` and run `docker compose up -d` again:

```sh
PUBLIC_ORIGIN=https://openhouse.example.com
APP_TRUST_PROXY_HOPS=2   # Caddy + the bundled nginx
```

`APP_TRUST_PROXY_HOPS` must match the real number of proxies. If it's too low,
every user is rate-limited as a single address. If it's too high, a client can
spoof its own address in `X-Forwarded-For`.

### Updating

```sh
git pull
docker compose up --build -d
```

The `migrate` service applies new migrations before the new API starts. The
web app is an installable PWA, and its service worker picks up the new build
on the next reload.

### Backups

All state is in PostgreSQL:

```sh
docker compose exec db pg_dump -U postgres openhouse > openhouse-$(date +%F).sql
cat openhouse-2026-10-19.sql | docker compose exec -T db psql -U postgres openhouse   # restore
```

### Rate limits

In production, every route allows 300 requests per minute per client
(`THROTTLE_LIMIT` / `THROTTLE_TTL_MS`). Sign-in and sign-up allow 10 attempts
per minute, and password changes allow 5 per 15 minutes per user. Redeeming a
password reset code allows 5 attempts per 15 minutes per client, and a code
prefix that fails 10 times is blocked for an hour.

### Forgotten passwords

Nothing is emailed. Members get a reset code from the owner; owners use their
recovery codes. If an owner lost both, issue a code from the server:

```sh
docker compose exec api npm run reset-code -- --email owner@example.com
```

### Deploying without Docker

1. Build: `npm ci && npm run build -- --filter=api --filter=web`.
2. Migrate: `DATABASE_URL=… npm run db:migrate`.
3. Run the API with `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and
   `CORS_ORIGINS` (your public origin) set: `node apps/api/dist/main.js`. It
   listens on `PORT` (default 3000). `apps/api/.env.example` documents every
   variable, and `apps/api/src/config/env.ts` rejects bad values at boot.
4. Serve `apps/web/dist` as static files on the same origin. Route `/api/*`
   to the API **with the `/api` prefix stripped**, and fall back to
   `index.html` for client routes. `apps/web/nginx.conf` is a working
   example. Serve `sw.js` and `index.html` with `Cache-Control: no-cache`.
5. Set `APP_TRUST_PROXY_HOPS` to the number of proxies in front of the API.

### The landing page

`apps/landing` is a separate static site with no API. Build it with the URL
of your deployed web app, then host `apps/landing/dist` anywhere static:

```sh
VITE_APP_URL=https://openhouse.example.com npm run build -- --filter=landing
```

### Checklist

- [ ] `JWT_SECRET` set to a long random value, and backed up
- [ ] `POSTGRES_PASSWORD` changed before the first start
- [ ] `PUBLIC_ORIGIN` is the exact HTTPS origin users open
- [ ] HTTPS in front of the web container
- [ ] `APP_TRUST_PROXY_HOPS` matches the proxies in front of the API
- [ ] A scheduled `pg_dump`

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
