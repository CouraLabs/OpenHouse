## REFERENCES

- Cloudflare: this project has a Wrangler config, so use Wrangler (not the cf CLI).
- Turborepo: config and CLI may differ from your training data. Before changing `turbo.json` or turbo commands, read `docs/README.md` inside the installed package (`node -p "require.resolve('turbo/package.json')"`).
- Skills in `.claude/skills/` — load the matching one before working in that area:
  - `hono-workers-best-practices`: apps/api
  - `typescript-best-practices`: any `.ts`/`.tsx`
  - `react-best-practices`: web `.tsx`
  - `design-system`: any page, form, dialog, or component in apps/web or packages/ui
  - `qa-browser`: after any web change, to test the real UI
- `docs/domain-invariants.md`: the full text of the domain rules summarized below.

## COMMANDS

Run from the repo root; each fans out through turbo.

```
npm run dev            # api (localhost:8787, local D1) + web (localhost:5173)
npm run build
npm run typecheck
npm run lint           # biome
npm run format         # prettier
npm run test           # vitest: unit specs + apps/api/test e2e specs, all in workerd
npm run db:generate    # drizzle migration from packages/db schema
npm run db:migrate     # apply migrations to the local D1
npm run reset-code     # operator password-reset code, never over HTTP
npm run set-tier       # operator: move a tenant to a plan (-1..3), never over HTTP
npm run test:e2e       # playwright: the web app against the local dev servers (packages/e2e)
```

## PROJECT STRUCTURE

The app is layered. Every addition has one obvious home, and imports only go down the graph below.

### Layers

```
apps/web          → packages/dto, packages/ui     presentation: renders what the API returns
apps/api          → packages/business, packages/dto   HTTP: routes, middleware, config, jobs
packages/business → packages/db, packages/domain, packages/dto   every rule and use case
packages/db       → packages/domain               schema, connection, repositories
packages/dto      → packages/domain               wire contract: zod schemas and response types
packages/domain   → nothing                       interfaces, types, plain objects, constants
packages/ui       → nothing                       design system (presentation)
```

```
apps/
  api/                    # Cloudflare Worker (Hono): HTTP only. wrangler.jsonc: DB (D1), JOBS (Queue), RATE_LIMIT, crons
    src/
      index.ts            # Worker entry: fetch, scheduled, queue
      app.ts              # composition root: middleware, mounts every feature router under /api, error handler
      config/             # env.ts: parses c.env once per isolate with zod
      common/             # HTTP plumbing: session and tier middleware, runtime middleware (createBusiness once per isolate), error response, rate limit, cookies
      infra/              # adapters for business ports: mailer, push transport, turnstile, R2
      jobs/               # scheduled + queue consumers; each calls a business use case
      <feature>/          # <feature>.routes.ts only: reads its services from c.var.business
    test/                 # e2e specs (*.e2e-spec.ts)
    scripts/              # operator commands (reset-code.mjs)
  web/src/                # presentation only; imports packages/dto and packages/ui
    features/<feature>/   # page, forms, columns, hooks. No business rules
    components/layout/    # app shell chrome (reads router/session/i18n)
    lib/                  # api client, auth, query, router, i18n, settings hooks, format-money (display only)
    locales/              # <locale>.json — every user-facing label
  landing/                # public marketing page (Vite + React, no API, port 5174); words only via useContent() from locales/<locale>.ts
packages/
  domain/                 # interfaces, types, plain objects, constants (TIER_PLANS, currencies, module keys) and pure value helpers (money cents, time zones). No zod, no rules
  dto/                    # wire contract: zod request schemas and response types, one file per feature (dates ISO strings, money decimal strings)
  db/                     # Drizzle schema and relations (the only schema owner), money type, repositories/<feature>/
  business/               # all app logic: rules, calculations, clock and ports, use cases; one folder per feature
  ui/                     # shared design system: shadcn primitives, DataTable, FilterDialog, MoneyField, ConfirmDialog, styles
  e2e/                    # playwright regression suite for apps/web (npm run test:e2e); tests/owner/*.spec.ts per page
```

### Rules for growing it

