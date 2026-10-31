---
name: hono-workers-best-practices
description: Hono on Cloudflare Workers patterns for this repository — composition root, middleware, validation, D1 access, background jobs. Use when writing, reviewing, or refactoring apps/api code.
---

# Hono on Cloudflare Workers — project patterns

## When to apply

- Writing or changing a route, middleware, or service in `apps/api`
- Adding a feature directory (the `<feature>.routes.ts` recipe, services
  wired in `createBusiness`)
- Touching `wrangler.jsonc`, bindings, cron/queue handlers, or
  `config/env.ts`

## Composition

- `src/app.ts` is the composition root. It builds the Hono app: public auth
  routes first, then the authenticated group carrying `authMiddleware`, then
  every feature router mounted under `/api/<feature>`.
- Every feature is a directory holding only `<feature>.routes.ts` (a Hono
  sub-app). Repositories live in `packages/db`, and services, rules and
  ports live in `packages/business`.
- Services are plain classes with constructor injection, wired once in
  `createBusiness` (`packages/business/src/runtime.ts`) — explicit,
  hand-wired, no DI container. `common/runtime.middleware.ts` builds the
  business once per isolate (the in-memory rate limiters keep state across
  requests) and sets `c.var.business`; routes read
  `c.var.business.<service>`. Jobs call `businessFromEnv(env).jobs`.
- Dependency direction: `apps/api → packages/business, packages/dto`.
  Ports (abstract classes in `packages/business/src/ports/`) are the
  sanctioned crossing between features; their adapters live in
  `apps/api/src/infra/`. `biome.jsonc` enforces the graph.

## Routing and validation

- One `new Hono<AppEnv>()` per feature, mounted with
  `app.route('/api/<feature>', router)`.
- Request bodies validate through `@hono/zod-validator` with the **dto
  schemas** from `packages/dto` — the same schemas the web forms use. Never
  re-declare a shape. A route then calls one `packages/business` use case;
  it never imports `packages/db`.
- Status codes and response bodies stay as they were: `201` on create,
  `200` where the previous controller answered `@HttpCode(200)`, `409` for
  conflicts, `204` on deletes.

## Middleware map (Nest → Hono)

| NestJS piece              | Hono replacement                                        |
| ------------------------- | ------------------------------------------------------- |
| `AuthGuard` + `@Public()` | `authMiddleware` on the authenticated group; public routes mounted before it |
| `@Roles`                  | `requireRole('owner')` middleware                       |
| `@CurrentUser/@CurrentTenant/@CurrentSession` | `c.var.session`                     |
| `ZodValidationPipe`       | `zValidator` over dto schemas                           |
| `@nestjs/throttler`       | the `RATE_LIMIT` Workers Rate Limiting binding, keyed by `cf-connecting-ip` |
| `helmet`                  | `hono/secure-headers`                                   |
| `cookie-parser`           | `hono/cookie`                                           |
| `@nestjs/jwt`             | business `TokenService` (WebCrypto HS256, same claim checks as `hono/jwt`) |
| exception filter          | `app.onError` mapping known domain errors               |

## D1

- D1 has **no interactive transactions**. Writes that used to run inside
  `db.transaction()` are one `db.batch([...])` whose statements are all
  built before it is sent. Read-then-decide-then-write becomes: read, then
  batch guarded statements (`WHERE` guards on lifecycle status/currency plus
  an affected-row-count check), or optimistic concurrency on `update_dt`.
  A guard miss throws `LedgerConflictError` (409).
- Money is **integer cents in storage** (the `money` custom type in
  `packages/db`) and a decimal string on the wire. Never `Number(x) * 100`.
- Statement limits: ≤100 bound parameters per statement, ≤100 KB of SQL per
  statement, ≤2 MB per row value, and a `LIKE`/`GLOB` pattern ≤50 bytes.
  A `db.batch()` counts as **one** query against the invocation's
  subrequest limit. Chunk big writes (statement-import commits, tenant
  deletion) so every chunk fits those limits; a chunk is atomic.
- SQLite `LIKE`/`lower()` fold ASCII only: case-insensitive, accent-sensitive
  search reads the `search_name` column (lowercased + accent-stripped in
  TypeScript on write), indexed with `tenant_id` first.

## Background work

- Cron Triggers fire `scheduled()` in `src/index.ts`; the handler enqueues
  one message per tenant (`{ kind, tenantId }`). The `queue()` consumer runs
  the per-tenant service logic, which stays tenant-day aware
  (`todayIn(settings.timezone)`) and **idempotent** — Queues deliver at
  least once.
- Tenant deletion is a hard delete of every row the tenant owns, children
  first, as `db.batch([...])` `DELETE ... WHERE tenant_id = ?` statements;
  chunk per table when a tenant is big, and remove the `tenants` row last.

## Env and secrets

- Env is read in `config/env.ts` only, parsed from `c.env` once per isolate
  and cached. Local dev binds come from `.dev.vars`; production secrets go
  through `wrangler secret put`. Feature code never reads `c.env` directly.

## Testing

- Specs run in workerd through `@cloudflare/vitest-pool-workers` against a
  real local D1. e2e specs call `app.request(path, init)` on the Hono app —
  no supertest, no Nest testing module. Migrations apply in a setup file
  (`applyD1Migrations`).
