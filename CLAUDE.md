## REFERENCES
- Turborepo: the agent-guidance block at the bottom of this file, plus the
  bundled docs inside the installed `turbo` package (`node -p
  "require.resolve('turbo/package.json')"` → `docs/README.md`).
- Project skills live in `.claude/skills/`: `nestjs-best-practices` (api),
  `react-best-practices` (web `.tsx`), `typescript-best-practices` (any
  `.ts`/`.tsx`). Load the matching one before writing code in that area.

## COMMANDS

Run from the repo root; each fans out through turbo to every workspace.

```
npm run dev            # api + web in watch mode
npm run build
npm run typecheck
npm run lint           # biome
npm run format         # prettier
npm run test           # vitest unit specs
npm run test:e2e       # api e2e specs (apps/api/test/), needs DATABASE_URL
npm run db:generate    # drizzle migration from packages/db schema
npm run db:migrate
```

## PROJECT STRUCTURE

This app **will grow substantially**. The tree below is the contract that keeps
growth orderly: every addition has one obvious home, and dependency directions
never invert.

```
apps/
  api/                  # a Cloudflare Worker (Hono), deployed with wrangler
    wrangler.jsonc      # bindings: DB (D1), JOBS (Queue), RATE_LIMIT; cron
                        #   triggers; migrations_dir; nodejs_compat
    src/
      index.ts                  # Worker entry: { fetch: app.fetch, scheduled, queue }
      app.ts                    # composition root: middleware order, mounts every
                                #   feature router under /api, global error handler
      config/                   # environment: env.ts parses c.env (bindings, vars,
                                #   secrets) once per isolate with zod
      common/                   # cross-cutting infrastructure — no domain logic
        context.ts              # Hono `Variables`: session, db, deps
        session/                # session.ts: Session type; auth.middleware.ts:
                                #   authMiddleware + cookie helpers + requireRole;
                                #   session-resolver.ts: the abstract SessionResolver
                                #   the middleware calls and auth/ implements
        validation/             # zValidator wrappers over poco schemas
        search/                 # fetch.helper.ts: buildPagedQuery, escapeLikePattern
        clock/                  # Clock (injectable "now"; specs pass a fixed one)
                                #   — never `new Date()` in a service whose logic
                                #   depends on the day
        ledger/                 # ledger-conflict.ts: LedgerConflictError; the
                                #   app-wide error handler answers it 409
        card-cycle/             # card-cycle-sync.ts: the abstract CardCycleSync port
                                #   accounts/ calls when a card's close/due days
                                #   change and credit-card-statements/ implements
        household/              # household-members.ts: the abstract HouseholdMembers
                                #   port splits and settle-up read the tenant's
                                #   members through; the household feature implements
                                #   it. split-members.ts: pure member helpers
        upcoming/               # upcoming-sources.ts: abstract ports the upcoming
                                #   panel and reminders read bills, rules, limits and
                                #   goals through; each owning feature implements
        db-errors.ts            # maps SQLite/D1 constraint errors to the 409/400
                                #   repositories answer
      <feature>/                # a domain feature (auth/, tenants/, settings/, preferences/, accounts/, categories/, limits/, goals/, receivers/, transactions/, recurring-transactions/, transaction-linkers/, credit-card-statements/, statement-imports/, data-exports/, tenant-deletion/, audit/, household/, upcoming/, notifications/, calendar/):
        <feature>.routes.ts     #   routes: HTTP shape, status codes, DTO mapping —
                                #   a Hono sub-app mounted by app.ts
        <feature>.deps.ts       #   builds the feature's services from (db, ports,
                                #   config); called once per request
        <entity>.repository.ts  #   Drizzle queries: tenant passed explicitly, paged
                                #   search via buildPagedQuery, sortable-column whitelist
        <entity>.service.ts     #   business rules; may be split per concern
                                #   (invite-code.service.ts, recurring-run.service.ts)
        <concern>.ts            #   pure domain logic with no Hono/DB deps
                                #   (limit-period.ts, auth/reset-code.ts;
                                #   transaction-ledger.ts pairs its money math with
                                #   the balance writes)
        *.spec.ts               #   Vitest specs next to the code
    test/                       # e2e specs (*.e2e-spec.ts) — run in workerd
    scripts/reset-code.mjs      # the operator command (rule 6e), never over HTTP
  web/
    src/
      App.tsx                   # query client + router composition
      main.tsx                  # React root
      features/                 # one directory per route/feature (sign-in/, main/,
                                #   transactions/, limits/, rent-vs-buy/, …): page,
                                #   forms, columns, hooks, feature-local pure logic
      components/
        layout/                 # app shell chrome: shells, header, sidebar, nav,
                                #   breadcrumbs, theme/locale switchers
        page-header.tsx         # shared page title block (candidate for packages/ui)
      lib/                      # transport and shared client logic: api.ts, auth.ts,
                                #   account-security.ts (recovery codes left, server
                                #   reset notices — read by the shell and Settings),
                                #   settings.ts (tenant settings from the session:
                                #   useMainCurrency, useTenantToday, useSaveSettings),
                                #   query.ts, router.tsx, i18n.ts, format-money.ts,
                                #   format-date-only.ts, finance.ts, main-currency-first.ts,
                                #   use-debounced-value.ts
      locales/                  # <locale>.json — every user-facing label (en-US.json today)
  landing/                      # public marketing single page (Vite + React, no API,
                                #   port 5174): warm-monochrome light/dark tokens in
                                #   landing.css, Newsreader/Geist/Geist Mono, Phosphor
                                #   icons; takes only ThemeProvider from packages/ui
                                #   (system theme + nav toggle)
    src/
      App.tsx                   # section composition, in reading order
      main.tsx                  # React root under ThemeProvider (packages/ui) and
                                #   LocaleProvider
      lib/                      # content.ts (the `Content` type: every word the page
                                #   shows), locale.ts (locales, stored pick → browser
                                #   language → en-US), use-locale.ts (useContent()),
                                #   links.ts (GitHub + web-app URLs from VITE_APP_URL in
                                #   .env, documented in .env.example), tones.ts
                                #   (pastels), use-in-view.ts
      locales/                  # <locale>.ts — one typed `Content` per locale (en-US,
                                #   pt-BR); sections read words only via useContent()
      components/               # landing-local primitives: Reveal, Eyebrow,
                                #   SectionHeading, ButtonLink, LocaleProvider, …;
                                #   preview/ app-slice visuals
      sections/<section>/       # one directory per page section (nav, hero, features,
                                #   planners, pricing, open-source, faq, footer)
packages/
  poco/                         # shared contracts: zod request schemas + wire DTO types,
                                #   one file per feature. The single source both api
                                #   validation and web forms run.
  db/                           # schema, relations, DatabaseModule — the only schema owner
  ui/                           # shared design system consumed by web: components/
                                #   (shadcn primitives + DataTable, FilterDialog,
                                #   MoneyField, ConfirmDialog, …), hooks/, lib/, styles/
```

