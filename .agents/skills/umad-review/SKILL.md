---
name: umad-review
description: 'Review content through lenses and report triaged findings. Use when the user asks to review a diff, pull request, branch, commit range, file, or document — code or prose. Routes: code (adversarial + edge cases + verification gaps), doc (structure + prose), critique (pressure-test an idea or decision with elicitation methods). Never invoke uninvited, including on edits you just made.'
---

# umad-review

Review content through lenses — each a distinct method and stance — and report findings in one shape. Report what is
real; never pad to look thorough. An empty result is valid for most lenses.

## Routes

| Route | Content | Lenses |
|---|---|---|
| `code` (default for code) | diff, PR, branch, commit range, file | adversarial, edge-cases, verification-gaps |
| `doc` (default for prose) | spec, PRD, plan, ticket, README, any document | structure, prose |
| `critique` | an idea, plan, or decision | elicitation methods (`references/critique.md`) |

The user may name specific lenses; run exactly those. Otherwise classify the content (code vs docs) and run the
route's default set.

## Step 1 — Stage the content

- A branch, PR, or commit range → produce the unified diff against the merge base and read from that.
- Uncommitted work → include untracked files.
- A file or document → read it.
- Empty or undecodable → say what is wrong and stop; do not invent content to review.

If the change came with its own narrative (commit messages, a plan, a description), keep it separate and hand it only
to the edge-case lens — and only **after** its tracing is done, so the narrative cannot steer it.

## Step 2 — Run the lenses

Each lens sees the content and nothing of the other lenses' findings, so overlaps stay signal rather than
echo. When subagents are available, launch the independent lenses in parallel, one per lens, with this constraint:
*"Return ONLY your findings. Do not invoke any skill and do not spawn subagents of your own — you are the reviewer."*
Otherwise run them sequentially.

| Lens | Reference | Job |
|---|---|---|
| Adversarial | `references/adversarial.md` | Exhaust all eight attack categories; a short list must name what each category checked. |
| Edge-cases | `references/edge-cases.md` | Pure path tracing. Report only unhandled paths. |
| Verification gaps | `references/verification-gaps.md` | Changed behavior that could break without verification catching it. |
| Structure | `references/structure.md` | Sections that do not serve the document's purpose; buried or missing information. |
| Prose | `references/prose.md` | Sentence-level clarity: wordiness, ambiguity, passive drift, inconsistent voice. |

## Step 3 — Triage

For every finding, decide and record a verdict:

- **confirmed** — real, and worth acting on. Say what to do.
- **false** — refute it. Give the refutation, not an opinion.
- **maybe-false** — state exactly what would settle it.
- **deferred** — state why, and who owns it.

Triage is yours, not the lens's: the lenses report, you judge. Try to falsify your own findings before reporting them.
Never widen a standard to make a review look clean.

## Step 4 — Report

One table, ordered by severity then confidence:

| # | Severity | Location | Finding | Confidence |
|---|----------|----------|---------|------------|

Severity is `critical` / `high` / `medium` / `low`. Below the table, list the triage decisions for anything not
confirmed, and state what you checked and how far you looked. If a lens produced nothing, say so explicitly — silence
is not a result.

## Rules

- Only review when actually asked. A request to act on earlier feedback is a change, not a review.
- Do not fix anything during a review. Report; the user decides.
- Precision beats volume. A finding you cannot ground in the content is not a finding.
- Never claim a lens ran if it did not.
