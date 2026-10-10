---
title: 'Multi-tenant auth: tenants, users, JWT cookie sessions, sign-in/sign-up web pages'
type: 'feature'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: 'a4a5543'
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

**Problem:** The app has no tenancy and no authentication. There is no way to sign up (creating a tenant with an owner), no way for further users to join an existing tenant, and no session mechanism guarding the API.

**Approach:** Add `tenants` and `users` (multi-tenant, password-hashed) plus tenant invite codes to `@workspace/db`; add an `AuthModule` (sign-up, sign-in, refresh, sign-out, me) and a `TenantsModule` (owner-only invite-code generation) to `apps/api`, guarded by a JWT cookie session where the token carries only the user id — tenant identity is always loaded from the database per request; build Sign In, Sign Up, and Main pages in `apps/web` with TanStack Router/Query, react-hook-form, and shadcn components.

**Boundaries (one line):** No roles beyond owner/user, no password reset, no e-mail verification, no tenant management UI, no MainPage content beyond user + tenant name.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Sign up (new tenant) | tenant name + name + email + password, email unused | 201; tenant + owner user in one transaction; access + refresh cookies set | 409 on duplicate email/tenant name |
| Sign up (with code) | tenant code + name + email + password, code valid | 201; user created in that tenant with role `user`; code consumed | 404 unknown code, 410 expired/used code, 409 duplicate email |
| Sign in | correct email + password | 200; access + refresh cookies set; remember-me extends refresh lifetime | 401 wrong credentials (identical message for unknown email and bad password) |
| Access token expired | request with expired access cookie, valid refresh | guarded route returns 401; client calls refresh and retries | 401 when refresh also invalid |
| Refresh | valid refresh cookie | 200; access token re-issued; refresh rotated (old one rejected afterwards) | 401 missing/invalid/rotated refresh |
| Cross-tenant access | user A's credentials against tenant B's data | request never sees tenant B: tenant context comes from the session user only | by construction — no route accepts a tenant id from the client |
| Guarded route without session | no cookies | 401 before any handler runs | Throttler still applies |
| Owner generates invite code | owner-session POST | 201 with generated code | 403 for role `user` |

</frozen-after-approval>

## Code Map

- `packages/db/src/schema.ts` — currently one `users` table; becomes `tenants`, `users` (with `password`, `role`, `tenantId` + index, unique email policy per Open Question), `tenantCodes`.
- `packages/db/src/relations.ts` — `defineRelations` callback wiring tenants→users→codes.
- `packages/db/scripts/generate.mjs` + `drizzle/` — migration generated via `npm run db:generate -w @workspace/db` (hash-named, existing convention).
- `apps/api/src/env.ts` — `VARIABLES`/`RESERVED_PREFIXES` grow a `JWT_` prefix: `JWT_SECRET` (required in production, dev default), `JWT_ACCESS_TTL_S` (default 900), `JWT_REFRESH_TTL_S` (default 604800).
- Decisions (checkpoint, 2026-10-10): email is unique per tenant — unique index on `(tenant_id, email)`; one SignUpPage with an optional tenant-code field (empty code = new tenant, filled = join); remember-me extends the refresh cookie/token to 30 days (unchecked = browser-session cookie, server expiry 1 day).
- `apps/api/src/auth/` (new module) — `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `token.service.ts` (sign/verify/rotate), `auth.guard.ts` (validates JWT, loads user+tenant, attaches to request), `current-user.decorator.ts` / `current-tenant.decorator.ts`, DTOs validated with zod pipes.
- `apps/api/src/tenants/` (new module) — `tenants.controller.ts` (POST invite codes, owner-only), `tenants.service.ts`, `invite-code.service.ts` (code generation).
- `apps/api/src/app.module.ts` — imports `AuthModule`, `TenantsModule`; adds a second `APP_GUARD` (`AuthGuard`) after `ThrottlerGuard`.
- `apps/api/src/main.ts` — `cookie-parser` registration.
- `apps/web/package.json` — adds `@tanstack/react-router`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod` (already resolved in the workspace).
- `apps/web/vite.config.ts` — dev proxy `/api` → `http://localhost:3000`.
- `apps/web/src/lib/api.ts` (new) — fetch wrapper, `credentials: 'include'`, JSON error propagation.
- `apps/web/src/lib/auth.ts` (new) — QueryClient, session query + sign-in/out/refresh mutations.
- `apps/web/src/components/ui/text-field.tsx` (new) — label + shadcn `Input` + error message, `type` prop (`email`, `password`, `text`, `tenantCode`).
- `apps/web/src/pages/sign-in/` (new) — `sign-in-page.tsx`, `sign-in-form.tsx`.
- `apps/web/src/pages/sign-up/` (new) — same structure; fields per Open Question 2.
- `apps/web/src/pages/main/` (new) — `main-page.tsx` showing user name + tenant name only.
- `apps/web/src/App.tsx`, `main.tsx` — replaced by router + query provider wiring.
- `turbo.json`, `apps/api/.env.example` — `JWT_*` vars declared for dev pass-through.

