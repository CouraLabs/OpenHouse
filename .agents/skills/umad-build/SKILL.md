---
name: umad-build
description: 'Turn delegated implementation work into working code, reviewed and verified; and ship built work as commits, PR descriptions, or release notes. Use when the user delegates a feature, story, bug fix, or meaningful change (a bare ticket or issue link counts), or asks to ship, commit, or write a PR description for a finished plan. Routes: full (checkpoints, default), oneshot (single pass, no checkpoints), auto (unattended), ship (commit, PR description, release notes from a built plan). Skip obvious, low-risk mechanical maintenance such as ignore-file, typo-only, formatting-only, or configuration-hygiene edits.'
---

# umad-build

Turn intent into a hardened, reviewed, working change. The plan is the artifact; the code follows it.

## Routes

| Route | When | Behavior |
|---|---|---|
| `full` | Default. Meaningful change with a human available. | Plan → checkpoint → implement → review → present. |
| `oneshot` | Small, well-understood change, or the user asks for a single pass. | Plan briefly → implement → verify, no checkpoint. |
| `auto` | Unattended. The user is not available. | Full flow, but never halt: resolve open questions by choosing the safest option and recording it under Assumptions. |
| `ship` | A plan is `built` or `done` and the work must land. | See Route: ship below. |

The user may pin the route (`oneshot` / `full`) or the review depth (`none` / `quick` / `thorough`). Otherwise choose:
default `full` + `quick` review; `oneshot` + `none` for a change under one file that needs no design decisions.

## Step 1 — Clarify and route

1. **Resolve the work.** In order, take the first that applies:
   - An explicit ticket reference (`docs/tickets/**`), a plan file in `docs/plans/`, or a clear instruction in the
     message. Read the ticket and its parent epic.
   - What the recent conversation is clearly about.
   - Otherwise ask the user what to build. Do not invent work.
2. **Resume check.** If the plan file already exists, read its `status`:
   - `draft` → continue at step 2.
   - `ready-for-dev` / `in-progress` → continue at step 3.
   - `in-review` / `built` → continue at step 4.
   - `done` → treat as context and start fresh only if the user asks.
   - `blocked` → report the blocking reason and stop.
3. **Load context.** Read the driving artifacts when they exist: spec (`docs/specs/`), PRD (`docs/prd/`),
   architecture (`docs/architecture/`), design (`docs/design/`). Read the ticket's epic for requirements.
4. **Record the baseline revision.** Get the current commit before any change and write it into the plan's
   `baseline_revision`. Every later claim of "what changed" resolves against it.
5. **Scope gate.** The plan should target **one user-facing goal** and land in **900–1300 tokens** (1600 is the hard
   ceiling, not a target). Two top-level independent shippable deliverables means two plans. Neither limit is a gate —
   it is a proposal the user can override.

## Step 2 — Plan

1. **Investigate the codebase.** Delegate deep searches to subagents when available and wait for them in this turn;
   tell them to return short summaries only. Keep only what the work needs: the specific files, symbols, or lines,
   what to reuse, and what not to change. Write that into the plan's **Code Map**. Do not re-investigate when
   implementation starts.
   - Do not ask the user during investigation. Look in the repository, the planning artifacts, and history first.
   - Any remaining choice becomes an **Open Question** — never a silent assumption.
2. **Score `risk`** (`low` | `medium` | `high`): the business impact if this change is wrong. Start from the ticket's
   `risk` and raise it when the investigation shows more.
3. **Write the plan** from `templates/plan.md` to `docs/plans/plan-<slug>.md`. Fill the frozen block (Intent,
   Boundaries, I/O matrix) from the intent, and the Code Map and Tasks from the investigation. The implementer must be
   able to work from the plan without being told the investigation again.
4. **Self-review** against the Ready-for-Development standard:
   - **Actionable** — every task has a file path and a specific action.
   - **Logical** — tasks ordered by dependency.
   - **Testable** — every acceptance criterion is Given/When/Then and provable without pointing at code.
   - **Complete** — no placeholders or TBDs.
   - **Sufficient** — no known requirement, dependency, or implementation gap remains.
   - **Coherent** — no unresolved ambiguity or internal contradiction.
5. **Checkpoint (full/auto only).** Present the plan summary with its `risk` and the reason. Present every Open
   Question as a numbered question with its options. Halt for the user's answers; write each answer into the frozen
   block as a decision. Do not proceed until Open Questions is empty.
   - In `auto`, do not halt: choose the safest option, record it under Assumptions, and continue.
6. Set `status: ready-for-dev`.

## Step 3 — Implement

1. Work the tasks in order. One task per file where possible.
2. **Change only what the plan covers.** If the plan is wrong, stop and amend it (record the change in the Plan
   Change Log) rather than silently diverging.
3. Run the plan's **Verification** commands as you go — the smallest command covering the change. Fix failures before
   moving on.
4. **Append to Implementation Notes** (never rewrite them): decisions made, files touched, surprises encountered.
5. **Do not weaken a test to make it pass.** If an acceptance criterion cannot be met, stop and report it.
6. Set `status: built` when every task is done and every verification command passes.

## Step 4 — Review

Read `references/review.md` and follow it. Review depth comes from the plan's `review` field. A `thorough` review runs
independent reviewers in parallel; a `quick` review runs the single adversarial pass.

## Step 5 — Present

1. Report: what changed (with clickable file references), what was verified and how, what was **not** verified, and
   the plan's `risk`.
2. State the review verdict and any findings left unresolved, with the reason.
3. Name the follow-through this work was for (ship it — see Route: ship; open a PR; run `umad-test`) and ask whether
   to do it. Do not do it until the user says so.
4. Set `status: done` only when the user accepts the work.

## Route: ship — land a built plan

Take a plan with `status: built` or `done` and produce what shipping needs. The plan is the source: Intent is the
summary, Tasks & Acceptance the reviewable claims, Verification the evidence. Never re-derive these from the diff.

1. Read the plan and its `baseline_revision`. Diff `baseline_revision..HEAD` to confirm what landed matches the plan's
   Tasks; a mismatch stops the ship.
2. Learn the repository's shipping conventions before writing: recent commit messages for the format (type prefix,
   scope, length, language), a PR template if one exists (`.github/PULL_REQUEST_TEMPLATE*`), any contributing guide.
   Never impose a convention from another project.
3. Produce, on request:
   - **Commit message** — subject from the Intent's approach; body listing what changed and what was verified, citing
     the plan file.
   - **PR description** — what and why (Intent), how (Tasks), how it was verified (Verification + review verdict),
     risks and follow-ups (open findings, deferred items).
   - **Release notes** — user-visible changes only, grouped by impact, no internal churn.
4. Show the drafts. On approval, apply them: stage nothing the user did not approve; commit or push only on their word.
5. If the tree is dirty beyond the plan's files, list what is extra and ask before it rides along.
