import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@workspace/db'
import { createAccountSchema } from '@workspace/poco'

import type { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import type { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { AccountRepository } from './account.repository.js'
import { AccountService } from './account.service.js'

/** An account row the repository can hand back, with every field the service reads. */
const row = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  tenantId: 1,
  name: 'Everyday',
  agency: '1234',
  number: '9876',
  type: 'Checking',
  balance: '12.34',
  currency: 'USD',
  spreadPct: '0.00',
  limit: null,
  closeDay: null,
  dueDay: null,
  closeDayInclusive: false,
  isDefault: false,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** An account repository mock with every method the service touches. */
const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
})

/** A cycle-sync port and a bill repository mock. */
const cardCycle = () => ({ onCycleChanged: vi.fn() })
const statements = () => ({
  unpaidSummary: vi.fn(async () => ({
    unpaidBills: 0,
    amountDue: '0.00',
    currency: 'USD' as const,
  })),
})

const accountService = (
  repo = repository(),
  sync = cardCycle(),
  bills = statements()
) =>
  new AccountService(
    repo as unknown as AccountRepository,
    sync as unknown as CardCycleSync,
    bills as unknown as CreditCardStatementRepository
  )

/** A card row and the update body that saves it unchanged. */
const card = row({
  type: 'Credit Card',
  agency: null,
  number: null,
  balance: '-50.00',
  limit: '1000.00',
  closeDay: 25,
  dueDay: 5,
})
const cardBody = {
  id: 1,
  name: 'Everyday',
  type: 'Credit Card' as const,
  balance: '-50.00',
  currency: 'USD' as const,
  spreadPct: '0',
  limit: '1000.00',
  closeDay: 25,
  dueDay: 5,
  closeDayInclusive: false,
  isDefault: false,
}

describe('AccountService', () => {
  it('creates an account, mapping absent optionals to nulls', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(row({ agency: null }))
    const service = accountService(repo)

    await service.create(1, 7, {
      name: 'Everyday',
      number: '9876',
      type: 'Checking',
      balance: '12.34',
      currency: 'USD',
      spreadPct: '0',
      closeDayInclusive: false,
      isDefault: false,
    })

    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      name: 'Everyday',
      agency: null,
      number: '9876',
      type: 'Checking',
      balance: '12.34',
      currency: 'USD',
      spreadPct: '0',
      limit: null,
      closeDay: null,
      dueDay: null,
      closeDayInclusive: false,
      isDefault: false,
    })
  })

  it('searches through to the repository', async () => {
    const repo = repository()
    const args = {
      sort: [],
      filter: { status: 'ACTIVE' },
      skip: 0,
      limit: 20,
    } as Parameters<AccountService['search']>[1]
    repo.search.mockResolvedValue({ rows: [row()], total: 1 })
    const service = accountService(repo)

    const found = await service.search(1, args)

    expect(found.total).toBe(1)
    expect(repo.search).toHaveBeenCalledWith(1, args)
  })

  it('rejects a read of an account the tenant does not hold', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)
    const service = accountService(repo)

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundException)
  })

  it('updates an ACTIVE account', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row())
    repo.update.mockResolvedValue(row({ balance: '99.00' }))
    const service = accountService(repo)

    const updated = await service.update(1, 7, {
      id: 1,
      name: 'Everyday',
      number: '9876',
      type: 'Checking',
      balance: '99.00',
      currency: 'USD',
      spreadPct: '0',
      closeDayInclusive: false,
      isDefault: false,
    })

    expect(updated.balance).toBe('99.00')
    // Only the writable fields reach the repository: the id selects the row,
    // it is never part of the update — the column is GENERATED ALWAYS.
    expect(repo.update).toHaveBeenCalledWith(
      1,
      1,
      7,
      {
        name: 'Everyday',
        agency: null,
        number: '9876',
        type: 'Checking',
        balance: '99.00',
        currency: 'USD',
        spreadPct: '0',
        limit: null,
        closeDay: null,
        dueDay: null,
        closeDayInclusive: false,
        isDefault: false,
      },
      undefined
    )
  })

  it('rejects the update of a deleted account as missing', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))
    const service = accountService(repo)

    await expect(
      service.update(1, 7, {
        id: 1,
        name: 'Everyday',
        number: '9876',
        type: 'Checking',
        balance: '99.00',
        currency: 'USD',
        spreadPct: '0',
        closeDayInclusive: false,
        isDefault: false,
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('creates a Wallet without a number, writing null', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(
      row({ type: 'Wallet', agency: null, number: null })
    )
    const service = accountService(repo)

    await service.create(1, 7, {
      name: 'Cash',
      type: 'Wallet',
      balance: '12.34',
      currency: 'USD',
      spreadPct: '0',
      closeDayInclusive: false,
      isDefault: false,
    })

    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      name: 'Cash',
      agency: null,
      number: null,
      type: 'Wallet',
      balance: '12.34',
      currency: 'USD',
      spreadPct: '0',
      limit: null,
      closeDay: null,
      dueDay: null,
      closeDayInclusive: false,
      isDefault: false,
    })
  })

  it('soft-deletes an account as a status change', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row())
    repo.softDelete.mockResolvedValue(row({ status: 'DELETED' }))
    const service = accountService(repo)

    await expect(service.softDelete(1, 7, 1)).resolves.toBeUndefined()
    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })

  it('rejects a card whose close and due days are the same', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(card)

    await expect(
      accountService(repo).update(1, 7, { ...cardBody, dueDay: 25 })
    ).rejects.toThrow(ConflictException)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('leaves the bills alone when the card days did not change', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(card)
    repo.update.mockResolvedValue(card)

    await accountService(repo).update(1, 7, { ...cardBody, name: 'Renamed' })

    expect(repo.update.mock.calls[0][4]).toBeUndefined()
  })

  it('re-resolves the open bills inside the save when a day changes', async () => {
    const repo = repository()
    const sync = cardCycle()
    repo.findById.mockResolvedValue(card)
    repo.update.mockImplementation(async (...args: unknown[]) => {
      const beforeWrite = args[4] as (tx: unknown) => Promise<void>
      await beforeWrite('tx')
      return card
    })

    await accountService(repo, sync).update(1, 7, { ...cardBody, dueDay: 10 })

    expect(sync.onCycleChanged).toHaveBeenCalledWith('tx', 1, 7, 1, {
      closeDay: 25,
      dueDay: 10,
      closeDayInclusive: false,
    })
  })

  it('rejects a type change once the card has transactions — and so bills', async () => {
    const repo = { ...repository(), hasTransactions: vi.fn(async () => true) }
    repo.findById.mockResolvedValue(card)

    await expect(
      accountService(repo).update(1, 7, {
        ...cardBody,
        type: 'Checking',
        agency: '1',
        number: '2',
        limit: null,
        closeDay: null,
        dueDay: null,
      })
    ).rejects.toThrow(ConflictException)
  })

  it('asks before deleting a card that still owes, until confirmed', async () => {
    const repo = repository()
    const bills = statements()
    repo.findById.mockResolvedValue(card)
    bills.unpaidSummary.mockResolvedValue({
      unpaidBills: 1,
      amountDue: '50.00',
      currency: 'USD',
    })

    await expect(
      accountService(repo, cardCycle(), bills).softDelete(1, 7, 1)
    ).rejects.toThrow(ConflictException)
    expect(repo.softDelete).not.toHaveBeenCalled()

    await accountService(repo, cardCycle(), bills).softDelete(1, 7, 1, true)
    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})

