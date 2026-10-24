import {
  defaultNotificationPreferences,
  type CreditCardStatement,
  type NotificationPreferences,
  type UpcomingLimitInput,
  type UpcomingRule,
} from '@workspace/poco'

/** Shared builders of the reminder specs. */

export function bill(
  overrides: Partial<CreditCardStatement> = {}
): CreditCardStatement {
  return {
    id: 7,
    accountId: 9,
    accountName: 'Nubank',
    currency: 'BRL',
    periodStart: '2026-10-01',
    closeDate: '2026-10-28',
    closesOn: '2026-10-27',
    dueDate: '2026-11-05',
    closedAt: null,
    charges: '300.00',
    credits: '0.00',
    total: '300.00',
    previousBalance: '0.00',
    paid: '0.00',
    amountDue: '300.00',
    status: 'Closed',
    carriedTo: null,
    minimumDue: null,
    bankTotal: null,
    reconciledAt: null,
    transactionCount: 3,
    ...overrides,
  }
}

export function rule(overrides: Partial<UpcomingRule> = {}): UpcomingRule {
  return {
    id: 1,
    receiverName: 'Landlord',
    linkedAccountId: 1,
    accountName: 'Checking',
    accountCurrency: 'BRL',
    amount: '1500.00',
    type: 'Expense',
    frequency: 'Monthly',
    frequencyDay: 10,
    frequencyMonth: null,
    ...overrides,
  }
}

export function limit(
  overrides: Partial<UpcomingLimitInput> = {}
): UpcomingLimitInput {
  return {
    id: 3,
    categoryName: 'Groceries',
    amount: '1000.00',
    type: 'Monthly',
    currency: 'BRL',
    spent: '0.00',
    ...overrides,
  }
}

export function preferences(
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return { ...defaultNotificationPreferences, ...overrides }
}
