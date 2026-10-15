## REFERENCES
- Turborepo: the agent-guidance block at the bottom of this file, plus the
  bundled docs inside the installed `turbo` package (`node -p
  "require.resolve('turbo/package.json')"` → `docs/README.md`).
- Dev-loop skills read: **./.agents/skills/umad/SKILL.md** (the `umad` skill set entry point)

## PROJECT STRUCTURE

This app **will grow substantially**. The tree below is the contract that keeps
growth orderly: every addition has one obvious home, and dependency directions
never invert.

```
apps/
  api/
    src/
      main.ts                  # bootstrap only: middleware, CORS, shutdown hooks
      app.module.ts            # composition root: wires modules and global guards
      app.controller.ts|spec   # health/root route
      config/                  # environment: env.ts validation, env.spec.ts
      common/                  # cross-cutting infrastructure — no domain logic
        session/               # Session type, Public/Roles/CurrentUser decorators, AuthGuard
        pipes/                 # generic request validation (ZodValidationPipe)
        search/                # fetch.helper.ts: buildPagedQuery, escapeLikePattern
      <feature>/               # a domain feature (auth/, tenants/, categories/, limits/):
        <feature>.module.ts    #   Nest module — wires the feature's providers; exports
                               #   a repository when another feature may need its rows
        <feature>.controller.ts#   routes: HTTP shape, status codes, DTO mapping (toWire)
        <entity>.repository.ts #   Drizzle queries: tenant passed explicitly, paged
                               #   search via buildPagedQuery, sortable-column whitelist
        <entity>.service.ts    #   business rules; may be split per concern (invite-code.service.ts)
        <entity>.service.spec.ts #  Vitest specs next to the code
  web/
    src/
      App.tsx                  # query client + router composition
      main.tsx                 # React root
      features/                # one directory per route/feature (sign-in/, sign-up/, main/,
                               # categories/, limits/): page, forms, columns, hooks
      components/
        layout/                # shell/shared chrome: theme-provider, headers, shells
                               # (shadcn primitives live in packages/ui/src/components)
      lib/                     # transport and shared client logic: api.ts, auth.ts, router.tsx,
                               # i18n.ts, format-money.ts, use-debounced-value.ts
      locales/                 # <locale>.json — every user-facing label (en-US.json today)
packages/
  poco/                        # shared contracts: zod request schemas + wire DTO types.
                               #   The single source both api validation and web forms run.
  db/                          # schema, relations, DatabaseModule — the only schema owner
  ui/                          # shared design system consumed by web
```

### Rules for growing it

1. **Dependency direction.** `feature → common → (config, packages)`. A feature
   NEVER imports another feature's internal files; anything two features need
   graduates to `common/` (or to `packages/` when a second app needs it). The
   one sanctioned crossing is module-level: a feature may import another
   feature's *module* to inject a repository that module exports (limits
   validates its categoryId through `CategoriesModule`'s exported
   `CategoryRepository`). Importing a sibling's service or internals directly
   is a design smell — extract the shared part instead.
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
   component to `components/` only when a second feature uses it — never
   pre-emptively. Generated shadcn primitives always land in
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
6b. **Money is a string end to end.** A `numeric` column maps to a string
   (`"12.34"`); poco validates the decimal shape with a regex; the web formats
   for display through `lib/format-money.ts` (USD fixed, separators from the
   i18next locale) and inputs it through `MoneyField` (packages/ui), whose
   reverse masking (digits typed are cents) is locale-aware. Money never
   crosses a float.
7. **Environment is read only in `config/`.** Feature code receives values via
   injection or module factories, never by calling `env.ts` helpers from deep
   inside a feature (the session guard is the sanctioned exception, as
   configuration consumed at guard-creation time).
8. **Tests sit next to their code** (`<name>.spec.ts`) and e2e specs in
   `apps/api/test/`. Vitest picks up both from any depth — moving files needs no
   config changes.
9. **One component per file.** Every React component lives in its own file
   (`<component>.tsx`); never stack multiple components in one file. Tiny
   single-use helpers used only by that component may stay inline, but anything
   exported is its own file.
10. **Reusable components go to `packages/ui`.** A component needed by more
    than one feature (or app) belongs in the shared design system, not in
    `apps/web/src/components/`.
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

<!-- BEGIN:umad-context -->
## Project rules

- Required-field markers follow the database: a form field carries the red `*`
  only when its column is NOT NULL, or the poco schema requires it
  unconditionally. Conditionally required pairs (tenant name XOR invite code)
  stay unmarked — their labels already say when each applies.

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

<!-- END:umad-context -->

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
