---
title: 'Production-ready hardening of apps/api + Docker'
type: 'feature'
ticket: ''
created: '2026-10-09'
status: 'ready-for-dev'
baseline_revision: 'no commits yet — branch main has zero commits; all files untracked as of 2026-10-09'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'auto'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** `apps/api` is a bootstrap-stage Nest 12 app with no config module, no security middleware, no caching, no rate limiting, no low-connection pool tuning, and no docker setup. It cannot be deployed safely or correlate its behavior with the environment.

**Approach:** Add `@nestjs/config` (global), Helmet, conditional CORS (prod-only, origins from env), a global `CacheModule`, `ThrottlerModule` (prod-only) with env-tuned TTL/limit, env-tuned pg pool/timeout options in `@workspace/db`'s `DatabaseModule`, `enableShutdownHooks`, strict TS + strict env validation everywhere, and a multi-stage Dockerfile + compose stack. All new knobs come from env vars with sane defaults.

**Boundaries (one line):** Do not touch `apps/web` runtime code or `packages/ui`; do not swap the in-memory throttler/cache stores (Redis is a later feature, not this plan).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Dev boot | `NODE_ENV=development`, no CORS_ORIGINS/THROTTLE vars | App boots; no CORS headers; no rate-limit headers | No error expected |
| Prod boot without origins | `NODE_ENV=production`, `CORS_ORIGINS` unset/empty | Boot aborted | `validateEnv` throws naming the missing var |
| Prod request with allowed origin | `NODE_ENV=production`, `Origin: <listed origin>` | Response carries `access-control-allow-origin` + Helmet headers | No error expected |
| Prod burst over limit | limit+1 requests within TTL from one IP | (limit)th + 1 gets `429` and `Retry-After` | ThrottlerGuard responds 429 |
| Bad pool var | `DB_POOL_MAX=zero` | Boot aborted | `validateEnv` throws: must be a positive integer |
| Kill SIGTERM during traffic | `docker compose stop api` | 503 for new requests, in-flight requests drain, pg pool `end()` called | Drizzle `autoCloseConnection` closes pool |

</frozen-after-approval>

## Code Map

- `apps/api/src/main.ts` — 7-line bootstrap; gets Helmet/CORS/shutdown hooks.
- `apps/api/src/app.module.ts` — imports only `DatabaseModule`; gets Config/Cache/Throttler wiring.
- `apps/api/src/env.ts` (new) — strict env validation + int/origin parsing; single place for api-side env rules.
- `packages/db/src/env.ts` — existing `getDatabaseUrl()` pattern to reuse/extend with `getPoolConfig()`.
- `packages/db/src/database.module.ts` — `DrizzleModule.forRootAsync` with `connection: getDatabaseUrl()` (string); becomes pool `PoolConfig` object.
- `apps/api/tsconfig.json`, `packages/db/tsconfig.json` — `strictPropertyInitialization: false` to flip; `apps/web/tsconfig.node.json` — missing `strict`.
- `turbo.json` — `env:` arrays declare pass-through vars (convention here).
- `packages/db/package.json` exports — `@workspace/db` resolves to `dist/` (drives Docker copy list).

## Tasks & Acceptance

**Execution:**

1. `apps/api/package.json` — add runtime deps (one `npm install -w api` at root): `@nestjs/config@^12.0.1`, `@nestjs/throttler@^6.7.1`, `@nestjs/cache-manager@^12.0.1`, `cache-manager@^7.2.9`, `helmet@^8.3.0`. Versions verified live against Nest 12 (peer ranges accept `^12`). Run `npm install` at root so the single lockfile updates. *No equivalent exists today; nothing else provides registry-verified versions.*
2. Create `apps/api/src/env.ts` — exports:
   - `validateEnv(config: Record<string, unknown>): Record<string, unknown>` — rejects a var if its name matches reserved prefixes `THROTTLE_`, `DB_`, `CORS_`, `APP_` and isn't in the known list (host-injected vars like `HOSTNAME`/`PATH` pass through untouched — that tolerance is deliberate); checks `NODE_ENV` ∈ {`development`,`test`,`production`} (default `development`); when production, requires non-empty `CORS_ORIGINS`; validates every optional numeric var parses to a positive integer: `PORT`, `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`, `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `DB_IDLE_TIMEOUT_MS`.
   - `getInt(name: string): number | undefined` and `getPositiveInt(name: string, fallback: number): number` — `parseInt` helpers used by main.ts / module factories.
   - `getCorsOrigins(): string[] | undefined` — `CORS_ORIGINS` comma-split and trimmed.
   - Values and exact defaults live only here / Code Map defaults table below.
