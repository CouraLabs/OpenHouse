---
title: 'poco: shared contracts package for api and web'
type: 'refactor'
ticket: ''
created: '2026-10-10'
status: 'built'
baseline_revision: 'a4a5543'
route: 'oneshot'
risk: 'medium'
review: 'quick'
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** The shapes the API and web exchange are declared twice — API DTOs
(`SessionResponse`, `InviteCodeDto`), web interfaces (`Session`, `SignInInput`,
`SignUpInput`) — and the zod request schemas live only in the API, so the web
re-implements sign-in/sign-up validation by hand. Drift between the two sides is
currently possible and uncaught.

**Approach:** Create `packages/poco` (`@workspace/poco`), a compiled internal
package holding the shared plain-old contracts: zod request schemas (single
source for both the API's validation pipe and the web's form resolvers) and the
response/DTO types both sides code against. Rewire `api` and `web` to import
from it.

**Boundaries (one line):** No route, form behavior, or error-message changes;
form-specific UX validation (empty-string checks) stays in the web forms.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| API validates sign-up body | schema from poco via ZodValidationPipe | same accepted/rejected bodies as before | identical 400 issues shape |
| Web validates sign-up form | zodResolver over poco schema + form-only wrapper | same fields, same UX messages, same exclusivity rule | unchanged |
| API serializes session | typed against poco `SessionResponse` | same JSON shape as before | — |
| Web types session/hooks | imports poco `Session` | same inference as before | — |

</frozen-after-approval>

## Code Map

- **`packages/db`** — the compiled-package pattern to copy: `type: module`,
  `exports` → `./dist`, `tsc -p tsconfig.build.json` build, `rootDir: src`,
  nodenext. Its `@nestjs/*` peer deps show how runtime deps stay minimal.
- **`apps/api/src/auth/auth.schemas.ts`** — `signUpSchema`, `signInSchema`
  (+ shared `password` rule) move to poco; API re-imports them.
- **`apps/api/src/auth/auth.service.ts:14-37`** — `PublicUser`/`PublicTenant`
  have `Date` fields; the wire format has strings (`web/lib/api.ts` `Session*`).
  Poco defines the **wire** types (`SessionUser`/`SessionTenant`/`SessionResponse`
  with ISO string dates); the API's internal `PublicUser`/`PublicTenant` (Date)
  stay in the service, and `sessionResponse` maps them.
- **`apps/api/src/tenants/tenants.controller.ts:15`** — `InviteCodeDto` moves to
  poco as `InviteCode` (wire: string|null dates).
- **`apps/api/src/tenants/tenants.controller.ts:20`** — `createCodeSchema`
  (invite-code body) moves to poco as `createInviteCodeSchema`.
- **`apps/web/src/lib/api.ts:5-26`** — `SessionUser`/`SessionTenant`/`Session`
  move to poco (unchanged shapes); `ApiError` and `api()` stay in web (client
  transport concern).
- **`apps/web/src/lib/auth.ts:36-55`** — `SignInInput`/`SignUpInput` replaced by
  poco `SignInBody`/`SignUpBody` (schema infer types).
- **`apps/web/src/features/sign-in/sign-in-form.tsx:10-13`** — form schema
  becomes a poco-schema-based wrapper: fields carry UX messages, `rememberMe`
  required for the form, output narrows to `SignInBody` shape.
- **`apps/web/src/features/sign-up/sign-up-form.tsx:14-29`** — same approach;
  wrapper keeps empty-string UX rules and `path: ['tenantCode']`; submit body
  already maps to `SignUpBody`.
- **Vitest configs** include `**/*.spec.ts` package-wide — poco schemas can be
  covered by API tests via imports; no config change needed for poco itself.
- **`turbo.json`** `build.outputs: ["dist/**"]` already covers a new compiled
  package; `dependsOn: ["^build"]` orders poco before apps once both depend on
  it.

### Design decisions

1. **Compiled package (like `db`), not just-types (like `ui`).** Schemas are
   runtime code; the web must bundle them. `tsc → dist`, exports point at dist
   with types alongside — the db pattern verbatim.
2. **Wire types, not ORM-adjacent types.** Poco mirrors what crosses HTTP:
   dates as ISO strings. The API's Date-based internal types are separate;
   `sessionResponse` remains the mapping point. This keeps poco free of db
   imports (web never pulls drizzle).
3. **One rule lives in one place.** `exactly one of tenantName/tenantCode`
   exists in the poco schema; the web form wrapper keeps only UX-only rules
   (empty-string messages) and delegates the exclusivity check via
   `.superRefine` on the shared rule — the shared rule is imported, not copied.
