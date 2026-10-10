# Validation checks

Run the scopes the user asks for. Report findings; do not fix silently.

## Ticket

- Every file or link referenced exists and opens; no unfilled placeholder; every assumption is marked.
- Nothing contradicts the requirement source, its companions, the architecture, or a recorded decision.
- The ticket has a description, its known uncertainty, and a `Verify:` check someone other than the builder can run.
- Numbered criteria (where written) cover the change **and** its failure paths.
- A ticket whose source conflict has no settling `Decision:` line is not marked `refined: true`.

## Set (an epic's tickets together)

- Together the tickets account for every requirement in the epic, except scope deferred with the user. Each `covers` id
  exists in the source; several tickets may cover one id, each description saying which part it delivers.
- UX, architecture, constraint, and integration work are accounted for even when they lack ids. The combined result
  must satisfy the epic's **Done when**; citing an id alone is not coverage.
- The epic's Build order table matches the ticket files on disk: every ticket appears exactly once, the table's
  `After` column agrees with each ticket's `after` frontmatter, and statuses in the table equal the frontmatter
  status. Drift means one is stale — report which; do not fix silently.
- Given the epic, a ticket, and its references, a builder could write that ticket's acceptance criteria if it had to.
  If not, fix the epic's requirements or the references.
- An epic of more than three tickets closes with a "Refactor sweep" ticket that waits on the others, or a `Decision:`
  line says why not.

## Tree (initiative and its epics)

- Every initiative requirement has an accountable epic or an agreed deferral. Shared requirements say which part each
  epic delivers; no unexplained overlap.
- Each epic's `covers` cites parent ids, and every local id maps to one. A non-empty `covers` is not coverage — verify
  the map resolves.
- Every decision two or more epics must adopt has one home: a single epic that the others wait on.
- Every epic has Outcome, Done when, boundaries, upstream coverage, and references. Each epic's Done when includes
  production delivery.
- With epics, no leaf ticket sits directly under the initiative.

## Dependencies

- **Needs:** list what must exist before each ticket can start and before its check can run — code, schema, setup,
  test tooling, fixtures, an entry point, a decision. Either the ticket builds it, or something in its `after` does.
- **Collisions:** two tickets with no dependency path between them run at the same time, so they must share no code,
  config, schema, or setup. Where they would, one goes in the other's `after`, or they merge.
- **Shared setup:** whatever more than one ticket needs has one owner — the earliest ticket that needs it — and the
  others list it in `after`.
- **Handoffs:** where one ticket relies on another's output (a default, an interface, a link target), both
  descriptions say so, so neither builder invents their own.

## Closure

- Verify the container's **Done when** against implementation evidence and its requirements, including constraints and
  companions. All children done is evidence, not proof the parent is complete. Explain any dropped work and confirm
  remaining scope with the user.
