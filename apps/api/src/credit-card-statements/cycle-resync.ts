import {
  addDays,
  resolveStatement,
  type CardCycle,
  type StatementWindow,
} from '@workspace/poco'

export interface OpenStatement extends StatementWindow {
  id: number
}

export interface ResyncCandidate {
  id: number
  transactionDt: string
}

export interface CycleResyncPlan {
  windowUpdates: Array<{ id: number; periodStart: string; dueDate: string }>
  assignments: Array<{ window: StatementWindow; transactionIds: number[] }>
  orphanIds: number[]
}

export function planCycleResync(
  cycle: CardCycle,
  openStatements: readonly OpenStatement[],
  candidates: readonly ResyncCandidate[],
  pinnedStatementIds: ReadonlySet<number>
): CycleResyncPlan {
  const windowUpdates = openStatements.flatMap((statement) => {
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
