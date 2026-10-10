---
id: ""
type: bug
title: "[What is wrong, from the user's view]"
parent: ""
covers: []
after: []
status: todo
refined: false
hitl: false
risk: low
severity: P2             # P0 outage/data-loss/security · P1 core broken, no workaround · P2 impaired, workaround exists · P3 cosmetic
---

# [Title]

## Description

[What the user sees go wrong and what should happen instead, from their side. 2–4 sentences.]

## Reproduction

[Exact steps, environment, and what happens versus what should happen. Logs or errors verbatim.]

## Cause Hypothesis

[Where the defect likely lives and why — a hypothesis, never a prescribed fix.]

## Acceptance Criteria

1. **[The expected behavior holds]**
   **Given** [the state from the reproduction]
   **When** [the reproduction steps are followed]
   **Then** [what should happen, as it should now happen]
2. **Tests cover the condition found and fixed**
   **Given** the test suite
   **When** it runs
   **Then** a test that fails on the defect and passes on the fix covers the reproduction, and one covers each related case the fix touched
3. **Or: no change is needed, with proof**
   **Given** the reproduction
   **When** it is run on the current code
   **Then** the expected behavior already holds, or the report was mistaken, with the evidence recorded in Notes — this supersedes 1 and 2

## Boundaries

- Must not change: …

## References

- parent — [path]

## Notes

- Decision: …
- Assumption: …
- Open question: …
