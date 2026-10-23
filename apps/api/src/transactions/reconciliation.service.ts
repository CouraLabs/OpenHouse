import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Account } from '@workspace/db'
import {
  BALANCE_ADJUSTMENT_CATEGORY,
  BALANCE_ADJUSTMENT_NAME,
  addMoney,
  isZeroMoney,
  negateMoney,
  type ReconcileBody,
  type ReconcilePreviewBody,
  type SearchTransactionsArgs,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { BalanceRepository } from '../balances/balance.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import {
  TransactionRepository,
  type TransactionRow,
} from './transaction.repository.js'

/** The most rows one search page reads — the paging envelope's ceiling. */
const PAGE = 100

/** What a reconciliation preview computes, before the wire shape. */
export interface ReconcilePreviewResult {
  account: Account
  computedBalance: string
  difference: string
  verifyRows: TransactionRow[]
  verifyCount: number
}

/** What a committed reconciliation computed, before the wire shape. */
export interface ReconcileOutcome {
  reconciledThrough: string
  balance: string
  adjustment: TransactionRow | null
  checkedCount: number
}

/**
 * Reconciling an account against the bank: the user reads the bank's
 * balance on a day, the ledger answers its own end-of-day running balance
 * for that day, and the difference is closed by an adjustment transaction.
 * A committed reconciliation stamps `reconciledThrough`, which locks the
 * rows up to it behind a confirmation. The balance on the day is always
 * derived from the rows — never from the cached `accounts.balance`.
 */
@Injectable()
export class ReconciliationService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly balances: BalanceRepository
  ) {}

  /** The ledger's balance on the day, the difference to the bank's, and
   * the rows still waiting for a check. Writes nothing. */
  async preview(
    tenantId: number,
    accountId: number,
    body: ReconcilePreviewBody
  ): Promise<ReconcilePreviewResult> {
    const account = await this.findUsableAccount(tenantId, accountId)
    const computedBalance = await this.balances.balanceOn(
      tenantId,
      accountId,
      account.openingBalance,
      body.date
    )
    const verify = await this.transactions.search(
      tenantId,
      verifyUpTo(accountId, body.date, 0)
    )

    return {
      account,
      computedBalance,
      difference: addMoney(body.bankBalance, negateMoney(computedBalance)),
      verifyRows: verify.rows,
      verifyCount: verify.total,
    }
  }

  /**
   * Commits a reconciliation: optionally creates the adjustment for the
   * difference (an Income when the bank holds more, an Expense when less —
   * category "Balance adjustment", flagged `isAdjustment`, already
   * Checked), optionally marks every Verify row up to the day Checked, then
   * stamps `reconciledThrough`. A difference left open with no adjustment
   * is a 409: the account would be marked matched when it is not.
   */
  async reconcile(
    tenantId: number,
    userId: number,
    accountId: number,
    body: ReconcileBody
  ): Promise<ReconcileOutcome> {
    const { account, difference } = await this.preview(
      tenantId,
      accountId,
      body
    )

    if (!isZeroMoney(difference) && !body.createAdjustment) {
      throw new ConflictException(
        'The balance differs from the bank. Create an adjustment, or fix the transactions first.'
      )
    }

    const adjustment =
      isZeroMoney(difference) || !body.createAdjustment
        ? null
        : await this.createAdjustment(
            tenantId,
            userId,
            account,
            body.date,
            difference
          )

    const checkedCount = body.markChecked
      ? await this.markVerifyChecked(tenantId, userId, accountId, body.date)
      : 0

    const reconciledThrough = await this.accounts.stampReconciledThrough(
      tenantId,
      accountId,
      userId,
      body.date
    )

    return {
      reconciledThrough: reconciledThrough ?? body.date,
      balance: await this.balances.balanceOn(
        tenantId,
        accountId,
        account.openingBalance,
        body.date
      ),
      adjustment,
      checkedCount,
    }
  }

  /** The adjustment row: dated on the reconciled day, moving the balance by
   * the difference, kept out of the reports by its flag. */
  private async createAdjustment(
    tenantId: number,
    userId: number,
    account: Account,
    date: string,
    difference: string
  ): Promise<TransactionRow> {
    const category = await this.categories.getOrCreateByName(
      tenantId,
      userId,
      BALANCE_ADJUSTMENT_CATEGORY
    )
    const income = difference.startsWith('-') === false

    return this.transactions.insertWithBalance(tenantId, userId, {
      name: BALANCE_ADJUSTMENT_NAME,
      note: null,
      invoice: null,
      amount: income ? difference : negateMoney(difference),
      transactionDt: date,
      linkedAccountId: account.id,
      categoryId: category.id,
      receiverId: null,
      recurringId: null,
      type: income ? 'Income' : 'Expense',
      reviewStatus: 'Checked',
      statusNote: null,
      isAdjustment: true,
    })
  }

  /** Marks every Verify row of the account up to the day Checked, page by
   * page; each row's own ledger write mirrors a transfer's other side.
   * Answers how many rows moved. */
  private async markVerifyChecked(
    tenantId: number,
    userId: number,
    accountId: number,
    date: string
  ): Promise<number> {
    let checked = 0

    for (;;) {
      // Rows leave the Verify set as they are checked, so the next page
      // is always the first.
      const { rows } = await this.transactions.search(
        tenantId,
        verifyUpTo(accountId, date, 0)
      )
      let moved = 0

      for (const row of rows) {
        const updated = await this.transactions.updateStatus(
          tenantId,
          row.id,
          userId,
          'Checked'
        )

        if (updated !== undefined) {
          moved += 1
        }
      }

      checked += moved

      // A page that moved nothing would loop forever on the same rows.
      if (rows.length < PAGE || moved === 0) {
        return checked
      }
    }
  }

  private async findUsableAccount(
    tenantId: number,
    accountId: number
  ): Promise<Account> {
    const account = await this.accounts.findById(tenantId, accountId)

    if (account === undefined || account.status === 'DELETED') {
      throw new NotFoundException(`No account with id ${accountId}.`)
    }

    return account
  }
}

/** The search for an account's Verify rows through a day, oldest first. */
function verifyUpTo(
  accountId: number,
  date: string,
  skip: number
): SearchTransactionsArgs {
  return {
    sort: [{ field: 'transactionDt', dir: 'asc' }],
    skip,
    limit: PAGE,
    filter: {
      linkedAccountId: accountId,
      transactionDtTo: date,
      status: 'Verify',
      creditMode: 'accrual',
      lifecycle: 'ACTIVE',
    },
  }
}
