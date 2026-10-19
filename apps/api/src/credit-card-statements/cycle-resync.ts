import {
  addDays,
  resolveStatement,
  type CardCycle,
  type StatementWindow,
} from '@workspace/poco'

/** An Open bill of the card, as stored. */
export interface OpenStatement extends StatementWindow {
  id: number
}

/** An unpinned charge that may move: on an Open bill, or on none yet. */
export interface ResyncCandidate {
  id: number
  transactionDt: string
}

/** What applying a new cycle to a card does to its Open bills. */
export interface CycleResyncPlan {
  /** Open bills whose close is still a cycle boundary, with the period
   * start and due date the new cycle gives them (a due-day-only change). */
  windowUpdates: Array<{ id: number; periodStart: string; dueDate: string }>
  /** The bill each candidate charge lands on, grouped by its window. */
  assignments: Array<{ window: StatementWindow; transactionIds: number[] }>
  /** Open bills no charge stays on — soft-deleted, nothing left to bill. */
  orphanIds: number[]
}

/**
 * Plans a card's resync under a new cycle. Only Open bills and the
 * unpinned charges on them (plus charges with no bill yet) move; closed
 * bills keep their snapshotted days. A bill that still holds pinned
 * charges is never an orphan — the user put them there by hand.
 */
export function planCycleResync(
  cycle: CardCycle,
  openStatements: readonly OpenStatement[],
  candidates: readonly ResyncCandidate[],
  pinnedStatementIds: ReadonlySet<number>
): CycleResyncPlan {
  const windowUpdates = openStatements.flatMap((statement) => {
    // The day before a close lands on the bill ending there exactly when
    // that close is a boundary of the new cycle.
    const window = resolveStatement(cycle, addDays(statement.closeDate, -1))

    if (
      window.closeDate !== statement.closeDate ||
      (window.periodStart === statement.periodStart &&
        window.dueDate === statement.dueDate)
    ) {
      return []
    }

    return [
      {
        id: statement.id,
        periodStart: window.periodStart,
        dueDate: window.dueDate,
      },
    ]
  })

  const groups = new Map<
    string,
    { window: StatementWindow; transactionIds: number[] }
  >()

  for (const candidate of candidates) {
    const window = resolveStatement(cycle, candidate.transactionDt)
    const group = groups.get(window.closeDate) ?? { window, transactionIds: [] }

    group.transactionIds.push(candidate.id)
    groups.set(window.closeDate, group)
  }

  const orphanIds = openStatements
    .filter(
      (statement) =>
        !groups.has(statement.closeDate) &&
        !pinnedStatementIds.has(statement.id)
    )
    .map((statement) => statement.id)

  return { windowUpdates, assignments: [...groups.values()], orphanIds }
}
