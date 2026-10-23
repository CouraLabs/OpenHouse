import { Cron } from '@nestjs/schedule'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import {
  MAX_BALANCE_HISTORY_DAYS,
  addMoney,
  type BalanceConsistency,
  type BalanceHistory,
  type BalanceHistoryBody,
} from '@workspace/poco'

import { BalanceRepository } from './balance.repository.js'

/**
 * The balance derivations that are not a single transaction row: the daily
 * end-of-day balance of an account, and the consistency check that keeps the
 * cached `accounts.balance` honest against the ledger.
 */
@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name)

  constructor(private readonly balances: BalanceRepository) {}

  /**
   * One end-of-day balance per day of `[from, to]`: the balance before
   * `from` (opening plus the earlier deltas) carried through each day's
   * net movement. Days without movement repeat the previous balance.
   */
  async history(
    tenantId: number,
    accountId: number,
    body: BalanceHistoryBody
  ): Promise<BalanceHistory> {
    const account = await this.balances.findAccount(tenantId, accountId)

    if (account === undefined) {
      throw new NotFoundException(`No account with id ${accountId}.`)
    }

    const days = daysBetween(body.from, body.to)

    if (days.length > MAX_BALANCE_HISTORY_DAYS) {
      throw new BadRequestException(
        `Ask for at most ${MAX_BALANCE_HISTORY_DAYS} days.`
      )
    }

    const [before, deltas] = await Promise.all([
      this.balances.deltaBefore(tenantId, accountId, body.from),
      this.balances.dailyDeltas(tenantId, accountId, body.from, body.to),
    ])
    const byDay = new Map(deltas.map((row) => [row.date, row.delta]))

    // The opening balance is where the account starts: a day before the
    // opening day has no movement either way, so it carries the opening.
    let balance = addMoney(account.openingBalance, before)

    return {
      accountId,
      currency: account.currency,
      points: days.map((date) => {
        balance = addMoney(balance, byDay.get(date) ?? '0.00')

        return { date, balance }
      }),
    }
  }

  /** Checks one tenant's accounts (on demand) and logs any drift. */
  async check(tenantId: number): Promise<BalanceConsistency> {
    const { checked, drifts } = await this.balances.findDrifts(tenantId)

    this.logDrifts(drifts)

    return {
      checked,
      drifts: drifts.map(({ tenantId: _tenant, ...drift }) => drift),
    }
  }

  /** The nightly check over every tenant: it asserts `balance ==
   * openingBalance + sum(deltas)` and logs each account that drifted. */
  @Cron('0 15 3 * * *')
  async checkAll(): Promise<number> {
    const { drifts } = await this.balances.findDrifts()

    this.logDrifts(drifts)

    return drifts.length
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
      this.logger.error(
        `Balance drift on account ${drift.accountId} (tenant ${drift.tenantId}): cached ${drift.balance}, ledger ${drift.expected}, off by ${drift.drift}.`
      )
    }
  }
}

/** Every `YYYY-MM-DD` day from `from` to `to`, inclusive. Calendar days, so
 * UTC arithmetic never shifts them. */
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
