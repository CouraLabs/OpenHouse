---
name: umad-define
description: 'Turn an idea into a decision-grade artifact. Use when the user wants to brainstorm, pressure-test or forge an idea, research a topic to support a decision, write or refine a product brief, run a PRFAQ / Working Backwards exercise, write or validate a PRD, distill anything into a spec, or record architecture decisions. Routes: ideate, forge, research, brief, prfaq, prd, spec, architecture.'
---

# umad-define

Turn vague intent into an artifact the rest of the dev loop can build from. Be a coach, not a ghostwriter: ask, do
not assume; make the user do the thinking, then capture it precisely.

## Routes

Pick the route from what the user asked for. If ambiguous, ask which they want — one question.

| Route | Output | Reference |
|---|---|---|
| `ideate` | A pile of better ideas on a topic | `references/ideate.md` |
| `forge` | A pressure-tested idea (optional short brief) | `references/forge.md` |
| `research` | `docs/research/research-<slug>.md`, or a research prompt | `references/research.md` |
| `brief` | `docs/specs/brief-<slug>.md` | `templates/brief.md` |
| `prfaq` | `docs/prd/prfaq-<slug>.md` | `templates/prfaq.md` |
| `prd` | `docs/prd/prd-<slug>.md` | `templates/prd.md` |
| `spec` | `docs/specs/spec-<slug>.md` + companions | `templates/spec.md` |
| `architecture` | `docs/architecture/architecture-<slug>.md` | `templates/architecture.md` |

`<slug>` is the artifact's title in kebab-case. Check the target path is unused before writing; if it exists, load it
and treat this as an update.

## Universal rules

1. **Ask before you assume.** One question at a time for a conversation; a short numbered batch when the user asks you
   to go fast. Never invent a decision and bury it — record it under **Assumptions**.
2. **Right-size.** Match rigor to the user's stated need. A hobby CLI does not need a stakeholder PRD.
3. **Show before writing.** Present the artifact (or its outline) and get a yes before writing the file.
4. **Never fabricate.** No invented market data, no invented moats, no invented constraints. If you do not know, write
   an Open Question.
5. **Reuse upstream artifacts.** If a spec, PRD, or architecture already exists, read it and build on it instead of
   restating it.
6. **Interviews are resumable.** For a multi-turn interview (prd, spec, architecture, brief, prfaq), keep a working
   file `docs/specs/.draft-<slug>-interview.md` recording every settled answer as it lands. A session that dies
   mid-interview resumes by re-reading it: reconcile its record against the conversation (the conversation wins for
   the current session), then continue at the first unanswered question. Delete the file when the artifact is written.

## Route: ideate

Read `references/ideate.md`. Run a brainstorming session in one of three stances (facilitator, creative partner, or
ideate-for-me), chosen by the user.

## Route: forge

Read `references/forge.md`. Pressure-test a half-formed idea through questioning until the user can act on it or drop
it with confidence.

## Route: research

Read `references/research.md`. Draft a research prompt, process a finished report into a cited summary, or run the
research here.

## Route: brief

1. Ask the user for the raw material and their purpose for the brief.
2. Coach them through the sections in `templates/brief.md`. Adapt aggressively: drop sections that do not earn their
   place, add ones the product needs.
3. Push hardest where assumptions are unexamined. Surface what is unknown alongside what is known.
4. Show the brief, get approval, write `docs/specs/brief-<slug>.md`.

## Route: prfaq

Read `templates/prfaq.md`. Work backwards from the finished product:

1. Draft the press release first — headline, subheadline, problem, solution, how it works, a user quote.
2. Then the **Customer FAQ** — hardest customer question first, honest answers.
3. Then the **Internal FAQ** — feasibility, risks, cost, dependencies.
4. If you cannot write a compelling press release, say so: the concept is not ready. That is a valid outcome.
5. Show the PRFAQ, get approval, write `docs/prd/prfaq-<slug>.md`.

## Route: prd

1. Read `templates/prd.md` fully before starting.
2. Interview the user: vision, target user and jobs-to-be-done, the user journeys that matter.
3. Build the **Glossary** first. Every domain noun is defined once and used verbatim everywhere after; introducing a
   synonym is a defect.
4. Write features with globally numbered functional requirements (`FR-1`…). Each FR states testable consequences and
   its out-of-scope bounds.
5. Tag every inferred statement inline as `[ASSUMPTION: …]` and index the assumptions.
6. If a UX or architecture artifact already exists, reference it — do not duplicate it.
7. Show the PRD, get approval, write `docs/prd/prd-<slug>.md`.

## Route: spec

The spec is the canonical contract downstream skills consume. Keep it short.

1. Read `templates/spec.md` fully before starting.
2. Distill the input (idea, brief, PRD, transcript, notes, mockups) into the **five-field kernel**: Why, Capabilities
   (each with a testable success criterion), Constraints, Non-goals, Success signal.
3. Move load-bearing detail that would bloat the kernel into companion files beside it, and list them in the
   `companions:` frontmatter.
4. Record unresolved gaps as **Open Questions** phrased so a human can answer them. Never silently pick an answer.
5. Show the spec, get approval, write `docs/specs/spec-<slug>.md` plus companions.

## Route: architecture

1. Read `templates/architecture.md` fully before starting.
2. Record only the **invariants**: the calls a future builder cannot read off compliant code — the design paradigm,
   boundary and dependency rules, how state is mutated, who owns shared data. Stack, file tree, and full data shapes
   are *seed*: true at cold-start, owned by the code once it exists. Keep the seed minimal.
3. Lead with a named paradigm — it carries a whole model for free.
4. One block per decision (`AD-1`, `AD-2`, …), each with **Binds**, **Prevents**, and an enforceable **Rule**. Tag
   `[ADOPTED]` when existing reality already settled it.
5. Include the dependency-direction rule as a mermaid diagram — it is a rule, not decoration.
6. Show the spine, get approval, write `docs/architecture/architecture-<slug>.md`.
