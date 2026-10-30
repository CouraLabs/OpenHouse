import type { APIRequestContext } from '@playwright/test'

import { apiPost } from './api.js'
import { uniqueName } from './names.js'

export interface SeededRow {
  id: number
  name: string
}

export interface SeededAccountInput {
  name?: string
  type?: 'Checking' | 'Wallet' | 'Savings' | 'Credit Card'
  currency?: 'BRL' | 'USD' | 'EUR'
  balance?: string
  limit?: string
  closeDay?: number
  dueDay?: number
}

export async function seedAccount(
  request: APIRequestContext,
  input: SeededAccountInput = {}
): Promise<SeededRow> {
  const type = input.type ?? 'Checking'
  const isCard = type === 'Credit Card'
  const isBank = type === 'Checking' || type === 'Savings'

  const account = await apiPost<SeededRow>(request, '/accounts', {
    name: input.name ?? uniqueName(`Seed ${type}`),
    ...(isBank ? { agency: '0001', number: '12345' } : {}),
    type,
    balance: isCard ? '0.00' : (input.balance ?? '1000.00'),
    currency: input.currency ?? 'BRL',
    spreadPct: '0',
    closeDayInclusive: false,
    isDefault: false,
    ownership: 'personal',
    ...(isCard
      ? {
          limit: input.limit ?? '5000.00',
          closeDay: input.closeDay ?? 5,
          dueDay: input.dueDay ?? 15,
        }
      : {}),
  })

  return { id: account.id, name: account.name }
}

export async function seedCreditCard(
  request: APIRequestContext,
  input: { name?: string; closeDay?: number; dueDay?: number } = {}
): Promise<SeededRow> {
  return seedAccount(request, { ...input, type: 'Credit Card', name: input.name ?? uniqueName('Seed Card') })
}

export async function seedCategory(
  request: APIRequestContext,
  name = uniqueName('Seed Category')
): Promise<SeededRow> {
  return apiPost<SeededRow>(request, '/categories', { name, color: '#1D4ED8' })
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function seedExpense(
  request: APIRequestContext,
  input: { name: string; amount: string; accountId: number; categoryId: number }
): Promise<SeededRow> {
  return apiPost<SeededRow>(request, '/transactions', {
    name: input.name,
    amount: input.amount,
    transactionDt: todayIso(),
    linkedAccountId: input.accountId,
    categoryId: input.categoryId,
    type: 'Expense',
    status: 'Verify',
  })
}

export async function seedReceiver(
  request: APIRequestContext,
  name = uniqueName('Seed Receiver')
): Promise<SeededRow> {
  return apiPost<SeededRow>(request, '/receivers', { name, type: 'Merchant' })
}