4. **Naming:** request bodies `SignUpBody`/`SignInBody`/`CreateInviteCodeBody`
  (schema outputs); responses `SessionResponse`, `InviteCode`. Schemas
  `signUpSchema`, `signInSchema`, `createInviteCodeSchema`.

## Tasks

1. Create `packages/poco`: `package.json` (name `@workspace/poco`, compiled
   build like db, zod ^4.6.5 dependency), `tsconfig.json`/`tsconfig.build.json`,
   `src/index.ts` barrel.
2. Write `src/auth.ts`: `signUpSchema`/`signInSchema` (moved verbatim from
   `auth.schemas.ts`) + infer types `SignUpBody`, `SignInBody`.
3. Write `src/tenants.ts`: `createInviteCodeSchema` + `CreateInviteCodeBody`;
   `InviteCode` type.
4. Write `src/session.ts`: `SessionUser`, `SessionTenant`, `SessionResponse`
   (wire shapes from web `lib/api.ts`, renamed per decision 4).
5. Rewire **api**: `auth.schemas.ts` deleted, controller imports
   schemas/types from poco; `auth.service.ts` types `SessionResponse` from poco
   (internal `PublicUser`/`PublicTenant` stay; `sessionResponse` returns poco
   type, mapping `Date → toISOString()`); tenants controller imports
   `InviteCode`, `createInviteCodeSchema` from poco; add `@workspace/poco` dep;
   `npm install`.
6. Rewire **web**: `lib/api.ts` session interfaces removed, import from poco;
   `lib/auth.ts` input types → poco body types; form schemas rebuilt on poco
   schemas; add `@workspace/poco` dep.
7. Update `AGENTS.md` PROJECT STRUCTURE: add `packages/poco` to the tree and a
   growth rule (contract-first: request/response shapes live in poco).

## Verification

- `npm run build -w @workspace/poco` — compiles clean. ✅ observed
- `npm run test -w api` — 15/15 pass. ✅ observed
- `npm run test:e2e -w api` — 2/2 pass (guard + error shape unchanged). ✅ observed
- `npm run build -w web` / `tsc -b` — poco imports resolve. ✅ observed
- `npx turbo run build` — 4 tasks successful, poco builds before apps. ✅ observed
- Throwaway smoke script against `poco/dist`: sign-up accept/both-reject/
  none-reject/short-password-reject, sign-in `rememberMe` default + bad-email
  reject, invite-code body accept/reject, shared predicate truth table. ✅ observed

## Implementation Notes

- Package created compiled (db pattern): `type: module`, exports → `./dist`,
  `tsc -p tsconfig.build.json`, zod as sole runtime dependency.
- Wire-type decision: poco `SessionResponse` carries ISO string dates; API's
  internal `PublicUser`/`PublicTenant` (Date) stay in `auth.service.ts`, and
  `sessionResponse`/`me` now map `Date → toISOString()`. The `me` route
  previously passed the guard's Date-based session straight through — it now
  maps explicitly. JSON responses are unchanged (Nest already serialized the
  Dates to ISO); only the type contract tightened.
- First approach reused the refine predicate via `signUpSchema._def.checks[0]`
  (zod internals, fragile); replaced by exporting `hasExactlyOneTenantField`
  from poco and calling it from the web form's `superRefine`.
- `lib/api.ts` re-exports poco's `SessionResponse` as `Session` — downstream
  imports (`lib/auth.ts`, `App.tsx`) unchanged.
- Verification: poco build; turbo build (4 tasks, poco ordered before apps);
  api unit 15/15, e2e 2/2; web `tsc -b` clean + vite build; biome clean;
  throwaway smoke script asserting sign-up/sign-in/invite-code schema behavior
  (accept/reject/default) against `poco/dist` — all passed.
- AGENTS.md: `poco` added to the packages tree; new rule 6 (contract-first);
  rule 1 extended with poco's zero-dependency position.

## Plan Change Log

- 2026-10-10: user review — `SignInInput`/`SignUpInput` alias types in
  `lib/auth.ts` removed; hooks take poco `SignInBody`/`SignUpBody` directly.
  Rule 6 of AGENTS.md now bans re-exporting poco types under local names.
- 2026-10-10: sweep — remaining aliases removed: `api.ts` no longer re-exports
  `SessionResponse as Session`; `lib/auth.ts` and `App.tsx` import
  `SessionResponse` from poco directly (the `ApiSession` alias dropped).
