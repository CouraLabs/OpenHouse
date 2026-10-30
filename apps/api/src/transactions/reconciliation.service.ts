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
import { ConflictError, NotFoundError } from '../common/errors.js'
import {
  TransactionRepository,
  type TransactionRow,
} from './transaction.repository.js'

const PAGE = 100

export interface ReconcilePreviewResult {
  account: Account
  computedBalance: string
  difference: string
  verifyRows: TransactionRow[]
  verifyCount: number
}

export interface ReconcileOutcome {
  reconciledThrough: string
  balance: string
  adjustment: TransactionRow | null
  checkedCount: number
}

export class ReconciliationService {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly balances: BalanceRepository
  ) {}

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
      throw new ConflictError(
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

  private async markVerifyChecked(
    tenantId: number,
    userId: number,
    accountId: number,
    date: string
  ): Promise<number> {
    let checked = 0

    for (;;) {
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
      throw new NotFoundError(`No account with id ${accountId}.`)
    }

    return account
  }
}

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