3. `apps/api/src/app.module.ts` — add imports before `DatabaseModule` in this order:
   - `ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv })`
   - `CacheModule.register({ isGlobal: true })` from `@nestjs/cache-manager` (defaults = in-memory store; decision: no TTL/store env until a consumer needs one)
   - `ThrottlerModule.forRootAsync({ inject: [ConfigService], useFactory: (config) => ({ throttlers: [{ ttl: getPositiveInt('THROTTLE_TTL_MS', 60000), limit: getPositiveInt('THROTTLE_LIMIT', 20), setHeaders: true }], skipIf: () => (config.get('NODE_ENV') ?? 'development') !== 'production' }) })` — root-level `skipIf` verified supported in v6 (`ThrottlerModuleOptions`); active only in production so development AND test (`NODE_ENV=test` under vitest) stay unthrottled.
   - provider `{ provide: APP_GUARD, useClass: ThrottlerGuard }` — global guard binding (throttler README pattern). Import `ConfigService` as a **value** import (biome override comment in `biome.jsonc` warns: type-only import of injectables silently breaks DI).
4. `packages/db/src/env.ts` + `database.module.ts` — mirror the existing `getDatabaseUrl()` pattern:
   - Add `getPoolConfig(): { connectionString: string; max: number; connectionTimeoutMillis: number; idleTimeoutMillis: number }` building from `DB_POOL_MAX` (default 10), `DB_CONNECTION_TIMEOUT_MS` (default 5000 — fail-fast connect), `DB_IDLE_TIMEOUT_MS` (default 30000), via the same `loadEnv()` first. Exact pg `PoolConfig` fields verified (`node_modules/@types/pg/index.d.ts`).
   - In `database.module.ts` replace `connection: getDatabaseUrl()` with `connection: getPoolConfig()`; Drizzle accepts `connection: string | PoolConfig` for the node-postgres driver (verified in `drizzle-orm/node-postgres/driver.d.ts`). Keep the existing doc comment style; `getDatabaseUrl()` stays used inside `getPoolConfig()` (also used by drizzle-kit — do not remove).
