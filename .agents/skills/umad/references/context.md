# Context — repository agent instructions (`AGENTS.md`)

Produce or maintain a small, verified block of agent instructions inside `AGENTS.md`. Conversational always: the
user approves every write.

## Intents

Detect from the repository, then confirm with the user:

| Intent | When |
|---|---|
| `setup` | No instruction file carries meaningful content (scaffolding, empty headings, or a lone import is not meaningful). When unsure, prefer `adopt`. |
| `adopt` | An instruction file has content but no managed block. That content is the baseline. |
| `refresh` | A managed block exists. |
| `record` | The user reports a mistake agents made here. |
| `audit` | Re-verify and prune an existing block. |

If a stated intent contradicts what detection finds, surface the contradiction and confirm — never silently obey.

## Rules

- **Never ask what a scan could answer.** Confirming a path-checked claim or something a config file already states is
  a defect.
- **Ask recall questions, not review lists.** Never hand the user a selection problem a scan created. Batches of at
  most eight questions; fewer is better.
- **Path-check every claim** that names a file. For every claim about what a command does, read the target or script
  that runs it.
- **Do not repeat what the repo already enforces.** If a linter, hook, or CI check can enforce a rule, propose the
  check instead of prose.
- **Keep the rule, not the story.** Examples may explain a rule but never replace it.

## Steps

1. **Assess and report.** Read `AGENTS.md`, harness-specific rule files, `docs/`, and any notes carrying lessons.
   Report what exists and how it measures up.
2. **Open a ledger.** One entry per existing section and per independently meaningful instruction. Each entry settles
   as `retain | rewrite | relocate | automate | delete`, with its reason, its evidence, and the risk if it goes.
   Deletion needs a stated ground: obsolete, enforced elsewhere, never followed, or false.
3. **Ask what the user brings.** Rules that apply regardless of what the repo does: governance, security, coding
   standards, frozen areas. Ask for outside documents (handbooks, wikis, architecture docs) and note their paths.
4. **Discover and verify.** Fan out parallel subagents over executable config, CI, tracked source, and targeted
   history. `package.json`, `Makefile`, `pyproject.toml`, contribution guides, PR templates, and CI config are read to
   know what the block must **not** repeat.
5. **Interview the gaps.** Only what no scan reaches: what agents keep getting wrong, what is off limits, what a
   domain term means, why a constraint exists. A mistake this session made and caught is observed evidence — offer it.
6. **Show the block, then write it.** Present the complete proposed block **and** the settled ledger before writing.
   Every existing instruction appears with its decision and reason. Deleting or weakening anything is itemized
   separately. On approval, splice only between the managed markers; nothing outside them changes as a side effect.

## Block shape

```markdown
<!-- BEGIN:umad-context -->
## Project rules

- <one verified, actionable rule per line>

## Pitfalls

- <a mistake agents actually made here, and what to do instead>

<!-- END:umad-context -->
```

Keep it small. Every line must earn its place: an agent should get something wrong without it.
