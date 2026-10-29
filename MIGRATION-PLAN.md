# Migration plan: Cloudflare (Workers + Hono + D1)

Target platform:

| Concern            | Today                                   | After                                                        |
| ------------------ | --------------------------------------- | ------------------------------------------------------------ |
| API runtime        | NestJS 12 on Node (Express)             | Hono on Cloudflare Workers                                   |
| Database           | One PostgreSQL 17, `tenant_id` columns  | One D1 database for the whole app, `tenant_id` columns kept  |
| ORM                | Drizzle `pg-core` / `node-postgres`     | Drizzle `sqlite-core` / `d1` (and `d1-http` for tooling)     |
| Background jobs    | `@nestjs/schedule` crons in the process | Workers Cron Triggers fanning out through Cloudflare Queues  |
| Data export        | Async job, ZIP stored in `EXPORT_DIR`   | One request: ZIP built in memory, returned as a download     |
| Web + landing      | nginx container / Vite                  | Workers static assets (web on the same Worker as the API)    |
| Deploy             | Dockerfile + docker-compose             | `wrangler deploy` (Docker removed)                           |

What this codebase brings to the move (counted from the tree as of `7cb34e6`):
~20.5k lines of non-spec API code, 24 feature modules, 119 routes, 23 tables
across 28 migrations, 5 crons, `FOR UPDATE` locking in 4 repositories,
interactive transactions in 12 files, and Postgres-only SQL (window functions,
`::numeric(16,2)` casts, `filter (where …)`) concentrated in `balances/` and
`credit-card-statements/statement-totals.query.ts`.

The plan runs in phases. Each phase ends green (`typecheck`, `lint`, `test`)
and gets its own commit or PR. The NestJS API stays runnable until Phase 5,
so the web app is never without a backend.

There is no production data to carry over: the new D1 database starts empty,
and nothing is copied from PostgreSQL.

**Scope:** one D1 database, bound statically as `DB`, holds every tenant.
Tenant isolation stays exactly as it is today: `tenant_id` columns, the
tenant id as an explicit repository argument, and the tenant read only from
the session (rule 6a). A database per tenant is out of scope for now. The
last section notes what this plan keeps open for it.

---

## Phase 0 — Groundwork

### 0.1 Limits to check before you start

Check each against current Cloudflare docs and your plan tier. Don't design
around remembered numbers:

- **Maximum D1 database size.** One database now holds every tenant, so this
  is the app's growth ceiling. Estimate bytes per household per year from a
  seeded test tenant and add a size alert (Phase 6).
- Statements per `batch`, bound parameters per statement, max SQL length,
  and max query duration (they size import chunking and tenant deletion).
- Worker CPU time and **memory (128 MB per isolate)** per request: bcrypt
  cost, import parsing, and the in-memory export ZIP (3.4), which sets the
  largest tenant an export can handle.
- Subrequests per invocation.
- Queue message size and retry/dead-letter settings.
- D1 has a single writer per database, so every tenant's writes are
  serialized. That is fine at household-finance volume. Watch write latency
  under load, though: it's the first thing to degrade.

### 0.2 Money storage

SQLite has no `numeric`. Money becomes **integer minor units** in the
database (all three currencies, BRL/USD/EUR, have 2 decimals), so `SUM` stays
exact and nothing crosses a float. Rule 6b ("money is a string end to end")
still holds on the wire and in poco. Only storage changes, through one
Drizzle custom type in `packages/db`:

```ts
// "12.34" <-> 1234, via BigInt / string slicing — never Number(x) * 100
export const money = customType<{ data: string; driverData: number }>({ … })
```

Every `::numeric(16,2)::text` in raw SQL becomes an integer expression, and the
column's `fromDriver` (or a `centsToDecimal` helper for `sql<string>` selects)
formats the result. **Unit-test the converter** with negatives, `0`,
`-0.01`, and values above 2^53 cents (reject those).

### 0.3 Local development and tests without Docker

- `wrangler dev` runs the Worker on workerd with a local D1 (Miniflare state
  in `.wrangler/state`). No Postgres, no containers.
