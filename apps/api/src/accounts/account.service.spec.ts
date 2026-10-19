import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Account } from '@workspace/db'
import { createAccountSchema } from '@workspace/poco'

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
  limit: null,
  closeDay: null,
  dueDay: null,
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

describe('AccountService', () => {
  it('creates an account, mapping absent optionals to nulls', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(row({ agency: null }))
    const service = new AccountService(repo as unknown as AccountRepository)

    await service.create(1, 7, {
      name: 'Everyday',
      number: '9876',
      type: 'Checking',
      balance: '12.34',
      currency: 'USD',
      isDefault: false,
    })

    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      name: 'Everyday',
      agency: null,
      number: '9876',
      type: 'Checking',
      balance: '12.34',
      currency: 'USD',
      limit: null,
      closeDay: null,
      dueDay: null,
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
    const service = new AccountService(repo as unknown as AccountRepository)

    const found = await service.search(1, args)

    expect(found.total).toBe(1)
    expect(repo.search).toHaveBeenCalledWith(1, args)
  })

  it('rejects a read of an account the tenant does not hold', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)
    const service = new AccountService(repo as unknown as AccountRepository)

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundException)
  })

  it('updates an ACTIVE account', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row())
    repo.update.mockResolvedValue(row({ balance: '99.00' }))
    const service = new AccountService(repo as unknown as AccountRepository)

    const updated = await service.update(1, 7, {
      id: 1,
      name: 'Everyday',
      number: '9876',
      type: 'Checking',
      balance: '99.00',
      currency: 'USD',
      isDefault: false,
    })

    expect(updated.balance).toBe('99.00')
    // Only the writable fields reach the repository: the id selects the row,
    // it is never part of the update — the column is GENERATED ALWAYS.
    expect(repo.update).toHaveBeenCalledWith(1, 1, 7, {
      name: 'Everyday',
      agency: null,
      number: '9876',
      type: 'Checking',
      balance: '99.00',
      currency: 'USD',
      limit: null,
      closeDay: null,
      dueDay: null,
      isDefault: false,
    })
  })

  it('rejects the update of a deleted account as missing', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))
    const service = new AccountService(repo as unknown as AccountRepository)

    await expect(
      service.update(1, 7, {
        id: 1,
        name: 'Everyday',
        number: '9876',
        type: 'Checking',
        balance: '99.00',
        currency: 'USD',
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
    const service = new AccountService(repo as unknown as AccountRepository)

    await service.create(1, 7, {
      name: 'Cash',
      type: 'Wallet',
      balance: '12.34',
      currency: 'USD',
      isDefault: false,
    })

    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      name: 'Cash',
      agency: null,
      number: null,
      type: 'Wallet',
      balance: '12.34',
      currency: 'USD',
      limit: null,
      closeDay: null,
      dueDay: null,
      isDefault: false,
    })
  })

  it('soft-deletes an account as a status change', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row())
    repo.softDelete.mockResolvedValue(row({ status: 'DELETED' }))
    const service = new AccountService(repo as unknown as AccountRepository)

    await expect(service.softDelete(1, 7, 1)).resolves.toBeUndefined()
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
      isDefault: false,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['number'])
    }
  })
})
