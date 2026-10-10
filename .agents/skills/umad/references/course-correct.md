# Course correct — sprint change management

A significant change landed mid-flight (a new constraint, a wrong assumption, a discovered dependency). Assess its
impact across the project's artifacts and produce a Sprint Change Proposal the team can act on.

## 1. Capture the trigger

State the change in one paragraph: what changed, who raised it, and why it cannot wait. Get the user to confirm it
before analyzing impact.

## 2. Load the artifacts

Read, when they exist:

| Artifact | Where |
|---|---|
| Spec | `docs/specs/spec-*.md` and the companion files it lists |
| PRD | `docs/prd/prd-*.md` |
| Architecture | `docs/architecture/architecture-*.md` |
| UX | `docs/design/DESIGN.md`, `docs/design/EXPERIENCE.md` |
| Tickets | `docs/tickets/` |
| Agent rules | `AGENTS.md` (the umad-context block) |

## 3. Assess impact, artifact by artifact

For each artifact, record: **affected?** (yes/no), **what changes**, and **who must approve**. Walk this checklist:

- [ ] Spec — does a capability, constraint, non-goal, or success signal change?
- [ ] PRD — do requirements or acceptance criteria change?
- [ ] Architecture — does an invariant, boundary, or ownership rule change?
- [ ] UX — does `DESIGN.md` or `EXPERIENCE.md` change?
- [ ] Tickets — which are invalidated, need re-scoping, or are newly required?
- [ ] In-flight work — what is already built that this invalidates?

Say "no impact" explicitly for each; silence is not an assessment.

## 4. Write the proposal

`docs/plans/change-<slug>.md`:

```markdown
# Sprint Change Proposal: <title>

## Trigger
<what changed and why it cannot wait>

## Impact
| Artifact | Affected | What changes | Approver |

## Proposed changes
1. <change> — <rationale> — <owner>

## Work impact
- Invalidated: <tickets/PRs/commits>
- New work: <tickets to create>
- Unchanged: <what the change does not touch>

## Risks and rollback
<what could go wrong, and how to undo>

## Decision needed
<the specific call the user must make, with options>
```

## 5. Hand off

Present the proposal, get the user's decision, then route: create or re-scope tickets via `umad-ticket`, update the
spec/architecture/UX via `umad-define` or `umad-ux`, and resume work via `umad-build`. Do not edit any artifact until
the user approves the proposal.