- Tests run in workerd through `@cloudflare/vitest-pool-workers`, with
  isolated per-test storage. `supertest` and `@nestjs/testing` go away: e2e
  specs call `app.request('/auth/sign-up', …)` on the Hono app.
- `DATABASE_URL`, `DB_POOL_*` and Postgres disappear from every `.env*` and
  from `turbo.json`.

### 0.4 Update the contract first

`CLAUDE.md` is the source of truth agents navigate by, and its own last
paragraph says to change it before the code. In the first PR, update:
PROJECT STRUCTURE (`apps/api` layout below, `wrangler.jsonc`), rule 6b
(integer cents in storage), 6g (exports generated per request and never
stored, so `EXPORT_DIR` goes away; deletion via `batch`),
7 (env comes from `c.env` bindings, read in `config/`), the COMMANDS block,
and the "Testing the web app" section (`wrangler dev` replaces `npm run
dev`'s Nest process). Replace the `nestjs-best-practices` skill reference with
a Hono/Workers one.

---

## Phase 1 — `packages/db` on SQLite

1. **Dependencies:** drop `pg`, `@types/pg`, `@nestjs/drizzle` (and the Nest
   peer deps). Keep `drizzle-orm`/`drizzle-kit` at the pinned
   `1.0.0-rc.4`, and verify that its `d1` and `d1-http` drivers are present at
   that version before you start.
2. **Schema** stays one file (`src/schema.ts` + `relations.ts`), and
   `tenantEntityColumns()` keeps `tenantId`. Only the column types change.
3. **Type mapping** (mechanical, table by table):

   | Postgres                                  | SQLite (Drizzle `sqlite-core`)                                   |
   | ----------------------------------------- | ---------------------------------------------------------------- |
   | `pgTable`                                 | `sqliteTable`                                                    |
   | `integer().generatedAlwaysAsIdentity()`   | `integer().primaryKey({ autoIncrement: true })`                  |
   | `numeric(16,2)` (13 columns)              | `money()` custom type (0.2)                                      |
   | `timestamp({ withTimezone: true })` (26)  | `integer({ mode: 'timestamp_ms' })`, default `sql\`(unixepoch('subsec') * 1000)\`` |
   | `date()` (10)                             | `text()` holding `YYYY-MM-DD`. Calendar days never shift (rule 6c); ISO text sorts and compares correctly |
   | `boolean()` (12)                          | `integer({ mode: 'boolean' })`                                   |
   | `jsonb()` (7)                             | `text({ mode: 'json' }).$type<…>()`                              |
   | `uuid()` (3)                              | `text()`, `$defaultFn(() => crypto.randomUUID())`                |
   | `varchar(n)` / `smallint`                 | `text()` + `check(length(...) <= n)` / `integer()`               |
   | `check`, `index`, `uniqueIndex`, partial `.where(sql\`…\`)` | Same. SQLite supports all of them; the `status = 'ACTIVE'` predicates stay as they are |
   | `.references(...)`                        | Same. D1 enforces foreign keys by default                        |

4. **Database handle.** `src/database.ts` exports
   `type Database = DrizzleD1Database<typeof relations>` and
   `createDatabase(env.DB)`. With no interactive transactions (Phase 2.6),
   `DbOrTx` collapses to `Database`. Delete `database.module.ts` and `env.ts`
   (the pool config).
5. **Migrations:** delete the 28 Postgres migrations (they cannot be
   replayed on SQLite, and there is no data to migrate) and generate one
   fresh SQLite baseline:
   - `drizzle.config.ts`: `dialect: 'sqlite'`, `driver: 'd1-http'` (account
     id, database id, API token from `.env` — tooling only, never the Worker),
     out `drizzle/`.
   - Keep `scripts/generate.mjs` (content-hash naming).
   - `db:migrate` = `wrangler d1 migrations apply DB --local` in dev,
     `--remote` in CI. Wrangler reads the folder named by
     `migrations_dir` in `wrangler.jsonc`; point it at
     `packages/db/drizzle`, and check that Wrangler accepts drizzle-kit's
     folder-per-migration layout. If it doesn't, have `generate.mjs` also
     emit a flat `NNNN_<hash>.sql` copy.
   - **Rule for every future migration: expand/contract.** Migrations are
     applied before `wrangler deploy`, so the running Worker must work with
     the new schema for a few seconds. Add this to `CLAUDE.md`.

---

## Phase 2 — SQL portability (still inside NestJS, against SQLite)

Do this **before** the framework swap, so SQL bugs and Hono bugs never mix.
For this phase only, point the Nest app at a local SQLite file
(`drizzle-orm/better-sqlite3`, dev-only) and keep the existing unit and e2e
specs as the oracle.

1. **Casts:** `count(*)::int` → `count(*)`; `::numeric(16,2)` /
   `::numeric(16,2)::text` → drop (integer cents) and format through `money`.
   Files: `balances/balance.repository.ts` (8),
   `credit-card-statements/statement-totals.query.ts` (9),
   `statement-view.ts`, `categories/`, `receivers/`, `transaction-linkers/`,
   `accounts/`, `statement-imports/import-transaction.repository.ts`.
2. **Window functions and `filter (where …)`** (running balance,
   carry-over, `lead(dueDate)`) are supported by SQLite ≥ 3.30 and should port
   verbatim. Cover them with the existing `running-balance` and
   `credit-card-statements` e2e specs.
3. **Case-insensitive search:** `ilike` → `like`. SQLite's `LIKE` and
   `lower()` fold **ASCII only**, so a pt-BR search for `"Água"` won't match
   `"água"`. Add a `search_name` column (lowercased + accent-stripped in
   TypeScript on write) to categories, receivers and linkers, and index it
   with `tenant_id` first. `escapeLikePattern` stays, with `ESCAPE '\'`.
4. **`(tenant_id, lower(name))` unique indexes** carry the same ASCII-only
   caveat. Rebuild them on `(tenant_id, search_name)`.
5. **Remove `FOR UPDATE`** (`transaction-ledger.ts`,
   `transaction.repository.ts`, `tenant-user.repository.ts`,
   `import-transaction.repository.ts`). See 2.6 for what replaces it.
6. **Transactions. D1 has no interactive transactions** (no
   `BEGIN … read … decide … write … COMMIT` across round trips); it offers
   `db.batch([...])`, which runs a list of prepared statements atomically.
   Rework the 12 files that call `.transaction()`:
   - **Ledger balance writes** (`transaction-ledger.ts`): replace
     "lock account → read balance → compute → write absolute balance" with
     relative, single-statement updates
     (`UPDATE accounts SET balance = balance + ? WHERE id = ? AND tenant_id = ?`)
     sent in the same `batch` as the transaction insert. Invariants that used
     to be checked under the lock (lifecycle status, currency match) become
     `WHERE` guards on the statements, plus a check that the affected-row
     count is what the guard expects. A miss throws `LedgerConflictError`
     (already answered 409).
   - **Edit/delete of a transaction** (and a transfer's other side): read
     first, then send a batch whose `UPDATE … WHERE id = ? AND update_dt = ?`
     carries the read version (optimistic concurrency). Zero rows → 409.
   - **Multi-step creates** (sign-up's tenant + owner + `tenant_settings`,
     installment plans, splits, import commits up to 5,000 rows): build every
     statement up front and send one batch. When a later statement needs an
     id generated by an earlier one, use `RETURNING` on the earlier one or a
     subselect (`(select id from tenants where name = ?)`) inside the
     batch. Chunk import commits to D1's statement/parameter limits (0.1).
     Each chunk is atomic, and an `import_batch_id` makes a partially applied
     import detectable and re-runnable.
   - **Sign-up's "tenant name is taken"** and **invite redemption** rely on
     unique constraints (`tenants.name`, `users.email`) rather than a
     read-then-write. Map SQLite's `UNIQUE constraint failed` to the same 409
     the Postgres error code maps to today.
7. **Error mapping.** Search for Postgres error codes (`23505`, `23503`,
   `40001`…) in repositories and replace them with SQLite messages /
   `SQLITE_CONSTRAINT_*` detection in one helper in `common/`.

Exit criterion: the whole existing unit + e2e suite passes on SQLite with
NestJS still in place.

---

## Phase 3 — Hono on Workers

### 3.1 Layout (`apps/api`)

```
apps/api/
  wrangler.jsonc               # bindings: DB (D1), JOBS (Queue),
                               #   RATE_LIMIT, assets; cron triggers;
                               #   migrations_dir; compatibility_flags: nodejs_compat
  src/
    index.ts                   # Worker entry: { fetch: app.fetch, scheduled, queue }
    app.ts                     # composition root: middleware order, mounts every
                               #   feature router under /api, global error handler
    config/env.ts              # typed Bindings + validated vars/secrets from c.env
    common/
      context.ts               # Hono `Variables`: session, db, clock, deps
      session/                 # auth middleware (replaces AuthGuard), cookie helpers,
                               #   requireRole(); public routes mounted before it
      validation/              # zValidator wrappers over poco schemas (replaces ZodValidationPipe)
      clock/, search/, ledger/, card-cycle/, household/, upcoming/   # kept, Nest-free
    <feature>/
      <feature>.routes.ts      # replaces controller + module: a Hono sub-app
      <feature>.deps.ts        # builds the feature's services from (db, ports)
      <entity>.repository.ts   # unchanged role; tenant id still the first argument
      <entity>.service.ts      # unchanged role; plain classes, constructor-injected by hand
      *.spec.ts
  scripts/reset-code.mjs       # replaces src/reset-code.ts (3.6)
```

### 3.2 Nest → Hono mapping

| NestJS piece | Hono / Workers replacement |
| --- | --- |
| `@Module` + DI container | Explicit composition: `<feature>.deps.ts` factories, called once per request from a middleware that sets `c.var.deps`. Ports (`SessionResolver`, `CardCycleSync`, `HouseholdMembers`, upcoming sources) stay abstract classes; `app.ts` decides which implementation each gets. The dependency-direction rule is unchanged |
| `@Controller` + `@Get/@Post…` (119 routes) | `new Hono<AppEnv>()` per feature with `.get/.post`, mounted with `app.route('/api/<feature>', router)` |
| `ZodValidationPipe` | `@hono/zod-validator` with the **same poco schemas** (rule 6) |
| `AuthGuard` (global) + `@Public()` | `authMiddleware` on the authenticated router group; public auth routes mounted before it |
| `@Roles`, `@CurrentUser/@CurrentTenant/@CurrentSession` | `requireRole('owner')` middleware; `c.var.session` |
| `@InjectDrizzle()` | `c.var.db`, created from `c.env.DB` per request (cheap, no pool) |
| `@nestjs/jwt` | `hono/jwt` (`sign` / `verify`, HS256), secret from `c.env.JWT_SECRET`. Existing tokens stay valid if the claims and secret are unchanged |
| `cookie-parser` | `hono/cookie` |
| `helmet` | `hono/secure-headers` |
| `enableCors` | `hono/cors`. Not needed at all if web and API share the Worker (3.5) |
| `useBodyParser({ limit })` | `hono/body-limit` with `IMPORT_COMMIT_MAX_BYTES` on the import route |
| `@nestjs/throttler` | Workers **Rate Limiting binding** (`RATE_LIMIT.limit({ key })`) keyed by `cf-connecting-ip`; a tighter namespace for credential routes. `APP_TRUST_PROXY_HOPS` goes away |
| `LedgerConflictError` exception filter | `app.onError` mapping known domain errors (409, 400, 404) |
| `@nestjs/schedule` `@Cron` | Cron Triggers + `scheduled()` handler (3.4) |
| `enableShutdownHooks`, pool close | Gone: no long-lived process or pool |
| `@nestjs/config` + `validateEnv` | `config/env.ts` parses `c.env` once per isolate with zod and caches it |

### 3.3 Node-only dependencies

| Dependency | Problem on Workers | Replacement |
| --- | --- | --- |
| `bcrypt` (native addon) | Cannot load native code | `bcryptjs` (pure JS) verifies the existing `$2b$` hashes. Check its CPU time per sign-in against the plan's CPU limit; if it's too slow, rehash on next sign-in to PBKDF2-SHA-256 via WebCrypto (Workers caps PBKDF2 iterations, so check the cap) and keep a hash-format prefix |
| `web-push` | Relies on Node `https`/`crypto` internals | A WebCrypto implementation of VAPID (ES256 JWT) + RFC 8291 payload encryption in `notifications/push-transport.ts` (the transport is already isolated), sent with `fetch`. Keep `push.service.spec.ts` as the oracle |
| `node:crypto` (9 imports) | `randomUUID`, `createHash`, `randomBytes` work under `nodejs_compat`, but prefer `crypto.randomUUID()`, `crypto.subtle.digest('SHA-256', …)`, `crypto.getRandomValues` | Reset-code and invite hashing become async (`subtle.digest`) |
| `node:fs`, `node:os`, `node:path`, `node:stream` (data exports) | No filesystem | Not needed: the ZIP is built in memory and returned (3.4) |
| `fflate` | Works on Workers | Keep; `zipSync` (or `zip`) into a `Uint8Array` returned as the response body |

### 3.4 Background work: crons → Cron Triggers + Queues

`wrangler.jsonc` `triggers.crons`, one `scheduled()` handler switching on
`event.cron`:

| Today (`@Cron`) | Cron Trigger | Work |
| --- | --- | --- |
| `recurring-run.service.ts` `0 30 * * * *` | `30 * * * *` | enqueue `{ kind: 'recurring', tenantId }` per active tenant |
| `reminder-run.service.ts` `0 45 * * * *` | `45 * * * *` | enqueue `{ kind: 'reminders', tenantId }` |
| `tenant-deletion.service.ts` `0 15 * * * *` | `15 * * * *` | enqueue `{ kind: 'delete-tenant', tenantId }` for tenants due today |
| `balance.service.ts` `0 15 3 * * *` | `15 3 * * *` | enqueue `{ kind: 'balances', tenantId }` |
| `data-export.service.ts` `0 */10 * * * *` | (none) | Deleted: there are no stored export files to expire |

The cron only lists tenants and enqueues messages. The `queue()` consumer runs
the existing per-tenant service logic. That keeps each invocation inside
Worker CPU and subrequest limits, retries per tenant, and isolates failures.
Every job stays tenant-day aware (`todayIn(settings.timezone)`, rule 6c) and
idempotent, because Queues deliver **at least once**. While tenants are few, a
cron may run the work inline instead of enqueuing. Keep the per-tenant
function shape either way, so switching costs nothing.

**Tenant deletion (rule 6g)** stays a hard delete of every row the tenant
owns, children first, `import_mappings` and `transaction_history` included,
as one `db.batch([...])` of `DELETE … WHERE tenant_id = ?` statements in the
same order the repository uses today. If a large tenant exceeds D1's query
duration or batch limits (0.1), delete in chunks per table and remove the
`tenants` row **last**. A crashed run then resumes on the next hour, and
`audit_log` (no foreign key to `tenants`) keeps the `tenant.deleted` line.

**Data exports: generated in memory, returned as a file download.** The
start → poll → download job (`POST data-exports`, `GET data-exports/:id`,
`GET data-exports/:id/download`) collapses into one owner-only route:

1. `POST /api/data-exports` reads the tenant's tables (the queries
   `data-export.repository.ts` already runs), builds the CSVs, and zips them
   with `fflate` into a `Uint8Array`, all in memory.
2. It writes the `data_export` audit line (rule 6g: exports stay audited).
3. It answers `200` with the bytes, `Content-Type: application/zip`,
   `Content-Disposition: attachment; filename="openhouse-export-<tenant>-<YYYY-MM-DD>.zip"`
   (the tenant's today, rule 6c) and `Cache-Control: no-store`.

Nothing is written anywhere: no `EXPORT_DIR`, no R2, no export-job table or
status, no expiry cron, no one-download bookkeeping. Contract-first (rule 6):
poco drops the export job/status wire types first. In
`apps/web/src/features/settings/`, `export-job-panel.tsx` and
`use-data-export.ts` become a button whose mutation `fetch`es the route, reads
`response.blob()`, and saves it through an object URL and a temporary `<a
download>`. It shows a pending state while the ZIP builds, because there is
no job to poll. `export-zip.ts` and its spec stay pure and move unchanged.
The cost is the Worker's memory and CPU limits (0.1): the whole ZIP lives in
memory once. Measure it against a large seeded tenant (several years of
transactions) in Phase 4. Rewrite `docs/data-export.md` for the new flow.

### 3.5 Serving the web app

Serve `apps/web/dist` as **Workers static assets** from the same Worker, with
`run_worker_first` for `/api/*` and SPA fallback for everything else. The
browser keeps calling same-origin `/api`, so session cookies stay as they are,
CORS isn't needed, and `apps/web/nginx.conf` is deleted. In dev, Vite's `/api`
proxy targets `wrangler dev` (port 8787) instead of Nest's 3000. The service
worker (`tsconfig.sw.json`, push) is unchanged. Deploy `apps/landing` as its
own static-assets Worker (or Pages project).

### 3.6 The `reset-code` command (rule 6e)

It stays a server-side operator command that never goes over HTTP:
`apps/api/scripts/reset-code.mjs` runs in Node, reuses the pure
`auth/reset-code.ts` logic, and writes the SHA-256 through
`wrangler d1 execute DB --local|--remote --command …` (or the D1 REST API
with `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`). The plaintext is
printed once and only the hash is stored, as today.

### 3.7 Porting order (one PR each, tests green each time)

1. Skeleton: `wrangler.jsonc`, `index.ts`, `app.ts`, `config/env.ts`, context
   types, error handler, health route (`app.controller.ts`).
2. `common/`: session middleware + cookies + JWT, validation, clock, search
   helpers, ledger error, SQLite error mapping, ports.
3. `auth/`, `tenants/`, `settings/`, `preferences/`. Sign-up through
   sign-in is then usable end to end.
4. Reference data: `categories/`, `receivers/`, `transaction-linkers/`,
   `accounts/`, `limits/`, `goals/`.
5. Money movement: `transactions/` (ledger, installments, reconciliation),
   `credit-card-statements/`, `balances/`, `recurring-transactions/`.
6. `household/`, `upcoming/`, `notifications/` (push transport), `calendar/`.
7. `statement-imports/`, `data-exports/` (single in-memory route + the web
   download button), `tenant-deletion/`, `audit/`.
8. Cron + queue handlers.

Pure domain files (`limit-period.ts`, `installment-plan.ts`,
`statement-assignment.ts`, `cycle-resync.ts`, `ofx-parser.ts`, `csv-parser.ts`,
`ics.ts`, `reminder-rules.ts`, …) and their specs should move **unchanged**.
That is the payoff of the existing `<concern>.ts` rule.

---

## Phase 4 — Tests

- `apps/api` vitest config → `@cloudflare/vitest-pool-workers` with
  `wrangler.jsonc` (`env.test`) and a local D1. Apply migrations in a
  `setupFiles` hook (`applyD1Migrations`).
- `test/support.ts`: `startApp()` returns the Hono app; `signUp()` keeps
  its shape but returns a small fetch-based agent that carries cookies
  (replaces `supertest.agent`).
- Port all 16 `*.e2e-spec.ts` files. They become the regression gate for
  Phase 3 PRs.
- Unit specs that built Nest testing modules construct services directly.
- Add specs for: the `money` converter, batch ledger writes under concurrent
  requests (two parallel `app.request` writes to one account must both
  apply), the optimistic-concurrency 409, tenant isolation (tenant B's session
  never reads tenant A's rows on every `POST <entity>/search`), queue job
  idempotency (same message twice), and the export route (owner-only, ZIP
  headers, the archive unzips to the expected CSVs, audit line written).
  Rewrite `data-export.e2e-spec.ts` for the single request.
- Browser QA per `CLAUDE.md`, against `wrangler dev` + Vite.

---

## Phase 5 — Remove Docker and the old stack

Delete: `Dockerfile`, `docker-compose.yml`, `.dockerignore`,
`apps/web/nginx.conf`, `apps/api/nest-cli.json`, `tsconfig.build.json`
(the Worker is bundled by Wrangler), `apps/api/src/reset-code.ts`,
`packages/db/src/database.module.ts`, `packages/db/src/env.ts`, the Postgres
migrations, and every `@nestjs/*`, `express`, `supertest`, `pg`, `bcrypt`,
`web-push`, `helmet`, `cookie-parser`, `reflect-metadata`, `rxjs` dependency.
Remove `bcrypt@6.0.0` from root `allowScripts`.

Update:

- **Root `package.json`:** `dev` runs `wrangler dev` + Vite; add `deploy`
  (`turbo run build && wrangler deploy`); `db:migrate` wraps
  `wrangler d1 migrations apply`; `reset-code` points at the script.
- **`turbo.json`:** drop `DATABASE_URL`, `DB_*`, `PORT`, `APP_TRUST_PROXY_HOPS`,
  `THROTTLE_*`, `EXPORT_DIR`. Secrets now live in `.dev.vars` (local) and
  `wrangler secret put` (prod): `JWT_SECRET`, `PUSH_VAPID_PRIVATE_KEY`, plus
  vars `JWT_*_TTL_S`, `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_SUBJECT`. Tooling
  (`drizzle-kit`, CI) gets `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`.
  The Worker itself needs no API token. Add `.dev.vars` to `.gitignore` and
  ship a `.dev.vars.example`.
- **Root `.env.example`:** rewrite for Wrangler (or remove it in favour of
  `.dev.vars.example`).
- **`README.md`**, `apps/api/README.md`, `docs/data-export.md`: deployment is
  now "create a Cloudflare account, `wrangler d1 create openhouse`, create
  the queue, set the secrets, `npm run db:migrate -- --remote`,
  `npm run deploy`".
- **Landing copy (`apps/landing/src/locales/*.ts`, self-host plan / FAQ):**
  "self-host" no longer means "run our Docker image anywhere". It means
  "deploy to your own Cloudflare account". Update the wording in both locales.
- **CI:** add a deploy job (`cloudflare/wrangler-action`) that runs
  `db:migrate --remote` **before** `wrangler deploy`.

---

## Phase 6 — Operations

- **Backups:** D1 Time Travel gives point-in-time restore for the whole
  database. It is per database, not per tenant, so restoring one household
  means restoring to a fork and copying that tenant's rows back. Write a
  runbook for it.
- **Size alert:** a daily cron reads the database size (D1 `meta` /
  analytics) and logs a warning at 70% of the limit from 0.1.
- **Observability:** enable Workers Logs; log `tenantId`, route and D1
  `meta.duration` per request so slow tenants and queries are visible.

---

## Keeping a database per tenant possible later

Not in scope now, but these choices keep that door open at low cost:

- Repositories already take the tenant explicitly. Keep it that way, and
  never write a query that reads two tenants' rows (cross-tenant reads stay
  confined to the cron fan-out that lists tenants).
- Keep tenant rows reachable through `tenant_id` on every table, including
  children, so one tenant can be extracted with `WHERE tenant_id = ?` per
  table.
- Keep the `Database` handle on the request context (`c.var.db`) rather
  than importing a global, so it can later be chosen per tenant.

## Checklist

- [ ] Phase 0: limits checked, money storage decided, `CLAUDE.md` contract updated
- [ ] Phase 1: SQLite schema, `money` type, baseline migration, `db:migrate` on Wrangler
- [ ] Phase 2: SQL ported, `FOR UPDATE` and interactive transactions replaced, suite green on SQLite
- [ ] Phase 3: all 24 features on Hono, Node deps replaced, crons on Cron Triggers/Queues, in-memory export download, web served by the Worker
- [ ] Phase 4: unit + 16 e2e specs green in workerd, browser QA passed
- [ ] Phase 5: Docker and NestJS removed, docs, landing copy and CI updated
- [ ] Phase 6: backups runbook, size alert, logging in place
