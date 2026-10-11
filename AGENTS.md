## REFERENCES
- Turbo Monorepository read: **./AGENTS.turborepo.md**
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
      <feature>/               # a domain feature (auth/, tenants/, …):
        <feature>.module.ts    #   Nest module — wires the feature's providers
        <feature>.controller.ts#   routes: HTTP shape, status codes, DTO mapping
        <feature>.service.ts   #   business rules; may be split per concern (invite-code.service.ts)
        <feature>.schemas.ts   #   zod request schemas when shared between routes
  web/
    src/
      App.tsx                  # query client + router composition
      main.tsx                 # React root
      features/                # one directory per route/feature (sign-in/, sign-up/, main/)
        <feature>/             #   page + its forms + feature-local components/hooks
      components/
        ui/                    # shadcn-style primitives (generated code stays here)
        layout/                # shell/shared chrome: theme-provider, headers, shells
      lib/                     # transport and shared client logic: api.ts, auth.ts
packages/
  poco/                        # shared contracts: zod request schemas + wire DTO types.
                               #   The single source both api validation and web forms run.
  db/                          # schema, relations, DatabaseModule — the only schema owner
  ui/                          # shared design system consumed by web
```

### Rules for growing it

1. **Dependency direction.** `feature → common → (config, packages)`. A feature
   NEVER imports from another feature; anything two features need graduates to
   `common/` (or to `packages/` when a second app needs it). Importing another
   feature's internals is a design smell — extract the shared part instead.
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
   pre-emptively. Generated shadcn primitives always land in `components/ui/`.
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

When a section of this contract stops fitting (e.g. `common/` needs
sub-domain splitting, or web needs shared data-access layers), change the
contract here first, then the code — this file is the source of truth agents
navigate by.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