1. **Layer direction.** Imports follow the Layers graph and nothing else. Apps never import each other, and `domain` and `ui` import nothing from this repo. `biome.jsonc` enforces the graph with one `noRestrictedImports` override per package, so `npm run lint` fails on a wrong import.
2. **Presentation has no logic.** `apps/web` renders the dto shapes endpoints return. It does no money arithmetic, computes no "today", no split, statement window, forecast or category, and runs no business rule beyond shape validation. Anything shown that is computed comes from the API; a preview while the user types is an endpoint call.
3. **The API is HTTP only.** A route parses input with a dto schema, calls one business use case and returns a dto. Middleware and jobs do the same. Routes never import `packages/db` and never hold a rule. `apps/api/src/common/` is HTTP plumbing only.
4. **Business owns every rule.** `packages/business` has one folder per feature: `<feature>.service.ts` for use cases, `<concern>.ts` for pure rules, `*.spec.ts` beside both. Use cases take their dependencies (db handle, clock, ports) as arguments and return dto shapes. They never read `c.env`, `process.env` or Hono types. Ports (`SessionResolver`, `CardCycleSync`, `Mailer`, …) are abstract classes defined in business; their adapters live in `apps/api/src/infra/`.
5. **DB owns persistence.** `packages/db` holds the schema, relations, the money type and the repositories (`repositories/<feature>/<entity>.repository.ts`). Repositories take the tenant id first and return the row types drizzle infers from the schema, so no table shape is declared twice; business maps rows to dto. They run queries and never hold rules.
6. **Domain holds shapes and constants.** `packages/domain` has interfaces, types, plain objects, constants and pure value helpers (decimal-to-cents conversion, time zone membership). They do no I/O and apply no business rule. No zod, no functions with rules.
7. **DTO is the wire contract.** Every shape crossing HTTP is declared once in `packages/dto` (zod schema plus inferred type; dates as ISO strings; money as decimal strings) and imported by both sides. Web forms wrap the dto schema (`schema.extend`), never re-declare it. Import dto types directly — no local aliases (`export type SignInInput = SignInBody` is banned).
8. **Environment is read only in `config/`.** Business gets values injected, never reads `c.env`/`process.env` (session middleware excepted). Local values in `apps/api/.dev.vars`; secrets via `wrangler secret put`.
9. **A new API capability is one folder in each layer**: `packages/dto/src/<feature>.ts`, `packages/domain/src/<feature>.ts`, `packages/db/src/repositories/<feature>/`, `packages/business/src/<feature>/` and `apps/api/src/<feature>/` (routes only), mounted in `app.ts`. Services are wired once in `createBusiness` (`packages/business/src/runtime.ts`). `auth/` owns credentials and session lifecycle only. A feature reaches another feature only through a port or the `createBusiness` wiring.
10. **Web features are vertical.** Everything a page needs lives in `features/<feature>/`. Lift a component only when a second feature uses it. shadcn primitives land in `packages/ui/src/components/`.
11. **Tests sit next to their code** (`<name>.spec.ts`) in business and apps/web; route and e2e specs live in `apps/api/test/`. Vitest finds both at any depth. API e2e specs seed and assert through HTTP or `@workspace/business/testing` (`TestDatabaseHarness`, `FixedClock`), never `packages/db` or `src/` internals.
12. **One component per file.** Tiny single-use helpers may stay inline; anything exported gets its own file.
13. **Reusable components go to `packages/ui`**, label-agnostic: every string comes in through props or `labels`. Only chrome that reads router, session, or i18n stays in `apps/web/src/components/`.
14. **Table pages follow one recipe.** Sorting, pagination and filters live in the page; the search args are the TanStack Query key with `keepPreviousData`. Server search is `POST <entity>/search` with dto's `FetchArgs`; the API whitelists sortable columns via `buildPagedQuery` and tie-breaks on `id`.
15. **Split components while you build.** Extract each mixed concern (debounce effect, inline confirm dialog, field pair, header block) into its own file — feature-agnostic pieces to `packages/ui`.

### Domain invariants (full text: `docs/domain-invariants.md`)

- **Tenant entities:** spread `tenantEntityColumns()`, soft delete, tenant from the session (never the body), repository takes tenant id first, writes stamp `createdBy`/`updateBy`, display fields joined. Tables outside the recipe are listed in the doc.
- **Time:** "today" is `todayIn(settings.timezone)` in business; the API returns it and the web never computes it. Day logic uses the injected `Clock`; `new Date()` only for instant stamps.
- **Currency:** `accounts.currency` is immutable and inherited by money that moves; limits and goals use the main currency; nothing is converted.
- **Money:** integer cents in SQLite (`money` type in `packages/db`), decimal strings on the wire, bigint cents for arithmetic in business, `format-money.ts` + `MoneyField` on the web for display only; `Number()` only for charts and ratios.
- **Transactions:** transfers pair two legs by `transferGroupId`; a card payment is the transfer's Income leg with `paymentStatementId`; installments ≤ 48; every write adds a `transaction_history` row.
- **Household splits:** shares > 0 summing to the amount, via business `resolveSplit`; rounding cents go to the payer.
- **Card bills are derived:** totals, carry-over and status computed on read; assignment is business `resolveStatement`.
- **Deletion:** soft everywhere, except tenant deletion (30-day job, one `db.batch`), member anonymization, and credential/throttle rows. `audit_log` and `transaction_history` are append-only. Exports are built in memory.
- **Switches follow `ENVIRONMENT`:** production (default) reads `KANTIM_ENABLE_EMAIL_VERIFICATION` / `KANTIM_ENABLE_CAPTCHA_CHECK` and hardens Hono (HSTS, CSRF origin check, no error detail); development turns both checks off.
- **Plans are tenant tiers:** domain's `TIER_PLANS`; caps are checked in business and refused by the API as 403 `tier_limit`; Free hides (never deletes) transactions older than 3 months; tiers change only via `npm run set-tier`.
- **Password recovery never needs email:** one-time codes stored as SHA-256, redeeming signs every session out, failures answer one generic 400.

## PROJECT RULES

- **No comments in source** (`.ts`, `.tsx`, `.js`, `.mjs`, `.css` under any `src/`). Tool directives count too — suppress rules via `overrides` in `biome.jsonc`. Exempt: comment-capable configs, generated files, fixtures quoting commented code.
- **Required-field `*`** only when the column is NOT NULL or the dto schema requires it unconditionally; conditionally required pairs stay unmarked.
- **Migrations are expand/contract.** `wrangler deploy` applies D1 migrations before the new Worker ships, so the old bundle must survive the new schema: widen first (nullable/default, backfill), deploy the code, contract later. Never drop or rename a column the deployed Worker still reads.
- **Web changes are verified in a browser** with the `qa-browser` skill; UI work follows the `design-system` skill.

When this contract stops fitting, change this file first, then the code — it is the source of truth agents navigate by.
