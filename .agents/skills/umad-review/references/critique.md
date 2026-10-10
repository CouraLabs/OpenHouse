# Critique — pressure-test an idea, plan, or decision

Apply elicitation methods to the target — the most recent output (a section, plan, draft, or decision) unless the user
points at something else. Hand back the improved version so the work continues exactly where it paused.

## Step 1 — Fix the target

Name what is being critiqued in one line and confirm with the user. If they want to critique something else, take that.

## Step 2 — Offer the menu

Pick five methods that attack the target from **different angles** (see the catalog below). Present them by name. The
user may pick one or several, or:

- **Reshuffle** — replace the list with five new options.
- **List all** — show the full catalog.
- **Proceed** — no further elicitation; the current version stands.

## Step 3 — Run each chosen method

Scale depth to the target: a paragraph gets a light pass, an architecture decision gets the full treatment. Each
application works on the current version, so refinements compound. Show what the method revealed and the changes it
proposes, then stop and let the user choose:

- **Apply** — accept the proposed changes.
- **Reject** — drop the proposal entirely.
- **Direction** — apply their instruction and offer the menu again.

**Never change the work unless the user accepts the proposal.** After a run, offer the menu again.

## Method catalog

Pick by category, then by fit.

**Core reasoning**
- **First Principles Analysis** — strip assumptions, rebuild from fundamental truths.
- **5 Whys** — drill to the root cause by asking why repeatedly.
- **Socratic Questioning** — targeted questions that reveal hidden assumptions.
- **Second-Order Thinking** — anticipate cascading consequences.
- **Inversion Analysis** — ask what would guarantee failure.
- **Problem Decomposition** — split into independent sub-problems.
- **Steelmanning** — build the strongest version of the opposing view.
- **Occam's Razor** — find the simplest sufficient explanation.

**Risk**
- **Pre-mortem Analysis** — imagine the failure, work backwards to prevent it.
- **Failure Mode Analysis** — how each component could fail.
- **Assumption Audit** — list every assumption, rate confidence and cost if wrong.
- **Cascading Failure Simulation** — trace how one failure propagates.
- **Challenge from Critical Perspective** — devil's advocate, stress-test the idea.

**Collaboration**
- **Stakeholder Round Table** — diverse personas find balanced solutions.
- **Expert Panel Review** — domain experts for depth.
- **Debate Club Showdown** — thesis, antithesis, synthesis.
- **Six Thinking Hats** — rotate facts, feelings, caution, optimism, creativity, process.
- **Red Team vs Blue Team** — adversarial attack and defend.

**Creative**
- **SCAMPER** — substitute, combine, adapt, modify, put to other use, eliminate, reverse.
- **Reverse Engineering** — work backwards from the desired outcome.
- **What If Scenarios** — explore alternative realities.
- **Constraint Injection** — add an artificial limit to force novelty.
- **Subtraction** — improve by removing elements.

**Framing**
- **Abstraction Laddering** — move up ("why?") or down ("how?").
- **Reframe the Question** — challenge whether the stated problem is the real problem.
- **Map Is Not the Territory** — treat any model as a lossy abstraction.

**Technical**
- **Architecture Decision Records** — debate choices, record the trade-off.
- **Security Audit Personas** — hacker, defender, auditor.
- **Boundary & Edge Case Sweep** — extremes, zeros, nulls, maximums.
- **Performance Profiler Panel** — diagnose slowdowns from several angles.

**Retrospective**
- **Hindsight Reflection** — look back from the future.
- **Lessons Learned Extraction** — key takeaways and actionable improvements.

## Rules

- Work in the session's language.
- When a method casts personas and a party is already in the session, reuse its members; otherwise invent named
  viewpoints suited to the content.
- Hand the improved version back to whatever invoked you; do not silently keep it.