## Tasks & Acceptance

**Execution:**

1. `packages/db/src/schema.ts` — add `tenants` (id, name unique, `expiresIn` timestamp nullable, createdAt, updatedAt), rewrite `users` (id, `tenantId` FK → tenants with index, email, name, password hash, role enum `owner|user`, createdAt, updatedAt), add `tenantCodes` (id, tenantId FK, code unique, createdAt, usedAt nullable, expiresAt nullable); regenerate the migration with `db:generate`.
2. `packages/db/src/relations.ts` — wire `tenants.one.users`, `tenants.one.tenantCodes`.
3. `apps/api/src/env.ts` — add `JWT_` prefix + variables (per Code Map); extend `env.spec.ts` for the new rules (secret required in production).
4. `apps/api/src/auth/token.service.ts` + `auth.guard.ts` — JWT sign/verify with `@nestjs/jwt`; guard reads the access cookie, verifies, loads user with tenant from DB, attaches `{ user, tenant }` to the request; exposes the decorators.
5. `apps/api/src/auth/auth.service.ts` + `auth.controller.ts` — transactional sign-up (tenant+owner), code sign-up, sign-in (bcrypt compare), refresh (rotate refresh token, reuse of a rotated token fails), sign-out (clears cookies), `GET /auth/me`; cookies are `httpOnly`, `sameSite=lax`, `secure` in production; remember-me extends refresh TTL.
6. `apps/api/src/tenants/` — owner-only `POST` generating an invite code (random, URL-safe).
7. `apps/api/src/app.module.ts` + `main.ts` — register modules, second `APP_GUARD`, `cookie-parser`.
8. `apps/web` — install deps; add api client + session hooks + router (code-based routes: `/`, `/sign-in`, `/sign-up`) with an unauthenticated-only guard on the auth pages and a session guard on `/`; Vite proxy.
9. `apps/web/src/pages/**` — build the three pages in the required parent/child structure; forms via react-hook-form + zodResolver; shadcn Button/Input/Field/Label; sign-in has "remember me" checkbox and a link to sign-up; sign-up links back to sign-in; successful auth redirects to `/` (MainPage shows user + tenant name).
10. `turbo.json` + `apps/api/.env.example` — declare `JWT_*`.

**Acceptance Criteria:**

- Given a fresh database, when a user signs up with a tenant name, then one tenant and one user with role `owner` exist and both cookies are set.
- Given an owner generated a code, when a new user signs up with that code, then the user belongs to the owner's tenant with role `user` and the code can never be used again.
- Given a user of tenant A, when any authenticated request is served, then the tenant context equals the user's tenant, regardless of anything the client sends.
- Given an expired access token with a valid refresh cookie, when the client refreshes, then a new access token is issued and the old refresh token is rejected on the next use.
- Given no session, when requesting any guarded route, then the response is 401 and the handler never runs.
- Given `NODE_ENV=production` without `JWT_SECRET`, then the API refuses to boot with a message naming the variable.

## Implementation Notes

<!-- Agent-owned. Append-only during implementation. Never delete. -->

