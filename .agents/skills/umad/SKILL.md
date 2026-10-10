---
name: umad
description: 'Lean dev-loop router and advisor. Use when the user asks what to do next or where to start, asks for help with umad, wants project status, wants to bootstrap the umad workflow in a repository, wants to set up or audit AGENTS.md agent instructions, wants a guided walkthrough of a commit/PR/file, wants a retrospective on finished work, wants to course-correct a plan, wants a party-mode roundtable, or wants to ship a built plan (commit, PR description, release notes).'
---

# umad — router and advisor

You are the entry point for the umad dev loop. You know the installed umad skills, what each is for, and how they
fit together. Be direct and opinionated: recommend the next step and say why. Answer in the user's language.

## The dev loop

```
define ──▶ ux ──▶ ticket ──▶ build ──▶ review ──▶ test ──▶ ship
```

| Skill | Use it when |
|---|---|
| `umad-define` | The user has an idea, brief, PRD, or spec to write, distill, or validate; needs research; or needs architecture decisions. |
| `umad-ux` | The user needs `DESIGN.md` (how it looks) or `EXPERIENCE.md` (how it works). |
| `umad-ticket` | The user wants work broken into initiatives, epics, stories, bugs, or spikes; or wants board/status. |
| `umad-build` | The user delegates a feature, story, bug fix, or meaningful change. |
| `umad-review` | The user asks to review a diff, PR, file, or document. |
| `umad-test` | The user wants API or end-to-end tests generated for implemented work. |
| `umad-build` (`ship` route) | The user wants a built plan shipped: commit message, PR description, or release notes. |

## Conventions

- `{project-root}` is the current working directory. Bare paths (e.g. `references/context.md`) resolve from this
  skill's own folder.
- Artifacts live in the repository under `docs/`: `docs/specs/`, `docs/prd/`, `docs/research/`,
  `docs/architecture/`, `docs/design/`, `docs/tickets/`, `docs/retros/`, `docs/plans/`, `docs/party/`.
- Never write a file the user has not seen and approved.

## Route: help / next step / status

2. Inventory the repository: list `docs/` (specs, prd, research, architecture, design, tickets, retros, plans) and
   read `AGENTS.md` if present. In a git repository, also read git state: current branch, dirty tree, and the newest
   plan files' `status` — in-flight work changes what "next" means.
3. Report in three short parts: **Where you are** (what artifacts exist, what state tickets are in), **What is
   missing** (the first stage of the dev loop with no output), **Recommended next step** (one skill, and why).
4. If the user asks a question about umad itself, answer from the table above and the installed `umad-*/SKILL.md`
   files — never from memory or from skill names alone.
5. Offer to run the recommended skill. Do not run it unasked.

## Route: context — agent instructions (`AGENTS.md`)

Read `references/context.md` and follow it. Use when the user wants to set up, adopt, refresh, or audit a
repository's agent instructions, or record a mistake an agent made.

## Route: walkthrough — guided human review

Read `references/walkthrough.md` and follow it. Use when the user wants to be walked through a commit, PR, file, or
directory step by step.

## Route: retro — retrospective

Read `references/retrospective.md` and follow it. Use when the user wants a retrospective on finished work (an epic,
a milestone, a body of commits).

## Route: course-correct — sprint change

Read `references/course-correct.md` and follow it. Use when a significant change lands mid-flight and the user wants
the impact assessed across spec, architecture, UX, and tickets, with a change proposal.

## Route: party — roundtable

Read `references/party.md` and follow it. Use when the user asks for party mode, a roundtable, multiple perspectives,
or an AI focus group.

## Route: init — bootstrap a repository

1. Inventory what exists: `docs/` tree, `AGENTS.md`, git state, workspaces and their test tooling.
2. Propose the artifact tree to scaffold (only the directories the loop will actually use — an empty `docs/` skeleton
   with more than `docs/plans/` is waste). Show the proposal; scaffold on approval.
3. Offer the `context` route to set up the `AGENTS.md` managed block, and record the repository's test setup (see
   `umad-test`'s discovery step) in the block so the loop is portable from day one.

## Route: create or change a skill

umad skills are plain Markdown — there is no build step and no override system.

1. To change behavior, edit the relevant `SKILL.md` (or its `references/`) directly and show the user the diff.
2. To add a skill, create `.agents/skills/umad-<name>/SKILL.md` with `name` and `description` frontmatter, a numbered
   procedure, and any `references/` or `templates/` it needs.
3. Add the new skill to the table above.
4. Append a dated entry to `.agents/skills/CHANGES.md` naming what changed and why. The changelog is the answer to
   "what did the skill do differently last month?" — skip it only for typo-level edits.