### Rules for growing it

1. **Dependency direction.** `feature → common → (config, packages)`. A feature
   NEVER imports another feature's internal files; anything two features need
   graduates to `common/` (or to `packages/` when a second app needs it). The
   one sanctioned crossing is module-level: a feature may import another
   feature's *module* to inject a repository that module exports (limits
   validates its categoryId through `CategoriesModule`'s exported
   `CategoryRepository`). Importing a sibling's service or internals directly
   is a design smell — extract the shared part instead. A second sanctioned
   shape is the **port**: an abstract class in `common/` (like
   `SessionResolver`) that one feature calls and another implements and
   provides under the abstract token — the caller depends on the
   abstraction, never on the implementing feature (accounts call
   `CardCycleSync`; credit-card-statements implements it).
   `poco` depends on nothing in this repo; everything else may depend on it.
2. **A new API capability is a feature directory**, not a file in an existing
   one. Create `<feature>/` with its module, controller, and service(s); split
   services per concern (see `invite-code.service.ts`); register the module in
   `app.module.ts`. Do not grow `auth/` into an accretion disk: it owns
   credentials and session lifecycle only.
3. **`common/` stays dumb.** It holds decorators, guards, pipes, filters,
   interceptors — things parameterized by their inputs, never business rules.
   If `common/` code needs to know what a tenant or an invite code is, it
   belongs in a feature (or a new shared *domain* module, deliberately created).
4. **Web features are vertical.** A page, its forms, its hooks, and its
   feature-local components live together in `features/<feature>/`. Lift a
   component out only when a second feature uses it — never pre-emptively —
   and lift it per rule 10. Generated shadcn primitives always land in
   `packages/ui/src/components/`.