5. `apps/api/src/main.ts` — bootstrap becomes: `app.use(helmet())` (before routes), `if (NODE_ENV === 'production') app.enableCors({ origin: getCorsOrigins() })`, `app.enableShutdownHooks()` (before `listen`; combined with Drizzle's default `autoCloseConnection: true` this closes the pg pool), then `await app.listen(process.env.PORT ?? '3000' as number)`. Decision: `forceCloseConnections` NOT set (only add if shutdown hangs on keep-alive — see Verification).
6. Strict TS, three files (repo already `strict: true` elsewhere):
   - `apps/api/tsconfig.json` — delete `"strictPropertyInitialization": false`
   - `packages/db/tsconfig.json` — delete `"strictPropertyInitialization": false`
   - `apps/web/tsconfig.node.json` — add `"strict": true`
7. `.env.example` files (gitignored `.env*` except `.env.example` per `.gitignore`):
   - `apps/api/.env.example` (new): `NODE_ENV=development`, `PORT=3000`, `# CORS_ORIGINS=`, `THROTTLE_TTL_MS=60000`, `THROTTLE_LIMIT=20`
   - `packages/db/.env.example`: append the three `DB_*` vars with defaults above.
8. `turbo.json` — extend `env` lists following the existing `DATABASE_URL` convention: `dev` gets `NODE_ENV, CORS_ORIGINS, THROTTLE_TTL_MS, THROTTLE_LIMIT, DB_POOL_MAX, DB_CONNECTION_TIMEOUT_MS, DB_IDLE_TIMEOUT_MS`; `test`/`test:e2e` get the three `DB_*` vars.
9. Docker, all new files at repo root (no equivalent exists):
   - `.dockerignore` — `.git`, `node_modules`, `**/dist`, `**/.turbo`, `coverage`, `.env*` (`!.env.example` NOT copied — prod image takes env at runtime; drizzle reads it in dev only), `apps/web`, `packages/ui`, `docs`, `.agents`
   - `Dockerfile` — 3 stages: `FROM node:24-alpine` base with `WORKDIR /app`; builder: copy `package*.json` → `npm ci` → copy source → `npm run build -- --filter=api` (turbo builds `db` first via `dependsOn`); runner: `ENV NODE_ENV=production`, fresh `npm ci --omit=dev`, copy root+nested `package.json`s, `apps/api/dist`, `packages/db/dist`; `EXPOSE 3000`; `CMD ["node", "apps/api/dist/main.js"]`. Runtime resolution works because npm creates the `node_modules/@workspace/db` symlink → `packages/db` (only `package.json` + `dist/` are copied). Decision: `--omit=dev` installs all workspaces' prod deps (web/ui deps included) — simple, correct, dev deps excluded.
   - `docker-compose.yml` — `db`: `postgres:17-alpine`, `POSTGRES_*` env for `openhouse`, named volume, `pg_isready` healthcheck; `api`: `build: .`, `NODE_ENV=production`, `DATABASE_URL=postgres://postgres:postgres@db:5432/openhouse`, `CORS_ORIGINS=${CORS_ORIGINS:-}` (api validation rejects empty → boot fails with explicit message), `ports: 3000:3000`, `depends_on: db service_healthy`. Decision: db port NOT published; migrations are run from the host (`npm run db:migrate`) against a published port when needed.
10. Copy this plan to `docs/plans/plan-api-production-hardening.md`, set `status: ready-for-dev` there (working file at `local://api-production-hardening-plan.md` becomes stale; that's expected).

**Defaults table (single source of truth):**

| Env var | Default | Consumer |
|---|---|---|
| `NODE_ENV` | `development` | main.ts CORS, throttler skipIf |
| `PORT` | 3000 | main.ts (existing) |
| `CORS_ORIGINS` | unset; required when production | main.ts |
| `THROTTLE_TTL_MS` | 60000 | ThrottlerModule |
| `THROTTLE_LIMIT` | 20 | ThrottlerModule |
| `DB_POOL_MAX` | 10 | DatabaseModule |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | DatabaseModule (fail-fast) |
| `DB_IDLE_TIMEOUT_MS` | 30000 | DatabaseModule |

**Steps 2–8 are a chain but each compiles independently after its step; step 9 (Docker) is independent of 2–8** (builds whatever the tree has). Steps must land in this order: deps first (1), then env/app wiring (2–4), then main.ts (5), then stryct/env samples (6–8), Docker last (9).

**Acceptance Criteria:**

- Given the repo checked out fresh, when `npm install && npm run typecheck && npm test && npm run test:e2e -w api` at root, then all pass with zero errors (tests run with `NODE_ENV=test`: no throttling, no CORS).
- Given `NODE_ENV=development`, when app boots, then log shows startup, `curl -s -D - localhost:3000` shows no `access-control-allow-origin` and **no** `x-ratelimit-*` header, and Helmet headers (`x-content-type-options: nosniff`, `strict-transport-security`) present.
- Given `NODE_ENV=production CORS_ORIGINS=http://localhost:3000`, when curl sends `Origin: http://localhost:3000`, then response has `access-control-allow-origin: http://localhost:3000`; 21 rapid requests → last is `429` with `Retry-After`.
- Given `NODE_ENV=production` without `CORS_ORIGINS`, when the app starts, then it exits with a message naming `CORS_ORIGINS` (not a generic crash).
- Given `DB_CONNECTION_TIMEOUT_MS=1` and an unreachable database host, when the app boots, then it aborts within ~1s with a connection error instead of hanging.
- Given `docker compose up --build` (with `CORS_ORIGINS` exported), then api answers on :3000 and db passthrough works (same curl checks); `docker compose stop api` exits the container in ≤10s (graceful drain).

## Implementation Notes

<!-- Agent-owned. Append-only during implementation. Never delete. Leave empty at planning time. -->

**2026-10-10 — executed.**

- **Bug found and fixed during smoke verification.** The first `assertUsable`
  (step 2) threw the "must list at least one origin" error when `CORS_ORIGINS`
  *was* set in production, and stayed silent when it was missing: the early
  `return` for an unset value ran before the requirement check. Now the check
  is on `value === undefined`, and `apps/api/src/env.spec.ts` (11 cases, new
  file, not in the plan) pins the contract: production requires origins,
  unknown `THROTTLE_*`/`DB_*`/`CORS_*`/`APP_*` names are rejected, numbers must
  be positive integers, `NODE_ENV` defaults to `development`, host-injected
  variables pass through.
- **Deviation — `.dockerignore` keeps `apps/web` and `packages/ui` in the build
  context.** The plan listed both as excluded, but the builder runs `npm ci`
  (which installs the workspaces the lockfile lists) and copies
  `apps/web/package.json`/`packages/ui/package.json`, so excluding those paths
  breaks both the install and the `COPY`. Only their manifests reach the
  runtime stage, so no web/ui source lands in the image.
- **Deviation — the throttler factory injects nothing.** `validateEnv`
  normalizes `NODE_ENV` into `process.env`, which is what `ConfigService` reads
  anyway, so `isProduction()` from `src/env.ts` is the single way to ask, shared
  by `main.ts` and the factory. A factory is still required (rather than
  `forRoot`): module definitions are evaluated before `ConfigModule.forRoot()`
  resolves its validation, so the limits must be read during DI.
- **Deviation — `main.ts` reads the port with `getPositiveInt('PORT', 3000)`.**
  The plan's `process.env.PORT ?? '3000' as number` is not valid TypeScript (a
  string asserted to `number`).
- **The database is not contacted at boot.** `pg` pools connect lazily, so
  `DB_CONNECTION_TIMEOUT_MS` is observable on the first query, not on startup
  (measured below).

## Plan Change Log

<!-- Append-only. One entry per plan amendment: trigger, what changed, what known-bad state it avoids. -->

- **2026-10-10 — `.dockerignore` no longer excludes `apps/web` / `packages/ui`.**
  Trigger: step 9's list contradicted step 9's own `COPY apps/web/package.json`.
  Effect: both stay in the build context; the runtime stage still copies only
  their manifests. Avoids a Docker build that fails at `COPY` (missing context
  file) and an `npm ci` that no longer matches the lockfile.

## Review Triage Log

<!-- Append-only. One entry per review pass: verdict counts, and one row per finding with verdict and evidence. -->

## Verification

**Commands (from repo root unless noted):**

- `npm install` — expected: lockfile updated, no peer-dep errors
- `npm run typecheck` — expected: clean, incl. flipped strict repos
- `npm test` (`turbo run test`) — expected: api unit tests pass
- `npm run test:e2e -w api` — expected: `/ (GET)` returns `Hello World!`; needs `DATABASE_URL` (packages/db/.env exists)
- Manual smoke, dev: `npm run dev -w api` + `curl -s -D - localhost:3000` — expected: nosniff/HSTS headers, no CORS/ratelimit headers
- Manual smoke, prod behavior: `NODE_ENV=production CORS_ORIGINS=http://localhost:3000 node apps/api/dist/main.js` (after `npm run build -w api`) with curl `Origin` + a 21-request loop — expected: ACA header + 429 with `Retry-After`; repeat once without `CORS_ORIGINS` — expected: boot abort naming the var
- Fail-fast: point `DATABASE_URL` at `localhost:59999` with `DB_CONNECTION_TIMEOUT_MS=1000` — expected: crash within ~1s
- Docker: `CORS_ORIGINS=http://localhost:3000 docker compose up --build` — expected: stack healthy, curl checks pass; `docker compose stop` then `docker compose ps` shows api gone within 10s

**Manual checks:**

- `docker compose config` parses clean (env interpolation OK)
- `node -e "require('@workspace/db/package.json')"` from the runner image context resolves (symlink intact) if image build surprises

**Results (2026-10-10, node v24.19.0, npm 12.0.2, Docker 29.8.2):**

| Check | Observed |
|---|---|
| `npm install` | clean; 15 packages added, lockfile updated, no peer-dep errors |
| `npm run typecheck` | 5/5 tasks pass with `strictPropertyInitialization` flipped off in `api` and `@workspace/db` and `strict` on in `apps/web/tsconfig.node.json` |
| `npm test` | 2 files, 12 tests pass (11 of them `env.spec.ts`) |
| `npm run test:e2e -w api` | 1/1 passes, `NODE_ENV=test` — no throttling, no CORS |
| `npm run lint` | 4/4 workspaces clean |
| Dev boot (`npm run dev -w api`) | Helmet `x-content-type-options: nosniff`, `strict-transport-security`; **no** `access-control-allow-origin` even with `Origin` sent; **no** `x-ratelimit-*`; 25 rapid requests all `200` |
| Prod boot (`NODE_ENV=production CORS_ORIGINS=http://localhost:3000`) | `access-control-allow-origin: http://localhost:3000` + helmet + `x-ratelimit-*`; disallowed `Origin` gets no ACAO; 21-request burst ends `429` with `Retry-After: 60` |
| Prod boot without `CORS_ORIGINS` | exits 1: `CORS_ORIGINS must list at least one origin when NODE_ENV is production.` |
| Bad values | `DB_POOL_MAX=zero` → exits naming `DB_POOL_MAX`; `THROTTLE_LIMITS=5` → exits naming the variable and listing the declared ones |
| Fail-fast pool | blackholed host: `DB_CONNECTION_TIMEOUT_MS=1000` → 1006 ms, cause `Connection terminated due to connection timeout`; default → 5004 ms; refused host → 16 ms |
| Pool closed on shutdown | `pool.ended=false` (1 idle connection) before `app.close()`, `true` after — the hook `enableShutdownHooks()` triggers on SIGTERM |
| `docker compose up --build` | builds, db healthy, api up; same curl checks pass inside the container; `db` reachable from the api container (`select current_database()` → `openhouse`) |
| `docker compose stop api` | 0 s, exit code 0 (`forceCloseConnections` not needed) |

Image: 665 MB; `packages/db` in the image contains only `dist/` + `package.json`, and `node_modules/@workspace/db` resolves.

## Assumptions & Contingencies

- Throttling/CORS active **only** in `NODE_ENV=production`; `test` treated like development (protects the existing e2e suite). Fallback if e2e still throttles: assert `NODE_ENV` unset under vitest — treat unset as development.
- Turbo passes undeclared env in practice here; declaring them in `turbo.json` env arrays (step 8) follows the file's own convention so strict `--env-mode` invocations also work.
- If `npm run build -- --filter=api` in Docker fails on the turbo filter syntax, use `npx turbo build --filter=api` (turbo is a root devDep, on PATH in the workdir).
- If flipping `strictPropertyInitialization` breaks code beyond what visual inspection predicts (nothing expected: no class property outside constructors), fix the individual property with definite-assignment only when it is provably initialized before use; otherwise report back.
- If graceful shutdown hangs (`docker compose stop` slow), add `forceCloseConnections: true` as second arg to `NestFactory.create(AppModule, ...)` and record in Implementation Notes.
- In-memory throttle/cache resets on restart and is per-process — the accepted tradeoff for "docker ready" now; Redis providers are the named later feature.
