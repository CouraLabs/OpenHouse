import { addMoney, compareMoney, type Currency, type SplitShare } from '@workspace/poco'

export interface SpendingRow {
  payerUserId: number | null
  currency: Currency
  amount: string
  categoryId: number
  categoryName: string
  categoryColor: string
  shares: readonly SplitShare[]
}

export interface MemberTotal {
  userId: number
  currency: Currency
  total: string
}

export interface CategoryTotal {
  categoryId: number
  categoryName: string
  categoryColor: string
  currency: Currency
  total: string
}

export function totalSpending(rows: readonly SpendingRow[]): {
  byMember: MemberTotal[]
  byCategory: CategoryTotal[]
} {
  const members = new Map<string, MemberTotal>()
  const categories = new Map<string, CategoryTotal>()

  for (const row of rows) {
    const borne: readonly SplitShare[] =
      row.shares.length > 0
        ? row.shares
        : row.payerUserId === null
          ? []
          : [{ userId: row.payerUserId, share: row.amount }]

    for (const entry of borne) {
      const key = `${row.currency}:${entry.userId}`
      const current = members.get(key)

      members.set(key, {
        userId: entry.userId,
        currency: row.currency,
        total: addMoney(current?.total ?? '0.00', entry.share),
      })
    }

    const categoryKey = `${row.currency}:${row.categoryId}`
    const category = categories.get(categoryKey)

    categories.set(categoryKey, {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryColor: row.categoryColor,
      currency: row.currency,
      total: addMoney(category?.total ?? '0.00', row.amount),
    })
  }

  const largestFirst = (a: { total: string }, b: { total: string }) =>
    compareMoney(b.total, a.total)

  return {
    byMember: [...members.values()].sort(largestFirst),
    byCategory: [...categories.values()].sort(largestFirst),
  }
}
