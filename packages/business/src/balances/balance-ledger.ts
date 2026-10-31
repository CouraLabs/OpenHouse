import type { AmountTotal, CachedBalance } from '@workspace/db'
import type { BalanceDrift } from '@workspace/dto'

import { addMoney, compareMoney, negateMoney } from '../calc/money.js'
import { appliedDeltaFor } from '../transactions/transaction-ledger.js'

export function netOf(totals: readonly AmountTotal[]): string {
  return totals.reduce(
    (net, row) =>
      addMoney(
        net,
        appliedDeltaFor({
          type: row.type,
          amount: row.total,
          reviewStatus: row.reviewStatus,
        })
      ),
    '0.00'
  )
}

export function balanceFrom(
  openingBalance: string,
  totals: readonly AmountTotal[]
): string {
  return addMoney(openingBalance, netOf(totals))
}

export function dailyNets(
  totals: ReadonlyArray<AmountTotal & { date: string }>
): Map<string, string> {
  const byDay = new Map<string, AmountTotal[]>()

  for (const row of totals) {
    byDay.set(row.date, [...(byDay.get(row.date) ?? []), row])
  }

  return new Map([...byDay].map(([date, rows]) => [date, netOf(rows)]))
}

export function findBalanceDrifts(
  accounts: readonly CachedBalance[],
  totals: ReadonlyArray<AmountTotal & { accountId: number }>
): { checked: number; drifts: Array<BalanceDrift & { tenantId: number }> } {
  const drifts = accounts.flatMap((account) => {
    const expected = balanceFrom(
      account.openingBalance,
      totals.filter((row) => row.accountId === account.accountId)
    )

    if (compareMoney(account.balance, expected) === 0) {
      return []
    }

    return [
      {
        tenantId: account.tenantId,
        accountId: account.accountId,
        name: account.name,
        balance: account.balance,
        expected,
        drift: addMoney(account.balance, negateMoney(expected)),
      },
    ]
  })

  return { checked: accounts.length, drifts }
}
