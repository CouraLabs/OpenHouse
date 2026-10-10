---
id: ""
type: epic
title: "[The outcome this container exists to reach]"
parent: ""
covers: []
after: []
status: todo
risk: low
---

# [Title]

## Description

[What is true when this is done and why it matters. With a spec, one paragraph pointing at it; without one, the intent in full.]

## Outcome

[One sentence: for whom, what changes, and the signal that shows it worked.]

## Requirements

[The requirement source at this altitude: lines as stable ids for children to cite, each mapping to a parent id in
`covers`. Reuse the parent's ids when the lines are the parent's; when this epic splits or adds one, mint `E<n> (R<m>)`.
An epic with no parent ids, such as a platform baseline, leaves `covers` empty and cites the source section per line.]

- **E1 (R1):** …
- **E2 (R2):** …

## Done when

[Three to six checks the owner runs at the end, taken from the source's measures and limits. Closing every child is not
one.]

## Boundaries

[Which boundary this container follows — team, service, UI, capability — and what it is not. Point at the spec's
non-goals when there is one.]

## References

- parent — [path, section containing the upstream requirement ids]
- spec — [local spec when present]
- constraint — [the source section that binds this container]

## Notes

- Assumption: …
- Open question: …
- Unknown: …
- Parked: [a requirement id not placed on any child, and why]
- Decision: …
- Source conflict: …
- Waits on [epic] because: [the one-line reason for each entry in `after`]

## Build order

[Tickets in build order, with each one's status. Keep in sync as tickets are written.]

| # | Ticket | Status | After |
| --- | --- | --- | --- |