5. **Schema lives only in `packages/db`.** API and web consume its types; no
   feature re-declares table shapes.
6. **Contract-first through `packages/poco`.** Any shape that crosses the
   HTTP boundary — a request body the API validates, a response body the web
   renders — is declared once in `poco` (zod schema or wire type) and imported
   by both sides. A web form NEVER re-declares an API schema by hand; it wraps
   the poco schema (adding only UX messages) via `schema.extend` / a predicate
   poco exports. Poco holds **wire types** (dates as ISO strings) and no
   imports from `db`, `api`, or `web` — it must stay installable by both. When
   a route's contract changes, poco changes first and both sides follow.
   Import poco types **directly** — never re-export them under a local name
   (`export type SignInInput = SignInBody` is banned): an alias hides where a
   type comes from and creates a second name for one contract.
6a. **Tenant entities follow the base recipe.** A tenant-scoped table spreads
   `tenantEntityColumns()` (packages/db) and adds its identity + business
   columns; deletion is a status change (soft), never a row removal; the
   controller reads tenant and user from `@CurrentSession()` — a request body
   or query never names a tenant; the repository takes the tenant id as an
   explicit first argument; every write stamps `createdBy`/`updateBy` from the
   session user. Wire rows that need a display field from another table carry
   it **joined** (limits carry `categoryName`, never a bare `categoryId` for
   humans) — the web never resolves foreign-key ids into labels.
   **Sanctioned exception — tenant singletons.** `tenant_settings` holds one
   row per tenant, keyed by `tenantId`, created in the sign-up transaction.
   It has no lifecycle, so it spreads no `tenantEntityColumns()` (no status,
   no soft delete, no `createdBy`); it keeps `updateBy`/`updateDt`. Settings
   are typed columns, never key/value rows: a new global setting is a new
   column by migration, validated by poco and the database.
   **Sanctioned exception — user-scoped rows.** Rows that belong to one user
   inside a tenant (`notification_preferences`, keyed by `userId`;
   `push_subscriptions`, one per browser; `notifications`, `notification_log`,
   `calendar_feeds`) carry `tenantId` and `userId`, spread no
   `tenantEntityColumns()`, and take the tenant as an explicit argument. They
   are not business entities: no status, no soft delete. Their rows are
   deleted only as credentials or delivery state (see 6g).
6c. **Time is the tenant's.** "Today" is `todayIn(settings.timezone)` (poco),
   never the server's or the device's zone: the recurring job evaluates each
   tenant against its own calendar day, and web forms default dates through
   `useTenantToday()`. `date` columns are calendar days and never shift when
   the zone changes.
6d. **Currency lives on the account.** `accounts.currency` is the only
   currency column for money that moves, and it never changes after
   creation. Anything that moves money (transactions, recurring rules, card
   bills, installments) inherits it from its account. Anything not tied to
   an account (limits, goals) is denominated in the tenant's **main
   currency** from `tenant_settings`; no other table declares a currency.
   Wire rows still carry a read-only `currency`, joined or filled in by the
   API, so the web never derives it. Until exchange rates exist, nothing is
   converted: a goal's account must be in the main currency, a limit counts
   only main-currency accounts (`excludedCount` reports the rest), and
   changing the main currency re-denominates limits and goals — the API
   answers 409 with their counts until the body confirms it.
   `accounts.spreadPct` is stored for the future exchange-rate integration
   and read by no calculation yet.
6b. **Money is a string end to end.** Storage is **integer minor units**
   (cents): the `money` custom type in `packages/db` maps a decimal string
   (`"12.34"`) to the integer SQLite stores, so `SUM` stays exact and
   nothing crosses a float — the converter rejects values above 2^53 cents;
   raw SQL answers cents through a `centsToDecimal` helper, not a cast.
   poco validates the decimal shape with a regex; the web formats
   for display through `lib/format-money.ts` (the row's `Currency` from poco
   picks the symbol; an amount with no currency of its own formats in the
   tenant's main currency (`useMainCurrency()`), never a hard-coded one; the
   i18next locale picks separators and symbol placement) and inputs it through `MoneyField` (packages/ui),
   whose reverse masking (digits typed are cents) is locale-aware. Money never
   crosses a float.
