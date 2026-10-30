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
```

## PROJECT STRUCTURE

The app will grow substantially. Every addition has one obvious home, and dependency directions never invert.

```
apps/
  api/                    # Cloudflare Worker (Hono); wrangler.jsonc: DB (D1), JOBS (Queue), RATE_LIMIT, crons
    src/
      index.ts            # Worker entry: fetch, scheduled, queue
      app.ts              # composition root: middleware, mounts every feature router under /api, error handler
      config/             # env.ts: parses c.env once per isolate with zod
      common/             # cross-cutting infrastructure and ports — no domain logic
      jobs/               # scheduled + queue consumers
      <feature>/          # <feature>.routes.ts, <feature>.deps.ts, <entity>.repository.ts, <entity>.service.ts, pure <concern>.ts, *.spec.ts
    test/                 # e2e specs (*.e2e-spec.ts)
    scripts/              # operator commands (reset-code.mjs)
  web/src/
    features/<feature>/   # page, forms, columns, hooks, feature-local logic
    components/layout/    # app shell chrome (reads router/session/i18n)
    lib/                  # api, auth, query, router, i18n, settings hooks, format-money, …
    locales/              # <locale>.json — every user-facing label
  landing/                # public marketing page (Vite + React, no API, port 5174); words only via useContent() from locales/<locale>.ts
packages/
  poco/                   # shared contracts: zod request schemas + wire DTO types, one file per feature
  db/                     # Drizzle schema and relations — the only schema owner
  ui/                     # shared design system: shadcn primitives, DataTable, FilterDialog, MoneyField, ConfirmDialog, styles
```

### Rules for growing it

1. **Dependency direction.** `feature → common → (config, packages)`. A feature's routes and services never import another feature's files; shared needs graduate to `common/` (or `packages/` when a second app needs them). `<feature>.deps.ts` is the one place that wires across features: it may construct a sibling's repository (limits builds `CategoryRepository`). The other sanctioned crossing is a **port**: an abstract class in `common/` that one feature calls and another implements (`SessionResolver`, `CardCycleSync`, `HouseholdMembers`, upcoming sources). `poco` depends on nothing in this repo.
2. **A new API capability is a feature directory** with its routes, deps, repository and service(s) (split services per concern), mounted in `app.ts`. `auth/` owns credentials and session lifecycle only.
3. **`common/` stays dumb.** Middleware, validation, search helpers, clock, error mapping, ports — parameterized by inputs, never business rules.
4. **Web features are vertical.** Everything a page needs lives in `features/<feature>/`. Lift a component only when a second feature uses it. shadcn primitives land in `packages/ui/src/components/`.
5. **Schema lives only in `packages/db`.** Nothing re-declares table shapes.
6. **Contract-first through `packages/poco`.** Every shape crossing HTTP is declared once in poco (wire types: dates as ISO strings) and imported by both sides; poco changes first. Web forms wrap the poco schema (`schema.extend` / a poco predicate), never re-declare it. Import poco types directly — no local aliases (`export type SignInInput = SignInBody` is banned).
7. **Environment is read only in `config/`.** Features get values injected, never read `c.env`/`process.env` (session middleware excepted). Local values in `apps/api/.dev.vars`; secrets via `wrangler secret put`.
8. **Tests sit next to their code** (`<name>.spec.ts`); e2e in `apps/api/test/`. Vitest finds both at any depth.
9. **One component per file.** Tiny single-use helpers may stay inline; anything exported gets its own file.
10. **Reusable components go to `packages/ui`**, label-agnostic: every string comes in through props or `labels`. Only chrome that reads router, session, or i18n stays in `apps/web/src/components/`.
11. **Table pages follow one recipe.** Sorting, pagination and filters live in the page; the search args are the TanStack Query key with `keepPreviousData`. Server search is `POST <entity>/search` with poco's `FetchArgs`; the API whitelists sortable columns via `buildPagedQuery` and tie-breaks on `id`.
12. **Split components while you build.** Extract each mixed concern (debounce effect, inline confirm dialog, field pair, header block) into its own file — feature-agnostic pieces to `packages/ui`.

### Domain invariants (full text: `docs/domain-invariants.md`)

- **Tenant entities:** spread `tenantEntityColumns()`, soft delete only, tenant comes from the session (never the body), repository takes tenant id first, writes stamp `createdBy`/`updateBy`, display fields are joined. Exceptions: `tenant_settings` (typed columns, one row per tenant) and user-scoped rows (notifications, push subscriptions, calendar feeds).
- **Time is the tenant's:** "today" is `todayIn(settings.timezone)` / `useTenantToday()`; use the injected `Clock`, never `new Date()` for day logic.
- **Currency lives on the account:** `accounts.currency` is immutable; money that moves inherits it; limits and goals use the tenant's main currency; nothing is converted yet.
- **Money is a string end to end:** integer cents in SQLite via the `money` type, decimal strings on the wire, `format-money.ts` and `MoneyField` on the web — never a float.
- **Card bills are derived:** totals, carry-over and status are computed on read; payments name their bill via `paymentStatementId`; assignment is poco's `resolveStatement`.
- **Tenant deletion is the only hard delete** (30-day scheduled job, one `db.batch`); otherwise only credential rows (push subscriptions, calendar feeds) are ever removed. `audit_log` is append-only. Exports are built in memory, never stored.
- **Switches follow `ENVIRONMENT`:** production (the default) reads `OPENHOUSE_ENABLE_EMAIL_VERIFICATION` / `OPENHOUSE_ENABLE_CAPTCHA_CHECK` and hardens Hono (HSTS, CSRF origin check, no error detail); development (`npm run dev`) turns both checks off.
- **Plans are tenant tiers:** the catalog is poco's `TIER_PLANS`; caps are enforced in `app.ts` through the `TierGate` port; Free hides (never deletes) transactions older than 3 months; tiers change only via `npm run set-tier`.
- **Password recovery never needs email:** one-time reset codes, stored as SHA-256 only, redeeming signs every session out, failures answer one generic 400.

## PROJECT RULES

- **No comments in source** (`.ts`, `.tsx`, `.js`, `.mjs`, `.css` under any `src/`). Tool directives count too — suppress rules via `overrides` in `biome.jsonc`. Exempt: comment-capable configs, generated files, fixtures quoting commented code.
- **Required-field `*`** only when the column is NOT NULL or poco requires it unconditionally; conditionally required pairs stay unmarked.
- **Migrations are expand/contract.** `wrangler deploy` applies D1 migrations before the new Worker ships, so the old bundle must survive the new schema: widen first (nullable/default, backfill), deploy the code, contract later. Never drop or rename a column the deployed Worker still reads.
- **Web changes are verified in a browser** with the `qa-browser` skill; UI work follows the `design-system` skill.

When this contract stops fitting, change this file first, then the code — it is the source of truth agents navigate by.
