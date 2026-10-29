# Porting guide: NestJS feature → Hono on Workers

This guide is for porting one API feature directory. **Read it fully, then read
the auth feature (the reference port) before writing anything.**

## The contract

- The app runs on Cloudflare Workers through **Hono**. `src/app.ts` is the
  composition root — you do NOT touch it (the integrator mounts your router).
- Every feature directory gets two new files:
  - `<feature>.deps.ts` — builds the feature's services from `(db, config,
    clock)` and answers `{ router }` (plus any port the feature implements).
  - `<feature>.routes.ts` — `new Hono<AppEnv>()` with the routes, mounted by
    app.ts under `/api/<feature-prefix>`.
- Repositories and services KEEP their roles; the Nest decorators go away.

## Read these first (the reference port)

- `src/auth/auth.routes.ts`, `src/auth/auth.deps.ts` — the pattern.
- `src/common/context.ts` — `AppEnv`, `App` (a `Hono<AppEnv>` sub-app).
- `src/common/errors.ts` — `BadRequestError`, `UnauthorizedError`,
  `ForbiddenError`, `NotFoundError`, `ConflictError`, `TooManyRequestsError`
  (the replacements of Nest's exceptions). `app.onError` maps them.
- `src/common/session/session.ts` — `Session`; handlers read
  `context.get('session')` (the auth middleware set it).
- `src/common/validation/parse.ts` — `parseJsonBody(context, pocoSchema)`
  replaces `@Body(new ZodValidationPipe(...))`; `parseQuery` for query strings.
- `src/common/session/auth.middleware.ts` — `requireRole(['owner'])` replaces
  `@Roles('owner')` (as a route-level middleware, before the handler).
- `src/common/ledger/*` — the batch ledger primitives (see below).
- `src/common/rate-limit.ts` — `limitRequest(env, 'credentials', addr)` where
  a controller had `@Throttle(...)`.

## Mechanical Nest → Hono rules

| Nest | Hono port |
| --- | --- |
| `@Injectable()` | delete |
| `@InjectDrizzle() private readonly db: Database` | plain constructor param `private readonly db: Database` |
| `@Inject(X) private readonly x: X` | plain constructor param |
| `NotFoundException('msg')` | `new NotFoundError('msg')` |
| `ConflictException('msg')` | `new ConflictError('msg')` |
| `ConflictException(structuredObject)` | `new ConflictError(structuredObject)` — the object rides as the response body |
| `BadRequestException(x)` | `new BadRequestError(x)` |
| `UnauthorizedException(x)` | `new UnauthorizedError(x)` |
| `ForbiddenException(x)` | `new ForbiddenError(x)` |
| `HttpException(msg, 429)` | `new TooManyRequestsError(msg)` |
| `@Controller('x')` + `@Get/@Post/@Put/@Patch/@Delete` | one `Hono<AppEnv>` with `router.get/post/put/patch/delete` |
| `@HttpCode(204)` | `context.body(null, 204)` |
| `@Body(schema)` | `await parseJsonBody(context, schema)` |
| `@Param('id', ParseIntPipe)` | `Number.parseInt(context.req.param('id'), 10)` |
| `@Query()` | `parseQuery(context, schema)` or `context.req.query()` |
| `@CurrentSession()` | `context.get('session')` |
| `@Roles('owner')` | `requireRole(['owner'])` middleware in the route chain |
| `@Res() response.cookie(...)` | `setCookie(context, ...)` from `hono/cookie` |
| module `providers/exports/imports` | gone — the deps builder wires constructors directly |

## Route inventory — preserve EXACTLY

Read the old controller file(s) and reproduce:

1. **Paths** — the controller's prefix + each route's path. app.ts mounts the
   router at the prefix; the router's own routes are the suffixes.
2. **Methods and status codes** — every POST answers **201** unless the old
   controller had `@HttpCode(200)` or `@HttpCode(204)`; PUT/PATCH answer 200;
   DELETE answers 200 or 204 exactly as the old controller did. The e2e
   specs assert these numbers.
3. **Response bodies** — the same wire shapes from `@workspace/poco` (the
   controllers' `toWire`/mapping code moves into the routes file or stays in
   services — whichever keeps it readable).
4. **Error payloads** — a 409 with a structured body (e.g. the reconciled-edit
   conflict) keeps that body: `new ConflictError(payload)`.

## The ledger (transactions, balances, installments)

D1 has no interactive transactions. The old `.transaction()` calls are gone —
`transaction.repository.ts` and `transaction-ledger.ts` are already ported to
the batch primitives (`LedgerBatchPlan`, `balanceDeltaStatement`,
`balanceSubselect`, `stampFor`, `auditedUpdateStatements`). If the feature you
port still calls a removed helper, port it to the plan APIs:
`planInsertGroup`/`planSoftDeleteGroup`/`planReplaceSplits` on
`TransactionRepository`, and compose per-row statements into one
`LedgerBatchPlan` that you `run` once.

## Money

Money columns store **integer cents** through the `money` custom type in
`@workspace/db` and answer **decimal strings** in TypeScript. Raw SQL that
formats cents uses `centsToDecimalSql(expression)` (import from
`@workspace/db`) — never a `::numeric` cast, never a float.

## Search

Case-insensitive search reads the `search_name` column (already in the
repositories): `like(column, likePattern(term))` — `ilike` does not exist.

## Spec files

- Replace Nest exception classes in assertions with the new error classes
  (`ConflictException` → `ConflictError`, …).
- A spec that built a Nest `Test.createTestingModule` constructs the service
  directly: `new Service(repo as unknown as Repository, …)` — see
  `auth/password-reset.service.spec.ts`.
- Services are constructor-injected; mocks are plain objects.

## Verify before you finish

From `apps/api`:

1. `npx tsc --noEmit` — clean (zero errors in the files you touched).
2. `npx biome lint . --write` — clean.
3. `npx vitest run src/<feature>` — every spec you own passes.
4. `npx vitest run` — you did not break another feature's specs.

Do NOT: edit `app.ts`/`index.ts`, add dependencies, or touch files outside
your feature directories + the specs within them.