6f. **Card bills are derived, not stored.** A `credit_card_statements` row
   is one cycle of one card: `periodStart` inclusive, `closeDate` the
   exclusive end of the period (the close day itself on a default card, the
   day after it on a `closeDayInclusive` card), `dueDate` snapshotted at
   creation. Its totals, carry-over, and status are computed on read from
   its transactions — never stored, so they cannot drift. `closedAt` is an
   audit stamp written only by write paths; no logic reads it. The
   assignment rule is poco's `resolveStatement`, shared by the API and the
   form; a bill's money is in its card's account currency.
   **A payment is a transfer into the card.** Its card side lands on no
   bill by date; `paymentStatementId` names the bill it settles, chosen
   explicitly (or poco's `defaultPaymentStatement`), never resolved from
   the payment's day. A bill's `paid` sums those rows, and the carry-over
   (`previousBalance`, `amountDue`, `carriedTo`) is derived on read too —
   no cache. `minimumDue`/`bankTotal` are typed in from the bank's bill and
   `reconciledAt`, like `closedAt`, is an audit stamp.
6g. **Tenant deletion is the one hard delete.** An owner schedules it by
   typing the tenant name; 30 days later (the tenant's own calendar day) an
   hourly job removes the tenant and everything it owns, children first,
   `import_mappings` and the append-only `transaction_history` included —
   one `db.batch([...])` of `DELETE … WHERE tenant_id = ?` statements (in
   chunks per table when a tenant is big; the `tenants` row goes last, so a
   crashed run resumes on the next hour). Nothing else ever removes business
   rows. The sanctioned exception
   is credentials that carry no history: a `push_subscriptions` row is deleted
   when its browser unsubscribes or the push service answers 404/410, and a
   `calendar_feeds` row when its token is regenerated or revoked. No
   transaction, settlement, or notification row is ever removed this way.
   `audit_log` is append-only, has
   no foreign key to `tenants`, and keeps the `tenant.deleted` line. Full
   exports (`data-exports/`) and CSV exports are owner-facing and audited;
   the ZIP is built in memory per request and returned as a download —
   nothing is stored, so there is no `EXPORT_DIR`, no expiry, and no
   one-download bookkeeping (see `docs/data-export.md`).
6e. **Password recovery never needs email.** A one-time reset code — issued
   by an owner for a member, generated in advance as an owner's recovery
   codes, or printed by the server's `reset-code` command — sets a new
   password through `POST auth/password/reset`. Only the SHA-256 of the
   normalized code is stored; the plaintext is shown once. Redeeming clears
   the refresh hash (every session signs out); wrong, expired, and used
   codes answer one generic 400.
7. **Environment is read only in `config/`.** The Worker's environment comes
   as `c.env` (D1 binding, queue binding, rate-limit binding, vars, secrets);
   `config/env.ts` parses it with zod once per isolate and caches it. Feature
   code receives values via injection, never by reading `c.env` or
   `process.env` deep inside a feature (the session middleware is the
   sanctioned exception, as configuration consumed at mount time). Local dev
   defines values in `apps/api/.dev.vars`; production secrets go through
   `wrangler secret put`.
8. **Tests sit next to their code** (`<name>.spec.ts`) and e2e specs in
   `apps/api/test/`. Vitest picks up both from any depth — moving files needs no
   config changes.
9. **One component per file.** Every React component lives in its own file
   (`<component>.tsx`); never stack multiple components in one file. Tiny
   single-use helpers used only by that component may stay inline, but anything
   exported is its own file.
10. **Reusable components go to `packages/ui`.** A component needed by more
    than one feature (or app) belongs in the shared design system. Only
    app-coupled chrome — pieces that read the router, session, or i18n
    directly — stays in `apps/web/src/components/` (today: `layout/`).
10a. **Components in `packages/ui` stay label-agnostic.** They render what
    the caller passes — every user-facing string comes in through props or
    `labels` objects, translated by the feature. The data table toolbar
    pattern is: `FilterDialog` (entity-parameterized fields: `text`,
    `number`, `select` with options) immediately left of the insert button;
    applying a filter resets the table to page 1.
10b. **Table pages follow one recipe.** State lives in the page (sorting,
    pagination, filter values); the search args derive from it and are the
    TanStack Query key, with `keepPreviousData` so paging never blanks.
    Server-side search runs through `POST <entity>/search` with the shared
    `FetchArgs` envelope from poco; the API whitelists sortable columns via
    `buildPagedQuery` and always tie-breaks on `id`.
11. **Split components while you build, not after.** When writing or changing
    a web component, actively look for the seams where it mixes concerns — a
    page holding its own debounce effect, an inline confirm dialog, a
    hand-aligned field pair, a page-header block — and extract each into a
    single-purpose component in its own file (rule 9). A piece that is
    feature-agnostic moves to `packages/ui` (rule 10); a piece only one
    feature uses yet lives in that feature's directory. Never leave a
    component doing layout, state, and domain rendering in one body when a
    subcomponent boundary would make the next page able to reuse it.

When a section of this contract stops fitting (e.g. `common/` needs
sub-domain splitting, or web needs shared data-access layers), change the
contract here first, then the code — this file is the source of truth agents
navigate by.

## Project rules

- Required-field markers follow the database: a form field carries the red `*`
  only when its column is NOT NULL, or the poco schema requires it
  unconditionally. Conditionally required pairs (tenant name XOR invite code)
  stay unmarked — their labels already say when each applies.

## Schema migrations

- Every migration is **expand/contract**: `wrangler deploy` applies pending
  `d1 migrations` before it ships the new Worker, so the running Worker must
  work with the *new* schema for a few seconds while the previous bundle may
  still be serving. Ship the widening migration first (new column nullable or
  with a default, then backfilled), deploy the code that uses it, and only
  then ship the contraction (drop the old column, tighten a constraint).
  Never drop or rename a column the deployed Worker still reads in the same
  deploy that stops reading it.

## Testing the web app in a browser

After any web change, test the real UI with the `browser-use` CLI (run
`browser-use skill` once for its helpers) — green unit and e2e tests do not
prove a dialog opens or a form submits.

1. `npm run dev` (web on `localhost:5173`, api on `localhost:8787` — the
   Worker with its local D1; apply migrations first with
   `npm run db:migrate`).
2. Open a **separate browser context** so the developer's own logged-in
   session and data are never touched:
   `ctx = cdp("Target.createBrowserContext")["browserContextId"]`, then
   `cdp("Target.createTarget", url="http://localhost:5173/", browserContextId=ctx)`
   and `switch_tab(<targetId>)`. Dispose it when done
   (`Target.disposeBrowserContext`).
3. Sign in with the QA account below. If it does not exist in the local
   database, sign up at `/sign-up` with tenant name `QA Household` and the
   same email and password (leave the tenant code empty).
4. Seed fixtures (accounts, categories, one-off charges) with
   `fetch('/api/<route>', {credentials: 'include', ...})` from the page —
   `/api` is the Vite proxy to the API, so the session cookie works.
   `POST /accounts` needs a `currency` (`BRL`, `USD`, `EUR`); a card also
   needs `type: 'Credit Card'`, `limit`, `closeDay`, `dueDay`. Drive the
   feature under test through the UI, not the API.
5. Take a screenshot (`capture_screenshot`) and read it after each step;
   read `[role=dialog]` `innerText` to assert content.

Driving the UI: get element positions from `getBoundingClientRect()` and use
`click_at_xy` — a synthetic `.click()` on base-ui `Select` triggers and
options does not open or pick them. Focus an input with a real click, call
`.select()`, then `type_text`. `MoneyField` is reverse-masked: typing
`120000` gives `1,200.00`. Row action buttons have `aria-label`s
(`Edit`, `Delete`, `Installment purchase`, `Split into installments`). If the
first click on a freshly rendered control does nothing, click it again.

**QA account (local development only, throwaway):**

- Email: `qa-installments-1@example.com`
- Password: `password-a`
- Tenant: `QA Household` (main currency BRL, timezone default)

Never reuse these anywhere but a local dev database.

## Pitfalls

- A row deletion once left the edit form open on the deleted item: any
  destructive row action must also clear the page's form state
  (`formOpen`/`editing`), not just its own dialog state.
- A companion control (color picker) placed left of its text field indented
  the label out of alignment with sibling fields: in a field row, the labeled
  text field goes first, the control after it — and the text input is
  `readOnly` so the control is the only source of the value.
- base-ui `Select` does not render the trigger's label for a value that was
  set while the popup was closed (a prefilled edit form showed the
  placeholder instead of the selection): render the label explicitly as
  `SelectValue` children (resolved from the same option list), do not rely
  on the `items`-derived label. `Select`/`RadioGroup` take generic
  `value`/`onValueChange` — numbers work at runtime, but the prop's default
  generic only admits strings, so cast at the boundary.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
