import type {
  Account,
  AccountRepository,
  BalanceRepository,
  CategoryRepository,
  TransactionRepository,
  TransactionRow,
} from '@workspace/db'
import {
  BALANCE_ADJUSTMENT_CATEGORY,
  BALANCE_ADJUSTMENT_NAME,
} from '@workspace/domain'
import type {
  MoneyTone,
  ReconcileBody,
  ReconcilePreviewBody,
  SearchTransactionsArgs,
} from '@workspace/dto'

import { addMoney, isZeroMoney, moneyTone, negateMoney } from '../calc/money.js'
import { ConflictError, NotFoundError } from '../errors.js'
import type { TransactionWrites } from './transaction-writes.js'
import { balanceFrom } from '../balances/balance-ledger.js'

const PAGE = 100

export interface ReconcilePreviewResult {
  account: Account
  computedBalance: string
  difference: string
  tone: MoneyTone
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
    private readonly balances: BalanceRepository,
    private readonly writes: Pick<TransactionWrites, 'insert' | 'changeStatus'>
  ) {}

  async preview(
    tenantId: number,
    accountId: number,
    body: ReconcilePreviewBody
  ): Promise<ReconcilePreviewResult> {
    const account = await this.findUsableAccount(tenantId, accountId)
    const computedBalance = balanceFrom(
      account.openingBalance,
      await this.balances.amountTotals(tenantId, accountId, {
        through: body.date,
      })
    )
    const verify = await this.transactions.search(
      tenantId,
      verifyUpTo(accountId, body.date, 0)
    )

    const difference = addMoney(body.bankBalance, negateMoney(computedBalance))

    return {
      account,
      computedBalance,
      difference,
      tone: moneyTone(difference),
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
      balance: balanceFrom(
        account.openingBalance,
        await this.balances.amountTotals(tenantId, accountId, {
          through: body.date,
        })
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

    return this.writes.insert(tenantId, userId, {
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
        const updated = await this.writes.changeStatus(
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
