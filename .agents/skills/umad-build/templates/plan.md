---
title: '{title}'
type: 'feature'      # feature | bugfix | refactor | chore
ticket: ''           # ticket id or story file stem; empty outside the tree
created: '{date}'
status: 'draft'      # draft | ready-for-dev | in-progress | in-review | built | done | blocked | dropped
baseline_revision: '' # the commit the work starts from, recorded before any change
route: ''            # oneshot | full | auto
route_source: ''     # pinned | auto
risk: ''             # low | medium | high
review: ''           # none | quick | thorough
review_source: ''    # pinned | auto
review_loop_iteration: 0
context: []          # optional: project-wide docs the implementer should load. Keep short.
---

<!-- Target 900–1300 tokens; above 1600 risks context rot. Never over-specify "how" — use boundaries and examples.
     Cohesive cross-layer changes (DB + API + UI) stay in ONE plan. Remove these comments when filling. -->

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** ONE_TO_TWO_SENTENCES

**Approach:** ONE_TO_TWO_SENTENCES

## Boundaries & Constraints

**Always:** INVARIANT_RULES

**Never:** NON_GOALS_AND_FORBIDDEN_APPROACHES

## I/O & Edge-Case Matrix

<!-- Delete if no meaningful I/O scenarios exist. Do not write "N/A". -->

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | INPUT | OUTCOME | No error expected |
| ERROR_CASE | INPUT | OUTCOME | ERROR_HANDLING |

</frozen-after-approval>

## Code Map

<!-- Filled during planning. Annotated paths prevent blind codebase searching. -->

- `FILE` -- ROLE_OR_RELEVANCE

## Tasks & Acceptance

**Execution:**

- [ ] `FILE` -- ACTION -- RATIONALE

**Acceptance Criteria:**

- Given PRECONDITION, when ACTION, then EXPECTED_RESULT

## Implementation Notes

<!-- Agent-owned. Append-only during implementation. Never delete. Leave empty at planning time. -->

## Plan Change Log

<!-- Append-only. One entry per plan amendment: trigger, what changed, what known-bad state it avoids. -->

## Review Triage Log

<!-- Append-only. One entry per review pass: verdict counts, and one row per finding with verdict and evidence. -->

## Design Notes

<!-- Only when non-obvious. Keep examples to 5–10 lines. Delete otherwise. -->

## Verification

**Commands:**

- `COMMAND` -- expected: SUCCESS_CRITERIA

**Manual checks (if no CLI):**

- WHAT_TO_INSPECT_AND_EXPECTED_STATE
