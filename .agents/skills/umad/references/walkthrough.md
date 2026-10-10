# Walkthrough — guided human review

Walk a human through a commit, PR, file, or directory, one block at a time. The human drives; you present and
answer.

## Setup

1. **Orient.** Establish what the target is and what it is for. Use the plan or spec, the PR description, and commit
   messages when they exist. Ask until you know both.
2. **Pick the block shape.** Choose a decomposition that matches the target: by file, by layer, by user-visible
   behavior, or by diff hunk. State the shape and the block list before starting.
3. **Create the narrative.** Write `docs/plans/walkthrough-<slug>.md`:
   - A checkbox per block: `- [ ]` unvisited / in progress / reopened (label the state), `- [x]` satisfied.
   - One block in focus at a time.
   - Keep findings, decisions, edits, and test results **out** of this file.
4. **Create the log.** Write `docs/plans/walkthrough-<slug>-log.md` as an append-only record for resuming or
   analysis. One entry per activity:

   ```markdown
   ## <n> — <block or area> — <activity>

   - Action: <what was examined, changed, or tested>
   - Result: <finding, outcome, or decision and its reason>
   - Evidence: <file references, commands, result links>
   - Open: <unresolved work or question>
   ```

   Give each finding a disposition: fixed, accepted as-is, deferred, or open. When a disposition changes, append a
   new entry; never edit an earlier one.

## Per-block loop

1. Present the block: its link into the narrative, then its content in the agreed shape.
2. Suggest 1–3 moves that fit (below). Then stop. The user may choose something you did not suggest.
3. Stay on the block until the user explicitly says it is done. No status chatter between turns.
4. If the user rejects a block's shape, rewrite it in the shape they describe and record the constraint in the log so
   it applies to every later block. Never present the same block a third time in a different shape unasked.
5. On "done": present the next block first so the user can keep going, then silently check the finished block in the
   narrative and revise the remaining blocks if they need to change.
6. If the tree is dirty when a block completes, ask whether to commit.

## Moves

- **Thoughts** — look at the requested area in this session and report concrete findings with clickable references.
- **Second opinion** — the same question, in a fresh subagent with none of this conversation's context.
- **Formal review** — hand off to `umad-review` on the block under discussion.
- **Test** — identify useful checks and expected behavior, run what you can, guide the user through what needs them.
  Record what was actually tested, the results, and what is still unverified.
- **Drive** — start the app and tell the user exactly what to click to see the behavior.
- **Wrap-up** — name the follow-through this review was for (ship it via `umad-build`'s ship route — commit, PR
  description, release notes — merge the PR, or commit and push edits) and ask. Do not do it until the user says so.
  Do not end with only a chat summary.
