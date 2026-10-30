# apps/api — the Worker

The API is a [Hono](https://hono.dev) application on Cloudflare Workers,
deployed with `wrangler deploy`. One Worker serves the API under `/api` and
the web app's static assets everywhere else; D1 is the database; a Queue
fans background jobs per tenant.

## Layout

```
wrangler.jsonc        bindings: DB (D1), JOBS (Queue), RATE_LIMIT (+ the
                      credentials namespace), ASSETS; cron triggers
src/
  index.ts            the Worker entry: fetch + scheduled + queue
  app.ts              composition root: middleware order, every feature
                      router mounted under /api, the error handler
  config/env.ts       parses c.env once per isolate (vars, secrets)
  common/             cross-cutting infrastructure — no domain logic
  <feature>/          one directory per domain feature:
    <feature>.routes.ts     the routes (a Hono sub-app)
    <feature>.deps.ts       builds the feature's services
    <entity>.repository.ts  Drizzle queries; the tenant id is an explicit
                            first argument on every method
    <entity>.service.ts     business rules
    <concern>.ts            pure domain logic (no Hono, no db)
    *.spec.ts               Vitest specs next to the code
  jobs/               the cron/queue plumbing: list tenants, enqueue, run
scripts/reset-code.mjs  the operator command (docs/domain-invariants.md, password recovery) — never over HTTP
test/                  e2e specs, run inside the Workers runtime
```

## Commands

```
npm run dev           wrangler dev — the API on :8787 with a local D1
npm run build         wrangler deploy --dry-run --outdir dist
npm run deploy        (root) migrate the remote D1, then wrangler deploy
npm run test          vitest — unit specs (src/) and e2e specs (test/)
npm run db:migrate:local | db:migrate:remote
npm run reset-code -- --email owner@example.com [--remote]
```

## Configuration

Every value arrives as a binding (`c.env`), parsed once per isolate by
`src/config/env.ts`:

- **Bindings:** `DB` (the D1 database), `JOBS` (the queue), `RATE_LIMIT` and
  `RATE_LIMIT_CREDENTIALS` (the Rate Limiting namespaces), `ASSETS` (the web
  app's static assets).
- **Vars:** `JWT_ACCESS_TTL_S`, `JWT_REFRESH_TTL_S`,
  `JWT_REMEMBER_REFRESH_TTL_S`, `PUSH_VAPID_SUBJECT` (defaults in
  `wrangler.jsonc`).
- **Secrets:** `JWT_SECRET`, `PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`
  — `.dev.vars` locally (see `.dev.vars.example`), `wrangler secret put` in
  production. The VAPID pair is optional as a pair: both set enables push,
  both absent disables it.

Feature code never reads `c.env` directly — it receives what it needs
through injection.

## Background jobs

The cron triggers (`wrangler.jsonc`'s `triggers.crons`) fire
`scheduled()` in `src/index.ts`, which lists the tenants each schedule
touches and enqueues one message per tenant. The `queue()` consumer runs
the per-tenant service logic (recurring rules, reminders, tenant deletion,
the balance-consistency check). Queues deliver **at least once**, so every
job is idempotent.

## Migrations

The schema lives in `packages/db` (`sqlite-core`). `npm run db:generate`
generates a migration from the schema diff; `npm run db:migrate` applies it
to the local D1, and `npm run deploy` applies it to the remote one before
deploying. Every migration is **expand/contract**: the running Worker must
work with the new schema for the seconds before the new bundle takes over.