describe('createAccountSchema', () => {
  /** A bank account body: the fields the shape accepts before refining. */
  const bankBody = {
    name: 'Everyday',
    agency: '1234',
    number: '9876',
    type: 'Checking',
    balance: '12.34',
    currency: 'USD',
    isDefault: false,
  }

  it('accepts a bank account carrying its agency and number', () => {
    expect(createAccountSchema.safeParse(bankBody).success).toBe(true)
  })

  it('keeps an account number exactly as typed — leading zeros and check digit', () => {
    const parsed = createAccountSchema.parse({
      ...bankBody,
      number: '00012345-6',
    })
    expect(parsed.number).toBe('00012345-6')
  })

  it('accepts an IBAN-length number with letters', () => {
    const parsed = createAccountSchema.safeParse({
      ...bankBody,
      number: 'GB82 WEST 1234 5698 7654 32',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a number longer than 34 characters or with symbols', () => {
    for (const number of ['1'.repeat(35), '12345/6']) {
      const parsed = createAccountSchema.safeParse({ ...bankBody, number })
      expect(parsed.success).toBe(false)
    }
  })

  it('rejects a Checking whose number is only spaces', () => {
    const parsed = createAccountSchema.safeParse({ ...bankBody, number: '  ' })
    expect(parsed.success).toBe(false)
  })

  it('rejects a Savings without a number', () => {
    const parsed = createAccountSchema.safeParse({
      ...bankBody,
      type: 'Savings',
      number: null,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['number'])
    }
  })

  it('accepts a Wallet without a number', () => {
    const parsed = createAccountSchema.safeParse({
      name: 'Cash',
      agency: null,
      number: null,
      type: 'Wallet',
      balance: '12.34',
      currency: 'USD',
      spreadPct: '0',
      closeDayInclusive: false,
      isDefault: false,
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects a Wallet that carries a number', () => {
    const parsed = createAccountSchema.safeParse({
      name: 'Cash',
      agency: null,
      number: '9876',
      type: 'Wallet',
      balance: '12.34',
      currency: 'USD',
      spreadPct: '0',
      closeDayInclusive: false,
      isDefault: false,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['number'])
    }
  })
})
