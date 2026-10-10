---
name: umad-test
description: 'Generate automated API and end-to-end tests for implemented features. Use when the user says "create qa automated tests for [feature]", "write e2e tests", "add API tests", or wants test coverage for a feature that was just built.'
---

# umad-test

Generate tests for implemented code. You **generate and verify tests only** — no code review, no feature changes. If
a test reveals a product bug, report it; do not fix the product.

## Discover the project's test setup

Before writing anything, discover how this repository tests. Never assume a runner, a command, or a layout from a
previous project.

1. Read the root `package.json` (or `pyproject.toml`, `Makefile`, etc.) for workspaces and test scripts. A monorepo's
   workspaces each own their runner and command — resolve the target workspace first.
2. Find existing tests by pattern (`*.spec.ts`, `*.test.ts`, `test/`, `__tests__/`) and read one or two to learn the
   framework, the assertion style, and the boot pattern (e.g. how an e2e test constructs the app). Follow that
   pattern — a test in a different style is a defect.
3. If the target workspace has no runner, say so and ask before adding one. Do not add a test framework unasked.

Record what you found and where, so the summary and the plan can cite it.

## Step 1 — Identify what to test

Ask the user, or infer from the request:

- A feature, controller, or service by name.
- A directory to scan.
- The change just built (read its plan in `docs/plans/`).

Read the implementation before writing anything. A test written without reading the code tests the author's
assumption, not the code.

## Step 2 — Choose the layer

- **API / service** → a unit test for the logic, or an e2e test for the HTTP contract — matching the file patterns the
  discovery step found.
- **UI** → a browser-driven e2e test. If no browser runner is installed, ask before installing one.

## Step 3 — Generate

**API tests** — cover:

- Status codes for the happy path and the error paths (400, 401, 403, 404, 409, 500 as applicable).
- Response shape: the fields the client depends on, not the whole payload.
- The happy path plus one or two critical error cases.
- Validation boundaries: missing, empty, wrong-type, and over-limit input.

**E2E tests** — cover:

- One user workflow end to end, from the user's entry point to a visible outcome.
- Semantic locators only (role, label, text) — never CSS classes or test ids that the UI can change freely.
- Assert **visible outcomes** the user would see, not internal state.
- Keep each test linear and short; one workflow per test.

## Step 4 — Rules

- Use the project's existing framework and patterns. Do not introduce a new assertion style.
- **No hardcoded waits or sleeps.** Wait for the observable condition.
- **Tests must be independent** — no order dependency, no shared mutable state between tests.
- **Assert behavior, not implementation.** A test that breaks on a safe refactor is a defect.
- Every test has a description that says what behavior it protects, in the user's language.
- A test must be able to **fail**: if it would pass with the feature deleted, it is not testing the feature.

## Step 5 — Run and verify

1. Run the tests with the workspace's command.
2. Fix failures you caused. If a test fails because the product is wrong, stop and report it — do not weaken the
   assertion to pass.
3. Prove each new test can fail: temporarily break the behavior (or reason explicitly about it) and confirm the test
   catches it. Report which tests you proved this way.
4. Run the full suite for the touched workspace to confirm nothing regressed.

## Step 6 — Summary

Write `docs/plans/test-summary-<slug>.md`:

```markdown
# Test Automation Summary: <feature>

## Generated tests
- [x] `apps/api/src/<path>.spec.ts` — <behavior protected>
- [x] `apps/api/test/<path>.e2e-spec.ts` — <workflow protected>

## Coverage
- Endpoints covered: N of M
- Workflows covered: N of M

## Verified
- Suite command: `…` — result: pass
- Falsification checks: <which tests were proved to fail when the behavior was broken>

## Gaps and next steps
- <uncovered behavior, and why it was left>
```
