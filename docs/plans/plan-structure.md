---
title: 'Project structure: common/, config/, web features/'
type: 'refactor'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: 'a4a5543'
route: 'oneshot'
risk: 'low'
review: 'none'
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** `auth/` mixes the sign-up/sign-in feature with app-wide session
infrastructure: `AuthGuard` is a global `APP_GUARD` and `session.ts` exports
decorators that `tenants/` imports. Every future module would reach into a
sibling feature for plumbing, inverting the dependency direction. The web app
has no convention for where features vs. shared components live.

**Approach:** Move cross-cutting API code to `src/common/` (session decorators
and guard, zod pipe) and env handling to `src/config/`. Move web `pages/` to
`features/` (feature = page + its forms), and put `theme-provider` under
`components/layout/`. Then write the structure — and the rules for growing it —
into `AGENTS.md`.

**Boundaries (one line):** No behavior changes, no new modules, no renaming of
public API surface; web `lib/` stays as is.

## I/O & Edge-Case Matrix

Not applicable — structural refactor with unchanged behavior. Verification is
"all existing tests and builds still pass".

</frozen-after-approval>

## Code Map

- `apps/api/src/session.ts` — `Session`, `Public`, `Roles`, `CurrentUser`,
  `CurrentTenant`, `CurrentSession`, `isPublic`, `AuthenticatedRequest`. Used by
  guard, auth controller, tenants controller. Moves to `common/session/`.
- `apps/api/src/auth/auth.guard.ts` — global guard; imports `env.js` (→
  `config/env.js`), `session.js` (→ `common/session/`), `token.service.js`
  (stays in `auth/`). Moves to `common/session/` and is re-exported or imported
  directly by `AuthModule`/`AppModule`.
- `apps/api/src/auth/zod-validation.pipe.ts` — generic; used by auth and
  tenants controllers. Moves to `common/pipes/`.
- `apps/api/src/env.ts` + `env.spec.ts` — move to `config/`. Importers:
  `main.ts`, `app.module.ts`, `auth.service.ts`, `auth.guard.ts`,
  `token.service.ts`.
- `apps/api/src/auth/auth.module.ts` — providers `AuthService, TokenService,
  AuthGuard`; exports `AuthGuard, TokenService`. Guard moves out; module keeps
  providing it (Nest resolves the class wherever it lives) and `app.module.ts`
  imports it from `common/session/`.
- `apps/web/src/App.tsx` — imports `@/pages/sign-in/sign-in-page.js`,
  `@/pages/sign-up/sign-up-page.js`, `@/pages/main/main-page.js`. Update to
  `@/features/…`.
- `apps/web/src/main.tsx` — imports `@/components/theme-provider.tsx`. Update
  to `@/components/layout/theme-provider.tsx`.
- `apps/web/src/pages/**` — three directories, each page + form. Move intact.
- Vitest configs include `**/*.spec.ts` from the package root — new file
  locations are picked up without config changes. `tsconfig.build.json` has
  `rootDir: ./src` — unchanged, moves stay inside `src/`.

## Tasks

1. `apps/api`: `git mv src/env.ts src/config/env.ts` and
   `git mv src/env.spec.ts src/config/env.spec.ts`; update the five importers
   to `../config/env.js` / `./config/env.js`.
2. `apps/api`: `git mv src/auth/session.ts src/common/session/session.ts`,
   `git mv src/auth/auth.guard.ts src/common/session/auth.guard.ts`,
   `git mv src/auth/zod-validation.pipe.ts src/common/pipes/zod-validation.pipe.ts`.
3. `apps/api`: fix moved files' relative imports (guard: `../../config/env.js`,
   `./session.js`, `../auth/token.service.js`); update auth controller/service,
   tenants controller to import pipe from `common/pipes`, session from
   `common/session`.
4. `apps/api`: `app.module.ts` — import `AuthGuard` from `common/session/`,
   keep `APP_GUARD` registration unchanged.
5. `apps/web`: `git mv src/pages src/features`; update `App.tsx` imports;
   `git mv src/components/theme-provider.tsx src/components/layout/`; update
   `main.tsx`.
6. Verify (below), then write the `AGENTS.md` structure section.

## Verification

- `npm run build -w api` (nest build / tsc) — zero errors after rewiring.
- `npm run test -w api` (unit, incl. moved `env.spec.ts`).
- `npm run test:e2e -w api` — guard behavior unchanged.
- `npm run build -w web` (tsc -b + vite) — imports resolve.

## Implementation Notes

- Files were untracked (feature branch work in progress), so plain `mv` was used
  instead of `git mv` — git status shows the new paths as untracked either way.
- `env.spec.ts` needed no import change (`./env.js` still correct inside
  `config/`).
- Verification: api build (nest build), 15 unit tests, 2 e2e tests, web build
  (tsc -b + vite) — all pass; biome check clean on restructured files.
- AGENTS.md gained a `## PROJECT STRUCTURE` section with the tree and seven
  growth rules; the turborepo managed block below it was left untouched.

## Plan Change Log

- (none)
