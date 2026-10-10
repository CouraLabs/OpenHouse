# Retrospective

Review a finished body of work (an epic, a milestone, a range of commits) against the evidence it left behind, and
produce a retrospective with sourced findings, action items, and an acceptance decision.

**Rule:** every finding carries a source reference (file, line, commit, or log). A claim you cannot point at is not a
finding — drop it.

## Inputs

Resolve the target from the invocation, or ask which epic/milestone to retro. Then gather the record:

| Input | Where | Use |
|---|---|---|
| Epic/ticket files | `docs/tickets/` | what was planned and what state each item reached |
| Plans | `docs/plans/` | the intended approach per item |
| Diffs and commits | version control, between each plan's baseline and the final state | what was actually built |
| Spec / PRD / architecture / UX | `docs/specs/`, `docs/prd/`, `docs/design/` | intended vs as-built |
| Previous retro | `docs/retros/` | whether last time's action items landed |

An item is finished when its ticket is `done` or `dropped`. Before analyzing, list anything unfinished and ask
whether to retro an incomplete body of work. Record the answer (or the assumption) in the document.

## Working state

The retrospective document **is** the working artifact, not just the output. Create it as a skeleton up front, then
write each phase's result into it as you finish. Resuming means re-reading the file: if it exists, reconcile its
recorded state against current evidence (current evidence wins) and resume at the first incomplete phase.

Document: `docs/retros/<target>-retrospective.md`, with sections: Epic summary · Evidence inventory · Findings ·
Dispositions · Verdict · Action items · Assumptions.

## Phases

### 1. Gather

Enumerate what was actually produced and record what is missing. For each later analysis, declare what it needs; when
the evidence is absent, record the narrowed scope, so a reader can tell "checked and clean" from "never checked".

### 2. Analyze

Produce findings, each with a source reference, from these angles:

- **Aggregate views** — defects no single diff hunk shows: architecture drift, duplication, god-class growth, pattern
  divergence, spec-to-implementation reconciliation.
- **Diff-scope review** — delegate to `umad-review` on the relevant range rather than reimplementing review.
- **Process** — from commits, plans, and session records: rework, dead ends, review churn. Note the gap when session
  records are absent.

### 3. Team discussion (optional)

Only if the user opts in. Run a short roundtable (`umad` party route) over the findings to surface angles the report
alone misses. Record what the discussion changed.

### 4. Verdict and action items

Judge the work against the criteria it set for itself (its spec's success signal, its ACs). Emit:

Every assumption made without the user is recorded in the Assumptions section so the audit trail survives.

## Close — feed the learning back

When a finding is a process mistake an agent made (rework churn, a review class that keeps recurring, a plan that
repeatedly missed the same gap), offer it as a **Pitfall** for the `AGENTS.md` managed block via the `umad` context
route — the loop should get harder to make the same mistake in. The user decides; write nothing unasked.
