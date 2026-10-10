---
id: SPEC-{slug}
companions: []   # files downstream MUST read alongside spec-{slug}.md
sources: []      # files fully absorbed into this spec (audit only; downstream does NOT read these)
---

# {Spec Title}

## Why

{One paragraph naming the force behind this work. Name which applies — and who is affected, and the backdrop that
makes it matter now. This is the anchor every downstream trade-off resolves against:

- **a pain to solve** — a user or operator is stuck on a specific gap;
- **an opportunity to capture** — something newly possible we want to claim;
- **a vision to realize** — a thing we want to make exist because we want it to;
- **a mandate to meet** — a regulation, deprecation, deadline, or contractual obligation.}

## Capabilities

- **CAP-1**
  - **intent:** {One sentence. "User or system can do X to achieve Y." WHAT, not HOW.}
  - **success:** {Testable or demonstrable criterion — something a test or a real demonstration can decide.}

## Constraints

- {A non-negotiable that bends design. If it does not rule anything out, it does not belong.}

## Non-goals

- {Explicit out-of-scope item. At least one — it stops downstream from filling the vacuum.}

## Success signal

- {One or two sentences. The world-change moment, not a dashboard. Concrete enough to write a test against.}

## Assumptions

<!-- Optional. Omit entirely if empty. -->

- {Statement of fact the spec proceeded under.}

## Open Questions

<!-- Optional. Omit entirely if empty. Phrase so a human can answer. -->

- {Question, e.g. "Is offline playback in scope for CAP-2?"}
