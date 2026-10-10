---
name: umad-ticket
description: 'Create and manage tickets — initiatives, epics, stories, bugs, spikes. Use when the user says "create a new initiative", "slice this initiative", "split this epic up", "break this into stories", "make a ticket", "refine this ticket", "what is ready", "status of a story", or "validate these tickets".'
---

# umad-ticket

Turn intent into tickets a coding agent can build from. The user decides the scope and the split; you propose
boundaries, explain tradeoffs, and check coverage. Ask only what is unsettled, offering a default for each.

## The store

A plain file tree under `docs/tickets/`. No database, no scripts — the LLM reads and writes the files.

```
docs/tickets/
  initiative-<slug>/
    initiative-<slug>.md          # the initiative: outcome, requirements, epics
    epic-<slug>/
      epic-<slug>.md              # the epic: description, requirements, done when
      story-<slug>.md             # one file per ticket
      bug-<slug>.md
      spike-<slug>.md
  backlog/
    <type>-<slug>.md              # standalone tickets with no parent
```

`<type>` is `initiative`, `epic`, `story`, `bug`, or `spike`. Status lives in each ticket's frontmatter
(`todo | in-progress | built | done | dropped`), so there is one source of truth and no drift between a file and a
board.

## Each fact lives in one place

- The **input** (spec, PRD, brief) owns the product argument. A ticket **references** the requirement ids it covers —
  never duplicates the argument.
- The **container** (initiative or epic) owns Description, Outcome, Done when, Boundaries, References, Notes.
- A **story** under an epic is one slice of the epic's build order. Several stories can cover one requirement.
- **Acceptance criteria** are a check the implementer can prove it met without pointing at code, and together they are
  enough that building the wrong thing cannot pass.
- **Boundaries** name behavior that must not change — behavior, not files.
- **References** are `type — location, section` lines. Open the location before citing it. Name the nearest document,
  not the documents behind it. No source-code paths or snippets; the builder reads the repo.

## Rules

- Short, declarative sentences in the project's own vocabulary. Say each thing once. No invented term, filler, or
  metaphor.
- `risk` on every ticket: `low`, `medium`, or `high` — the business impact if this change is wrong. Propose it with a
  one-line reason; the user's value wins. A high-risk ticket names one check outside its own criteria (a person, a
  wider suite, a monitor).
- `hitl: true` only when a person must do part of the work; say which step in the Description.
- A **bug** carries a reproduction and a cause hypothesis, never a fix. If the behavior already holds, say so with
  evidence and create nothing.
- A **spike** names the question, who waits on the answer, and where it is recorded. A spike is always `hitl`.
- **Notes** hold only what is not in the repo or the source, each line marked `Decision:`, `Assumption:`,
  `Open question:`, or `Unknown:`. Never resolve one by guessing. An `Unknown:` gates the start.
- A **UI ticket** links its design in References; criteria stay functional, layout lives in the design. If there is no
  design and the work is user-facing, offer `umad-ux` first.
- `estimate` is recorded only when the user gives one. Never propose one.

## Route: create a ticket

1. Determine the type. Ask if unclear.
2. Read the input (spec/PRD/brief) and the parent container. Identify which requirement ids this covers.
3. Ask only the unsettled questions — what "done" looks like, how it will be verified, what must not change — offering
   a default for each.
4. Draft from the matching template — `templates/initiative.md`, `templates/epic.md`, `templates/story.md`,
   `templates/bug.md`, or `templates/spike.md`. Match the template example's level of detail; do not copy it.
5. Show the draft. On approval, write the file and update the parent's epic list and build order.

## Route: slice an initiative into epics

1. Read the initiative. List the requirements it must satisfy.
2. Propose epic boundaries: each epic is a coherent slice of user-facing value that could ship on its own.
3. For each proposed epic, name what it covers, what it depends on, and what it explicitly does not.
4. Get the user's split, then write the epic files and record the order in the initiative.

## Route: break an epic into stories

1. Read the epic: its requirements and Done when.
2. Propose the build order as stories — each story one slice that can be built and verified on its own.
3. Check coverage: every requirement id in the epic maps to at least one story. Report any that do not.
4. Write the story files. Record prerequisites in `after` (sibling id, `<epic>.<id>` across epics, or `epic-<slug>`).

## Route: refine a ticket

Use before a ticket starts, when the user wants full criteria.

1. Read the ticket, its source, the finished siblings and their plans, and the code it will touch.
2. If the source contradicts the code, record `Source conflict: <id> — <source says> vs <found>` in the container's
   Notes and tell the user.
3. Write numbered criteria (Given/When/Then) covering the change **and** its failure paths, plus Boundaries.
4. Set `refined: true`. Show the result before writing.

## Route: review a ticket

Improve the description, `Verify:` line, references, and notes with the user. Adjust order and prerequisites. A review
sets neither `status` nor `refined` — the file is intent ready for the build.

## Route: board / status

1. Walk `docs/tickets/` and read each ticket's frontmatter.
2. Print a board grouped by status, and per epic the build order with each ticket's state.
3. Report what is ready to build: tickets whose `after` prerequisites are all `done`, and which are not blocked by an
   `Unknown:` note.

## Route: validate

Read `references/validate.md` and run its checks over the tree.
