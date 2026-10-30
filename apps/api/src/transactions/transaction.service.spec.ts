import { describe, expect, it, vi } from 'vitest'
import type {
  Account,
  Category,
  CreditCardStatement,
  Receiver,
} from '@workspace/db'
import { CARD_PAYMENT_CATEGORY, TRANSFER_CATEGORY } from '@workspace/poco'
import { HouseholdMembers } from '../common/household/household-members.js'

import { AccountRepository } from '../accounts/account.repository.js'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../common/errors.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import {
  TransactionRepository,
  type TransactionRow,
} from './transaction.repository.js'
import type { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import type { InstallmentService } from './installment.service.js'
import type { TierGate } from '../common/tiers/tier-gate.js'
import { TransactionService } from './transaction.service.js'

/** The account the account repository finds — ACTIVE Checking unless overridden. */
const account = (overrides: Partial<Account> = {}): Account => ({
  id: 10,
  tenantId: 1,
  name: 'Everyday',
  agency: null,
  number: '123',
  type: 'Checking',
  balance: '100.00',
  openingBalance: '100.00',
  openingDt: '2026-01-01',
  reconciledThrough: null,
  currency: 'USD',
  spreadPct: '0.00',
  limit: null,
  closeDay: null,
  dueDay: null,
  closeDayInclusive: false,
  isDefault: false,
  ownership: 'personal',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The category the category repository finds — ACTIVE unless overridden. */
const category = (overrides: Partial<Category> = {}): Category => ({
  id: 3,
  tenantId: 1,
  name: 'Groceries',
  searchName: '',
  color: '#1D4ED8',
  defaultSplit: null,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The receiver the receiver repository finds — ACTIVE unless overridden. */
const receiver = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 5,
  tenantId: 1,
  name: 'Market',
  searchName: '',
  type: 'Merchant',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A transaction row the repository hands back, joined fields included. */
const row = (overrides: Partial<TransactionRow> = {}): TransactionRow => ({
  id: 1,
  tenantId: 1,
  name: 'Groceries',
  note: null,
  invoice: 'INV-1',
  amount: '12.34',
  transactionDt: '2026-10-14',
  balanceOnDt: '87.66',
  runningBalance: '87.66',
  isAdjustment: false,
  externalId: null,
  importBatchId: null,
  locked: false,
  linkedAccountId: 10,
  categoryId: 3,
  receiverId: 5,
  recurringId: null,
  type: 'Expense',
  reviewStatus: 'Verify',
  statusNote: null,
  status: 'ACTIVE',
  transferGroupId: null,
  statementId: null,
  statementPinned: false,
  paymentStatementId: null,
  installmentGroupId: null,
  installmentNumber: null,
  installmentCount: null,
  paidByUserId: 7,
  isSettlement: false,
  paidByName: 'Ana',
  splits: [],
  createdBy: 7,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: 7,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  accountName: 'Everyday',
  categoryName: 'Groceries',
  categoryColor: '#1D4ED8',
  receiverName: 'Market',
  currency: 'USD',
  statementDueDate: null,
  paymentStatementDueDate: null,
  ...overrides,
})

/** A transaction repository mock with every method the service touches. */
const repository = () => ({
  insertWithBalance: vi.fn(),
  insertTransfer: vi.fn(),
  updateWithBalance: vi.fn(),
  updateStatus: vi.fn(),
  softDeleteWithBalance: vi.fn(),
  search: vi.fn(),
  summary: vi.fn(),
  findById: vi.fn(async (): Promise<TransactionRow | undefined> => row()),
  findHistory: vi.fn(),
})

/** An account repository mock with every method the service touches. */
const accounts = () => ({
  findById: vi.fn(async (): Promise<Account | undefined> => account()),
})

/** A category repository mock with every method the service touches. */
const categories = () => ({
  findById: vi.fn(async (): Promise<Category | undefined> => category()),
  getOrCreateByName: vi.fn(async () => category({ id: 30 })),
})

/** A receiver repository mock with every method the service touches. */
const receivers = () => ({
  findById: vi.fn(async (): Promise<Receiver | undefined> => receiver()),
})

/** A bill repository mock with every method the transfer touches. */
const statements = () => ({
  findById: vi.fn(async (): Promise<CreditCardStatement | undefined> =>
    statement()
  ),
  defaultPaymentStatementId: vi.fn(async (): Promise<number | null> => 40),
})

/** A bill of the card account 11 — ACTIVE unless overridden. */
const statement = (
  overrides: Partial<CreditCardStatement> = {}
): CreditCardStatement => ({
  id: 41,
  tenantId: 1,
  accountId: 11,
  periodStart: '2026-09-25',
  closeDate: '2026-10-25',
  dueDate: '2026-11-05',
  closedAt: null,
  minimumDue: null,
  bankTotal: null,
  reconciledAt: null,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A household of three active members (1, 2, 7) and a removed one (3). */
const members = () => ({
  activeMemberIds: vi.fn(async () => [1, 2, 7]),
  allMemberIds: vi.fn(async () => [1, 2, 3, 7]),
  nameOf: vi.fn(async (_tenant: number, id: number) => `Member ${id}`),
})

const unlimitedTiers = {
  transactionWindowStart: async () => null,
} as unknown as TierGate

const service = (
  repo = repository(),
  accs = accounts(),
  cats = categories(),
  rcv = receivers(),
  bills = statements(),
  household = members()
) =>
  new TransactionService(
    repo as unknown as TransactionRepository,
    accs as unknown as AccountRepository,
    cats as unknown as CategoryRepository,
    rcv as unknown as ReceiverRepository,
    bills as unknown as CreditCardStatementRepository,
    {} as InstallmentService,
    household as unknown as HouseholdMembers,
    unlimitedTiers
  )

const createBody = {
  name: 'Groceries',
  note: null,
  invoice: 'INV-1',
  amount: '12.34',
  transactionDt: '2026-10-14',
  linkedAccountId: 10,
  categoryId: 3,
  receiverId: 5,
  type: 'Expense' as const,
  status: 'Verify' as const,
  statusNote: null,
}

describe('TransactionService', () => {
  it('creates a transaction through the ledger', async () => {
    const repo = repository()
    repo.insertWithBalance.mockResolvedValue(row())
    const svc = service(repo)

    await svc.create(1, 7, createBody)

    // The wire's `status` names out before the spread: the row's lifecycle
    // column is never written from a body.
    const { status: _status, ...bodyRest } = createBody

    // Whoever enters the expense paid it.
    expect(repo.insertWithBalance).toHaveBeenCalledWith(1, 7, {
      ...bodyRest,
      paidByUserId: 7,
      recurringId: null,
      reviewStatus: 'Verify',
    })
  })

  describe('splits', () => {
    const equal = {
      mode: 'equal' as const,
      entries: [{ userId: 7 }, { userId: 2 }, { userId: 1 }],
    }

    it('stores equal shares with the remainder cents on the payer', async () => {
      const repo = repository()
      repo.insertWithBalance.mockResolvedValue(row())

      await service(repo).create(1, 7, {
        ...createBody,
        amount: '100.00',
        paidByUserId: 2,
        split: equal,
      })

      expect(repo.insertWithBalance).toHaveBeenCalledWith(
        1,
        7,
        expect.objectContaining({
          paidByUserId: 2,
          splits: [
            { userId: 7, share: '33.33' },
            { userId: 2, share: '33.34' },
            { userId: 1, share: '33.33' },
          ],
        })
      )
    })

    it('leaves a create with no split unsplit', async () => {
      const repo = repository()
      repo.insertWithBalance.mockResolvedValue(row())

      await service(repo).create(1, 7, createBody)

      const [, , write] = repo.insertWithBalance.mock.calls[0] as unknown[] as [
        number,
        number,
        { splits?: unknown },
      ]

      expect(write.splits).toBeUndefined()
    })

    it('rejects shares that do not add up to the amount', async () => {
      await expect(
        service().create(1, 7, {
          ...createBody,
          split: {
            mode: 'exact',
            entries: [
              { userId: 7, value: '5.00' },
              { userId: 2, value: '5.00' },
            ],
          },
        })
      ).rejects.toThrow(BadRequestError)
    })

    it('rejects a payer or a member outside the household', async () => {
      await expect(
        service().create(1, 7, { ...createBody, paidByUserId: 99 })
      ).rejects.toThrow(BadRequestError)
      await expect(
        service().create(1, 7, {
          ...createBody,
          split: { mode: 'equal', entries: [{ userId: 3 }] },
        })
      ).rejects.toThrow(BadRequestError)
    })

    it('does not split an income, or what a shared account pays', async () => {
      await expect(
        service().create(1, 7, { ...createBody, type: 'Income', split: equal })
      ).rejects.toThrow(BadRequestError)

      const accs = accounts()
      accs.findById.mockResolvedValue(account({ ownership: 'shared' }))

      await expect(
        service(repository(), accs).create(1, 7, {
          ...createBody,
          split: equal,
        })
      ).rejects.toThrow(ConflictError)
    })

    it('rescales the shares when an edit changes the amount', async () => {
      const repo = repository()
      repo.findById.mockResolvedValue(
        row({
          splits: [
            { userId: 7, userName: 'Ana', share: '6.17' },
            { userId: 2, userName: 'Bruno', share: '6.17' },
          ],
        })
      )
      repo.updateWithBalance.mockResolvedValue(row())

      await service(repo).update(1, 7, {
        ...createBody,
        id: 1,
        amount: '20.00',
      })

      expect(repo.updateWithBalance).toHaveBeenCalledWith(
        1,
        1,
        7,
        expect.objectContaining({
          splits: [
            { userId: 7, share: '10.00' },
            { userId: 2, share: '10.00' },
          ],
        })
      )
    })

    it('keeps the shares when the amount is unchanged, and clears on null', async () => {
      const repo = repository()
      repo.findById.mockResolvedValue(
        row({ splits: [{ userId: 7, userName: 'Ana', share: '12.34' }] })
      )
      repo.updateWithBalance.mockResolvedValue(row())

      await service(repo).update(1, 7, { ...createBody, id: 1 })
      await service(repo).update(1, 7, { ...createBody, id: 1, split: null })

      const [first, second] = repo.updateWithBalance.mock.calls.map(
        (call) => call[3] as { splits?: unknown }
      )

      expect(first.splits).toBeUndefined()
      expect(second.splits).toEqual([])
    })

    it('does not edit a settlement', async () => {
      const repo = repository()
      repo.findById.mockResolvedValue(row({ isSettlement: true }))

      await expect(
        service(repo).update(1, 7, { ...createBody, id: 1 })
      ).rejects.toThrow(ConflictError)
    })

    it('does not split a transfer side', async () => {
      const repo = repository()
      repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))

      await expect(
        service(repo).update(1, 7, { ...createBody, id: 1, split: equal })
      ).rejects.toThrow(ConflictError)
    })
  })

  describe('settle up', () => {
    const settleBody = {
      fromUserId: 2,
      toUserId: 1,
      amount: '120.00',
      currency: 'USD' as const,
      fromAccountId: 10,
      transactionDt: '2026-10-14',
    }

    it('records a transfer flagged as a settlement between two accounts', async () => {
      const repo = repository()
      repo.insertTransfer.mockResolvedValue([row(), row()])
      const accs = {
        findById: vi.fn(async (_t: number, id: number) => account({ id })),
      } as unknown as ReturnType<typeof accounts>

      await service(repo, accs).settle(1, 7, { ...settleBody, toAccountId: 11 })

      expect(repo.insertTransfer).toHaveBeenCalledWith(
        1,
        7,
        expect.objectContaining({
          fromAccountId: 10,
          toAccountId: 11,
          amount: '120.00',
          settlement: { fromUserId: 2, toUserId: 1 },
          paymentStatementId: null,
        })
      )
    })

    it('falls back to an expense paid to the member as receiver', async () => {
      const repo = repository()
      repo.insertWithBalance.mockResolvedValue(row())
      const rcv = {
        ...receivers(),
        getOrCreatePerson: vi.fn(async () => receiver({ id: 8 })),
      }

      await service(repo, accounts(), categories(), rcv).settle(
        1,
        7,
        settleBody
      )

      expect(rcv.getOrCreatePerson).toHaveBeenCalledWith(1, 7, 'Member 1')
      expect(repo.insertWithBalance).toHaveBeenCalledWith(
        1,
        7,
        expect.objectContaining({
          type: 'Expense',
          receiverId: 8,
          isSettlement: true,
          paidByUserId: 2,
          splits: [{ userId: 1, share: '120.00' }],
        })
      )
    })

    it('settles with a removed member', async () => {
      const repo = repository()
      repo.insertWithBalance.mockResolvedValue(row())
      const rcv = {
        ...receivers(),
        getOrCreatePerson: vi.fn(async () => receiver({ id: 8 })),
      }

      await service(repo, accounts(), categories(), rcv).settle(1, 7, {
        ...settleBody,
        fromUserId: 3,
      })

      expect(repo.insertWithBalance).toHaveBeenCalled()
    })

    it('rejects strangers, cards, and another currency', async () => {
      await expect(
        service().settle(1, 7, { ...settleBody, fromUserId: 99 })
      ).rejects.toThrow(BadRequestError)

      const card = accounts()
      card.findById.mockResolvedValue(account({ type: 'Credit Card' }))

      await expect(
        service(repository(), card).settle(1, 7, settleBody)
      ).rejects.toThrow(ConflictError)
      await expect(
        service().settle(1, 7, { ...settleBody, currency: 'BRL' })
      ).rejects.toThrow(ConflictError)
    })
  })

  it('rejects a create whose account the tenant does not hold', async () => {
    const repo = repository()
    const accs = accounts()
    accs.findById.mockResolvedValue(undefined)

    await expect(
      service(repo, accs).create(1, 7, { ...createBody, linkedAccountId: 999 })
    ).rejects.toThrow(NotFoundError)
    expect(repo.insertWithBalance).not.toHaveBeenCalled()
  })

  it('rejects an update of a DELETED transaction', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1 })
    ).rejects.toThrow(NotFoundError)
  })

  it('changes the status through the narrow route, not the ledger', async () => {
    const repo = repository()
    repo.updateStatus.mockResolvedValue(row({ reviewStatus: 'Checked' }))
    const svc = service(repo)

    const changed = await svc.changeStatus(1, 7, { id: 1, status: 'Checked' })

    expect(changed.reviewStatus).toBe('Checked')
    // Only the status travels: the full-row update path — which reverts and
    // re-applies the same delta — never runs for a review-status change.
    expect(repo.updateStatus).toHaveBeenCalledWith(1, 1, 7, 'Checked')
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it('rejects the status change of a DELETED transaction', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))

    await expect(
      service(repo).changeStatus(1, 7, { id: 1, status: 'Checked' })
    ).rejects.toThrow(NotFoundError)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })

  it('forwards the session user with the status change', async () => {
    const repo = repository()
    repo.updateStatus.mockResolvedValue(row())
    const svc = service(repo)

    await svc.changeStatus(1, 42, { id: 1, status: 'Canceled' })

    expect(repo.updateStatus).toHaveBeenCalledWith(1, 1, 42, 'Canceled')
  })

  it('updates an ACTIVE transaction, keeping its recurring link', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ recurringId: 9 }))
    repo.updateWithBalance.mockResolvedValue(row({ name: 'Market run' }))
    const svc = service(repo)

    await svc.update(1, 7, { ...createBody, id: 1, name: 'Market run' })

    expect(repo.updateWithBalance).toHaveBeenCalledWith(
      1,
      1,
      7,
      expect.objectContaining({ recurringId: 9, reviewStatus: 'Verify' })
    )
  })

  it('rejects moving a transaction to an account of another currency', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ currency: 'BRL' }))
    const accs = accounts()
    accs.findById.mockResolvedValue(account({ id: 11, currency: 'USD' }))

    const error = await service(repo, accs)
      .update(1, 7, {
        ...createBody,
        id: 1,
        linkedAccountId: 11,
      })
      .then(
        () => null,
        (error: unknown) => error
      )

    expect(error).toBeInstanceOf(ConflictError)
    expect((error as ConflictError).payload).toBe(
      'Move the transaction to an account of the same currency.'
    )
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it('moves a transaction to another account of the same currency', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ currency: 'BRL' }))
    repo.updateWithBalance.mockResolvedValue(row({ linkedAccountId: 11 }))
    const accs = accounts()
    accs.findById.mockResolvedValue(account({ id: 11, currency: 'BRL' }))

    await service(repo, accs).update(1, 7, {
      ...createBody,
      id: 1,
      linkedAccountId: 11,
    })

    expect(repo.updateWithBalance).toHaveBeenCalledWith(
      1,
      1,
      7,
      expect.objectContaining({ linkedAccountId: 11 })
    )
  })

  it("rejects a change to a transfer side's type", async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1, type: 'Income' })
    ).rejects.toThrow(ConflictError)
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it("rejects a change to a transfer side's account", async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1, linkedAccountId: 11 })
    ).rejects.toThrow(ConflictError)
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it("updates a transfer side's amount, leaving the pair to the ledger", async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))
    repo.updateWithBalance.mockResolvedValue(row({ amount: '50.00' }))

    await service(repo).update(1, 7, { ...createBody, id: 1, amount: '50.00' })

    expect(repo.updateWithBalance).toHaveBeenCalledWith(
      1,
      1,
      7,
      expect.objectContaining({ amount: '50.00', type: 'Expense' })
    )
  })

  it('soft-deletes an ACTIVE transaction through the ledger', async () => {
    const repo = repository()
    const svc = service(repo)

    await svc.softDelete(1, 7, 1)

    expect(repo.softDeleteWithBalance).toHaveBeenCalledWith(1, 1, 7)
  })

  it('skips the delete of an already-deleted transaction', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))
    const svc = service(repo)

    await svc.softDelete(1, 7, 1)

    expect(repo.softDeleteWithBalance).not.toHaveBeenCalled()
  })

  describe('transfer', () => {
    const transferBody = {
      fromAccountId: 10,
      toAccountId: 11,
      categoryId: 3,
      amount: '50.00',
      transactionDt: '2026-10-14',
      note: null,
    }

    it('creates exactly two rows through one ledger pass', async () => {
      const repo = repository()
      repo.insertTransfer.mockResolvedValue([
        row({
          id: 21,
          name: 'TRANSFER_OUT',
          linkedAccountId: 10,
          type: 'Expense',
        }),
        row({
          id: 22,
          name: 'TRANSFER_IN',
          linkedAccountId: 11,
          type: 'Income',
        }),
      ])
      const accs = accounts()
      accs.findById
        .mockResolvedValueOnce(account())
        .mockResolvedValueOnce(account({ id: 11, name: 'Reserve' }))

      const [out, inn] = await service(repo, accs).transfer(1, 7, transferBody)

      expect(out.type).toBe('Expense')
      expect(inn.type).toBe('Income')
      expect(repo.insertTransfer).toHaveBeenCalledWith(1, 7, {
        ...transferBody,
        paymentStatementId: null,
      })
    })

    describe('into a credit card', () => {
      const card = account({ id: 11, name: 'Visa', type: 'Credit Card' })
      const paying = () => {
        const accs = accounts()
        accs.findById
          .mockResolvedValueOnce(account())
          .mockResolvedValueOnce(card)
        const repo = repository()
        repo.insertTransfer.mockResolvedValue([row(), row()])

        return { accs, repo }
      }

      it('settles the card default bill when the body names none', async () => {
        const { accs, repo } = paying()

        await service(repo, accs).transfer(1, 7, transferBody)

        expect(repo.insertTransfer).toHaveBeenCalledWith(
          1,
          7,
          expect.objectContaining({ paymentStatementId: 40 })
        )
      })

      it('settles the bill the body names, whatever day it is paid', async () => {
        const { accs, repo } = paying()
        const bills = statements()

        await service(repo, accs, categories(), receivers(), bills).transfer(
          1,
          7,
          {
            ...transferBody,
            transactionDt: '2026-11-03',
            paymentStatementId: 41,
          }
        )

        expect(bills.defaultPaymentStatementId).not.toHaveBeenCalled()
        expect(repo.insertTransfer).toHaveBeenCalledWith(
          1,
          7,
          expect.objectContaining({ paymentStatementId: 41 })
        )
      })

      it('rejects a bill of another card', async () => {
        const { accs, repo } = paying()
        const bills = statements()
        bills.findById.mockResolvedValue(statement({ accountId: 99 }))

        await expect(
          service(repo, accs, categories(), receivers(), bills).transfer(1, 7, {
            ...transferBody,
            paymentStatementId: 41,
          })
        ).rejects.toThrow(ConflictError)
        expect(repo.insertTransfer).not.toHaveBeenCalled()
      })

      it('lands an uncategorized payment in the card payment category', async () => {
        const { accs, repo } = paying()
        const cats = categories()

        await service(repo, accs, cats).transfer(1, 7, {
          ...transferBody,
          categoryId: undefined,
        })

        expect(cats.getOrCreateByName).toHaveBeenCalledWith(
          1,
          7,
          CARD_PAYMENT_CATEGORY
        )
        expect(repo.insertTransfer).toHaveBeenCalledWith(
          1,
          7,
          expect.objectContaining({ categoryId: 30 })
        )
      })
    })

    it('lands an uncategorized transfer in the transfer category', async () => {
      const repo = repository()
      const accs = accounts()
      const cats = categories()
      repo.insertTransfer.mockResolvedValue([row(), row()])
      accs.findById
        .mockResolvedValueOnce(account())
        .mockResolvedValueOnce(account({ id: 11 }))

      await service(repo, accs, cats).transfer(1, 7, {
        ...transferBody,
        categoryId: undefined,
      })

      expect(cats.getOrCreateByName).toHaveBeenCalledWith(
        1,
        7,
        TRANSFER_CATEGORY
      )
    })

    it('names a bill only on a transfer into a card', async () => {
      const repo = repository()
      const accs = accounts()
      accs.findById
        .mockResolvedValueOnce(account())
        .mockResolvedValueOnce(account({ id: 11 }))

      await expect(
        service(repo, accs).transfer(1, 7, {
          ...transferBody,
          paymentStatementId: 41,
        })
      ).rejects.toThrow(ConflictError)
    })

    it('rejects accounts of different currencies', async () => {
      const repo = repository()
      const accs = accounts()
      accs.findById
        .mockResolvedValueOnce(account())
        .mockResolvedValueOnce(account({ id: 11, currency: 'BRL' }))

      await expect(
        service(repo, accs).transfer(1, 7, transferBody)
      ).rejects.toThrow(ConflictError)
      expect(repo.insertTransfer).not.toHaveBeenCalled()
    })

    it('rejects the schema-proof second line of defense: the same account twice', async () => {
      const repo = repository()
      const accs = accounts()
      accs.findById.mockResolvedValue(account())

      await expect(
        service(repo, accs).transfer(1, 7, {
          ...transferBody,
          toAccountId: 10,
        })
      ).rejects.toThrow(ConflictError)
    })
  })
})
