import type { BalanceRepository } from '@workspace/db'
import {
  MAX_BALANCE_HISTORY_DAYS,
  type BalanceConsistency,
  type BalanceHistory,
  type BalanceHistoryBody,
} from '@workspace/dto'
import { addMoney } from '../calc/money.js'
import {
  balanceFrom,
  dailyNets,
  findBalanceDrifts,
} from './balance-ledger.js'
import { BadRequestError, NotFoundError } from '../errors.js'

export class BalanceService {
  constructor(private readonly balances: BalanceRepository) {}

  async history(
    tenantId: number,
    accountId: number,
    body: BalanceHistoryBody
  ): Promise<BalanceHistory> {
    const account = await this.balances.findAccount(tenantId, accountId)

    if (account === undefined) {
      throw new NotFoundError(`No account with id ${accountId}.`)
    }

    const days = daysBetween(body.from, body.to)

    if (days.length > MAX_BALANCE_HISTORY_DAYS) {
      throw new BadRequestError(
        `Ask for at most ${MAX_BALANCE_HISTORY_DAYS} days.`
      )
    }

    const [before, deltas] = await Promise.all([
      this.balances.amountTotals(tenantId, accountId, { before: body.from }),
      this.balances.dailyAmountTotals(tenantId, accountId, body.from, body.to),
    ])
    const byDay = dailyNets(deltas)

    let balance = balanceFrom(account.openingBalance, before)

    return {
      accountId,
      currency: account.currency,
      points: days.map((date) => {
        balance = addMoney(balance, byDay.get(date) ?? '0.00')

        return { date, balance }
      }),
    }
  }

  async check(tenantId: number): Promise<BalanceConsistency> {
    const { accounts, totals } =
      await this.balances.listAccountTotals(tenantId)
    const { checked, drifts } = findBalanceDrifts(accounts, totals)

    this.logDrifts(drifts)

    return {
      checked,
      drifts: drifts.map(({ tenantId: _tenant, ...drift }) => drift),
    }
  }

  private logDrifts(
    drifts: Array<{
      tenantId: number
      accountId: number
      balance: string
      expected: string
      drift: string
    }>
  ): void {
    for (const drift of drifts) {
      console.error(
        `Balance drift on account ${drift.accountId} (tenant ${drift.tenantId}): cached ${drift.balance}, ledger ${drift.expected}, off by ${drift.drift}.`
      )
    }
  }
}

function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  const end = Date.parse(`${to}T00:00:00Z`)

  for (
    let at = Date.parse(`${from}T00:00:00Z`);
    at <= end;
    at += 86_400_000
  ) {
    days.push(new Date(at).toISOString().slice(0, 10))

    if (days.length > MAX_BALANCE_HISTORY_DAYS) {
      break
    }
  }

  return days
}