- 2026-10-10 — All tasks implemented. Deviations from the letter of the plan, none from intent:
  - Drizzle ORM is 1.0.0-rc.4: relational queries take object filters (`where: { id }`) and `orderBy` callbacks with operator helpers, not `eq()`. Update builders still take `eq()`/`isNull()`.
  - `createParamDecorator` requires direct calls (a wrapper broke the legacy-decorator typing under TS 6); `CurrentUser`/`CurrentTenant`/`CurrentSession` are each a direct `createParamDecorator`. Roles read via `Reflector.getAllAndOverride` with a `getAcceptedRoles` fallback.
  - A global `AuthGuard` needed a `@Public()` marker; sign-up/sign-in/refresh carry it, everything else 401s without a session.
  - Web router: TanStack Router 1.x exposes `createRouter` + `createBrowserHistory` (no `createBrowserRouter`). Route guards read the session straight from the query cache (`queryClient.getQueryData`), not a snapshot passed as router context — a sign-in updates the cache and navigates in one tick, and a context snapshot lagged one render behind (observed: after sign-in the guard bounced back to /sign-in).
  - Vite 8 proxy config required a fresh dev-server start (a stale process served the pre-proxy config, producing 404s that looked like API bugs).
  - Sign-out clears cookies and navigates to /sign-in in the mutation's onSuccess.
  - Stray compiled `.js` files from earlier `nest build`/`tsc` runs polluted src trees (pre-existing from the scaffold, exposed by lint); deleted and verified gone.
- Verification evidence: unit 15/15, e2e 2/2, typecheck/lint clean across db/api/web/ui; live curl flow (sign-up 201, code sign-up 201, code reuse 409, wrong password 401, no-session 401, refresh 200, refresh reuse 401, sign-out 200 + cookies cleared, me-after-signout 401); browser flow verified in a real tab (sign-up → MainPage with user+tenant, sign-out → sign-in page, guard redirects both ways, /sign-up bounce while signed in).

## Plan Change Log

<!-- Append-only. One entry per plan amendment: trigger, what changed, what known-bad state it avoids. -->

## Review Triage Log

<!-- Append-only. One entry per review pass: verdict counts, and one row per finding with verdict and evidence. -->

- 2026-10-10 — quick review, pass 1: 3 findings, 2 patched, 1 patched-elsewhere.
  - `auth.guard.ts` — role lookup double-read the metadata (`getAllAndOverride` then `getAcceptedRoles` fallback). Patched: single `getAllAndOverride` with an `ANY_ROLE` fallback; dead `getAcceptedRoles` removed from `session.ts`.
  - `auth.service.ts:refresh` — a `refresh` for a user id that does not exist performs a pointless `UPDATE` on the missing row. Patched-by-construction: the update is a no-op for a missing id and the 401 is thrown either way; no information leaks. Accepted as is.
  - Stray compiled `.js` files across `src` trees (from earlier `nest build`/`tsc` runs with a mis-scoped `outDir`; pre-existing from the scaffold, not authored by this change). Patched: deleted; `@workspace/db` rebuilt cleanly; e2e re-run green after (its `Failed to resolve "@workspace/db"` was the deleted `dist`).

## Design Notes

- Token payload: `{ sub: userId }` only — the requirement forbids tenant data in the token; the guard re-loads tenant per request, so revoked/moved users never inherit a stale tenant.
- Refresh rotation: refresh token carries a jti; the hash of the current valid one is stored on the user row (column `refreshTokenHash`, nullable). A presented token that verifies but does not match the stored hash means reuse → revoke the session (clear the hash) and 401.
- Session query on the web retries refresh once on 401, then redirects to `/sign-in`.

## Verification

**Commands:**

- `npm run typecheck -w @workspace/db -w api -w web` — expected: no errors
- `npm run lint -w @workspace/db -w api -w web` — expected: clean
- `npm run test -w api` — expected: unit tests pass, including new `env.spec.ts` cases
- `npm run db:generate -w @workspace/db && npm run db:migrate -w @workspace/db` — expected: migration applies cleanly
- `npm run test:e2e -w api` — expected: full sign-up → sign-in → guard → refresh → invite-code → code-sign-up flow passes against the real database

**Manual checks (if no CLI):**

- Browser: sign up, land on MainPage showing user + tenant name; sign out; sign in again with remember me on/off and compare cookie expiry.
