# Build review

Review the change adversarially before presenting it. No noise, no filler. Report what is real; never pad to look
thorough.

## Depth

| `review` | What runs |
|---|---|
| `none` | Skip. Only allowed on the `oneshot` route, or when the user pins it. |
| `quick` | The adversarial pass below, by you. |
| `thorough` | The adversarial pass **plus** independent reviewers in parallel (below). |

## Adversarial pass

Work from the **diff**, not the whole repository.

1. **Read the diff** against the plan's Intent and Tasks & Acceptance.
2. **Edge-case hunt** — mechanically walk every branching path and boundary in the changed lines, not by intuition.
   For each: is it handled? Report **only unhandled** paths. Derive the edge classes from the content (missing
   `else`/default, unguarded input, off-by-one, overflow, implicit coercion, races, timeout gaps, handle lifetime,
   implicit branches of a fixed value set).
3. **Call-site check** — for every call the diff adds or changes (tests included), read the callee's declaration and
   check argument count, order, types, and defaults.
4. **Deletion check** — only when the diff removes meaningful code (ignore renames and whitespace): did the removed
   code carry behavior or a contract the change neither re-established nor intentionally retired? Report regressions,
   orphaned references, and newly-dead code.
5. **Claims check** — read the plan's Intent and Tasks & Acceptance **last**, after the tracing is done, so the claims
   cannot steer it retroactively. The plan is the change's own account of itself: testimony, not evidence. Extract each
   checkable claim and try to **falsify** it against the traced code. Verified claims produce nothing.

Each finding: `location`, `trigger_condition`, `what is wrong`, `what could go wrong`, `confidence`.

## Independent reviewers (thorough)

Launch these as parallel subagents, each with the diff and nothing else from this conversation. Ask each for findings
only, in the same shape.

| Reviewer | Job |
|---|---|
| **Edge-case hunter** | The edge-case hunt above, exhaustively. |
| **Verification gap** | What the change claims to do versus what the tests actually exercise. Name the untested paths. |
| **Regression** | What previously-working behavior this diff could break. Trace the callers of everything changed. |

## Triage

For every finding, decide and record a verdict: **patch** (fix it), **false** (refute it — give the refutation),
**maybe-false** (state what would settle it), or **defer** (state why and who owns it).

- Patch the high-confidence, consequential findings before presenting.
- A finding you cannot refute and cannot patch becomes an explicit open risk in the presentation — never silence.
- Record the pass in the plan's **Review Triage Log**: verdict counts and one row per finding with its verdict and
  evidence. Append; never edit earlier entries.

## Loop

If patching reveals the plan itself was wrong, amend the plan, append to the **Plan Change Log** (what triggered it,
what was amended, what known-bad state the amendment avoids), and re-run the review. Increment
`review_loop_iteration`. Never loop more than twice without telling the user why.
