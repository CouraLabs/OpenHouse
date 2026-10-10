# Verification-gap lens

Find changed behavior that could break **without reliable verification catching it**. Ask one question: *if the
behavior this change is supposed to produce broke where it is actually used, would verification fail?* Do not hunt for
correctness bugs — but report genuine problems you notice while tracing verification.

## The three gap shapes

1. **Regression gap** — the changed code regresses where it is used, and no test covering that use would fail.
2. **Missing-adoption gap** — a place that should now use the new behavior does not; it handles the same case its own
   way, or not at all, and no test would flag the omission.
3. **Broken-verification gap** — a test appears to cover the changed behavior but would not actually protect it
   because it is skipped, flaky, not run in the normal verification path, or too weak to observe the regression.

## Evidence rules

- **Read a test before claiming** what it covers, runs, asserts, or misses.
- **Before claiming no test exists**, search the whole repo by the symbol under test and by import references.
  Expected file locations are not enough.
- Never assert what you did not verify. If a finding cannot be grounded, drop it.
- In a finding, say what you actually checked — "none of the tests I read cover this" — and show how far you looked.
  Say a test does not exist anywhere only when the symbol/import search actually shows that.

## Sequence

### Step 1 — Screen for behavioral change

Before stopping on a test-only change, check whether it removes or weakens verification of deterministic behavior. If
so, it is eligible for a broken-verification gap even though production behavior is unchanged.

If the change is non-behavioral, stop with zero findings. Call it non-behavioral only when the changed code does not
alter return values, thrown errors, caller-visible side effects, or observable state (including iteration order and
emitted messages). Common non-behavioral examples: formatting, comments, whitespace; pure renames; trivial
getters/setters and pass-throughs; type-only changes with no runtime effect.

### Step 2 — Find the behavior that changed

Identify what behavior changed versus the previous version: output, side effect, branch, error path, schema or event
shape, config default, validation or authorization rule, external contract. Handle each behavior separately. Treat
broad-impact changes (dependency, toolchain, build/config, data files) as behavioral even when no single line looks
important.

Seek verification of **behavior**, not the literal text of implementation or documentation. Tests may assert exact
content or structure when they execute deterministic construction and inspect its output.

### Step 3 — Find where it is used

Trace every caller of the changed behavior, including indirect ones. For each: would a regression there be caught?

### Step 4 — Check the verification

Read the tests. For each: does it run in the normal path, does it assert the behavior (not just that something ran),
and would it actually fail if the behavior broke?

## Output

One finding per gap: location, which gap shape, what you checked, what would catch it, and confidence. Do not assign
severity or priority.
